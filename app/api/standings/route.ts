import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin().from('profiles').select('id,display_name,squads(name),gameweek_scores(gameweek,points,total_points)');
    if (error) throw error;
    const rows = (data || []).map((profile: any) => {
      const scores = [...(profile.gameweek_scores || [])].sort((a, b) => b.gameweek - a.gameweek);
      const latest = scores[0];
      return { name: profile.squads?.[0]?.name || 'Team pending', manager: profile.display_name, points: latest?.total_points || 0, week: latest?.points || 0 };
    }).sort((a, b) => b.points - a.points || b.week - a.week).map((row, index) => ({ ...row, rank: index + 1, change: '—' }));
    return NextResponse.json({ standings: rows });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load standings.' }, { status: 500 }); }
}
