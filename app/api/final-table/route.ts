import { NextRequest, NextResponse } from 'next/server';
import { scoreBoard } from '@/lib/scoreboard';
import { supabaseAdmin } from '@/lib/supabase-admin';

const season = '2025/26';

async function commissioner(request:NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = supabaseAdmin();
  const { data:auth } = await db.auth.getUser(token);
  if (!auth.user) return null;
  const { data:profile } = await db.from('profiles').select('is_admin').eq('id', auth.user.id).maybeSingle();
  return profile?.is_admin ? auth.user.id : null;
}

export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data:snapshot, error } = await db.from('season_final_standings').select('rows,archived_at').eq('season', season).maybeSingle();
    if (error) throw error;
    if (snapshot) return NextResponse.json({ rows:snapshot.rows, archived:true, archivedAt:snapshot.archived_at }, { headers:{ 'Cache-Control':'no-store' } });
  } catch { /* The page remains usable until the one-time archive migration has been run. */ }
  const live = await scoreBoard('season');
  return NextResponse.json({ rows:live.rows, archived:false }, { headers:{ 'Cache-Control':'no-store' } });
}

export async function POST(request:NextRequest) {
  const userId = await commissioner(request);
  if (!userId) return NextResponse.json({ error:'Commissioner access required.' }, { status:401 });
  try {
    const rows = (await scoreBoard('season')).rows;
    const db = supabaseAdmin();
    const { data, error } = await db.from('season_final_standings').upsert({ season, rows, archived_at:new Date().toISOString(), archived_by:userId }, { onConflict:'season' }).select('archived_at').single();
    if (error) throw error;
    return NextResponse.json({ saved:true, archivedAt:data.archived_at });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to archive the final table. Run the final standings migration first.' }, { status:500 }); }
}
