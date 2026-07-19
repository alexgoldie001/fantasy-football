import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const authorised = (code: string | undefined) => Boolean(process.env.ADMIN_SETUP_CODE) && code === process.env.ADMIN_SETUP_CODE;

function detailedError(error: unknown, action: string) {
  const databaseError = error as { code?: string; message?: string; details?: string };
  if (databaseError?.code === '23505') return `${action}: a duplicate player record already exists. The old squad could not be replaced.`;
  if (databaseError?.code === '23503') return `${action}: one of the selected players is no longer available in the player database. Refresh the FPL player list and try again.`;
  if (databaseError?.message) return `${action}: ${databaseError.message}${databaseError.details ? ` (${databaseError.details})` : ''}`;
  return `${action}: an unexpected database error occurred.`;
}

export async function POST(request: NextRequest) {
  const { commissionerCode, managerId, entries } = await request.json() as { commissionerCode?: string; managerId?: string; entries?: { fplId: number; price: number }[] };
  if (!authorised(commissionerCode)) return NextResponse.json({ error: 'Incorrect commissioner code.' }, { status: 401 });
  if (!managerId || !Array.isArray(entries) || entries.length !== 11) return NextResponse.json({ error: 'Enter exactly 11 players and their purchase prices.' }, { status: 400 });
  if (entries.some(entry => !Number.isInteger(entry.fplId) || !Number.isInteger(entry.price) || entry.price < 0 || entry.price % 10 !== 0)) return NextResponse.json({ error: 'Select every player from the FPL lookup and use whole £1m price increments (including £0m).' }, { status: 400 });
  const spend = entries.reduce((total, entry) => total + entry.price, 0);
  if (spend > 1000) return NextResponse.json({ error: `This squad costs £${(spend / 10).toFixed(1)}m, which exceeds the £100m budget.` }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { data: squad, error: squadError } = await db.from('squads').select('id').eq('manager_id', managerId).single();
    if (squadError || !squad) throw squadError || new Error('Squad not found.');
    const { data: allPlayers, error: playersError } = await db.from('fpl_players').select('fpl_id');
    if (playersError) throw playersError;
    const validIds = new Set((allPlayers || []).map(player => player.fpl_id));
    const fplIds = entries.map(entry => entry.fplId);
    if (fplIds.some(id => !validIds.has(id))) return NextResponse.json({ error: 'One or more selected players are no longer in the official FPL list. Refresh and try again.' }, { status: 400 });
    if (new Set(fplIds).size !== 11) return NextResponse.json({ error: 'Each player can only appear once in this squad.' }, { status: 400 });
    const { data: owned, error: ownedError } = await db.from('squad_players').select('fpl_id,squad_id').in('fpl_id', fplIds).is('released_at', null);
    if (ownedError) throw ownedError;
    if ((owned || []).some(owner => owner.squad_id !== squad.id)) return NextResponse.json({ error: 'One or more players are already owned by another manager.' }, { status: 409 });
    // A commissioner entering a completed auction squad is a clean replacement, including an incomplete prior squad.
    // Clearing old rows avoids the unique historical (squad, player, acquired date) conflict when a player is re-added.
    const { error: historyDeleteError } = await db.from('squad_player_gameweeks').delete().eq('squad_id', squad.id);
    if (historyDeleteError) throw historyDeleteError;
    const { error: squadDeleteError } = await db.from('squad_players').delete().eq('squad_id', squad.id);
    if (squadDeleteError) throw squadDeleteError;
    const seasonStart = '2025-08-01T00:00:00.000Z';
    const { error: insertError } = await db.from('squad_players').insert(entries.map((entry, index) => ({ squad_id: squad.id, fpl_id: fplIds[index], purchase_price: entry.price, acquired_at: seasonStart })));
    if (insertError) return NextResponse.json({ error: detailedError(insertError, 'The old Bryce squad was cleared, but the replacement 11 could not be saved') }, { status: 500 });
    const { error: budgetError } = await db.from('squads').update({ budget: 1000 - spend }).eq('id', squad.id);
    if (budgetError) return NextResponse.json({ error: detailedError(budgetError, 'The squad was saved, but its remaining budget could not be updated') }, { status: 500 });
    return NextResponse.json({ saved: 11, spent: spend, balance: 1000 - spend });
  } catch (error) { return NextResponse.json({ error: detailedError(error, 'Unable to replace the auction squad') }, { status: 500 }); }
}
