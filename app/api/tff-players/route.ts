import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncTffPlayers } from '@/lib/tff-sync';

export const dynamic = 'force-dynamic';
const value = (raw:Record<string, unknown>, key:string) => Number(raw[key] || 0);

export async function GET() {
  try {
    const db = supabaseAdmin();
    let { data: players, error } = await db.from('tff_players').select('tff_id,display_name,team_name,team_code,position,current_price,raw').eq('season', '2025/26').order('display_name');
    if (error) throw error;
    if (!(players || []).length) {
      await syncTffPlayers();
      const refreshed = await db.from('tff_players').select('tff_id,display_name,team_name,team_code,position,current_price,raw').eq('season', '2025/26').order('display_name');
      if (refreshed.error) throw refreshed.error;
      players = refreshed.data;
    }
    return NextResponse.json({ season:'2025/26', players:(players || []).map((player:any) => {
      const raw = player.raw || {};
      return { id:player.tff_id, name:player.display_name, team:player.team_name, teamCode:player.team_code || '', position:player.position, price:player.current_price, points:value(raw, 'total_points'), starts:value(raw, 'starting11'), cleanSheets:value(raw, 'full_clean_sheets'), partialCleanSheets:value(raw, 'partial_clean_sheets'), assists:value(raw, 'assists'), goals:value(raw, 'goals'), tackles:value(raw, 'tackles'), saves:value(raw, 'saves'), goalsConceded:value(raw, 'goals_conceded'), yellowCards:value(raw, 'yellow_cards'), redCards:value(raw, 'red_cards'), penaltiesMissed:value(raw, 'missed_pen'), penaltiesSaved:value(raw, 'saved_pen') };
    }) });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load TFF player statistics.' }, { status:500 }); }
}
