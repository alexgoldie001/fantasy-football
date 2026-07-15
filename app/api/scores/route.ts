import { NextRequest,NextResponse } from 'next/server';
import { scoreBoard } from '@/lib/scoreboard';
import { syncFixtureScores } from '@/lib/fixture-sync';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{const period=(request.nextUrl.searchParams.get('period')||'season') as 'season'|'week'|'month';const key=request.nextUrl.searchParams.get('key')||undefined;let scores=await scoreBoard(period,key);if(!scores.periods.weeks.length){await syncFixtureScores();scores=await scoreBoard(period,key);}return NextResponse.json(scores,{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to calculate scores.'},{status:500});}}
