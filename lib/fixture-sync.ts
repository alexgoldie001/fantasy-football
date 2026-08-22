import { supabaseAdmin } from '@/lib/supabase-admin';

type ExplainStat={identifier:string;points:number;value:number};
type Explain={fixture:number;stats:ExplainStat[]};
type Fixture={id:number;event:number;kickoff_time:string;started:boolean;finished:boolean;team_h:number;team_a:number;team_h_score:number|null;team_a_score:number|null};
type LiveElement={id:number;stats?:Record<string, unknown>;explain?:Explain[]};
const LEAGUE_SCORING_STATS=['minutes','starts','goals_scored','assists','red_cards','yellow_cards','penalties_missed','own_goals','saves','penalties_saved','clean_sheets','goals_conceded','tackles'] as const;
export async function syncFixtureScores() {
  const [fixturesResponse,bootstrapResponse]=await Promise.all([
    fetch('https://fantasy.premierleague.com/api/fixtures/',{headers:{'User-Agent':'BailsAndGoldiesFantasy/1.0'},cache:'no-store'}),
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/',{headers:{'User-Agent':'BailsAndGoldiesFantasy/1.0'},cache:'no-store'}),
  ]);
  if(!fixturesResponse.ok)throw new Error('Unable to retrieve FPL fixtures.');
  if(!bootstrapResponse.ok)throw new Error('Unable to retrieve FPL players.');
  const [fixtures,bootstrap]=await Promise.all([fixturesResponse.json() as Promise<Fixture[]>,bootstrapResponse.json() as Promise<{elements?:Array<{id:number;team:number}>}>]);
  const playerTeams=new Map((bootstrap.elements||[]).map(player=>[player.id,player.team]));
  const { data:leaguePlayers, error:leaguePlayersError }=await supabaseAdmin().from('fpl_players_2026_27').select('fpl_id,position').eq('season','2026/27');
  if(leaguePlayersError)throw leaguePlayersError;
  const leaguePositions=new Map((leaguePlayers||[]).map(player=>[player.fpl_id,player.position]));
  // FPL's event/live feed contains provisional player scores while a match is
  // underway. Keep those rows, then overwrite them with the final figures on
  // the next refresh after FPL marks the fixture as finished.
  const fixtureMap=new Map<number,Fixture>(fixtures.filter(fixture=>fixture.started&&fixture.event&&fixture.kickoff_time).map(fixture=>[fixture.id,fixture]));
  const gameweeks=[...new Set([...fixtureMap.values()].map(fixture=>fixture.event))]; const records:any[]=[];
  const responses=await Promise.all(gameweeks.map(async gameweek=>{const response=await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`,{headers:{'User-Agent':'BailsAndGoldiesFantasy/1.0'},cache:'no-store'});return response.ok?{gameweek,live:await response.json()}:null;}));
  for(const result of responses){if(!result)continue;for(const element of (result.live.elements||[]) as LiveElement[]){
    const activeExplains=(element.explain||[]).filter(explain=>fixtureMap.has(explain.fixture));
    for(const explain of activeExplains){const fixture=fixtureMap.get(explain.fixture);if(!fixture)continue;const stats=new Map((explain.stats||[]).map(stat=>[stat.identifier,stat]));
      // FPL's fixture explanation only lists stats that affect FPL scoring.
      // Our rules also use starts, tackles, every second save, goals conceded
      // and partial clean sheets, so copy the live player totals for a normal
      // one-fixture Gameweek into this fixture's saved record.
      const fixtureStatsById=new Map((explain.stats||[]).map(stat=>[stat.identifier,stat]));
      if(activeExplains.length===1) for(const identifier of LEAGUE_SCORING_STATS){
        const value=Number(element.stats?.[identifier]||0);
        const existing=fixtureStatsById.get(identifier);
        fixtureStatsById.set(identifier,{identifier,points:existing?.points||0,value});
      }
      const playerTeam=playerTeams.get(element.id);
      const oppositionGoals=playerTeam===fixture.team_h ? Number(fixture.team_a_score||0) : playerTeam===fixture.team_a ? Number(fixture.team_h_score||0) : null;
      const cleanSheetEligible=leaguePositions.get(element.id)==='GK'||leaguePositions.get(element.id)==='DEF';
      if(activeExplains.length===1 && cleanSheetEligible && Number(element.stats?.minutes||0)>0 && oppositionGoals===0){
        const existing=fixtureStatsById.get('clean_sheets');
        fixtureStatsById.set('clean_sheets',{identifier:'clean_sheets',points:existing?.points||0,value:1});
      }
      const fixtureStats=[...fixtureStatsById.values()];
      const total=(explain.stats||[]).reduce((sum,stat)=>sum+Number(stat.points||0),0);const bonus=Number(stats.get('bonus')?.points||0);records.push({fpl_id:element.id,fixture_id:explain.fixture,gameweek:result.gameweek,kickoff_at:fixture.kickoff_time,points_excluding_bonus:total-bonus,goals:Number(stats.get('goals_scored')?.value||0),assists:Number(stats.get('assists')?.value||0),clean_sheets:Number(fixtureStatsById.get('clean_sheets')?.value||0),raw:{...explain,stats:fixtureStats},updated_at:new Date().toISOString()});
    }
  }
  }
  if(records.length){const {error}=await supabaseAdmin().from('fpl_fixture_player_stats').upsert(records,{onConflict:'fpl_id,fixture_id'});if(error)throw error;}
  return records.length;
}
