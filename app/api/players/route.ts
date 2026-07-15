import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];
const stat = (raw: Record<string, unknown>, key: string) => Number(raw[key] || 0);
async function loadPlayers() {
  const db = supabaseAdmin();
  let result = await db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price,raw').order('web_name');
  if (result.error) throw result.error;
  if ((result.data || []).length) return result.data;
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { 'User-Agent': 'BailsAndGoldiesFantasy/1.0' }, cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to reach the official FPL player feed.');
  const fpl = await response.json();
  const names = new Map(fpl.teams.map((team: { id:number; name:string }) => [team.id, team.name]));
  const records = fpl.elements.map((p: Record<string, any>) => ({ fpl_id:p.id, web_name:p.web_name, first_name:p.first_name, second_name:p.second_name, team_id:p.team, team_name:names.get(p.team), position:positions[p.element_type], current_price:p.now_cost, photo:p.photo, status:p.status, raw:p, updated_at:new Date().toISOString() }));
  const { error } = await db.from('fpl_players').upsert(records, { onConflict:'fpl_id' });
  if (error) throw error;
  return records;
}
export async function GET() {
  try {
    const db = supabaseAdmin();
    const [players, ownershipResult] = await Promise.all([loadPlayers(), db.from('squad_players').select('fpl_id,squads(name)').is('released_at', null)]);
    if (ownershipResult.error) throw ownershipResult.error;
    const owners = new Map((ownershipResult.data || []).map((row: any) => [row.fpl_id, row.squads?.name || null]));
    return NextResponse.json({ players: players.map((player: any) => { const raw = player.raw as Record<string, unknown>; return { id: player.fpl_id, name: player.web_name, fullName: `${player.first_name || ''} ${player.second_name || ''}`.trim() || player.web_name, team: player.team_name, position: player.position, price: player.current_price, owner: owners.get(player.fpl_id) || null, points: stat(raw, 'total_points') - stat(raw, 'bonus'), starts: stat(raw, 'starts'), cleanSheets: stat(raw, 'clean_sheets'), defensiveContribution: stat(raw, 'defensive_contribution'), assists: stat(raw, 'assists'), goals: stat(raw, 'goals_scored'), penaltiesMissed: stat(raw, 'penalties_missed'), penaltiesSaved: stat(raw, 'penalties_saved'), yellowCards: stat(raw, 'yellow_cards'), redCards: stat(raw, 'red_cards') }; }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load players.' }, { status: 500 }); }
}
