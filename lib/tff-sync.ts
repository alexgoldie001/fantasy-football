import { supabaseAdmin } from '@/lib/supabase-admin';

const TFF_PLAYERS_URL = 'https://fantasyfootball.telegraph.co.uk/json/epl/players.json';
const TFF_SQUADS_URL = 'https://fantasyfootball.telegraph.co.uk/json/epl/squads.json';
const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];
type TffSquad = { id:number; name:string; short_name?:string };
type TffPlayer = { id:number; squad_id:number; first_name:string; last_name:string; position:number; cost:number; status?:string; stats?:Record<string, unknown> };

export async function syncTffPlayers() {
  const [playersResponse, squadsResponse] = await Promise.all([
    fetch(TFF_PLAYERS_URL, { cache:'no-store', headers:{ 'User-Agent':'BailsAndGoldiesFantasy/1.0' } }),
    fetch(TFF_SQUADS_URL, { cache:'no-store', headers:{ 'User-Agent':'BailsAndGoldiesFantasy/1.0' } }),
  ]);
  if (!playersResponse.ok || !squadsResponse.ok) throw new Error('Unable to reach the Telegraph Fantasy Football player feed.');
  const [players, squads] = await Promise.all([playersResponse.json() as Promise<TffPlayer[]>, squadsResponse.json() as Promise<TffSquad[]>]);
  const squadById = new Map(squads.map(squad => [squad.id, squad]));
  const syncedAt = new Date().toISOString();
  const rows = players.map(player => {
    const team = squadById.get(player.squad_id);
    return { tff_id:player.id, season:'2025/26', first_name:player.first_name, last_name:player.last_name, display_name:`${player.first_name} ${player.last_name}`.trim(), squad_id:player.squad_id, team_name:team?.name || 'Unknown', team_code:team?.short_name || null, position:positions[player.position] || 'MID', current_price:player.cost || 0, status:player.status || null, raw:player.stats || {}, source_updated_at:syncedAt, updated_at:syncedAt };
  });
  const { error } = await supabaseAdmin().from('tff_players').upsert(rows, { onConflict:'tff_id' });
  if (error) throw error;
  return rows.length;
}
