import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncFixtureScores } from '@/lib/fixture-sync';
import { cronAuthorised, leagueMemberFromRequest } from '@/lib/api-auth';
import { addMissingFpl2026Players } from '@/lib/fpl-2026-sync';
import { leaguePosition } from '@/lib/tff-position';

const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];

async function sync(request: NextRequest) {
  if (!cronAuthorised(request) && !(await leagueMemberFromRequest(request))) return NextResponse.json({ error: 'Sign in to update league stats.' }, { status: 401 });
  const db = supabaseAdmin();
  const { data: lockData, error: lockError } = await db.rpc('claim_fpl_sync').single();
  const lock = lockData as { claimed:boolean; message:string; retry_after_seconds:number } | null;
  if (lockError) return NextResponse.json({ error: 'Update protection has not been installed yet. Run the latest Supabase migration.' }, { status: 503 });
  if (!lock?.claimed) return NextResponse.json({ started: false, message: lock?.message || 'An update is already in progress', retryAfter: lock?.retry_after_seconds || 60 }, { status: 202 });
  try {
    const fpl = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { 'User-Agent': 'TheDraftLeague/1.0' } }).then(r => r.json());
    const firstDeadline = fpl.events?.find((event: { id?:number }) => event.id === 1)?.deadline_time || '';
    if (String(firstDeadline).startsWith('2026-')) {
      const officialPlayerCount = Array.isArray(fpl.elements) ? fpl.elements.length : 0;
      const { count:storedPlayerCount, error:countError } = await db.from('fpl_players_2026_27').select('*', { count:'exact', head:true }).eq('season', '2026/27');
      if (countError) throw countError;
      const playersAdded = officialPlayerCount > Number(storedPlayerCount || 0) ? await addMissingFpl2026Players(fpl) : 0;
      const fixtureStatsSynced = await syncFixtureScores();
      await db.rpc('finish_fpl_sync', { success: true, detail: null });
      return NextResponse.json({ season:'2026/27', playersChecked:officialPlayerCount, playersAdded, synced:playersAdded, fixtureStatsSynced, at:new Date().toISOString() });
    }
    const teamNames = new Map<number, string>(fpl.teams.map((team: { id: number; name: string }) => [team.id, team.name] as [number, string]));
    const records = fpl.elements.map((p: Record<string, unknown>) => ({ fpl_id:p.id, web_name:p.web_name, first_name:p.first_name, second_name:p.second_name, team_id:p.team, team_name:teamNames.get(p.team as number), position:leaguePosition({ first_name:p.first_name as string, second_name:p.second_name as string, web_name:p.web_name as string, team_name:teamNames.get(p.team as number), position:positions[p.element_type as number] as string | undefined }), current_price:p.now_cost, photo:`https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png`, status:p.status, raw:{ ...p, team_code:(fpl.teams.find((team: { id:number }) => team.id === p.team) || {}).code }, updated_at:new Date().toISOString() }));
    const { error } = await db.from('fpl_players').upsert(records, { onConflict:'fpl_id' });
    if (error) throw error;
    const currentGameweek = fpl.events?.find((event: { is_current?:boolean }) => event.is_current)?.id;
    if (currentGameweek) {
      const { data: leagues } = await db.from('leagues').select('id');
      await Promise.all((leagues || []).map(league => fetch(new URL('/api/admin/score-gameweek', request.url), { method:'POST', headers:{ 'Content-Type':'application/json', ...(process.env.CRON_SECRET ? { Authorization:`Bearer ${process.env.CRON_SECRET}` } : {}) }, body:JSON.stringify({ leagueId:league.id, gameweek:currentGameweek }), cache:'no-store' })));
    }
    const fixtureStatsSynced = await syncFixtureScores();
    await db.rpc('finish_fpl_sync', { success: true, detail: null });
    return NextResponse.json({ synced:records.length, fixtureStatsSynced, at:new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await db.rpc('finish_fpl_sync', { success:false, detail:message });
    return NextResponse.json({ error:message }, { status:500 });
  }
}

export async function GET(request: NextRequest) { return sync(request); }
export async function POST(request: NextRequest) { return sync(request); }
