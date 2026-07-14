import { AppShell } from '@/components/app-shell';
import { players } from '@/lib/demo-data';
import { getTeam } from '@/lib/teams';
import { Coins, UsersRound } from 'lucide-react';

export function TeamView({ slug = 'north-bank' }: { slug?: string }) {
  const team = getTeam(slug) ?? getTeam('north-bank')!;
  const squad = players.slice(0, 11);
  return <AppShell><section className="page-heading compact"><p className="eyebrow">{team.manager}’s team</p><h1>{team.name}</h1></section><section className="team-stats"><div><UsersRound/><span><small>Squad size</small><strong>11 players</strong></span></div><div><Coins/><span><small>Available funds</small><strong>£8.5m</strong></span></div><div><span><small>Gameweek 12</small><strong>{team.week} pts</strong></span></div></section><section className="panel squad-list"><div className="squad-list-head"><span>Player</span><span>Club</span><span>Position</span><span>Season points</span><span>Price</span></div>{squad.map(player=><div className="squad-list-row" key={player.id}><div><strong>{player.name}</strong><small>Purchased player</small></div><span>{player.team}</span><span className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</span><strong>{player.points}</strong><strong>£{(player.price/10).toFixed(1)}m</strong></div>)}</section></AppShell>;
}
