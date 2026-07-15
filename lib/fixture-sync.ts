import { supabaseAdmin } from '@/lib/supabase-admin';

type ExplainStat={identifier:string;points:number;value:number};
type Explain={fixture:number;stats:ExplainStat[]};
type Fixture={id:number;event:number;kickoff_time:string;finished:boolean};
export async function syncFixtureScores() {
  const fixturesResponse=await fetch('https://fantasy.premierleague.com/api/fixtures/',{headers:{'User-Agent':'BailsAndGoldiesFantasy/1.0'},cache:'no-store'});
  if(!fixturesResponse.ok)throw new Error('Unable to retrieve FPL fixtures.');
  const fixtures=(await fixturesResponse.json()) as Fixture[]; const fixtureMap=new Map<number,Fixture>(fixtures.filter(fixture=>fixture.finished&&fixture.event&&fixture.kickoff_time).map(fixture=>[fixture.id,fixture]));
  const gameweeks=[...new Set([...fixtureMap.values()].map(fixture=>fixture.event))]; const records:any[]=[];
  const responses=await Promise.all(gameweeks.map(async gameweek=>{const response=await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`,{headers:{'User-Agent':'BailsAndGoldiesFantasy/1.0'},cache:'no-store'});return response.ok?{gameweek,live:await response.json()}:null;}));
  for(const result of responses){if(!result)continue;for(const element of result.live.elements||[]){for(const explain of (element.explain||[]) as Explain[]){const fixture=fixtureMap.get(explain.fixture);if(!fixture)continue;const stats=new Map((explain.stats||[]).map(stat=>[stat.identifier,stat]));const total=(explain.stats||[]).reduce((sum,stat)=>sum+Number(stat.points||0),0);const bonus=Number(stats.get('bonus')?.points||0);records.push({fpl_id:element.id,fixture_id:explain.fixture,gameweek:result.gameweek,kickoff_at:fixture.kickoff_time,points_excluding_bonus:total-bonus,goals:Number(stats.get('goals_scored')?.value||0),assists:Number(stats.get('assists')?.value||0),clean_sheets:Number(stats.get('clean_sheets')?.value||0),raw:explain,updated_at:new Date().toISOString()});}}}
  if(records.length){const {error}=await supabaseAdmin().from('fpl_fixture_player_stats').upsert(records,{onConflict:'fpl_id,fixture_id'});if(error)throw error;}
  return records.length;
}
