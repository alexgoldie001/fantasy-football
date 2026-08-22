import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadCustomScoreStats, type CustomScoreStat } from '@/lib/custom-score-stats';

type Period = 'season' | 'week' | 'month';
type PeriodOption = { key:string; label:string; start:string; end:string };

const monthNames = ['August','September','October','November','December','January','February','March','April','May'];
const months:PeriodOption[] = monthNames.map((name, index) => {
  const year = index < 5 ? 2026 : 2027;
  const month = index < 5 ? index + 7 : index - 5;
  const start = new Date(Date.UTC(year, month, 1));
  return { key:`${year}-${String(month + 1).padStart(2, '0')}`, label:`${name} ${year}`, start:start.toISOString(), end:new Date(Date.UTC(year, month + 1, 1)).toISOString() };
});
const weeks:PeriodOption[] = Array.from({ length:42 }, (_, index) => {
  const start = new Date(Date.parse('2026-08-18T00:01:00.000Z') + index * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key:String(index + 1), label:`Week ${index + 1} · ${start.toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })} – ${new Date(end.getTime() - 1).toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })}`, start:start.toISOString(), end:end.toISOString() };
});
const currentPeriod = (periods:PeriodOption[], now = new Date().toISOString()) => periods.find(period => now >= period.start && now < period.end) || (now < periods[0].start ? periods[0] : periods[periods.length - 1]);

const emptyRow = (squad:any, profiles:Map<string, any>) => ({ id:squad.id, manager:profiles.get(squad.manager_id)?.display_name || 'Manager', team:squad.name, points:0, goals:0, assists:0, cleanSheets:0, weekPoints:0, monthPoints:0 });
const ranked = (totals:Map<string, any>) => [...totals.values()].sort((a, b) => b.points - a.points || a.team.localeCompare(b.team)).map((row, index) => ({ ...row, rank:index + 1 }));

export async function scoreBoard(period:Period = 'season', key?:string) {
  const db = supabaseAdmin();
  const [{ data:memberships, error:membershipsError }, { data:squads, error:squadsError }, { data:profiles, error:profilesError }] = await Promise.all([
    db.from('squad_players').select('squad_id,fpl_id,acquired_at,released_at'),
    db.from('squads').select('id,name,manager_id'),
    db.from('profiles').select('id,display_name'),
  ]);
  if (membershipsError) throw membershipsError;
  if (squadsError) throw squadsError;
  if (profilesError) throw profilesError;

  const playerIds = [...new Set((memberships || []).map((membership:any) => membership.fpl_id))];
  const allStats = await loadCustomScoreStats(playerIds).then(result => result.rows);

  const squadById = new Map((squads || []).map((squad:any) => [squad.id, squad]));
  const profileById = new Map((profiles || []).map((profile:any) => [profile.id, profile]));
  const membershipsByPlayer = new Map<number, any[]>();
  for (const membership of memberships || []) membershipsByPlayer.set(membership.fpl_id, [...(membershipsByPlayer.get(membership.fpl_id) || []), membership]);
  const addFixtureStats = (filter:(stat:CustomScoreStat) => boolean, includeEmpty:boolean) => {
    const totals = new Map<string, any>();
    for (const stat of allStats) {
      if (!filter(stat)) continue;
      const owner = (membershipsByPlayer.get(stat.fpl_id) || []).find(member => new Date(member.acquired_at) <= new Date(stat.kickoff_at) && (!member.released_at || new Date(member.released_at) > new Date(stat.kickoff_at)));
      if (!owner) continue;
      const squad = squadById.get(owner.squad_id);
      if (!squad) continue;
      const row = totals.get(squad.id) || emptyRow(squad, profileById);
      row.points += Number(stat.points || 0);
      row.goals += Number(stat.goals || 0);
      row.assists += Number(stat.assists || 0);
      if (stat.position === 'GK' || stat.position === 'DEF') row.cleanSheets += Number(stat.clean_sheets || 0);
      totals.set(squad.id, row);
    }
    if (includeEmpty) for (const squad of squads || []) if (!totals.has(squad.id)) totals.set(squad.id, emptyRow(squad, profileById));
    return totals;
  };

  const latestKickoff = allStats.reduce((latest, stat) => stat.kickoff_at > latest ? stat.kickoff_at : latest, '');
  const currentWeek = currentPeriod(weeks), currentMonth = currentPeriod(months);
  const latestWeek = weeks.find(option => latestKickoff >= option.start && latestKickoff < option.end) || currentWeek;
  const latestMonth = months.find(option => latestKickoff >= option.start && latestKickoff < option.end) || currentMonth;
  const selected = period === 'week' ? (weeks.find(option => option.key === (key || currentWeek.key)) || currentWeek) : period === 'month' ? (months.find(option => option.key === (key || currentMonth.key)) || currentMonth) : undefined;
  const seasonTotals = addFixtureStats(() => true, true);
  const weeklyTotals = addFixtureStats(stat => stat.kickoff_at >= latestWeek.start && stat.kickoff_at < latestWeek.end, false);
  const monthlyTotals = addFixtureStats(stat => stat.kickoff_at >= latestMonth.start && stat.kickoff_at < latestMonth.end, false);
  for (const [id, row] of seasonTotals) { row.weekPoints = weeklyTotals.get(id)?.points || 0; row.monthPoints = monthlyTotals.get(id)?.points || 0; }
  if (period !== 'season') return { rows:ranked(addFixtureStats(stat => stat.kickoff_at >= selected!.start && stat.kickoff_at < selected!.end, true)), periods:{ weeks, months }, selected:selected!.key, latestWeek, latestMonth };

  const previousRankById = new Map(ranked(addFixtureStats(stat => stat.kickoff_at < latestWeek.start, true)).map(row => [row.id, row.rank]));
  const rows = ranked(seasonTotals).map(row => ({ ...row, previousRank:previousRankById.get(row.id) || row.rank }));
  return { rows, periods:{ weeks, months }, selected:undefined, latestWeek, latestMonth };
}
