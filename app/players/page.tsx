'use client';

import { AppShell } from '@/components/app-shell';
import { Download, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Player = { id:number; name:string; team:string; position:string; price:number; owner:string|null; points:number; cleanSheets:number; defensiveContribution:number; assists:number; goals:number; penaltiesMissed:number; penaltiesSaved:number; yellowCards:number; redCards:number };
const columns: { key:keyof Player; label:string }[] = [
  { key:'goals', label:'G' }, { key:'assists', label:'A' }, { key:'cleanSheets', label:'CS' }, { key:'defensiveContribution', label:'Def con.' },
  { key:'yellowCards', label:'YC' }, { key:'redCards', label:'RC' }, { key:'penaltiesMissed', label:'Pen miss' }, { key:'penaltiesSaved', label:'Pen saved' },
];

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('All');
  const [club, setClub] = useState('All');
  const [ownership, setOwnership] = useState('All');
  const [sort, setSort] = useState<keyof Player>('points');

  useEffect(() => {
    fetch('/api/players').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPlayers(data.players || []);
    }).catch(reason => setError(reason.message || 'Unable to load the FPL player list.')).finally(() => setLoading(false));
  }, []);

  const clubs = useMemo(() => [...new Set(players.map(player => player.team).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [players]);
  const filtered = useMemo(() => players.filter(player =>
    (position === 'All' || player.position === position) &&
    (club === 'All' || player.team === club) &&
    (ownership === 'All' || (ownership === 'Available' ? !player.owner : !!player.owner)) &&
    `${player.name} ${player.team}`.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => Number(b[sort]) - Number(a[sort]) || a.name.localeCompare(b.name)), [players, search, position, club, ownership, sort]);

  return <AppShell>
    <section className="page-heading"><p className="eyebrow">Official FPL data</p><h1>The player market.</h1><a className="excel-link" href="/api/players/export"><Download size={16}/> Excel format</a></section>
    <section className="filters"><label><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search players or teams"/></label><div className="selects">
      <select value={position} onChange={event => setPosition(event.target.value)}><option>All</option><option>GK</option><option>DEF</option><option>MID</option><option>FWD</option></select>
      <select value={club} onChange={event => setClub(event.target.value)}><option value="All">All clubs</option>{clubs.map(team => <option key={team}>{team}</option>)}</select>
      <select value={ownership} onChange={event => setOwnership(event.target.value)}><option>All</option><option>Available</option><option>Owned</option></select>
      <button><SlidersHorizontal size={16}/> {filtered.length || '—'} players</button>
    </div></section>
    <section className="panel player-table player-market">{loading ? <p className="table-message">Loading the official FPL player list…</p> : error ? <p className="form-error">{error}</p> : <div className="market-scroll">
      <div className="market-head"><span>Player</span><span>Pos.</span><span>Owner</span><button onClick={() => setSort('points')} className={sort === 'points' ? 'sorted' : ''}>Pts</button><span>FPL price</span>{columns.map(column => <button key={column.key} onClick={() => setSort(column.key)} className={sort === column.key ? 'sorted' : ''}>{column.label}</button>)}</div>
      {filtered.map(player => <div className="market-row" key={player.id}><div><strong>{player.name}</strong><small>{player.team}</small></div><span className={`position-chip ${player.position.toLowerCase()}`}>{player.position}</span><span className={player.owner ? 'owner' : 'available'}>{player.owner || 'Available'}</span><strong>{player.points}</strong><span>£{(player.price / 10).toFixed(1)}m</span>{columns.map(column => <strong key={column.key}>{player[column.key] as number}</strong>)}</div>)}
    </div>}</section>
  </AppShell>;
}
