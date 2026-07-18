import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
const weeks = Array.from({ length: 42 }, (_, index) => {
  const start = new Date(Date.parse('2025-08-12T05:00:00.000Z') + index * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { key: String(index + 1), label: `Week ${index + 1} · ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })} – ${new Date(end.getTime() - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London'})}`, start: start.toISOString(), end: end.toISOString() };
});

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: squads, error: squadsError }, { data: profiles, error: profilesError }, { data: memberships, error: membershipsError }, { data: players, error: playersError }] = await Promise.all([
      db.from('squads').select('id,name,manager_id'),
      db.from('profiles').select('id,display_name'),
      db.from('squad_players').select('id,squad_id,fpl_id,acquired_at,released_at'),
      db.from('fpl_players').select('fpl_id,web_name'),
    ]);
    if (squadsError) throw squadsError;
    if (profilesError) throw profilesError;
    if (membershipsError) throw membershipsError;
    if (playersError) throw playersError;
    const managerNames = new Map((profiles || []).map(profile => [profile.id, profile.display_name]));
    const playersById = new Map((players || []).map(player => [player.fpl_id, player.web_name]));
    const membershipsBySquad = new Map<string, any[]>();
    for (const membership of memberships || []) membershipsBySquad.set(membership.squad_id, [...(membershipsBySquad.get(membership.squad_id) || []), membership]);
    const managers = (squads || []).map(squad => ({
      id: squad.id,
      manager: managerNames.get(squad.manager_id) || 'Manager',
      team: squad.name,
      weeks: weeks.map(week => { const allMemberships = membershipsBySquad.get(squad.id) || []; const owned = allMemberships.filter(member => member.acquired_at < week.end && (!member.released_at || member.released_at > week.start)); const assigned = new Set<string>(); const players:{name:string;changed:boolean}[] = []; for (const incoming of owned.filter(member => allMemberships.some(previous => previous.id !== member.id && previous.released_at === member.acquired_at))) { const outgoing = owned.find(member => member.id !== incoming.id && member.released_at === incoming.acquired_at && !assigned.has(member.id)); if (outgoing) { players.push({ name:`${playersById.get(outgoing.fpl_id) || 'Unknown player'} / ${playersById.get(incoming.fpl_id) || 'Unknown player'}`, changed:true }); assigned.add(outgoing.id); assigned.add(incoming.id); } } for (const member of owned) if (!assigned.has(member.id)) players.push({ name:playersById.get(member.fpl_id) || 'Unknown player', changed:(member.acquired_at >= week.start && member.acquired_at < week.end) || Boolean(member.released_at && member.released_at >= week.start && member.released_at < week.end) }); return { key:week.key, players:players.sort((a, b) => a.name.localeCompare(b.name)) }; }),
    })).sort((a, b) => a.manager.localeCompare(b.manager) || a.team.localeCompare(b.team));
    return NextResponse.json({ weeks: weeks.map(({ key, label }) => ({ key, label })), managers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load player ownership.' }, { status: 500 });
  }
}
