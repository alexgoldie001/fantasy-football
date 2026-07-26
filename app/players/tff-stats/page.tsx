'use client';

import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Player = { id:number; name:string; team:string; teamCode:string; position:string; price:number; points:number; starts:number; cleanSheets:number; partialCleanSheets:number; assists:number; goals:number; tackles:number; saves:number; goalsConceded:number; yellowCards:number; redCards:number; penaltiesMissed:number; penaltiesSaved:number };
const columns: { key:keyof Player; label:string }[] = [
  { key:'starts', label:'SXI' }, { key:'goals', label:'G' }, { key:'assists', label:'A' }, { key:'cleanSheets', label:'FCS' }, { key:'partialCleanSheets', label:'PCS' }, { key:'saves', label:'S' }, { key:'goalsConceded', label:'GC' }, { key:'tackles', label:'T' }, { key:'yellowCards', label:'YC' }, { key:'redCards', label:'RC' }, { key:'penaltiesMissed', label:'Pen miss' }, { key:'penaltiesSaved', label:'Pen saved' },
];
const positionOrder: Record<string, number> = { GK:1, DEF:2, MID:3, FWD:4 };

export default function TffStatsPage() {
  const [players, setPlayers] = useState<Player[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [position, setPosition] = useState('All'), [club, setClub] = useState('All'), [sort, setSort] = useState<keyof Player>('points');
  useEffect(() => { fetch('/api/tff-players').then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setPlayers(data.players || []); }).catch(reason => setError(reason.message || 'Unable to load the TFF player list.')).finally(() => setLoading(false)); }, []);
  const clubs = useMemo(() => [...new Set(players.map(player => player.team).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [players]);
  const filtered = useMemo(() => players.filter(player => (position === 'All' || player.position === position) && (club === 'All' || player.team === club) && `${player.name} ${player.team}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (sort === 'position' ? positionOrder[a.position] - positionOrder[b.position] : Number(b[sort]) - Number(a[sort])) || a.name.localeCompare(b.name)), [players, search, position, club, sort]);
  return <AppShell>
    <section className="page-heading"><p className="eyebrow">Telegraph Fantasy Football · 2025/26</p><h1>TFF Stats Centre.</h1><Link className="excel-link" href="/players">Back to FPL players</Link></section>
    <section className="filters"><label><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search players or teams"/></label><div className="selects"><select value={position} onChange={event => setPosition(event.target.value)}><option value="All">All Positions</option><option>GK</option><option>DEF</option><option>MID</option><option>FWD</option></select><select value={club} onChange={event => setClub(event.target.value)}><option value="All">All Teams</option>{clubs.map(team => <option key={team}>{team}</option>)}</select></div></section>
    <section className="panel player-table player-market">{loading ? <p className="table-message">Loading TFF 2025/26 player statistics…</p> : error ? <p className="form-error">{error}</p> : <div className="market-scroll"><div className="market-head tff-market-head"><span>Player</span><button onClick={() => setSort('position')} className={sort === 'position' ? 'sorted' : ''}>Pos.</button><button onClick={() => setSort('points')} className={sort === 'points' ? 'sorted' : ''}>Pts</button><span>TFF price</span>{columns.map(column => <button key={column.key} onClick={() => setSort(column.key)} className={sort === column.key ? 'sorted' : ''}>{column.label}</button>)}</div>{filtered.map(player => <div className="market-row tff-market-row" key={player.id}><div><strong>{player.name}</strong><small>{player.teamCode || player.team}</small></div><span className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</span><strong>{player.points}</strong><span>£{(player.price / 1000000).toFixed(1)}m</span>{columns.map(column => <strong key={column.key}>{player[column.key] as number}</strong>)}</div>)}</div>}</section>
  </AppShell>;
}
