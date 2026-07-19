import { supabaseAdmin } from '@/lib/supabase-admin';

type Period = 'season' | 'week' | 'month';
type FixtureStat = { fpl_id:number; gameweek:number; kickoff_at:string; points_excluding_bonus:number; goals:number; assists:number; clean_sheets:number };
type PeriodOption = { key:string; label:string; start:string; end:string };

const monthNames = ['August','September','October','November','December','January','February','March','April','May'];
const months:PeriodOption[] = monthNames.map((name, index) => {
  const year = index < 5 ? 2025 : 2026;
  const month = index < 5 ? index + 7 : index - 5;
  const start = new Date(Date.UTC(year, month, 1));
  return { key:`${year}-${String(month + 1).padStart(2, '0')}`, label:`${name} ${year}`, start:start.toISOString(), end:new Date(Date.UTC(year, month + 1, 1)).toISOString() };
});
const weeks:PeriodOption[] = Array.from({ length:42 }, (_, index) => {
  const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key:String(index + 1), label:`Week ${index + 1} · ${start.toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })} – ${new Date(end.getTime() - 1).toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })}`, start:start.toISOString(), end:end.toISOString() };
});

const emptyRow = (squad:any, profiles:Map<string, any>) => ({ id:squad.id, manager:profiles.get(squad.manager_id)?.display_name || 'Manager', team:squad.name, points:0, goals:0, assists:0, cleanSheets:0, weekPoints:0, monthPoints:0 });
const ranked = (totals:Map<string, any>) => [...totals.values()].sort((a, b) => b.points - a.points || a.team.localeCompare(b.team)).map((row, index) => ({ ...row, rank:index + 1 }));

export async function scoreBoard(period:Period = 'season', key?:string) {
  const db = supabaseAdmin();
  const [{ data:memberships, error:membershipsError }, { data:squads, error:squadsError }, { data:profiles, error:profilesError }, { data:players, error:playersError }] = await Promise.all([
    db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at'),
    db.from('squads').select('id,name,manager_id'),
    db.from('profiles').select('id,display_name'),
    db.from('fpl_players').select('fpl_id,raw'),
  ]);
  if (membershipsError) throw membershipsError;
  if (squadsError) throw squadsError;
  if (profilesError) throw profilesError;
  if (playersError) throw playersError;

  const playerIds = [...new Set((memberships || []).map((membership:any) => membership.fpl_id))];
  const { count, error:countError } = playerIds.length ? await db.from('fpl_fixture_player_stats').select('*', { count:'exact', head:true }).in('fpl_id', playerIds) : { count:0, error:null };
  if (countError) throw countError;
  const statPages = await Promise.all(Array.from({ length:Math.ceil((count || 0) / 1000) }, (_, page) => db.from('fpl_fixture_player_stats').select('fpl_id,gameweek,kickoff_at,points_excluding_bonus,goals,assists,clean_sheets').in('fpl_id', playerIds).range(page * 1000, page * 1000 + 999)));
  const allStats = statPages.flatMap(result => { if (result.error) throw result.error; return result.data || []; }) as FixtureStat[];

  const squadById = new Map((squads || []).map((squad:any) => [squad.id, squad]));
  const profileById = new Map((profiles || []).map((profile:any) => [profile.id, profile]));
  const membershipsByPlayer = new Map<number, any[]>();
  for (const membership of memberships || []) membershipsByPlayer.set(membership.fpl_id, [...(membershipsByPlayer.get(membership.fpl_id) || []), membership]);
  const addFixtureStats = (filter:(stat:FixtureStat) => boolean, includeEmpty:boolean) => {
    const totals = new Map<string, any>();
    for (const stat of allStats) {
      if (!filter(stat)) continue;
      const owner = (membershipsByPlayer.get(stat.fpl_id) || []).find(member => new Date(member.acquired_at) <= new Date(stat.kickoff_at) && (!member.released_at || new Date(member.released_at) > new Date(stat.kickoff_at)));
      if (!owner) continue;
      const squad = squadById.get(owner.squad_id);
      if (!squad) continue;
      const row = totals.get(squad.id) || emptyRow(squad, profileById);
      row.points += Number(stat.points_excluding_bonus || 0);
      row.goals += Number(stat.goals || 0);
      row.assists += Number(stat.assists || 0);
      row.cleanSheets += Number(stat.clean_sheets || 0);
      totals.set(squad.id, row);
    }
    if (includeEmpty) for (const squad of squads || []) if (!totals.has(squad.id)) totals.set(squad.id, emptyRow(squad, profileById));
    return totals;
  };

  const latestWeek = weeks[weeks.length - 1];
  const latestMonth = months[months.length - 1];
  const selected = period === 'week' ? (weeks.find(option => option.key === (key || latestWeek.key)) || latestWeek) : period === 'month' ? (months.find(option => option.key === (key || latestMonth.key)) || latestMonth) : undefined;
  let seasonTotals = addFixtureStats(() => true, true);
  if (!allStats.length) {
    seasonTotals = new Map<string, any>();
    const playerById = new Map((players || []).map((player:any) => [player.fpl_id, player.raw || {}]));
    for (const [fplId, owned] of membershipsByPlayer) {
      const owner = owned.find(member => !member.released_at);
      const squad = owner && squadById.get(owner.squad_id);
      const player:any = playerById.get(fplId);
      if (!squad || !player) continue;
      const row = seasonTotals.get(squad.id) || emptyRow(squad, profileById);
      row.points += Number(player.total_points || 0) - Number(player.bonus || 0);
      row.goals += Number(player.goals_scored || 0);
      row.assists += Number(player.assists || 0);
      row.cleanSheets += Number(player.clean_sheets || 0);
      seasonTotals.set(squad.id, row);
    }
    for (const squad of squads || []) if (!seasonTotals.has(squad.id)) seasonTotals.set(squad.id, emptyRow(squad, profileById));
  }

  const weeklyTotals = addFixtureStats(stat => stat.kickoff_at >= latestWeek.start && stat.kickoff_at < latestWeek.end, false);
  const monthlyTotals = addFixtureStats(stat => stat.kickoff_at >= latestMonth.start && stat.kickoff_at < latestMonth.end, false);
  for (const [id, row] of seasonTotals) { row.weekPoints = weeklyTotals.get(id)?.points || 0; row.monthPoints = monthlyTotals.get(id)?.points || 0; }
  if (period !== 'season') return { rows:ranked(addFixtureStats(stat => stat.kickoff_at >= selected!.start && stat.kickoff_at < selected!.end, true)), periods:{ weeks, months }, selected:selected!.key, latestWeek, latestMonth };

  const previousRankById = new Map(ranked(addFixtureStats(stat => stat.kickoff_at < latestWeek.start, true)).map(row => [row.id, row.rank]));
  const rows = ranked(seasonTotals).map(row => ({ ...row, previousRank:previousRankById.get(row.id) || row.rank }));
  return { rows, periods:{ weeks, months }, selected:undefined, latestWeek, latestMonth };
}
