import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculatePoints } from '@/lib/scoring';
import { remainingBudget } from '@/lib/budget';
import { commissionerFromRequest } from '@/lib/api-auth';

function errorMessage(error:unknown) { if (error instanceof Error) return error.message; if (error && typeof error === 'object' && 'message' in error) return String((error as { message:unknown }).message); return 'Unable to save squad amendments.'; }
async function managerLeague(db:ReturnType<typeof supabaseAdmin>, managerId:string) { const { data:profile, error } = await db.from('profiles').select('league_id').eq('id', managerId).maybeSingle(); if (error) throw error; if (!profile) throw new Error('Manager not found.'); return profile.league_id; }
async function repairIncompleteSquad(db:ReturnType<typeof supabaseAdmin>, squadId:string) { const { data:active, error:activeError } = await db.from('squad_players').select('id,fpl_id,purchase_price').eq('squad_id', squadId).is('released_at', null); if (activeError) throw activeError; if ((active || []).length >= 11) return false; const { data:released, error:releasedError } = await db.from('squad_players').select('id,fpl_id,purchase_price').eq('squad_id', squadId).not('released_at', 'is', null).order('released_at', { ascending:false }); if (releasedError) throw releasedError; let restored = false; for (const player of released || []) { if ((active || []).length >= 11) break; const { data:owner, error:ownerError } = await db.from('squad_players').select('id').eq('fpl_id', player.fpl_id).is('released_at', null).maybeSingle(); if (ownerError) throw ownerError; if (owner) continue; const { error } = await db.from('squad_players').update({ released_at:null }).eq('id', player.id); if (error) throw error; active?.push(player); restored = true; } if (restored) { const spent = (active || []).reduce((sum, row) => sum + row.purchase_price, 0); const { error } = await db.from('squads').update({ budget:1000 - spent }).eq('id', squadId); if (error) throw error; } return restored; }

export async function GET(request:NextRequest, { params }:{ params:Promise<{ managerId:string }> }) {
  const commissioner = await commissionerFromRequest(request);
  if (!commissioner) return NextResponse.json({ error:'Commissioner access required.' }, { status:401 });
  try {
    const { managerId } = await params, db = supabaseAdmin(), leagueId = await managerLeague(db, managerId);
    if (leagueId !== commissioner.leagueId) return NextResponse.json({ error:'Commissioner access required.' }, { status:403 });
    const { data:summary, error:summaryError } = await db.from('squads').select('id').eq('manager_id', managerId).eq('league_id', leagueId).maybeSingle();
    if (summaryError) throw summaryError;
    if (!summary) return NextResponse.json({ error:'This manager does not have a squad in this league yet.' }, { status:404 });
    await repairIncompleteSquad(db, summary.id);
    const { data:squad, error } = await db.from('squads').select('id,name,budget,profiles(display_name),squad_players(id,fpl_id,purchase_price,released_at,fpl_players(web_name,first_name,second_name,team_name,position))').eq('id', summary.id).single();
    if (error) throw error;
    return NextResponse.json({ squad }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:errorMessage(error) }, { status:500 }); }
}

