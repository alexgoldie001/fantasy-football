import { NextResponse } from 'next/server';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(_:Request, { params }:{ params:Promise<{ playerId:string }> }) {
  try {
    const { playerId } = await params;
    const fplId = Number(playerId);
    if (!Number.isInteger(fplId)) return NextResponse.json({ error:'Player not found.' }, { status:404 });
    const db = supabaseAdmin();
    const [{ data:player, error:playerError }, custom] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,team_name,position').eq('fpl_id', fplId).single(),
      loadCustomScoreStats([fplId]),
    ]);
    if (playerError) throw playerError;
    const weeks = custom.rows.sort((a, b) => a.gameweek - b.gameweek).map(stat => ({ gameweek:stat.gameweek, date:stat.kickoff_at, points:stat.points, goals:stat.goals, assists:stat.assists, cleanSheets:stat.clean_sheets }));
    return NextResponse.json({ player, points:weeks.reduce((total, row) => total + row.points, 0), weeks, scoreSource:'2025/26 Players scores' }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load player scores.' }, { status:500 }); }
}