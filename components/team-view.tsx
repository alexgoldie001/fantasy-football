'use client';
import { AppShell } from '@/components/app-shell';
import { players as demoPlayers } from '@/lib/demo-data';
import { getTeam } from '@/lib/teams';
import { Coins, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type Player = { name: string; team: string; position: string; points: number; price: number };
type Team = { name: string; manager: string; budget: number; players: Player[] };
export function TeamView({ slug = 'north-bank' }: { slug?: string }) {
  const fallback = getTeam(slug) ?? getTeam('north-bank')!;
  const [team, setTeam] = useState<Team>({ name: fallback.name, manager: fallback.manager, budget: 85, players: demoPlayers.slice(0, 11).map(player => ({ name: player.name, team: player.team, position: player.position, points: player.points, price: player.price })) });
  const [loadError, setLoadError] = useState('');
  useEffect(()=>{fetch(`/api/teams/${slug}`,{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('Team not found.');return response.json();}).then(data=>{setTeam(data);setLoadError('');}).catch(error=>{if(slug !== 'north-bank')setLoadError(error.message);});},[slug]);
  if(loadError) return <AppShell><section className="page-heading"><p className="eyebrow">Team unavailable</p><h1>{loadError}</h1><p className="sub">Return to the league table and open the team again from its current link.</p></section></AppShell>;
  const orderedPlayers = [...team.players].sort((a,b)=>({GK:1,DEF:2,MID:3,FWD:4}[a.position]||9)-({GK:1,DEF:2,MID:3,FWD:4}[b.position]||9)||a.name.localeCompare(b.name));
  return <AppShell><section className="page-heading compact"><p className="eyebrow">{team.manager}’s team</p><h1>{team.name}</h1></section><section className="team-stats"><div><UsersRound/><span><small>Squad size</small><strong>{team.players.length} players</strong></span></div><div><Coins/><span><small>Available funds</small><strong>£{(team.budget/10).toFixed(1)}m</strong></span></div><div><span><small>Season points</small><strong>{team.players.reduce((sum, player) => sum + player.points, 0)} pts</strong></span></div></section><section className="panel squad-list"><div className="squad-list-head"><span>Player</span><span>Club</span><span>Position</span><span>Season points</span><span>Purchase price</span></div>{orderedPlayers.map((player,index)=><div className="squad-list-row" key={`${player.name}-${index}`}><div><strong>{player.name}</strong><small>Purchased player</small></div><span>{player.team}</span><span className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</span><strong>{player.points}</strong><strong>£{(player.price/10).toFixed(1)}m</strong></div>)}</section></AppShell>;
}
