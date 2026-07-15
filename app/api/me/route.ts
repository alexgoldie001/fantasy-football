import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const db = supabaseAdmin();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const { data: profile, error } = await db.from('profiles').select('display_name,is_admin,squads(id,name,budget)').eq('id', auth.user.id).single();
    if (error) throw error;
    return NextResponse.json({ user: { email: auth.user.email, name: profile.display_name, isAdmin: profile.is_admin, squad: profile.squads?.[0] || null } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load account.' }, { status: 500 }); }
}
