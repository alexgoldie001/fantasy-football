import { NextResponse } from 'next/server';
import { fixtureCustomScore } from '@/lib/fixture-custom-score';
import { loadCurrentSeasonFixtureStats } from '@/lib/fixture-stats';
import { syncFpl2026Players } from '@/lib/fpl-2026-sync';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { leaguePosition } from '@/lib/tff-position';

const stat = (fixture: { raw?: { stats?: Array<{ identifier?:string; value?:number }> } | null }, identifier: string) => Number(fixture.raw?.stats?.find(item => item.identifier === identifier)?.value || 0);

export async function GET() {
  try {
    const db = supabaseAdmin();
    let { data: players, error } = await db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price').eq('season', '2026/27').order('web_name');
    if (error) throw error;
    if (!(players || []).length) { await syncFpl2026Players(); const refreshed = await db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price').eq('season', '2026/27').order('web_name'); if (refreshed.error) throw refreshed.error; players = refreshed.data; }
    const ids = (players || []).map(player => player.fpl_id);
    const [fixtures, ownership] = await Promise.all([loadCurrentSeasonFixtureStats(ids), db.from('squad_players').select('fpl_id,squads(name)').is('released_at', null)]);
    if (ownership.error) throw ownership.error;
    const ownerByPlayer = new Map((ownership.data || []).map((row: any) => [row.fpl_id, row.squads?.name || null]));
    const byPlayer = new Map<number, typeof fixtures>();
    for (const fixture of fixtures) byPlayer.set(fixture.fpl_id, [...(byPlayer.get(fixture.fpl_id) || []), fixture]);
    return NextResponse.json({ season: '2026/27', players: (players || []).map(player => {
      const position = leaguePosition(player);
      const rows = byPlayer.get(player.fpl_id) || [];
      const sum = (key: string) => rows.reduce((total, row) => total + stat(row, key), 0);
      const starts = rows.filter(row => stat(row, 'starts') > 0).length;
      const substituteAppearances = rows.filter(row => stat(row, 'minutes') > 0 && stat(row, 'starts') === 0).length;
      const eligibleForCleanSheet = position === 'GK' || position === 'DEF';
      const fullCleanSheets = eligibleForCleanSheet ? rows.filter(row => stat(row, 'clean_sheets') > 0 && stat(row, 'minutes') >= 60).length : 0;
      const partialCleanSheets = eligibleForCleanSheet ? rows.filter(row => stat(row, 'clean_sheets') > 0 && stat(row, 'minutes') > 0 && stat(row, 'minutes') < 60).length : 0;
      return { id:player.fpl_id, name:player.web_name, team:player.team_name, position, price:player.current_price, owner:ownerByPlayer.get(player.fpl_id) || null, points:rows.reduce((total, row) => total + fixtureCustomScore(row, position), 0), starts, substituteAppearances, goals:sum('goals_scored'), assists:sum('assists'), fullCleanSheets, partialCleanSheets, saves:sum('saves'), goalsConceded:sum('goals_conceded'), tackles:sum('tackles'), yellowCards:sum('yellow_cards'), redCards:sum('red_cards'), penaltiesMissed:sum('penalties_missed'), penaltiesSaved:sum('penalties_saved'), ownGoals:sum('own_goals') };
    }) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load 2026/27 player scores.' }, { status: 500 }); }
}
