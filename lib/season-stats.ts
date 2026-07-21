import { supabaseAdmin } from '@/lib/supabase-admin';

type FixtureStat = { fpl_id:number; kickoff_at:string; points_excluding_bonus:number; goals:number; assists:number };
type Period = { label:string; start:string; end:string };
type RecordRow = { id:string; category:string; subject:string; value:string; detail:string; playerId?:number };

const weeks:Period[] = Array.from({ length:42 }, (_, index) => { const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 604800000); return { label:`Week ${index + 1}`, start:start.toISOString(), end:new Date(start.getTime() + 604800000).toISOString() }; });
const months:Period[] = ['August','September','October','November','December','January','February','March','April','May'].map((name, index) => { const year = index < 5 ? 2025 : 2026, month = index < 5 ? index + 7 : index - 5; return { label:`${name} ${year}`, start:new Date(Date.UTC(year, month, 1)).toISOString(), end:new Date(Date.UTC(year, month + 1, 1)).toISOString() }; });

function topEntry(values:Map<string, number>, names:Map<string, string>) { const winner = [...values.entries()].sort((a, b) => b[1] - a[1] || (names.get(a[0]) || '').localeCompare(names.get(b[0]) || ''))[0]; return winner ? { name:names.get(winner[0]) || '—', value:winner[1], key:winner[0] } : { name:'—', value:0, key:'' }; }

export async function seasonStats() {
  const db = supabaseAdmin();
  const [{ data:memberships, error:membershipsError }, { data:squads, error:squadsError }, { data:players, error:playersError }] = await Promise.all([db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at'), db.from('squads').select('id,name'), db.from('fpl_players').select('fpl_id,web_name,position')]);
  if (membershipsError) throw membershipsError; if (squadsError) throw squadsError; if (playersError) throw playersError;
  const playerIds = [...new Set((memberships || []).map((member:any) => member.fpl_id))];
  const { count, error:countError } = playerIds.length ? await db.from('fpl_fixture_player_stats').select('*', { count:'exact', head:true }).in('fpl_id', playerIds) : { count:0, error:null };
  if (countError) throw countError;
  const pages = await Promise.all(Array.from({ length:Math.ceil((count || 0) / 1000) }, (_, page) => db.from('fpl_fixture_player_stats').select('fpl_id,kickoff_at,points_excluding_bonus,goals,assists').in('fpl_id', playerIds).range(page * 1000, page * 1000 + 999)));
  const stats = pages.flatMap(page => { if (page.error) throw page.error; return page.data || []; }) as FixtureStat[];
  const squadNames = new Map((squads || []).map((squad:any) => [squad.id, squad.name]));
  const playerInfo = new Map((players || []).map((player:any) => [player.fpl_id, player]));
  const playerNames = new Map((players || []).map((player:any) => [player.fpl_id, player.web_name]));
  const membershipsByPlayer = new Map<number, any[]>(); for (const member of memberships || []) membershipsByPlayer.set(member.fpl_id, [...(membershipsByPlayer.get(member.fpl_id) || []), member]);
  const ownedStats = stats.flatMap(stat => { const owner = (membershipsByPlayer.get(stat.fpl_id) || []).find(member => member.acquired_at <= stat.kickoff_at && (!member.released_at || member.released_at > stat.kickoff_at)); return owner ? [{ stat, owner }] : []; });
  const teamPeriod = (periods:Period[]) => { const values = new Map<string, number>(), names = new Map<string, string>(); for (const { stat, owner } of ownedStats) for (const period of periods) if (stat.kickoff_at >= period.start && stat.kickoff_at < period.end) { const key = `${period.label}|${owner.squad_id}`; values.set(key, (values.get(key) || 0) + Number(stat.points_excluding_bonus || 0)); names.set(key, `${squadNames.get(owner.squad_id) || 'Team'} · ${period.label}`); } return topEntry(values, names); };
  const playerPeriod = (periods:Period[]) => { const values = new Map<string, number>(), names = new Map<string, string>(); for (const { stat } of ownedStats) for (const period of periods) if (stat.kickoff_at >= period.start && stat.kickoff_at < period.end) { const key = `${period.label}|${stat.fpl_id}`; values.set(key, (values.get(key) || 0) + Number(stat.points_excluding_bonus || 0)); names.set(key, `${playerNames.get(stat.fpl_id) || 'Player'} · ${period.label}`); } return topEntry(values, names); };
  const playerTotal = (field:'goals'|'assists'|'points_excluding_bonus', goalkeeperOnly = false) => { const values = new Map<string, number>(); for (const { stat } of ownedStats) { if (goalkeeperOnly && playerInfo.get(stat.fpl_id)?.position !== 'GK') continue; const id = String(stat.fpl_id); values.set(id, (values.get(id) || 0) + Number(stat[field] || 0)); } return topEntry(values, new Map([...playerNames].map(([id, name]) => [String(id), name]))); };
  const topTeamWeek = teamPeriod(weeks), topTeamMonth = teamPeriod(months), topPlayerWeek = playerPeriod(weeks), topPlayerMonth = playerPeriod(months), topGoals = playerTotal('goals'), topAssists = playerTotal('assists'), topGoalkeeper = playerTotal('points_excluding_bonus', true);
  const playerId = (key:string) => Number(key.split('|').pop()) || undefined;
  const records:RecordRow[] = [
    { id:'team-week', category:'Highest manager team weekly score', subject:topTeamWeek.name, value:`${topTeamWeek.value} pts`, detail:'League-specific fixture points' },
    { id:'team-month', category:'Highest manager team monthly score', subject:topTeamMonth.name, value:`${topTeamMonth.value} pts`, detail:'League-specific fixture points' },
    { id:'player-week', category:'Highest individual player weekly score', subject:topPlayerWeek.name, value:`${topPlayerWeek.value} pts`, detail:'While owned in this league', playerId:playerId(topPlayerWeek.key) },
    { id:'player-month', category:'Highest individual player monthly score', subject:topPlayerMonth.name, value:`${topPlayerMonth.value} pts`, detail:'While owned in this league', playerId:playerId(topPlayerMonth.key) },
    { id:'goals', category:'Most goals by a league-owned player', subject:topGoals.name, value:`${topGoals.value} goals`, detail:'Only goals scored while league-owned', playerId:playerId(topGoals.key) },
    { id:'assists', category:'Most assists by a league-owned player', subject:topAssists.name, value:`${topAssists.value} assists`, detail:'Only assists made while league-owned', playerId:playerId(topAssists.key) },
    { id:'goalkeeper', category:'Highest-scoring goalkeeper', subject:topGoalkeeper.name, value:`${topGoalkeeper.value} pts`, detail:'Only points scored while league-owned', playerId:playerId(topGoalkeeper.key) },
  ];
  return { records };
}
