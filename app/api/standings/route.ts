import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin().from('profiles').select('id,display_name,squads(name,squad_players(released_at,fpl_players(raw)))');
    if (error) throw error;
    const rows = (data || []).map((profile: any) => {
      const squad = profile.squads?.[0];
      const activePlayers = (squad?.squad_players || []).filter((player: any) => !player.released_at);
      const points = activePlayers.reduce((total: number, player: any) => total + Number(player.fpl_players?.raw?.total_points || 0) - Number(player.fpl_players?.raw?.bonus || 0), 0);
      return { name: squad?.name || 'Team pending', manager: profile.display_name, points, week: 0 };
    }).sort((a, b) => b.points - a.points || b.week - a.week).map((row, index) => ({ ...row, rank: index + 1, change: '—' }));
    return NextResponse.json({ standings: rows });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load standings.' }, { status: 500 }); }
}
