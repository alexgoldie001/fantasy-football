'use client';

import { AppShell } from '@/components/app-shell';
import { useEffect, useState } from 'react';
import styles from './ownership.module.css';

type Period = { key:string; label:string };
type OwnershipPeriod = { key:string; budget:number; players:{ name:string; changed:boolean }[] };
type Manager = { id:string; manager:string; team:string; budget:number; months:OwnershipPeriod[] };
type OwnershipData = { months:Period[]; managers:Manager[]; budgets:{ id:string; manager:string; team:string; budget:number }[]; error?:string };

// Budgets are stored in £0.1m units, but the auction works in £0.5m steps.
const formatBudget = (budget:number) => `£${(Math.round(budget / 5) * 5 / 10).toFixed(1)}m`;

function MonthlyOwnershipTable({ periods, managers }:{ periods:Period[]; managers:Manager[] }) {
  return <section className="panel ownership-table monthly-ownership-table">
    <div className="ownership-scroll">
      <div className="ownership-head"><span>Manager</span>{periods.map(period => <span key={period.key}>{period.label}</span>)}</div>
      {managers.map(manager => <div className="ownership-row" key={manager.id}>
        <div><strong>{manager.manager}</strong><small>{manager.team}</small></div>
        {manager.months.map(period => <div key={period.key}>{period.players.length ? period.players.map(player => <span className={player.changed ? 'ownership-change' : ''} key={player.name}>{player.name}</span>) : <small>—</small>}<strong className={`ownership-budget ${styles.budget}`}>{formatBudget(period.budget)} left</strong></div>)}
      </div>)}
      {!managers.length && <p className="table-message">No manager squads have been created yet.</p>}
    </div>
  </section>;
}

export default function OwnershipPage() {
  const [data, setData] = useState<OwnershipData>({ months:[], managers:[], budgets:[] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/ownership', { cache:'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }).catch(error => setData({ months:[], managers:[], budgets:[], error:error.message || 'Unable to load player ownership.' })).finally(() => setLoading(false)); }, []);

  return <AppShell>
    <section className="page-heading"><p className="eyebrow">Transfers & squad history</p><h1>Player ownership.</h1><p className="sub">Red names mark a player joining or leaving during that period. Sale returns are 50% of the purchase price, rounded down to nearest £0.5m.</p></section>
    {!loading && !data.error && <section className="panel budget-table"><div className="budget-head"><span>Manager</span><span>Team</span><span>Remaining budget</span></div>{data.budgets.map(manager => <div className="budget-row" key={manager.id}><strong>{manager.manager}</strong><span>{manager.team}</span><strong>{formatBudget(manager.budget)}</strong></div>)}</section>}
    {loading ? <section className="panel ownership-table"><p className="table-message">Loading ownership history…</p></section> : data.error ? <p className="form-error">{data.error}</p> : <>
      <section className="ownership-section-heading"><p className="eyebrow">Month by month</p><h2>Monthly transfers</h2></section>
      <MonthlyOwnershipTable periods={data.months} managers={data.managers}/>
    </>}
  </AppShell>;
}
