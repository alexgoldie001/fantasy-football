import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const season = '2025/26';

export async function GET() {
  try {
    const { data:snapshot, error } = await supabaseAdmin().from('season_final_standings').select('rows,archived_at').eq('season', season).maybeSingle();
    if (error) throw error;
    if (!snapshot) return NextResponse.json({ error:'The 2025/26 final-table archive has not been stored yet.' }, { status:404 });
    return NextResponse.json({ rows:snapshot.rows, archived:true, archivedAt:snapshot.archived_at }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load the archived final table.' }, { status:500 }); }
}
