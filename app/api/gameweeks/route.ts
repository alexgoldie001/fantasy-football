import { NextResponse } from 'next/server';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data:profiles, error:profilesError }, { data:squads, error:squadsError }, { data:memberships, error:membershipsError }] = await Promise.all([
      db.from('profiles').select('id,display_name'),
      db.from('squads').select('id,name,manager_id'),
      db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at'),
    ]);
    if (profilesError || squadsError || membershipsError) throw profilesError || squadsError || membershipsError;
    const custom = await loadCustomScoreStats([...new Set((memberships || []).map(row => row.fpl_id))]);
    const membershipsByPlayer = new Map<number, any[]>();
    for (const row of memberships || []) membershipsByPlayer.set(row.fpl_id, [...(membershipsByPlayer.get(row.fpl_id) || []), row]);
    const scoresBySquad = new Map<string, Record<string, number>>();
    for (const stat of custom.rows) {
      const owner = (membershipsByPlayer.get(stat.fpl_id) || []).find(row => row.acquired_at <= stat.kickoff_at && (!row.released_at || row.released_at > stat.kickoff_at));
      if (!owner) continue;
      const scores = scoresBySquad.get(owner.squad_id) || {};
      scores[String(stat.gameweek)] = (scores[String(stat.gameweek)] || 0) + stat.points;
      scoresBySquad.set(owner.squad_id, scores);
    }
    const profileNames = new Map((profiles || []).map(profile => [profile.id, profile.display_name]));
    return NextResponse.json({ rows:(squads || []).map(squad => ({ manager:profileNames.get(squad.manager_id) || 'Manager', team:squad.name, scores:scoresBySquad.get(squad.id) || {} })) }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load gameweek table.' }, { status:500 }); }
}