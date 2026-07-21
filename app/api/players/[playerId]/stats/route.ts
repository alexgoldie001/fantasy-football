import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }:{ params:Promise<{ playerId:string }> }) {
  try {
    const { playerId } = await params;
    const fplId = Number(playerId);
    if (!Number.isInteger(fplId)) return NextResponse.json({ error:'Player not found.' }, { status:404 });
    const db = supabaseAdmin();
    const [{ data:player, error:playerError }, { data:stats, error:statsError }] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,team_name,position').eq('fpl_id', fplId).single(),
      db.from('fpl_fixture_player_stats').select('gameweek,kickoff_at,points_excluding_bonus,goals,assists,clean_sheets').eq('fpl_id', fplId).order('gameweek').order('kickoff_at'),
    ]);
    if (playerError) throw playerError;
    if (statsError) throw statsError;
    const weeks = new Map<number, { gameweek:number; date:string; points:number; goals:number; assists:number; cleanSheets:number }>();
    for (const stat of stats || []) {
      const current = weeks.get(stat.gameweek) || { gameweek:stat.gameweek, date:stat.kickoff_at, points:0, goals:0, assists:0, cleanSheets:0 };
      current.points += Number(stat.points_excluding_bonus || 0);
      current.goals += Number(stat.goals || 0);
      current.assists += Number(stat.assists || 0);
      current.cleanSheets += Number(stat.clean_sheets || 0);
      weeks.set(stat.gameweek, current);
    }
    const rows = [...weeks.values()];
    return NextResponse.json({ player, points:rows.reduce((total, row) => total + row.points, 0), weeks:rows }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load player scores.' }, { status:500 });
  }
}
