import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data, error } = await supabaseAdmin().from('squads').select('name,budget,profiles(display_name),squad_players(purchase_price,released_at,fpl_players(web_name,team_name,position,raw))');
    if (error) throw error;
    const squad: any = (data || []).find((row: any) => slugify(row.name) === slug);
    if (!squad) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    const players = (squad.squad_players || []).filter((player: any) => !player.released_at).map((player: any) => ({ name: player.fpl_players?.web_name, team: player.fpl_players?.team_name, position: player.fpl_players?.position, points: Number(player.fpl_players?.raw?.total_points || 0) - Number(player.fpl_players?.raw?.bonus || 0), price: player.purchase_price }));
    return NextResponse.json({ name: squad.name, manager: squad.profiles?.display_name, budget: squad.budget, players });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load team.' }, { status: 500 }); }
}
