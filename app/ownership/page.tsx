'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';

type Week = { key: string; label: string };
type Manager = { id: string; manager: string; team: string; budget:number; weeks: { key: string; budget:number; players: { name:string; changed:boolean }[] }[] };
type OwnershipData = { weeks: Week[]; managers: Manager[]; budgets:{id:string;manager:string;team:string;budget:number}[]; error?: string };

export default function OwnershipPage() {
  const [data, setData] = useState<OwnershipData>({ weeks: [], managers: [], budgets:[] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/ownership', { cache: 'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }).catch(error => setData({ weeks: [], managers: [], budgets:[], error: error.message || 'Unable to load player ownership.' })).finally(() => setLoading(false)); }, []);
  return <AppShell><section className="page-heading"><p className="eyebrow">Transfers & squad history</p><h1>Player ownership.</h1><p className="sub">Red names mark a player joining or leaving during that week. Sale returns are 50% of the purchase price, rounded down to £0.5m.</p></section>{!loading&&!data.error&&<section className="panel budget-table"><div className="budget-head"><span>Manager</span><span>Team</span><span>Remaining budget</span></div>{data.budgets.map(manager=><div className="budget-row" key={manager.id}><strong>{manager.manager}</strong><span>{manager.team}</span><strong>£{(manager.budget/10).toFixed(1)}m</strong></div>)}</section>}<section className="panel ownership-table">{loading ? <p className="table-message">Loading ownership history…</p> : data.error ? <p className="form-error">{data.error}</p> : <div className="ownership-scroll"><div className="ownership-head"><span>Manager</span>{data.weeks.map(week => <span key={week.key}>Week {week.key}</span>)}</div>{data.managers.map(manager => <div className="ownership-row" key={manager.id}><div><strong>{manager.manager}</strong><small>{manager.team}</small></div>{manager.weeks.map(week => <div key={week.key}>{week.players.length ? week.players.map(player => <span className={player.changed ? 'ownership-change' : ''} key={player.name}>{player.name}</span>) : <small>—</small>}<strong className="ownership-budget">£{(week.budget/10).toFixed(1)}m left</strong></div>)}</div>)}{!data.managers.length && <p className="table-message">No manager squads have been created yet.</p>}</div>}</section></AppShell>;
}
