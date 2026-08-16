import { supabaseAdmin } from '@/lib/supabase-admin';

const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];

export async function syncFpl2026Players() {
  const response = await fetch(FPL_URL, { headers:{ 'User-Agent':'BailsAndGoldiesFantasy/1.0' }, cache:'no-store' });
  if (!response.ok) throw new Error('Unable to reach the official FPL player feed.');
  const fpl = await response.json();
  const firstDeadline = fpl.events?.find((event:any) => event.id === 1)?.deadline_time || '';
  if (!String(firstDeadline).startsWith('2026-')) throw new Error('The official FPL feed is not currently the 2026/27 player list.');
  const teams = new Map<number, any>((fpl.teams || []).map((team:any) => [team.id, team] as [number, any]));
  const syncedAt = new Date().toISOString();
  const records: Array<Record<string, any>> = (fpl.elements || []).map((player:any) => {
    const team = teams.get(player.team);
    return {
    fpl_id:player.id, season:'2026/27', web_name:player.web_name, first_name:player.first_name, second_name:player.second_name,
    team_id:player.team, team_name:team?.name || 'Unknown', position:positions[player.element_type] || 'MID',
    current_price:player.now_cost, photo:`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`, status:player.status,
    raw:{ ...player, team_code:team?.code, team_short_name:team?.short_name }, source_updated_at:syncedAt, updated_at:syncedAt,
  }; });
  const { error } = await supabaseAdmin().from('fpl_players_2026_27').upsert(records, { onConflict:'fpl_id' });
  if (error) throw error;
  // The live league catalogue reads fpl_players. Keep it aligned with the 2026/27 season as well.
  const liveRecords = records.map(({ season, source_updated_at, ...player }) => player);
  const { error: liveError } = await supabaseAdmin().from('fpl_players').upsert(liveRecords, { onConflict:'fpl_id' });
  if (liveError) throw liveError;
  return records.length;
}
