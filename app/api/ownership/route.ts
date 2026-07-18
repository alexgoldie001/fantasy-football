import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { currentSeasonBudgetDate, remainingBudget, saleReturn } from '@/lib/budget';

export const dynamic = 'force-dynamic';

type Period = { key:string; label:string; start:string; end:string };
const positionOrder: Record<string, number> = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const positionPrefix: Record<string, string> = { GK: 'G', DEF: 'D', MID: 'M', FWD: 'F' };
const weeks: Period[] = Array.from({ length: 42 }, (_, index) => {
  const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key:String(index + 1), label:`Week ${index + 1}`, start:start.toISOString(), end:end.toISOString() };
});
const months: Period[] = ['Aug','Sept','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'].map((label, index) => {
  const year = index < 5 ? 2025 : 2026;
  const month = index < 5 ? index + 7 : index - 5;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { key:`${year}-${month + 1}`, label, start:start.toISOString(), end:end.toISOString() };
});

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: squads, error: squadsError }, { data: profiles, error: profilesError }, { data: memberships, error: membershipsError }, { data: players, error: playersError }] = await Promise.all([
      db.from('squads').select('id,name,manager_id'),
      db.from('profiles').select('id,display_name'),
      db.from('squad_players').select('id,squad_id,fpl_id,purchase_price,acquired_at,released_at'),
      db.from('fpl_players').select('fpl_id,web_name,position'),
    ]);
    if (squadsError) throw squadsError;
    if (profilesError) throw profilesError;
    if (membershipsError) throw membershipsError;
    if (playersError) throw playersError;

    const managerNames = new Map((profiles || []).map(profile => [profile.id, profile.display_name]));
    const playersById = new Map((players || []).map(player => [player.fpl_id, { name:player.web_name, position:player.position }]));
    const membershipsBySquad = new Map<string, any[]>();
    for (const membership of memberships || []) membershipsBySquad.set(membership.squad_id, [...(membershipsBySquad.get(membership.squad_id) || []), membership]);
    const playerDetails = (fplId:number) => playersById.get(fplId) || { name:'Unknown player', position:'—' };

    const buildPeriodRows = (allMemberships:any[], period:Period) => {
      const owned = allMemberships.filter(member => member.acquired_at < period.end && (!member.released_at || member.released_at > period.start));
      const assigned = new Set<string>();
      const playerRows:{ name:string; changed:boolean; position:string }[] = [];
      for (const incoming of owned.filter(member => member.acquired_at >= period.start && member.acquired_at < period.end)) {
        const outgoing = owned.find(member => member.id !== incoming.id && member.released_at === incoming.acquired_at && !assigned.has(member.id));
        if (!outgoing) continue;
        const oldPlayer = playerDetails(outgoing.fpl_id), newPlayer = playerDetails(incoming.fpl_id);
        const returned = saleReturn(outgoing.purchase_price);
        playerRows.push({ name:`${positionPrefix[oldPlayer.position] || '—'} ${oldPlayer.name}${returned > 0 ? ` £${(returned / 10).toFixed(1)}m` : ''} / ${positionPrefix[newPlayer.position] || '—'} ${newPlayer.name}${incoming.purchase_price > 0 ? ` £${(incoming.purchase_price / 10).toFixed(1)}m` : ''}`, changed:true, position:oldPlayer.position });
        assigned.add(outgoing.id); assigned.add(incoming.id);
      }
      for (const member of owned) if (!assigned.has(member.id)) {
        const player = playerDetails(member.fpl_id);
        const joined = member.acquired_at >= period.start && member.acquired_at < period.end;
        const left = Boolean(member.released_at && member.released_at >= period.start && member.released_at < period.end);
        playerRows.push({ name:`${positionPrefix[player.position] || '—'} ${player.name}${joined && member.purchase_price > 0 ? ` £${(member.purchase_price / 10).toFixed(1)}m` : ''}`, position:player.position, changed:joined || left });
      }
      return { key:period.key, players:playerRows.sort((a, b) => (positionOrder[a.position] || 9) - (positionOrder[b.position] || 9) || a.name.localeCompare(b.name)), budget:remainingBudget(allMemberships, period.end) };
    };

    const balanceDate = currentSeasonBudgetDate();
    const managers = (squads || []).map(squad => {
      const allMemberships = membershipsBySquad.get(squad.id) || [];
      return { id:squad.id, manager:managerNames.get(squad.manager_id) || 'Manager', team:squad.name, weeks:weeks.map(period => buildPeriodRows(allMemberships, period)), months:months.map(period => buildPeriodRows(allMemberships, period)), budget:remainingBudget(allMemberships, balanceDate) };
    }).sort((a, b) => a.manager.localeCompare(b.manager) || a.team.localeCompare(b.team));
    const budgets = managers.map(manager => ({ id:manager.id, manager:manager.manager, team:manager.team, budget:manager.budget })).sort((a, b) => b.budget - a.budget || a.manager.localeCompare(b.manager));
    return NextResponse.json({ weeks:weeks.map(({ key, label }) => ({ key, label })), months:months.map(({ key, label }) => ({ key, label })), managers, budgets }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load player ownership.' }, { status:500 });
  }
}
