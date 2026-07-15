import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const positions = ['', 'GK', 'DEF', 'MID', 'FWD'];
// Protect this endpoint with CRON_SECRET before adding it to Vercel Cron.
export async function POST(request: NextRequest) {
  const cronAuthorised = Boolean(process.env.CRON_SECRET) && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const commissionerAuthorised = Boolean(process.env.ADMIN_SETUP_CODE) && request.headers.get('x-commissioner-code') === process.env.ADMIN_SETUP_CODE;
  if (!cronAuthorised && !commissionerAuthorised) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const fpl = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { headers: { 'User-Agent': 'TheDraftLeague/1.0' } }).then(r => r.json());
    const teamNames = new Map(fpl.teams.map((team: { id: number; name: string }) => [team.id, team.name]));
    const records = fpl.elements.map((p: Record<string, unknown>) => ({
      fpl_id: p.id, web_name: p.web_name, first_name: p.first_name, second_name: p.second_name,
      team_id: p.team, team_name: teamNames.get(p.team as number), position: positions[p.element_type as number],
      current_price: p.now_cost, photo: p.photo, status: p.status, raw: p, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin().from('fpl_players').upsert(records, { onConflict: 'fpl_id' });
    if (error) throw error;
    const currentGameweek = fpl.events?.find((event: { is_current?: boolean }) => event.is_current)?.id;
    if (currentGameweek) {
      const { data: leagues } = await supabaseAdmin().from('leagues').select('id');
      await Promise.all((leagues || []).map(league => fetch(new URL('/api/admin/score-gameweek', request.url), {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}) }, body: JSON.stringify({ leagueId: league.id, gameweek: currentGameweek }), cache: 'no-store',
      })));
    }
    return NextResponse.json({ synced: records.length, at: new Date().toISOString() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 }); }
}
