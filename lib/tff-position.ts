import catalogue from '@/lib/tff-positions-2026.json';

type TffCataloguePlayer = {
  club: string;
  fullName: string;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  shortName: string;
};

type FplPlayerIdentity = {
  first_name?: string | null;
  second_name?: string | null;
  web_name?: string | null;
  team_name?: string | null;
  position?: string | null;
};

const tffPosition: Record<TffCataloguePlayer['position'], 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MID',
  Forward: 'FWD',
};

function repairText(value: string) {
  // The source list can surface UTF-8 text as Windows-1252. Repair only
  // strings with the tell-tale characters, leaving ordinary names untouched.
  if (!/[ÃÂâÄÅ]/.test(value)) return value;
  try { return Buffer.from(value, 'latin1').toString('utf8'); } catch { return value; }
}

function normalise(value: string | null | undefined) {
  return repairText(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function clubKey(value: string | null | undefined) {
  const key = normalise(value).replaceAll(' ', '');
  const aliases: Record<string, string> = {
    brightonhovealbion: 'brighton',
    brighton: 'brighton',
    leedsunited: 'leeds',
    leeds: 'leeds',
    manchestercity: 'mancity',
    mancity: 'mancity',
    manchesterunited: 'manunited',
    manutd: 'manunited',
    newcastleunited: 'newcastle',
    newcastle: 'newcastle',
    nottinghamforest: 'nottmforest',
    nottmforest: 'nottmforest',
    tottenhamhotspur: 'spurs',
    spurs: 'spurs',
  };
  return aliases[key] || key;
}

function words(value: string | null | undefined) {
  return normalise(value).split(' ').filter(word => word.length > 1);
}

function candidateScore(player: FplPlayerIdentity, candidate: TffCataloguePlayer) {
  const fullName = normalise(`${player.first_name || ''} ${player.second_name || ''}`);
  const webName = normalise(player.web_name);
  const tffFullName = normalise(candidate.fullName);
  const tffShortName = normalise(candidate.shortName);
  const sharedWords = words(fullName).filter(word => words(tffFullName).includes(word));
  const finalWord = words(fullName).at(-1);
  const tffFinalWord = words(tffFullName).at(-1);
  let score = 0;

  if (fullName && fullName === tffFullName) score += 10000;
  if (fullName && (fullName.includes(tffFullName) || tffFullName.includes(fullName))) score += 5000;
  if (webName && tffShortName.endsWith(webName)) score += 2500;
  if (webName && tffFullName.includes(webName)) score += 800;
  if (finalWord && finalWord === tffFinalWord) score += 1000;
  score += sharedWords.length * 100;
  return score;
}

/**
 * Returns Telegraph's role only when the player is an unambiguous match in
 * its 2026/27 selector. The FPL role is retained for players Telegraph does
 * not currently list, rather than risking a wrong formation or score.
 */
export function leaguePosition(player: FplPlayerIdentity) {
  const fallback = player.position || 'MID';
  const candidates = (catalogue as TffCataloguePlayer[])
    .filter(candidate => clubKey(candidate.club) === clubKey(player.team_name))
    .map(candidate => ({ candidate, score: candidateScore(player, candidate) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const next = candidates[1];
  if (!best || best.score < 1000 || (next && best.score - next.score < 100)) return fallback;
  return tffPosition[best.candidate.position];
}
