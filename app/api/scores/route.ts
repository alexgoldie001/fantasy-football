import { NextRequest,NextResponse } from 'next/server';
import { scoreBoard } from '@/lib/scoreboard';
import { syncFixtureScores } from '@/lib/fixture-sync';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{if(request.nextUrl.searchParams.get('sync')==='1'){return NextResponse.json({synced:await syncFixtureScores()},{headers:{'Cache-Control':'no-store'}});}const period=(request.nextUrl.searchParams.get('period')||'season') as 'season'|'week'|'month';const key=request.nextUrl.searchParams.get('key')||undefined;return NextResponse.json(await scoreBoard(period,key),{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to calculate scores.'},{status:500});}}
