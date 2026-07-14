import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function authorised(code: string | null) {
  return Boolean(process.env.ADMIN_SETUP_CODE) && code === process.env.ADMIN_SETUP_CODE;
}

export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data: league } = await db.from('leagues').select('id,name,max_managers').order('created_at').limit(1).maybeSingle();
    if (!league) return NextResponse.json({ league: null, managers: [] });
    const { data: managers, error } = await db.from('profiles').select('id,display_name,is_admin,squads(name,budget)').eq('league_id', league.id).order('display_name');
    if (error) throw error;
    return NextResponse.json({ league, managers });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load managers.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const { commissionerCode, name, email, teamName, budget = 1000, isAdmin = false } = await request.json();
  if (!authorised(commissionerCode)) return NextResponse.json({ error: 'Incorrect commissioner code.' }, { status: 401 });
  if (!name || !email || !teamName) return NextResponse.json({ error: 'Name, email and team name are required.' }, { status: 400 });
  try {
    const db = supabaseAdmin();
    let { data: league } = await db.from('leagues').select('id,max_managers').order('created_at').limit(1).maybeSingle();
    if (!league) {
      const created = await db.from('leagues').insert({ name: 'The Draft League', season: '2025/26' }).select('id,max_managers').single();
      if (created.error) throw created.error; league = created.data;
    }
    const { count } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('league_id', league.id);
    if ((count || 0) >= league.max_managers) return NextResponse.json({ error: `This league is limited to ${league.max_managers} managers.` }, { status: 400 });
    const temporaryPassword = `Draft${Math.random().toString(36).slice(-7)}!`;
    const auth = await db.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true });
    if (auth.error) throw auth.error;
    const profile = await db.from('profiles').insert({ id: auth.data.user.id, league_id: league.id, display_name: name, is_admin: isAdmin }).select().single();
    if (profile.error) throw profile.error;
    const squad = await db.from('squads').insert({ league_id: league.id, manager_id: auth.data.user.id, name: teamName, budget }).select().single();
    if (squad.error) throw squad.error;
    return NextResponse.json({ manager: { ...profile.data, squad: squad.data }, temporaryPassword });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add manager.' }, { status: 500 }); }
}
