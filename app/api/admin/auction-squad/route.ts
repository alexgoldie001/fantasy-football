import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const authorised = (code: string | undefined) => Boolean(process.env.ADMIN_SETUP_CODE) && code === process.env.ADMIN_SETUP_CODE;

export async function POST(request: NextRequest) {
  const { commissionerCode, managerId, entries } = await request.json() as { commissionerCode?: string; managerId?: string; entries?: { player: string; price: number }[] };
  if (!authorised(commissionerCode)) return NextResponse.json({ error: 'Incorrect commissioner code.' }, { status: 401 });
  if (!managerId || !Array.isArray(entries) || entries.length !== 11) return NextResponse.json({ error: 'Enter exactly 11 players and their purchase prices.' }, { status: 400 });
  if (entries.some(entry => !entry.player?.trim() || !Number.isInteger(entry.price) || entry.price < 0 || entry.price % 10 !== 0)) return NextResponse.json({ error: 'Each player needs a name and a price in whole £1m increments (including £0m).' }, { status: 400 });
  const spend = entries.reduce((total, entry) => total + entry.price, 0);
  if (spend > 1000) return NextResponse.json({ error: `This squad costs £${(spend / 10).toFixed(1)}m, which exceeds the £100m budget.` }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const { data: squad, error: squadError } = await db.from('squads').select('id').eq('manager_id', managerId).single();
    if (squadError || !squad) throw squadError || new Error('Squad not found.');
    const { data: allPlayers, error: playersError } = await db.from('fpl_players').select('fpl_id,web_name');
    if (playersError) throw playersError;
    const lookup = new Map((allPlayers || []).map(player => [player.web_name.toLowerCase(), player.fpl_id]));
    const unresolved = entries.filter(entry => !lookup.has(entry.player.trim().toLowerCase())).map(entry => entry.player);
    if (unresolved.length) return NextResponse.json({ error: `Could not match: ${unresolved.join(', ')}. Use the exact name in the Players tab.` }, { status: 400 });
    const fplIds = entries.map(entry => lookup.get(entry.player.trim().toLowerCase())!);
    if (new Set(fplIds).size !== 11) return NextResponse.json({ error: 'Each player can only appear once in this squad.' }, { status: 400 });
    const { data: owned } = await db.from('squad_players').select('fpl_id,squad_id').in('fpl_id', fplIds).is('released_at', null);
    if ((owned || []).some(owner => owner.squad_id !== squad.id)) return NextResponse.json({ error: 'One or more players are already owned by another manager.' }, { status: 409 });
    await db.from('squad_players').update({ released_at: new Date().toISOString() }).eq('squad_id', squad.id).is('released_at', null);
    const { error: insertError } = await db.from('squad_players').insert(entries.map((entry, index) => ({ squad_id: squad.id, fpl_id: fplIds[index], purchase_price: entry.price })));
    if (insertError) throw insertError;
    const { error: budgetError } = await db.from('squads').update({ budget: 1000 - spend }).eq('id', squad.id);
    if (budgetError) throw budgetError;
    return NextResponse.json({ saved: 11, spent: spend, balance: 1000 - spend });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save the auction squad.' }, { status: 500 }); }
}
