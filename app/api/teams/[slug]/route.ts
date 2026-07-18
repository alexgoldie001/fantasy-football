import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { currentSeasonBudgetDate, remainingBudget } from '@/lib/budget';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const positionOrder: Record<string, number> = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const weeks = Array.from({ length: 42 }, (_, index) => {
  const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key: String(index + 1), label: `Week ${index + 1} · ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })} – ${new Date(end.getTime() - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })}`, start: start.toISOString(), end: end.toISOString() };
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const requestedWeek = request.nextUrl.searchParams.get('week') || '';
  const selectedWeek = weeks.find(week => week.key === requestedWeek);
  try {
    const db = supabaseAdmin();
    const { data: squads, error: squadsError } = await db.from('squads').select('id,name,budget,manager_id');
    if (squadsError) throw squadsError;
    const squad = (squads || []).find(row => row.id === slug) || (squads || []).find(row => slugify(row.name) === slug);
    if (!squad) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] = await Promise.all([
      db.from('profiles').select('display_name').eq('id', squad.manager_id).single(),
      db.from('squad_players').select('id,fpl_id,purchase_price,acquired_at,released_at').eq('squad_id', squad.id),
    ]);
    if (profileError) throw profileError;
    if (membershipError) throw membershipError;

    const relevant = selectedWeek
      ? (memberships || []).filter(member => member.acquired_at < selectedWeek.end && (!member.released_at || member.released_at > selectedWeek.start))
      : (memberships || []).filter(member => !member.released_at);
    const ids = [...new Set(relevant.map(row => row.fpl_id))];
    const { data: fplPlayers, error: playersError } = ids.length
      ? await db.from('fpl_players').select('fpl_id,web_name,team_name,position,raw').in('fpl_id', ids)
      : { data: [], error: null };
    if (playersError) throw playersError;
    const byId = new Map((fplPlayers || []).map(player => [player.fpl_id, player]));
    const pointsById = new Map<number, number>();

    if (selectedWeek && ids.length) {
      const { data: stats, error: statsError } = await db.from('fpl_fixture_player_stats')
        .select('fpl_id,kickoff_at,points_excluding_bonus')
        .in('fpl_id', ids)
        .gte('kickoff_at', selectedWeek.start)
        .lt('kickoff_at', selectedWeek.end);
      if (statsError) throw statsError;
      for (const stat of stats || []) {
        const ownedAtKickoff = relevant.some(member => member.fpl_id === stat.fpl_id && member.acquired_at <= stat.kickoff_at && (!member.released_at || member.released_at > stat.kickoff_at));
        // The 2025/26 backfill records the current squad as the owner throughout that completed season.
        const legacyOwner = stat.kickoff_at >= '2025-08-01T00:00:00Z' && stat.kickoff_at < '2026-06-01T00:00:00Z' && relevant.some(member => member.fpl_id === stat.fpl_id && !member.released_at);
        if (ownedAtKickoff || legacyOwner) pointsById.set(stat.fpl_id, (pointsById.get(stat.fpl_id) || 0) + Number(stat.points_excluding_bonus || 0));
      }
    }

    // A swap made inside one score week is shown as one squad slot: outgoing / incoming.
    const groupedMemberships: any[][] = [];
    if (selectedWeek) {
      const assigned = new Set<string>();
      for (const incoming of relevant.filter(member => (memberships || []).some(previous => previous.id !== member.id && previous.released_at === member.acquired_at))) {
        const outgoing = relevant.find(member => member.id !== incoming.id && member.released_at === incoming.acquired_at && !assigned.has(member.id));
        if (outgoing) { groupedMemberships.push([outgoing, incoming]); assigned.add(outgoing.id); assigned.add(incoming.id); }
      }
      for (const member of relevant) if (!assigned.has(member.id)) groupedMemberships.push([member]);
    } else groupedMemberships.push(...relevant.map(member => [member]));
    const players = groupedMemberships.map(group => {
      const orderedGroup = [...group].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
      const playerRecords = orderedGroup.map(row => byId.get(row.fpl_id) as any);
      const individualPoints = orderedGroup.map((row, index) => selectedWeek ? (pointsById.get(row.fpl_id) || 0) : Number(playerRecords[index]?.raw?.total_points || 0) - Number(playerRecords[index]?.raw?.bonus || 0));
      return {
        name: playerRecords.map(player => player?.web_name || 'Unknown player').join(' / '),
        team: playerRecords.map(player => player?.team_name || '—').join(' / '),
        position: playerRecords[0]?.position || 'MID',
        points: individualPoints.length > 1 ? individualPoints.join(' / ') : individualPoints[0] || 0,
        totalPoints: individualPoints.reduce((total, points) => total + points, 0),
        price: orderedGroup.map(row => row.purchase_price).join(' / '),
      };
    }).sort((a, b) => positionOrder[a.position] - positionOrder[b.position] || a.name.localeCompare(b.name));
    const budget = remainingBudget(memberships || [], currentSeasonBudgetDate());
    return NextResponse.json({ name: squad.name, manager: profile.display_name, budget, players, weeks: weeks.map(({ key, label }) => ({ key, label })), selectedWeek: selectedWeek?.key || '', pointsLabel: selectedWeek ? selectedWeek.label : 'Season points' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load team.' }, { status: 500 });
  }
}
