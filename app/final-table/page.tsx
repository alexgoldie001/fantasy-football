'use client';

import { AppShell } from '@/components/app-shell';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = { manager:string; aug:number; sep:number; oct:number; nov:number; dec:number; jan:number; feb:number; mar:number; apr:number; may:number; total:number };
const columns: { key:Exclude<keyof Row, 'manager'>; label:string }[] = [{ key:'aug', label:'Aug' }, { key:'sep', label:'Sep' }, { key:'oct', label:'Oct' }, { key:'nov', label:'Nov' }, { key:'dec', label:'Dec' }, { key:'jan', label:'Jan' }, { key:'feb', label:'Feb' }, { key:'mar', label:'Mar' }, { key:'apr', label:'Apr' }, { key:'may', label:'May' }, { key:'total', label:'Total' }];

export default function FinalTablePage() {
  const [rows, setRows] = useState<Row[]>([]), [error, setError] = useState('');
  useEffect(() => { fetch('/api/final-table', { cache:'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setRows(result.rows || []); }).catch(reason => setError(reason.message || 'Unable to load the archived table.')); }, []);
  return <AppShell><section className="page-heading"><p className="eyebrow">2025 / 26 archive</p><h1>Final league table.</h1><p className="sub">The final monthly scores are stored locally and will not change.</p><Link className="table-link final-back" href="/league">Back to league</Link></section><section className="panel final-table final-monthly-table"><div className="final-monthly-scroll"><div className="final-monthly-head"><span>Manager</span>{columns.map(column => <span key={column.key}>{column.label}</span>)}</div>{rows.map(row => <div className={`final-monthly-row ${row.manager === 'Lee' ? 'champion' : ''}`} key={row.manager}><strong>{row.manager}{row.manager === 'Lee' && <Trophy className="champion-trophy team-trophy" size={17}/>}</strong>{columns.map(column => <span className={column.key === 'total' ? 'final-total' : ''} key={column.key}>{row[column.key]}</span>)}</div>)}</div>{!rows.length && !error && <p className="table-message">Loading archived 2025/26 scores…</p>}{error && <p className="form-error">{error}</p>}</section></AppShell>;
}
