import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';

type Fixture={id:string;division_id:string;home_squad_id:string;away_squad_id:string;starts_at:string;ends_at:string};
type Membership={squad_id:string;fpl_id:number;acquired_at:string;released_at:string|null};

export async function scoreCupFixtures(fixtures:Fixture[]){
  if(!fixtures.length)return new Map<string,{home:number;away:number}>();
  const db=supabaseAdmin();
  const {data:memberships,error:membershipError}=await db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at');
  if(membershipError)throw membershipError;

  // Uses the same paginated, de-duplicated fixture source as League and My Team.
  // A direct Supabase select is limited to one page, which previously caused cup
  // fixtures later in the season to omit players and return too few points.
  const stats=await loadCustomScoreStats([...new Set((memberships||[]).map(row=>row.fpl_id))]).then(result => result.rows);
  const owned=new Map<number,Membership[]>();
  for(const row of memberships||[])owned.set(row.fpl_id,[...(owned.get(row.fpl_id)||[]),row]);

  const result=new Map<string,{home:number;away:number}>();
  for(const fixture of fixtures){
    let home=0,away=0;
    const start=new Date(fixture.starts_at).getTime(),end=new Date(fixture.ends_at).getTime();
    for(const stat of stats){
      const kickoff=new Date(stat.kickoff_at).getTime();
      if(kickoff<start||kickoff>=end)continue;
      const owner=(owned.get(stat.fpl_id)||[]).find(row=>new Date(row.acquired_at).getTime()<=kickoff&&(!row.released_at||new Date(row.released_at).getTime()>kickoff));
      if(!owner)continue;
      if(owner.squad_id===fixture.home_squad_id)home+=Number(stat.points||0);
      if(owner.squad_id===fixture.away_squad_id)away+=Number(stat.points||0);
    }
    result.set(fixture.id,{home,away});
  }
  return result;
}

export function cupTable(entries:any[],fixtures:Fixture[],scores:Map<string,{home:number;away:number}>){
  const rows=new Map(entries.map(entry=>[entry.squad_id,{squadId:entry.squad_id,team:entry.team,manager:entry.manager,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}]));
  for(const fixture of fixtures){const score=scores.get(fixture.id);if(!score)continue;const home=rows.get(fixture.home_squad_id),away=rows.get(fixture.away_squad_id);if(!home||!away)continue;home.played++;away.played++;home.for+=score.home;home.against+=score.away;away.for+=score.away;away.against+=score.home;if(score.home>score.away){home.wins++;home.points+=3;away.losses++;}else if(score.away>score.home){away.wins++;away.points+=3;home.losses++;}else{home.draws++;away.draws++;home.points++;away.points++;}}
  const headToHead=(a:any,b:any)=>{const games=fixtures.filter(f=>(f.home_squad_id===a.squadId&&f.away_squad_id===b.squadId)||(f.home_squad_id===b.squadId&&f.away_squad_id===a.squadId));let ap=0,bp=0;for(const game of games){const score=scores.get(game.id);if(!score)continue;const as=a.squadId===game.home_squad_id?score.home:score.away,bs=b.squadId===game.home_squad_id?score.home:score.away;if(as>bs)ap+=3;else if(bs>as)bp+=3;else{ap++;bp++;}}return bp-ap;};
  return [...rows.values()].sort((a,b)=>b.points-a.points||headToHead(a,b)||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.team.localeCompare(b.team));
}
