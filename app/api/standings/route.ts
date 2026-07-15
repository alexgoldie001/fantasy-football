import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: squads, error: squadsError }, { data: profiles, error: profilesError }, { data: memberships, error: membershipsError }] = await Promise.all([
      db.from('squads').select('id,name,manager_id'),
      db.from('profiles').select('id,display_name'),
      db.from('squad_players').select('squad_id,fpl_id').is('released_at', null),
    ]);
    if (squadsError) throw squadsError;
    if (profilesError) throw profilesError;
    if (membershipsError) throw membershipsError;
    const ids = [...new Set((memberships || []).map(row => row.fpl_id))];
    const { data: fplPlayers, error: playersError } = ids.length ? await db.from('fpl_players').select('fpl_id,raw').in('fpl_id', ids) : { data: [], error: null };
    if (playersError) throw playersError;
    const profileNames = new Map((profiles || []).map(profile => [profile.id, profile.display_name]));
    const playerPoints = new Map((fplPlayers || []).map((player: any) => [player.fpl_id, Number(player.raw?.total_points || 0) - Number(player.raw?.bonus || 0)]));
    const playersBySquad = new Map<string, number[]>();
    for (const membership of memberships || []) playersBySquad.set(membership.squad_id, [...(playersBySquad.get(membership.squad_id) || []), playerPoints.get(membership.fpl_id) || 0]);
    const standings = (squads || []).map(squad => ({ name: squad.name, manager: profileNames.get(squad.manager_id) || 'Manager', points: (playersBySquad.get(squad.id) || []).reduce((total, points) => total + points, 0), week: 0 })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).map((row, index) => ({ ...row, rank: index + 1, change: '—' }));
    return NextResponse.json({ standings }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load standings.' }, { status: 500 }); }
}
