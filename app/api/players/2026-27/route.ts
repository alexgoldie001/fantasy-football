import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncFpl2026Players } from '@/lib/fpl-2026-sync';

export const dynamic = 'force-dynamic';
const stat = (raw:Record<string, unknown>, key:string) => Number(raw[key] || 0);

export async function GET() {
  try {
    const db = supabaseAdmin();
    let { data: players, error } = await db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price,raw').eq('season', '2026/27').order('web_name');
    if (error) throw error;
    if (!(players || []).length) {
      await syncFpl2026Players();
      const refreshed = await db.from('fpl_players_2026_27').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price,raw').eq('season', '2026/27').order('web_name');
      if (refreshed.error) throw refreshed.error;
      players = refreshed.data;
    }
    return NextResponse.json({ season:'2026/27', players:(players || []).map((player:any) => {
      const raw = player.raw || {};
      const fullName = `${player.first_name || ''} ${player.second_name || ''}`.trim() || player.web_name;
      return { id:player.fpl_id, name:player.web_name, fullName, lookupLabel:`${fullName} · ${player.team_name}`, team:player.team_name, position:player.position, price:player.current_price, owner:null, points:stat(raw, 'total_points') - stat(raw, 'bonus'), cleanSheets:stat(raw, 'clean_sheets'), defensiveContribution:stat(raw, 'defensive_contribution'), assists:stat(raw, 'assists'), goals:stat(raw, 'goals_scored'), penaltiesMissed:stat(raw, 'penalties_missed'), penaltiesSaved:stat(raw, 'penalties_saved'), yellowCards:stat(raw, 'yellow_cards'), redCards:stat(raw, 'red_cards') };
    }) });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load 2026/27 players.' }, { status:500 }); }
}
