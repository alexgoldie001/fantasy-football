import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type Commissioner = { id: string; leagueId: string | null };

/** Verifies a real signed-in commissioner, never a browser-supplied shared code. */
export async function commissionerFromRequest(request: NextRequest): Promise<Commissioner | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = supabaseAdmin();
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return null;
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('league_id,is_admin')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError || !profile?.is_admin) return null;
  return { id: auth.user.id, leagueId: profile.league_id };
}

export function cronAuthorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}
