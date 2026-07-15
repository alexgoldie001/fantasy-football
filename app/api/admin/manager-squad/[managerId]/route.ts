import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculatePoints } from '@/lib/scoring';

async function authorised(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const db = supabaseAdmin();
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return false;
  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', auth.user.id).maybeSingle();
  return Boolean(profile?.is_admin);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ managerId:string }> }) {
  if (!(await authorised(request))) return NextResponse.json({ error:'Commissioner access required.' },{status:401});
  const { managerId } = await params;
  try { const db=supabaseAdmin(); const { data:squad,error }=await db.from('squads').select('id,name,budget,profiles(display_name),squad_players(id,fpl_id,purchase_price,fpl_players(web_name,first_name,second_name,team_name,position))').eq('manager_id',managerId).single(); if(error)throw error; return NextResponse.json({squad}); } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load squad.'},{status:500});}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ managerId:string }> }) {
  if (!(await authorised(request))) return NextResponse.json({ error:'Commissioner access required.' },{status:401});
  const { managerId }=await params; const { changes }=await request.json() as { changes:{ squadPlayerId:string; price:number; replacementFplId?:number }[] };
  if(!Array.isArray(changes)) return NextResponse.json({error:'Invalid squad changes.'},{status:400});
  try { const db=supabaseAdmin(); const {data:squad,error:squadError}=await db.from('squads').select('id,league_id,budget').eq('manager_id',managerId).single(); if(squadError||!squad)throw squadError||new Error('Squad not found.'); const {data:rules}=await db.from('scoring_rules').select('*').eq('league_id',squad.league_id).eq('is_active',true).maybeSingle();
    const bootstrap=await fetch('https://fantasy.premierleague.com/api/bootstrap-static/',{cache:'no-store'}).then(r=>r.json()); const currentEvent=bootstrap.events.find((event:any)=>event.is_current)?.id || bootstrap.events.find((event:any)=>event.is_next)?.id || 1; const live=await fetch(`https://fantasy.premierleague.com/api/event/${currentEvent}/live/`,{cache:'no-store'}).then(r=>r.json()); const liveStats=new Map(live.elements.map((row:any)=>[row.id,row.stats]));
    for(const change of changes){if(!Number.isInteger(change.price)||change.price<0) return NextResponse.json({error:'Prices must be whole values in tenths of a million.'},{status:400}); const {data:current,error:currentError}=await db.from('squad_players').select('id,fpl_id').eq('id',change.squadPlayerId).eq('squad_id',squad.id).is('released_at',null).single(); if(currentError||!current)throw currentError||new Error('Squad player not found.');
      if(change.replacementFplId && change.replacementFplId!==current.fpl_id){const {data:owner}=await db.from('squad_players').select('id').eq('fpl_id',change.replacementFplId).is('released_at',null).maybeSingle();if(owner)return NextResponse.json({error:'A replacement player is already owned by another manager.'},{status:409}); const {data:replacement,error:replacementError}=await db.from('fpl_players').select('position').eq('fpl_id',change.replacementFplId).single();if(replacementError||!replacement)throw replacementError||new Error('Replacement player not found.'); const offset=rules?calculatePoints((liveStats.get(change.replacementFplId)||{}) as Record<string,number>,replacement.position,rules):0; await db.from('squad_players').update({released_at:new Date().toISOString()}).eq('id',current.id); const {error:insertError}=await db.from('squad_players').insert({squad_id:squad.id,fpl_id:change.replacementFplId,purchase_price:change.price,score_offset_gameweek:currentEvent,score_offset_points:offset});if(insertError)throw insertError;}else{const {error:updateError}=await db.from('squad_players').update({purchase_price:change.price}).eq('id',current.id);if(updateError)throw updateError;}}
    const {data:active}=await db.from('squad_players').select('purchase_price').eq('squad_id',squad.id).is('released_at',null); const spent=(active||[]).reduce((sum,row)=>sum+row.purchase_price,0); await db.from('squads').update({budget:1000-spent}).eq('id',squad.id); return NextResponse.json({saved:true,budget:1000-spent});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to save squad amendments.'},{status:500});}
}
