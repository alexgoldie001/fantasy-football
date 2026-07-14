import { AppShell } from '@/components/app-shell';
import { players } from '@/lib/demo-data';
import { getTeam } from '@/lib/teams';
import { Coins, UsersRound } from 'lucide-react';

export function TeamView({ slug = 'north-bank' }: { slug?: string }) {
  const team = getTeam(slug) ?? getTeam('north-bank')!;
  const squad = players.slice(0, 11);
  const lines = [squad.slice(0, 1), squad.slice(1, 5), squad.slice(5, 8), squad.slice(8, 11)];

  return <AppShell><section className="page-heading compact"><p className="eyebrow">{team.manager}’s team</p><h1>{team.name}</h1></section><section className="team-stats"><div><UsersRound/><span><small>Formation</small><strong>4–3–3</strong></span></div><div><Coins/><span><small>Available funds</small><strong>£8.5m</strong></span></div><div><span><small>Gameweek 12</small><strong>{team.week} pts</strong></span></div></section><section className="pitch panel"><div className="pitch-top"><span>STARTING XI</span><strong>Gameweek 12</strong></div><div className="pitch-grass">{lines.map((line, index) => <div className={`pitch-line line-${index}`} key={index}>{line.map((player) => <div className="pitch-player" key={player.id}><b>{player.name}</b><small>{player.points} pts</small></div>)}</div>)}</div></section></AppShell>;
}
