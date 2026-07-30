'use client';

import { AppShell } from '@/components/app-shell';
import { players as demoPlayers } from '@/lib/demo-data';
import { getTeam } from '@/lib/teams';
import { Coins, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlayerStatsModal } from '@/components/player-stats-modal';

type Player = { fplId?:number | null; name:string; teamId?:number | null; team:string; position:string; points:number | string; totalPoints?:number; price:number | string };
type Period = { key:string; label:string };
type Team = { name:string; manager:string; budget:number; teamPoints?:number; players:Player[]; weeks?:Period[]; months?:Period[]; selectedWeek?:string; selectedMonth?:string; pointsLabel?:string };

const positions = ['GK', 'DEF', 'MID', 'FWD'];
const positionOrder:Record<string, number> = { GK:1, DEF:2, MID:3, FWD:4 };

export function TeamView({ slug = 'north-bank' }:{ slug?:string }) {
  const fallback = getTeam(slug) ?? getTeam('north-bank')!;
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState('');
  const [team, setTeam] = useState<Team>({ name:fallback.name, manager:fallback.manager, budget:85, players:demoPlayers.slice(0, 11).map(player => ({ name:player.name, team:player.team, position:player.position, points:player.points, price:player.price })) });
  const [loadError, setLoadError] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(); if (week) query.set('week', week); if (month) query.set('month', month);
    fetch(`/api/teams/${slug}${query.size ? `?${query}` : ''}`, { cache:'no-store' }).then(async response => { if (!response.ok) throw new Error('Team not found.'); return response.json(); }).then(data => { setTeam(data); setLoadError(''); }).catch(error => { if (slug !== 'north-bank') setLoadError(error.message); });
  }, [slug, week, month]);

  if (loadError) return <AppShell><section className="page-heading"><p className="eyebrow">Team unavailable</p><h1>{loadError}</h1><p className="sub">Return to the league table and open the team again from its current link.</p></section></AppShell>;
  const orderedPlayers = [...team.players].sort((a, b) => (positionOrder[a.position] || 9) - (positionOrder[b.position] || 9) || a.name.localeCompare(b.name));
  const showingPeriod = Boolean(week || month);
  const pointsTotal = team.teamPoints ?? team.players.reduce((sum, player) => sum + (player.totalPoints ?? Number(player.points)), 0);
  const formation = `${orderedPlayers.filter(player => player.position === 'DEF').length}-${orderedPlayers.filter(player => player.position === 'MID').length}-${orderedPlayers.filter(player => player.position === 'FWD').length}`;
  const selectWeek = (value:string) => { setWeek(value); if (value) setMonth(''); };
  const selectMonth = (value:string) => { setMonth(value); if (value) setWeek(''); };

  return <AppShell>
    <section className="page-heading compact"><p className="eyebrow">{team.manager}&rsquo;s team</p><h1>{team.name}</h1></section>
    <section className="team-stats">
      <div><UsersRound/><span><small>Formation</small><strong>{formation}</strong></span></div>
      <div><Coins/><span><small>Available funds</small><strong>£{(team.budget / 10).toFixed(1)}m</strong></span></div>
      <div className="team-points"><span><small>{week ? 'Weekly score' : 'Season points'}</small><strong>{`${pointsTotal} pts`}</strong></span><select aria-label="Select weekly score" value={week} onChange={event => selectWeek(event.target.value)}><option value="">Weekly scores</option>{(team.weeks || []).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div>
      <div className="team-points"><span><small>{month ? 'Monthly score' : 'Monthly scores'}</small><strong>{month ? `${pointsTotal} pts` : '—'}</strong></span><select aria-label="Select monthly score" value={month} onChange={event => selectMonth(event.target.value)}><option value="">Monthly scores</option>{(team.months || []).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div>
    </section>
    <section className="panel squad-pitch">
      <div className="squad-pitch-head"><div><p className="eyebrow">Squad visual</p><h2>Formation {formation}</h2></div><span>{showingPeriod ? team.pointsLabel : 'Season points'}</span></div>
      <div className="squad-pitch-grass"><div className="pitch-goal" aria-hidden="true"><i/><i/><i/></div><div className="pitch-penalty-box pitch-penalty-box-top" aria-hidden="true"/><div className="pitch-halfway-line" aria-hidden="true"/>{positions.map(position => <div className={`pitch-line pitch-line-${position.toLowerCase()}`} key={position}>{orderedPlayers.filter(player => player.position === position).map((player, index) => <div className="pitch-player-card" key={`${player.name}-${index}`}>{player.teamId ? <img className="club-shirt" src={`/kits/${player.position === 'GK' ? 'gk_' : ''}${player.teamId}.webp`} alt={`${player.team} ${player.position === 'GK' ? 'goalkeeper' : 'outfield'} shirt`}/> : <span className="mini-shirt" aria-hidden="true"/>}{player.fplId ? <button className="pitch-player-name" onClick={() => setSelectedPlayerId(player.fplId!)}>{player.name}</button> : <strong>{player.name}</strong>}<small>{player.points} pts</small></div>)}</div>)}<div className="pitch-penalty-box pitch-penalty-box-bottom" aria-hidden="true"/><div className="pitch-bottom-arc" aria-hidden="true"/></div>
    </section>
    <section className="panel squad-list"><div className="squad-list-head"><span>Player</span><span>Club</span><span>Position</span><span>{showingPeriod ? 'Period points' : 'Season points'}</span><span>Purchase price</span></div>{orderedPlayers.map((player, index) => <div className="squad-list-row" key={`${player.name}-${index}`}><div><strong>{player.fplId ? <button className="player-stat-link" onClick={() => setSelectedPlayerId(player.fplId!)}>{player.name}</button> : player.name}</strong></div><span data-label="Club">{player.team}</span><span data-label="Position"><i className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</i></span><strong data-label={showingPeriod ? 'Period points' : 'Season points'}>{player.points}</strong><strong data-label="Purchase price">{typeof player.price === 'string' ? player.price.split(' / ').map(price => `£${(Number(price) / 10).toFixed(1)}m`).join(' / ') : `£${(player.price / 10).toFixed(1)}m`}</strong></div>)}</section>
    <PlayerStatsModal playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)}/>
  </AppShell>;
}
