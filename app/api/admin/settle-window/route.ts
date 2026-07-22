import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { commissionerFromRequest, cronAuthorised } from '@/lib/api-auth';

// Commissioner endpoint: winners are chosen by max bid, then the *lower* league rank wins a tie.
export async function POST(request: NextRequest) {
  if (!cronAuthorised(request) && !(await commissionerFromRequest(request))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { windowId } = await request.json(); if (!windowId) return NextResponse.json({ error: 'windowId is required' }, { status: 400 });
  const db = supabaseAdmin();
  const { data: bids, error } = await db.from('transfer_bids').select('*, profiles!transfer_bids_manager_id_fkey(display_name), gameweek_scores(points,total_points)').eq('window_id', windowId).eq('status', 'submitted');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const groups = new Map<number, typeof bids>();
  for (const bid of bids || []) groups.set(bid.buy_fpl_id, [...(groups.get(bid.buy_fpl_id) || []), bid]);
  const results: string[] = [];
  for (const [, contenders] of groups) {
    // Descending bid. On a tie, lower total (lower league position) is intentionally first.
    contenders.sort((a, b) => b.maximum_bid - a.maximum_bid || (a.gameweek_scores?.[0]?.total_points || 0) - (b.gameweek_scores?.[0]?.total_points || 0));
    const winner = contenders[0];
    const { data: squad } = await db.from('squads').select('id,budget').eq('manager_id', winner.manager_id).single();
    if (!squad || squad.budget < winner.maximum_bid || winner.maximum_bid % 5 !== 0) { await db.from('transfer_bids').update({ status: 'invalid' }).eq('id', winner.id); continue; }
    const { data: old } = await db.from('squad_players').select('purchase_price').eq('squad_id', squad.id).eq('fpl_id', winner.sell_fpl_id).is('released_at', null).single();
    if (!old) { await db.from('transfer_bids').update({ status: 'invalid' }).eq('id', winner.id); continue; }
    const credit = Math.floor(old.purchase_price * .5);
    await db.from('squad_players').update({ released_at: new Date().toISOString() }).eq('squad_id', squad.id).eq('fpl_id', winner.sell_fpl_id).is('released_at', null);
    await db.from('squad_players').insert({ squad_id: squad.id, fpl_id: winner.buy_fpl_id, purchase_price: winner.maximum_bid });
    await db.from('squads').update({ budget: squad.budget - winner.maximum_bid + credit }).eq('id', squad.id);
    await db.from('transfer_bids').update({ status: 'won', winning_bid: winner.maximum_bid }).eq('id', winner.id);
    await db.from('transfer_bids').update({ status: 'lost' }).in('id', contenders.slice(1).map(x => x.id));
    results.push(`Bid ${winner.id} settled`);
  }
  await db.from('transfer_windows').update({ status: 'complete' }).eq('id', windowId);
  return NextResponse.json({ settled: results });
}
