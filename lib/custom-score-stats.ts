import { loadSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type CustomScoreStat = {
  fpl_id:number;
  gameweek:number;
  kickoff_at:string;
  points:number;
  goals:number;
  assists:number;
  clean_sheets:number;
};

type FplPlayer = { fpl_id:number; web_name:string; first_name:string|null; second_name:string|null; team_name:string; position:string };
type TffPlayer = { display_name:string; team_name:string; position:string; raw:Record<string, unknown> };
const fallbackSeasonStart = Date.parse('2025-08-12T05:00:00.000Z');
const normalize = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 1);
const normalizeTeam = (value:string) => normalize(value.replace('Manchester', 'Man').replace('United', 'Utd').replace('Nottingham Forest', 'Nottm Forest').replace('Tottenham Hotspur', 'Spurs'));

function matchTffPlayer(player:FplPlayer, tffPlayers:TffPlayer[]) {
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
  let playersQuery = db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position');
  if (playerIds?.length) playersQuery = playersQuery.in('fpl_id', playerIds);
  const [{ data:players, error:playersError }, { data:tffPlayers, error:tffError }] = await Promise.all([
    playersQuery,
    db.from('tff_players').select('display_name,team_name,position,raw').eq('season', '2025/26'),
  ]);
  if (playersError) throw playersError;
  if (tffError) throw tffError;

  const ids = (players || []).map(player => player.fpl_id);
  const fixtures = await loadSeasonFixtureStats(ids);
  const fixtureWeeks = new Map<string, { kickoff_at:string; goals:number; assists:number; clean_sheets:number }>();
  for (const fixture of fixtures) {
    const key = `${fixture.fpl_id}:${fixture.gameweek}`;
    const current = fixtureWeeks.get(key) || { kickoff_at:fixture.kickoff_at, goals:0, assists:0, clean_sheets:0 };
    if (fixture.kickoff_at < current.kickoff_at) current.kickoff_at = fixture.kickoff_at;
    current.goals += Number(fixture.goals || 0);
    current.assists += Number(fixture.assists || 0);
    current.clean_sheets += Number(fixture.clean_sheets || 0);
    fixtureWeeks.set(key, current);
  }

  const rows:CustomScoreStat[] = [];
  const matched = new Map<number, TffPlayer>();
  for (const player of (players || []) as FplPlayer[]) {
    const source = matchTffPlayer(player, (tffPlayers || []) as TffPlayer[]);
    if (!source) continue;
    matched.set(player.fpl_id, source);
    const roundScores = source.raw?.round_scores && typeof source.raw.round_scores === 'object' && !Array.isArray(source.raw.round_scores) ? source.raw.round_scores as Record<string, unknown> : {};
    for (const [round, score] of Object.entries(roundScores)) {
      const gameweek = Number(round);
      if (!Number.isInteger(gameweek) || gameweek < 1 || gameweek > 38) continue;
      const fixture = fixtureWeeks.get(`${player.fpl_id}:${gameweek}`);
      rows.push({ fpl_id:player.fpl_id, gameweek, kickoff_at:fixture?.kickoff_at || new Date(fallbackSeasonStart + (gameweek - 1) * 604800000).toISOString(), points:Number(score || 0), goals:fixture?.goals || 0, assists:fixture?.assists || 0, clean_sheets:fixture?.clean_sheets || 0 });
    }
  }
  return { rows, matchedPlayerIds:new Set(matched.keys()), unmatchedPlayers:((players || []) as FplPlayer[]).filter(player => !matched.has(player.fpl_id)).map(player => ({ fplId:player.fpl_id, name:player.web_name, team:player.team_name })) };
}