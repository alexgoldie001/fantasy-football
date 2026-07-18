'use client';

import { AppShell } from '@/components/app-shell';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = { id:string; rank:number; manager:string; team:string; points:number; goals:number; assists:number; cleanSheets:number };
export default function FinalTablePage() {
  const [rows, setRows] = useState<Row[]>([]), [archived, setArchived] = useState(false);
  useEffect(() => { fetch('/api/final-table', { cache:'no-store' }).then(response => response.json()).then(result => { setRows(result.rows || []); setArchived(Boolean(result.archived)); }).catch(() => setRows([])); }, []);
  return <AppShell><section className="page-heading"><p className="eyebrow">2025 / 26 archive</p><h1>Final league table.</h1><p className="sub">{archived ? 'This is the locally archived final standings for the completed 2025/26 season.' : 'Preparing the 2025/26 final standings for local archiving.'}</p><Link className="table-link final-back" href="/league">Back to league</Link></section><section className="panel final-table"><div className="final-head"><span>#</span><span>Team</span><span>Goals</span><span>Assists</span><span>CS</span><span>Points</span></div>{rows.map(row => <div className={`final-row ${row.rank === 1 ? 'champion' : ''}`} key={row.id}><b>{row.rank === 1 ? <Trophy className="champion-trophy" size={18}/> : String(row.rank).padStart(2, '0')}</b><div><strong>{row.team}{row.rank === 1 && <Trophy className="champion-trophy team-trophy" size={17}/>}</strong><small>{row.manager}</small></div><span>{row.goals}</span><span>{row.assists}</span><span>{row.cleanSheets}</span><strong>{row.points}</strong></div>)}{!rows.length && <p className="table-message">Loading final standings…</p>}</section></AppShell>;
}