export async function PATCH(request:NextRequest, { params }:{ params:Promise<{ managerId:string }> }) {
  const commissioner = await commissionerFromRequest(request);
  if (!commissioner) return NextResponse.json({ error:'Commissioner access required.' }, { status:401 });
  try {
    const { managerId } = await params;
    const { changes } = await request.json() as { changes:{ squadPlayerId:string; price:number; replacementFplId?:number; replacementPrice?:number; effectiveDate?:string }[] };
    if (!Array.isArray(changes) || !changes.length) return NextResponse.json({ error:'Make at least one squad change.' }, { status:400 });
    const db = supabaseAdmin(), leagueId = await managerLeague(db, managerId);
    if (leagueId !== commissioner.leagueId) return NextResponse.json({ error:'Commissioner access required.' }, { status:403 });
    const { data:squad, error:squadError } = await db.from('squads').select('id,league_id,budget').eq('manager_id', managerId).eq('league_id', leagueId).maybeSingle();
    if (squadError) throw squadError;
    if (!squad) return NextResponse.json({ error:'This manager does not have a squad in this league yet.' }, { status:404 });
    await repairIncompleteSquad(db, squad.id);
    let rules:any = null, currentEvent:number | null = null, liveStats = new Map<number, Record<string,number>>();
    if (changes.some(change => Boolean(change.replacementFplId))) {
      const rulesResult = await db.from('scoring_rules').select('*').eq('league_id', squad.league_id).eq('is_active', true).maybeSingle();
      if (rulesResult.error) throw rulesResult.error;
      rules = rulesResult.data;
      try { const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', { cache:'no-store' }); if (bootstrapResponse.ok) { const bootstrap = await bootstrapResponse.json(); currentEvent = bootstrap.events.find((event:any) => event.is_current)?.id || bootstrap.events.find((event:any) => event.is_next)?.id || null; if (currentEvent) { const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${currentEvent}/live/`, { cache:'no-store' }); if (liveResponse.ok) { const live = await liveResponse.json(); liveStats = new Map(live.elements.map((row:any) => [row.id, row.stats])); } } } } catch { /* A pre-gameweek replacement starts on zero points. */ }
    }
    for (const change of changes) {
      if (!Number.isInteger(change.price) || change.price < 0) return NextResponse.json({ error:'Prices must be whole values in tenths of a million.' }, { status:400 });
      const { data:current, error:currentError } = await db.from('squad_players').select('id,fpl_id,purchase_price').eq('id', change.squadPlayerId).eq('squad_id', squad.id).is('released_at', null).single();
      if (currentError || !current) throw currentError || new Error('Squad player not found.');
      if (!change.replacementFplId || change.replacementFplId === current.fpl_id) {
        const { error } = await db.from('squad_players').update({ purchase_price:change.price }).eq('id', current.id);
        if (error) throw error;
        continue;
      }
      const replacementPrice = change.replacementPrice;
      if (typeof replacementPrice !== 'number' || !Number.isInteger(replacementPrice) || replacementPrice < 0) return NextResponse.json({ error:'Enter a valid price for the new player.' }, { status:400 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(change.effectiveDate || '')) return NextResponse.json({ error:'Choose the date this replacement takes effect.' }, { status:400 });
      const effectiveAt = new Date(`${change.effectiveDate}T00:00:00.000Z`);
      if (Number.isNaN(effectiveAt.getTime()) || effectiveAt.getTime() > Date.now()) return NextResponse.json({ error:'Swap dates cannot be in the future.' }, { status:400 });
      const { data:owner } = await db.from('squad_players').select('id').eq('fpl_id', change.replacementFplId).is('released_at', null).maybeSingle();
      if (owner) return NextResponse.json({ error:'That replacement player is already owned by another manager.' }, { status:409 });
      const { data:replacement, error:replacementError } = await db.from('fpl_players').select('position').eq('fpl_id', change.replacementFplId).single();
      if (replacementError || !replacement) throw replacementError || new Error('Replacement player not found.');
      const offset = rules ? calculatePoints((liveStats.get(change.replacementFplId) || {}) as Record<string,number>, replacement.position, rules) : 0;
      const transferAt = effectiveAt.toISOString();
      if (change.price !== current.purchase_price) { const { error } = await db.from('squad_players').update({ purchase_price:change.price }).eq('id', current.id); if (error) throw error; }
      const { error:insertError } = await db.from('squad_players').insert({ squad_id:squad.id, fpl_id:change.replacementFplId, purchase_price:replacementPrice, acquired_at:transferAt, score_offset_gameweek:currentEvent, score_offset_points:offset });
      if (insertError) throw insertError;
      const { error:releaseError } = await db.from('squad_players').update({ released_at:transferAt }).eq('id', current.id);
      if (releaseError) throw releaseError;
    }
    const { data:memberships, error:membershipsError } = await db.from('squad_players').select('id,purchase_price,acquired_at,released_at').eq('squad_id', squad.id);
    if (membershipsError) throw membershipsError;
    const budget = remainingBudget(memberships || []);
    const { error:budgetError } = await db.from('squads').update({ budget }).eq('id', squad.id);
    if (budgetError) throw budgetError;
    return NextResponse.json({ saved:true, budget });
  } catch (error) { return NextResponse.json({ error:`Unable to save squad amendments: ${errorMessage(error)}` }, { status:500 }); }
}
