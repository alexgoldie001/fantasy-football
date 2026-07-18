'use client';

import { AppShell } from '@/components/app-shell';
import { players as demoPlayers } from '@/lib/demo-data';
import { getTeam } from '@/lib/teams';
import { Coins, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type Player = { name: string; team: string; position: string; points: number | string; totalPoints?: number; price: number | string };
type Week = { key: string; label: string };
type Team = { name: string; manager: string; budget: number; players: Player[]; weeks?: Week[]; selectedWeek?: string; pointsLabel?: string };

export function TeamView({ slug = 'north-bank' }: { slug?: string }) {
  const fallback = getTeam(slug) ?? getTeam('north-bank')!;
  const [week, setWeek] = useState('');
  const [team, setTeam] = useState<Team>({ name: fallback.name, manager: fallback.manager, budget: 85, players: demoPlayers.slice(0, 11).map(player => ({ name: player.name, team: player.team, position: player.position, points: player.points, price: player.price })) });
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch(`/api/teams/${slug}${week ? `?week=${encodeURIComponent(week)}` : ''}`, { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Team not found.'); return response.json(); })
      .then(data => { setTeam(data); setLoadError(''); })
      .catch(error => { if (slug !== 'north-bank') setLoadError(error.message); });
  }, [slug, week]);

  if (loadError) return <AppShell><section className="page-heading"><p className="eyebrow">Team unavailable</p><h1>{loadError}</h1><p className="sub">Return to the league table and open the team again from its current link.</p></section></AppShell>;
  const orderedPlayers = [...team.players].sort((a, b) => ({ GK: 1, DEF: 2, MID: 3, FWD: 4 }[a.position] || 9) - ({ GK: 1, DEF: 2, MID: 3, FWD: 4 }[b.position] || 9) || a.name.localeCompare(b.name));
  const showingWeek = Boolean(week);

  return <AppShell>
    <section className="page-heading compact"><p className="eyebrow">{team.manager}’s team</p><h1>{team.name}</h1></section>
    <section className="team-stats">
      <div><UsersRound/><span><small>Squad size</small><strong>{team.players.length} players</strong></span></div>
      <div><Coins/><span><small>Available funds</small><strong>£{(team.budget / 10).toFixed(1)}m</strong></span></div>
      <div className="team-points"><span><small>{team.pointsLabel || 'Season points'}</small><strong>{team.players.reduce((sum, player) => sum + (player.totalPoints ?? Number(player.points)), 0)} pts</strong></span><select aria-label="Select score week" value={week} onChange={event => setWeek(event.target.value)}><option value="">Season points</option>{(team.weeks || []).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div>
    </section>
    <section className="panel squad-list">
      <div className="squad-list-head"><span>Player</span><span>Club</span><span>Position</span><span>{showingWeek ? 'Week points' : 'Season points'}</span><span>Purchase price</span></div>
      {orderedPlayers.map((player, index) => <div className="squad-list-row" key={`${player.name}-${index}`}><div><strong>{player.name}</strong><small>Purchased player</small></div><span>{player.team}</span><span className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</span><strong>{player.points}</strong><strong>{typeof player.price === 'string' ? player.price.split(' / ').map(price => `£${(Number(price) / 10).toFixed(1)}m`).join(' / ') : `£${(player.price / 10).toFixed(1)}m`}</strong></div>)}
    </section>
  </AppShell>;
}
