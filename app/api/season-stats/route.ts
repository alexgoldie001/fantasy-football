import { NextResponse } from 'next/server';
import { seasonStats } from '@/lib/season-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return NextResponse.json(await seasonStats(), { headers:{ 'Cache-Control':'no-store' } }); }
  catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to calculate season statistics.' }, { status:500 }); }
}
