import { fixtureCustomScore } from '@/lib/fixture-custom-score';
import { loadCurrentSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { leaguePosition } from '@/lib/tff-position';

export type CustomScoreStat = {
  fpl_id:number;
  gameweek:number;
  kickoff_at:string;
  points:number;
  goals:number;
  assists:number;
  clean_sheets:number;
  position:string;
};

export type FplPlayer = { fpl_id:number; web_name:string; first_name:string|null; second_name:string|null; team_name:string; position:string };
export type TffPlayer = { display_name:string; team_name:string; position:string; raw:Record<string, unknown> };

// Retained for the read-only 2025/26 archive endpoint. Current league scoring
// below uses the live 2026/27 FPL fixture feed instead.
const normalize = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 1);
const normalizeTeam = (value:string) => normalize(value.replace('Manchester', 'Man').replace('United', 'Utd').replace('Nottingham Forest', 'Nottm Forest').replace('Tottenham Hotspur', 'Spurs'));

export function matchTffPlayer(player:FplPlayer, tffPlayers:TffPlayer[]) {
  const fullName = [player.first_name, player.second_name].filter(Boolean).join(' ');
  const full = normalize(fullName), web = normalize(player.web_name), team = normalizeTeam(player.team_name);
  const aliases:Record<string, string> = { juniorkroupi:'elikroupi', kroupijr:'elikroupi' };
  const alias = aliases[full] || aliases[web];
  if (alias) {
    const aliased = tffPlayers.find(candidate => normalize(candidate.display_name) === alias);
    if (aliased) return aliased;
  }
  const exact = tffPlayers.find(candidate => normalize(candidate.display_name) === full);
  if (exact) return exact;
  const fullTokens = tokens(fullName);
  const ranked = tffPlayers.map(candidate => {
    const candidateTokens = tokens(candidate.display_name);
    const overlap = candidateTokens.filter(token => fullTokens.includes(token)).length;
    return { candidate, overlap, score:overlap / Math.min(fullTokens.length || 1, candidateTokens.length || 1) };
  }).sort((left, right) => right.score - left.score || right.overlap - left.overlap);
  if (ranked[0] && ranked[0].overlap >= 2 && ranked[0].score >= 0.75 && (!ranked[1] || ranked[0].score > ranked[1].score || ranked[0].overlap > ranked[1].overlap)) return ranked[0].candidate;
  const exactWeb = tffPlayers.filter(candidate => normalize(candidate.display_name) === web);
  if (exactWeb.length === 1) return exactWeb[0];
  const teamMatches = tffPlayers.filter(candidate => normalizeTeam(candidate.team_name) === team && (normalize(candidate.display_name).endsWith(web) || normalize(candidate.display_name).includes(web)));
  if (teamMatches.length === 1) return teamMatches[0];
  const surname = normalize((player.web_name.match(/^[A-Z]\.(.+)$/i)?.[1] || player.web_name).split(/\s+/).pop() || '');
  const surnameMatches = tffPlayers.filter(candidate => tokens(candidate.display_name).includes(surname));
  return surnameMatches.length === 1 ? surnameMatches[0] : null;
}

export async function loadCustomScoreStats(playerIds?:number[]) {
  const db = supabaseAdmin();
  let playersQuery = db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_name,position').eq('season', '2026/27');
  if (playerIds?.length) playersQuery = playersQuery.in('fpl_id', playerIds);
  const { data:players, error:playersError } = await playersQuery;
  if (playersError) throw playersError;

  const ids = (players || []).map(player => player.fpl_id);
  const fixtures = await loadCurrentSeasonFixtureStats(ids);
  const playerById = new Map((players || []).map(player => [player.fpl_id, player as FplPlayer]));
  const rows:CustomScoreStat[] = fixtures.flatMap(fixture => {
    const player = playerById.get(fixture.fpl_id);
    if (!player) return [];
    const position = leaguePosition(player);
    const eligibleForCleanSheet = position === 'GK' || position === 'DEF';
    return [{ fpl_id:fixture.fpl_id, gameweek:fixture.gameweek, kickoff_at:fixture.kickoff_at, points:fixtureCustomScore(fixture, position), goals:Number(fixture.goals || 0), assists:Number(fixture.assists || 0), clean_sheets:eligibleForCleanSheet ? Number(fixture.clean_sheets || 0) : 0, position }];
  });
  const matchedPlayerIds = new Set((players || []).map(player => player.fpl_id));
  return { rows, matchedPlayerIds, matchedPositions:new Map((players || []).map(player => [player.fpl_id, leaguePosition(player as FplPlayer)])), unmatchedPlayers:[] };
}
