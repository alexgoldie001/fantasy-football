import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
export const dynamic='force-dynamic';
export async function GET(){try{const {data,error}=await supabaseAdmin().from('profiles').select('display_name,squads(name),gameweek_scores(gameweek,points)').order('display_name');if(error)throw error;return NextResponse.json({rows:(data||[]).map((profile:any)=>({manager:profile.display_name,team:profile.squads?.[0]?.name||'Team pending',scores:Object.fromEntries((profile.gameweek_scores||[]).map((score:any)=>[score.gameweek,score.points]))}))});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load gameweek table.'},{status:500});}}
