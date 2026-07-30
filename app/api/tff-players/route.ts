import { NextResponse } from 'next/server';
import { matchTffPlayer, type FplPlayer, type TffPlayer } from '@/lib/custom-score-stats';
import { loadSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncTffPlayers } from '@/lib/tff-sync';

export const dynamic = 'force-dynamic';
const value = (raw:Record<string, unknown>, key:string) => Number(raw[key] || 0);
const firstValue = (raw:Record<string, unknown>, keys:string[]) => {
  for (const key of keys) if (raw[key] !== undefined && raw[key] !== null) return Number(raw[key] || 0);
  return 0;
};
const ownerKey = (player:TffPlayer) => `${player.display_name}|${player.team_name}`;

export async function GET() {
  try {
    const db = supabaseAdmin();
    let { data:players, error } = await db.from('tff_players').select('tff_id,display_name,team_name,team_code,position,current_price,raw').eq('season', '2025/26').order('display_name');
    if (error) throw error;
    if (!(players || []).length) {
      await syncTffPlayers();
      const refreshed = await db.from('tff_players').select('tff_id,display_name,team_name,team_code,position,current_price,raw').eq('season', '2025/26').order('display_name');
      if (refreshed.error) throw refreshed.error;
      players = refreshed.data;
    }
    const [{ data:memberships, error:membershipError }, { data:fplPlayers, error:fplError }, { data:squads, error:squadError }, { data:profiles, error:profileError }] = await Promise.all([
      db.from('squad_players').select('fpl_id,squad_id').is('released_at', null),
      db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position,raw'),
      db.from('squads').select('id,manager_id'),
      db.from('profiles').select('id,display_name'),
    ]);
    if (membershipError || fplError || squadError || profileError) throw membershipError || fplError || squadError || profileError;
    const tffPlayers = (players || []) as TffPlayer[];
    const fplById = new Map((fplPlayers || []).map(player => [player.fpl_id, player as FplPlayer & { raw?:Record<string, unknown> }]));
    const fixtures = await loadSeasonFixtureStats([...fplById.keys()]);
    const appearances = new Map<number, number>();
    for (const fixture of fixtures) {
      const minutes = Number(fixture.raw?.stats?.find(stat => stat.identifier === 'minutes')?.value || 0);
      if (minutes > 0) appearances.set(fixture.fpl_id, (appearances.get(fixture.fpl_id) || 0) + 1);
    }
    const managerBySquad = new Map((squads || []).map(squad => [squad.id, (profiles || []).find(profile => profile.id === squad.manager_id)?.display_name || 'Manager']));
    const owners = new Map<string, string>();
    const substituteAppearances = new Map<string, number>();
    for (const fplPlayer of fplById.values()) {
      const matched = matchTffPlayer(fplPlayer, tffPlayers);
      if (!matched) continue;
      const starts = Number(fplPlayer.raw?.starts || 0);
      substituteAppearances.set(ownerKey(matched), Math.max(0, (appearances.get(fplPlayer.fpl_id) || 0) - starts));
    }
    for (const membership of memberships || []) {
      const fplPlayer = fplById.get(membership.fpl_id);
      const matched = fplPlayer && matchTffPlayer(fplPlayer, tffPlayers);
      if (matched) owners.set(ownerKey(matched), managerBySquad.get(membership.squad_id) || 'Manager');
    }
    return NextResponse.json({ season:'2025/26', players:tffPlayers.map((player:any) => {
      const raw = player.raw || {};
      const roundScores = raw.round_scores && typeof raw.round_scores === 'object' && !Array.isArray(raw.round_scores) ? raw.round_scores as Record<string, unknown> : {};
      return { id:player.tff_id, name:player.display_name, team:player.team_name, teamCode:player.team_code || '', position:player.position, owner:owners.get(ownerKey(player)) || null, price:player.current_price, points:value(raw, 'total_points'), weeklyScores:Object.fromEntries(Object.entries(roundScores).map(([round, score]) => [round, Number(score || 0)])), starts:value(raw, 'starting11'), substituteAppearances:substituteAppearances.get(ownerKey(player)) || 0, cleanSheets:value(raw, 'full_clean_sheets'), partialCleanSheets:value(raw, 'partial_clean_sheets'), assists:value(raw, 'assists'), goals:value(raw, 'goals'), tackles:value(raw, 'tackles'), saves:value(raw, 'saves'), goalsConceded:value(raw, 'goals_conceded'), yellowCards:value(raw, 'yellow_cards'), redCards:value(raw, 'red_cards'), penaltiesMissed:value(raw, 'missed_pen'), penaltiesSaved:value(raw, 'saved_pen'), ownGoals:firstValue(raw, ['own_goals', 'own_goal']) };
    }) }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load TFF player statistics.' }, { status:500 }); }
}