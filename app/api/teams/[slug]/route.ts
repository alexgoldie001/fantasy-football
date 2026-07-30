import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { currentSeasonBudgetDate, remainingBudget } from '@/lib/budget';
import { loadCustomScoreStats } from '@/lib/custom-score-stats';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const slugify = (value:string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const positionOrder:Record<string, number> = { GK:1, DEF:2, MID:3, FWD:4 };
type Period = { key:string; label:string; start:string; end:string };
const weeks:Period[] = Array.from({ length:42 }, (_, index) => { const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 7 * 86400000); const end = new Date(start.getTime() + 7 * 86400000); return { key:String(index + 1), label:`Week ${index + 1} · ${start.toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })} – ${new Date(end.getTime() - 1).toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })}`, start:start.toISOString(), end:end.toISOString() }; });
const months:Period[] = ['Aug','Sept','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'].map((label, index) => { const year = index < 5 ? 2025 : 2026; const month = index < 5 ? index + 7 : index - 5; const start = new Date(Date.UTC(year, month, 1)); const end = new Date(Date.UTC(year, month + 1, 1)); return { key:`${year}-${month + 1}`, label, start:start.toISOString(), end:end.toISOString() }; });

export async function GET(request:NextRequest, { params }:{ params:Promise<{ slug:string }> }) {
  const { slug } = await params;
  const selectedWeek = weeks.find(period => period.key === (request.nextUrl.searchParams.get('week') || ''));
  const selectedMonth = months.find(period => period.key === (request.nextUrl.searchParams.get('month') || ''));
  const selectedPeriod = selectedWeek || selectedMonth;
  try {
    const db = supabaseAdmin();
    const { data:squads, error:squadsError } = await db.from('squads').select('id,name,budget,manager_id'); if (squadsError) throw squadsError;
    const squad = (squads || []).find(row => row.id === slug) || (squads || []).find(row => slugify(row.name) === slug); if (!squad) return NextResponse.json({ error:'Team not found.' }, { status:404 });
    const [{ data:profile, error:profileError }, { data:memberships, error:membershipError }] = await Promise.all([db.from('profiles').select('display_name').eq('id', squad.manager_id).single(), db.from('squad_players').select('id,fpl_id,purchase_price,acquired_at,released_at').eq('squad_id', squad.id)]); if (profileError) throw profileError; if (membershipError) throw membershipError;
    const relevant = selectedPeriod ? (memberships || []).filter(member => member.acquired_at < selectedPeriod.end && (!member.released_at || member.released_at > selectedPeriod.start)) : (memberships || []).filter(member => !member.released_at);
    const ids = [...new Set(relevant.map(row => row.fpl_id))];
    const allIds = [...new Set((memberships || []).map(row => row.fpl_id))];
    const [{ data:fplPlayers, error:playersError }, custom] = await Promise.all([
      ids.length ? db.from('fpl_players').select('fpl_id,web_name,team_id,team_name,position').in('fpl_id', ids) : Promise.resolve({ data:[], error:null }),
      allIds.length ? loadCustomScoreStats(allIds) : Promise.resolve({ rows:[] }),
    ]); if (playersError) throw playersError;
    const byId = new Map((fplPlayers || []).map(player => [player.fpl_id, player])); const pointsById = new Map<number, number>();
    let teamPoints = 0;
    for (const stat of custom.rows) { if (selectedPeriod && (stat.kickoff_at < selectedPeriod.start || stat.kickoff_at >= selectedPeriod.end)) continue; const ownedBySquad = (memberships || []).some(member => member.fpl_id === stat.fpl_id && member.acquired_at <= stat.kickoff_at && (!member.released_at || member.released_at > stat.kickoff_at)); if (ownedBySquad) teamPoints += Number(stat.points || 0); const ownedByDisplayedPlayer = relevant.some(member => member.fpl_id === stat.fpl_id && member.acquired_at <= stat.kickoff_at && (!member.released_at || member.released_at > stat.kickoff_at)); if (ownedByDisplayedPlayer) pointsById.set(stat.fpl_id, (pointsById.get(stat.fpl_id) || 0) + Number(stat.points || 0)); }
    // Keep a sale and its replacement in the same slot for the selected period.
    // This preserves the player-out / player-in presentation in both team views.
    const sameTransferMoment = (left:string | null, right:string) => Boolean(left) && new Date(left!).getTime() === new Date(right).getTime();
    const groupedMemberships:any[][] = [];
    const assigned = new Set<string>();
    for (const incoming of relevant) {
      const candidates = relevant.filter(outgoing => outgoing.id !== incoming.id && !assigned.has(outgoing.id) && sameTransferMoment(outgoing.released_at, incoming.acquired_at));
      const outgoing = candidates.find(candidate => (byId.get(candidate.fpl_id) as any)?.position === (byId.get(incoming.fpl_id) as any)?.position) || candidates[0];
      if (outgoing) { groupedMemberships.push([outgoing, incoming]); assigned.add(outgoing.id); assigned.add(incoming.id); }
    }
    for (const member of relevant) if (!assigned.has(member.id)) groupedMemberships.push([member]);    const players = groupedMemberships.map(group => {
      const orderedGroup = [...group].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
      const records = orderedGroup.map(row => byId.get(row.fpl_id) as any);
      const points = orderedGroup.map(row => pointsById.get(row.fpl_id) || 0);
      const incoming = records[records.length - 1];
      return { fplId:orderedGroup[orderedGroup.length - 1]?.fpl_id || null, name:records.map(player => player?.web_name || 'Unknown player').join(' / '), teamId:incoming?.team_id || null, team:records.map(player => player?.team_name || '—').join(' / '), position:incoming?.position || 'MID', points:points.length > 1 ? points.join(' / ') : points[0] || 0, totalPoints:points.reduce((total, value) => total + value, 0), price:orderedGroup.map(row => row.purchase_price).join(' / ') };
    }).sort((a,b) => positionOrder[a.position] - positionOrder[b.position] || a.name.localeCompare(b.name));
    const budget = remainingBudget(memberships || [], currentSeasonBudgetDate());
    return NextResponse.json({ name:squad.name, manager:profile.display_name, budget, teamPoints, players, weeks:weeks.map(({ key,label }) => ({ key,label })), months:months.map(({ key,label }) => ({ key,label })), selectedWeek:selectedWeek?.key || '', selectedMonth:selectedMonth?.key || '', pointsLabel:selectedPeriod?.label || 'Season points' }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to load team.' }, { status:500 }); }
}
