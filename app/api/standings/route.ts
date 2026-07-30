import { NextResponse } from 'next/server';
import { scoreBoard } from '@/lib/scoreboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { rows } = await scoreBoard('season');
    return NextResponse.json({ standings:rows.map(row => ({ id:row.id, name:row.team, manager:row.manager, points:row.points, week:row.weekPoints, rank:row.rank, change:row.previousRank === row.rank ? '-' : row.previousRank > row.rank ? `+${row.previousRank - row.rank}` : String(row.previousRank - row.rank) })) }, { headers:{ 'Cache-Control':'no-store, max-age=0' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load standings.' }, { status:500 }); }
}