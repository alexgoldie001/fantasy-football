import { supabaseAdmin } from '@/lib/supabase-admin';

const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];

export async function syncFpl2026Players() {
  const response = await fetch(FPL_URL, { headers:{ 'User-Agent':'BailsAndGoldiesFantasy/1.0' }, cache:'no-store' });
  if (!response.ok) throw new Error('Unable to reach the official FPL player feed.');
  const fpl = await response.json();
  const firstDeadline = fpl.events?.find((event:any) => event.id === 1)?.deadline_time || '';
  if (!String(firstDeadline).startsWith('2026-')) throw new Error('The official FPL feed is not currently the 2026/27 player list.');
  const teamNames = new Map((fpl.teams || []).map((team:any) => [team.id, team.name]));
  const syncedAt = new Date().toISOString();
  const records = (fpl.elements || []).map((player:any) => ({
    fpl_id:player.id, season:'2026/27', web_name:player.web_name, first_name:player.first_name, second_name:player.second_name,
    team_id:player.team, team_name:teamNames.get(player.team) || 'Unknown', position:positions[player.element_type] || 'MID',
    current_price:player.now_cost, photo:player.photo, status:player.status, raw:player, source_updated_at:syncedAt, updated_at:syncedAt,
  }));
  const { error } = await supabaseAdmin().from('fpl_players_2026_27').upsert(records, { onConflict:'fpl_id' });
  if (error) throw error;
  return records.length;
}
