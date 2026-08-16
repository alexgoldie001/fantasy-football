import { NextResponse } from 'next/server';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';
import { fixtureCustomScore } from '@/lib/fixture-custom-score';
import { loadSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { leaguePosition } from '@/lib/tff-position';

export const dynamic = 'force-dynamic';

export async function GET(_:Request, { params }:{ params:Promise<{ playerId:string }> }) {
  try {
    const { playerId } = await params;
    const fplId = Number(playerId);
    if (!Number.isInteger(fplId)) return NextResponse.json({ error:'Player not found.' }, { status:404 });
    const db = supabaseAdmin();
    const [{ data:player, error:playerError }, custom, fixtures] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position').eq('fpl_id', fplId).single(),
      loadCustomScoreStats([fplId]),
      loadSeasonFixtureStats([fplId]),
    ]);
    if (playerError) throw playerError;
    const position = leaguePosition(player);
    const grouped = new Map<number, { gameweek:number; date:string; points:number; goals:number; assists:number; cleanSheets:number }>();
    for (const stat of fixtures) {
      const current = grouped.get(stat.gameweek) || { gameweek:stat.gameweek, date:stat.kickoff_at, points:0, goals:0, assists:0, cleanSheets:0 };
      if (stat.kickoff_at < current.date) current.date = stat.kickoff_at;
      const fixturePoints = fixtureCustomScore(stat, position);
      current.points += fixturePoints;
      current.goals += Number(stat.goals || 0);
      current.assists += Number(stat.assists || 0);
      if ((position === 'GK' || position === 'DEF') && fixturePoints > 0) current.cleanSheets += Number(stat.clean_sheets || 0);
      grouped.set(stat.gameweek, current);
    }
    const weeks = [...grouped.values()].sort((a, b) => a.gameweek - b.gameweek);
    return NextResponse.json({ player:{ ...player, position }, points:weeks.reduce((total, row) => total + row.points, 0), weeks, scoreSource:'Saved FPL fixture stats using Bails & Goldies scoring' }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load player scores.' }, { status:500 }); }
}
