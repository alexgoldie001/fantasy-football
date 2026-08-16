import { NextResponse } from 'next/server';
import { fixtureCustomScore } from '@/lib/fixture-custom-score';
import { loadCurrentSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { leaguePosition } from '@/lib/tff-position';

export const dynamic = 'force-dynamic';

export async function GET(_:Request, { params }:{ params:Promise<{ playerId:string }> }) {
  try {
    const { playerId } = await params;
    const fplId = Number(playerId);
    if (!Number.isInteger(fplId)) return NextResponse.json({ error:'Player not found.' }, { status:404 });
    const db = supabaseAdmin();
    const [{ data:player, error:playerError }, fixtures, fixtureResponse] = await Promise.all([
      db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_id,team_name,position').eq('season', '2026/27').eq('fpl_id', fplId).single(),
      loadCurrentSeasonFixtureStats([fplId]),
      fetch('https://fantasy.premierleague.com/api/fixtures/', { headers:{ 'User-Agent':'BailsAndGoldiesFantasy/1.0' }, cache:'no-store' }),
    ]);
    if (playerError) throw playerError;
    if (!fixtureResponse.ok) throw new Error('Unable to retrieve the official FPL fixture dates.');
    const position = leaguePosition(player);
    const scheduledFixtures = (await fixtureResponse.json() as Array<{ id:number; event:number | null; kickoff_time:string | null; team_h:number; team_a:number }>)
      .filter(fixture => fixture.event && fixture.kickoff_time && (fixture.team_h === player.team_id || fixture.team_a === player.team_id))
      .map(fixture => ({ gameweek:fixture.event as number, date:fixture.kickoff_time as string }));
    const grouped = new Map<number, { gameweek:number; date:string; points:number; goals:number; assists:number; cleanSheets:number }>();
    for (const fixture of scheduledFixtures) grouped.set(fixture.gameweek, { gameweek:fixture.gameweek, date:fixture.date, points:0, goals:0, assists:0, cleanSheets:0 });
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
    return NextResponse.json({ season:'2026/27', player:{ ...player, position }, points:weeks.reduce((total, row) => total + row.points, 0), weeks, scoreSource:'Official FPL 2026/27 fixtures and saved fixture stats' }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load player scores.' }, { status:500 }); }
}
