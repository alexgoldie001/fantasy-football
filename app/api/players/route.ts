import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const stat = (raw: Record<string, unknown>, key: string) => Number(raw[key] || 0);

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: players, error }, { data: ownership }] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,team_name,position,current_price,raw').order('web_name'),
      db.from('squad_players').select('fpl_id,squads(name)').is('released_at', null),
    ]);
    if (error) throw error;
    const owners = new Map((ownership || []).map((row: any) => [row.fpl_id, row.squads?.name || null]));
    return NextResponse.json({ players: (players || []).map(player => {
      const raw = player.raw as Record<string, unknown>;
      return { id: player.fpl_id, name: player.web_name, team: player.team_name, position: player.position, price: player.current_price, owner: owners.get(player.fpl_id) || null,
        points: stat(raw, 'total_points') - stat(raw, 'bonus'), starts: stat(raw, 'starts'), cleanSheets: stat(raw, 'clean_sheets'), defensiveContribution: stat(raw, 'defensive_contribution'), assists: stat(raw, 'assists'), goals: stat(raw, 'goals_scored'), penaltiesMissed: stat(raw, 'penalties_missed'), penaltiesSaved: stat(raw, 'penalties_saved'), yellowCards: stat(raw, 'yellow_cards'), redCards: stat(raw, 'red_cards') };
    }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load players.' }, { status: 500 }); }
}
