'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';

type Week = { key: string; label: string };
type Manager = { id: string; manager: string; team: string; weeks: { key: string; players: { name:string; changed:boolean }[] }[] };
type OwnershipData = { weeks: Week[]; managers: Manager[]; error?: string };

export default function OwnershipPage() {
  const [data, setData] = useState<OwnershipData>({ weeks: [], managers: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/ownership', { cache: 'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }).catch(error => setData({ weeks: [], managers: [], error: error.message || 'Unable to load player ownership.' })).finally(() => setLoading(false)); }, []);
  return <AppShell><section className="page-heading"><p className="eyebrow">Squad history</p><h1>Player ownership.</h1><p className="sub">Each weekly column uses the same Tuesday-to-Tuesday dates as Weekly Scores. Red names mark a player joining or leaving during that week.</p></section><section className="panel ownership-table">{loading ? <p className="table-message">Loading ownership history…</p> : data.error ? <p className="form-error">{data.error}</p> : <div className="ownership-scroll"><div className="ownership-head"><span>Manager</span>{data.weeks.map(week => <span key={week.key}>Week {week.key}</span>)}</div>{data.managers.map(manager => <div className="ownership-row" key={manager.id}><div><strong>{manager.manager}</strong><small>{manager.team}</small></div>{manager.weeks.map(week => <div key={week.key}>{week.players.length ? week.players.map(player => <span className={player.changed ? 'ownership-change' : ''} key={player.name}>{player.name}</span>) : <small>—</small>}</div>)}</div>)}{!data.managers.length && <p className="table-message">No manager squads have been created yet.</p>}</div>}</section></AppShell>;
}
