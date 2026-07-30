import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorised } from '@/lib/api-auth';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Snapshot the same weekly custom scores used throughout the app.
export async function POST(request:NextRequest) {
  if (!cronAuthorised(request)) return NextResponse.json({ error:'Unauthorised' }, { status:401 });
  const { leagueId, gameweek } = await request.json();
  if (!leagueId || !gameweek) return NextResponse.json({ error:'leagueId and gameweek are required' }, { status:400 });
  try {
    const db = supabaseAdmin();
    const { data:squads, error:squadsError } = await db.from('squads').select('id,manager_id').eq('league_id', leagueId);
    if (squadsError) throw squadsError;
    const squadIds = (squads || []).map(squad => squad.id);
    const { data:memberships, error:membershipsError } = squadIds.length ? await db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at').in('squad_id', squadIds) : { data:[], error:null };
    if (membershipsError) throw membershipsError;
    const custom = await loadCustomScoreStats([...new Set((memberships || []).map(row => row.fpl_id))]);
    const weekStats = custom.rows.filter(row => row.gameweek === Number(gameweek));
    const pointsBySquad = new Map<string, number>();
    const playerHistory:{ squad_id:string; fpl_id:number; gameweek:number; points:number }[] = [];
    for (const stat of weekStats) {
      const owner = (memberships || []).find(row => row.fpl_id === stat.fpl_id && row.acquired_at <= stat.kickoff_at && (!row.released_at || row.released_at > stat.kickoff_at));
      if (!owner) continue;
      pointsBySquad.set(owner.squad_id, (pointsBySquad.get(owner.squad_id) || 0) + stat.points);
      playerHistory.push({ squad_id:owner.squad_id, fpl_id:stat.fpl_id, gameweek:Number(gameweek), points:stat.points });
    }
    const records = [];
    for (const squad of squads || []) {
      const { data:previous, error:previousError } = await db.from('gameweek_scores').select('points').eq('league_id', leagueId).eq('manager_id', squad.manager_id).lt('gameweek', Number(gameweek));
      if (previousError) throw previousError;
      const points = pointsBySquad.get(squad.id) || 0;
      records.push({ league_id:leagueId, manager_id:squad.manager_id, gameweek:Number(gameweek), points, total_points:(previous || []).reduce((total, row) => total + Number(row.points || 0), 0) + points, breakdown:playerHistory.filter(row => row.squad_id === squad.id).map(row => ({ fplId:row.fpl_id, points:row.points })) });
    }
    const { error } = await db.from('gameweek_scores').upsert(records, { onConflict:'league_id,manager_id,gameweek' });
    if (error) throw error;
    if (playerHistory.length) { const { error:historyError } = await db.from('squad_player_gameweeks').upsert(playerHistory, { onConflict:'squad_id,fpl_id,gameweek' }); if (historyError) throw historyError; }
    return NextResponse.json({ scored:records.length, gameweek:Number(gameweek), unmatchedPlayers:custom.unmatchedPlayers });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Scoring failed' }, { status:500 }); }
}