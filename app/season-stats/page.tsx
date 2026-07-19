'use client';

import { AppShell } from '@/components/app-shell';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

type RecordRow = { id:string; category:string; subject:string; value:string; detail:string };

export default function SeasonStatsPage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/season-stats', { cache:'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setRecords(data.records || []); }).catch(reason => setError(reason.message || 'Unable to load season stats.')); }, []);
  return <AppShell><section className="page-heading"><p className="eyebrow">League records</p><h1>Season stats.</h1><p className="sub">Every record counts only fixtures earned while the player was owned by a team in this league.</p></section><section className="panel season-stat-table"><div className="season-stat-head"><span>Record</span><span>Team / player</span><span>Score</span></div>{records.map(record => <div className="season-stat-row" key={record.id}><div><strong>{record.category}</strong><small>{record.detail}</small></div><span>{record.subject}</span><strong>{record.value}</strong></div>)}{error && <p className="form-error">{error}</p>}{!records.length && !error && <p className="table-message">Calculating season records…</p>}</section><Link className="table-link season-stats-back" href="/league"><ChevronLeft size={16}/> Back to league</Link></AppShell>;
}
