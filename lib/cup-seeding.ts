import { loadSeasonFixtureStats } from '@/lib/fixture-stats';
import { supabaseAdmin } from '@/lib/supabase-admin';

const seasonStart='2025-08-01T00:00:00.000Z';
const seedingCutoff='2026-01-01T00:30:00.000Z';

/**
 * The January seeding table is the League-table score through the cup cut-off.
 * It deliberately loads the canonical fixture data once: the former approach
 * built five separate monthly League tables, making the cup page unreliable.
 */
export async function cupSeedingRows(){
  const db=supabaseAdmin();
  const [{data:memberships,error:membershipError},{data:squads,error:squadError},{data:profiles,error:profileError}]=await Promise.all([
    db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at'),
    db.from('squads').select('id,name,manager_id'),
    db.from('profiles').select('id,display_name'),
  ]);
  if(membershipError||squadError||profileError)throw membershipError||squadError||profileError;

  const playerIds=[...new Set((memberships||[]).map(row=>row.fpl_id))];
  const stats=await loadSeasonFixtureStats(playerIds);
  const profilesById=new Map((profiles||[]).map(profile=>[profile.id,profile.display_name]));
  const ownedByPlayer=new Map<number,any[]>();
  for(const membership of memberships||[])ownedByPlayer.set(membership.fpl_id,[...(ownedByPlayer.get(membership.fpl_id)||[]),membership]);

  const totals=new Map((squads||[]).map(squad=>[squad.id,{id:squad.id,team:squad.name,manager:profilesById.get(squad.manager_id)||'Manager',points:0}]));
  for(const stat of stats){
    if(stat.kickoff_at<seasonStart||stat.kickoff_at>=seedingCutoff)continue;
    const owner=(ownedByPlayer.get(stat.fpl_id)||[]).find(membership=>membership.acquired_at<=stat.kickoff_at&&(!membership.released_at||membership.released_at>stat.kickoff_at));
    const row=owner&&totals.get(owner.squad_id);
    if(row)row.points+=Number(stat.points_excluding_bonus||0);
  }
  return [...totals.values()].sort((a,b)=>b.points-a.points||a.team.localeCompare(b.team)).map((row,index)=>({...row,rank:index+1}));
}
