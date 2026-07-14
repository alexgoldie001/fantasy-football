import { NextRequest, NextResponse } from 'next/server';
import { calculatePoints } from '@/lib/scoring';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Snapshot custom scores per manager. Run after FPL updates, and once after the gameweek closes.
export async function POST(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { leagueId, gameweek } = await request.json();
  if (!leagueId || !gameweek) return NextResponse.json({ error: 'leagueId and gameweek are required' }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const [live, rulesResult, squadsResult] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`, { headers: { 'User-Agent': 'TheDraftLeague/1.0' } }).then(r => r.json()),
      db.from('scoring_rules').select('*').eq('league_id', leagueId).eq('is_active', true).single(),
      db.from('squads').select('id,manager_id,squad_players(fpl_id,released_at,fpl_players(position))').eq('league_id', leagueId),
    ]);
    if (rulesResult.error) throw rulesResult.error;
    const liveStats = new Map<number, Record<string, number>>(live.elements.map((row: { id: number; stats: Record<string, number> }) => [row.id, row.stats] as [number, Record<string, number>]));
    const records = (squadsResult.data || []).map(squad => {
      const scores = (squad.squad_players || []).filter(p => !p.released_at).map(p => ({ fplId: p.fpl_id, points: calculatePoints(liveStats.get(p.fpl_id) || ({} as Record<string, number>), p.fpl_players[0]?.position || 'MID', rulesResult.data) }));
      return { league_id: leagueId, manager_id: squad.manager_id, gameweek, points: scores.reduce((total, p) => total + p.points, 0), total_points: 0, breakdown: scores };
    });
    // Running totals must include this snapshot but not a prior snapshot for this gameweek.
    for (const record of records) {
      const { data: previous } = await db.from('gameweek_scores').select('points').eq('league_id', leagueId).eq('manager_id', record.manager_id).lt('gameweek', gameweek);
      record.total_points = (previous || []).reduce((total, score) => total + score.points, 0) + record.points;
    }
    const { error } = await db.from('gameweek_scores').upsert(records, { onConflict: 'league_id,manager_id,gameweek' });
    if (error) throw error;
    return NextResponse.json({ scored: records.length, gameweek });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Scoring failed' }, { status: 500 }); }
}
