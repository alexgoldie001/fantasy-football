import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const positionOrder: Record<string, number> = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const db = supabaseAdmin();
    const { data: squads, error: squadsError } = await db.from('squads').select('id,name,budget,manager_id');
    if (squadsError) throw squadsError;
    const squad = (squads || []).find(row => row.id === slug) || (squads || []).find(row => slugify(row.name) === slug);
    if (!squad) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
      db.from('profiles').select('display_name').eq('id', squad.manager_id).single(),
      db.from('squad_players').select('fpl_id,purchase_price').eq('squad_id', squad.id).is('released_at', null),
    ]);
    if (profileError) throw profileError;
    if (membershipError) throw membershipError;
    const ids = (memberships || []).map(row => row.fpl_id);
    const { data: fplPlayers, error: playersError } = ids.length ? await db.from('fpl_players').select('fpl_id,web_name,team_name,position,raw').in('fpl_id', ids) : { data: [], error: null };
    if (playersError) throw playersError;
    const byId = new Map((fplPlayers || []).map(player => [player.fpl_id, player]));
    const players = (memberships || []).map(row => {
      const player: any = byId.get(row.fpl_id);
      return { name: player?.web_name || 'Unknown player', team: player?.team_name || '—', position: player?.position || 'MID', points: Number(player?.raw?.total_points || 0) - Number(player?.raw?.bonus || 0), price: row.purchase_price };
    }).sort((a, b) => positionOrder[a.position] - positionOrder[b.position] || a.name.localeCompare(b.name));
    return NextResponse.json({ name: squad.name, manager: profile.display_name, budget: squad.budget, players });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load team.' }, { status: 500 }); }
}
