'use client';

import { AppShell } from '@/components/app-shell';
import { ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type ScoreRow = { id:string; rank:number; manager:string; team:string; points:number; goals:number; assists:number; cleanSheets:number; weekPoints:number; monthPoints:number };
type ScoreData = { rows:ScoreRow[]; latestWeek?:{ label:string }; latestMonth?:{ label:string }; error?:string };

export default function LeaguePage() {
  const [data, setData] = useState<ScoreData>({ rows:[] });
  useEffect(() => {
    let active = true;
    const load = () => fetch('/api/scores?period=season', { cache:'no-store' }).then(response => response.json()).then((result:ScoreData) => {
      if (!active) return;
      setData(result);
      if (!result.error && !result.rows.length) fetch('/api/scores?sync=1', { cache:'no-store' }).finally(() => active && load());
    }).catch(() => active && setData({ rows:[] }));
    load();
    return () => { active = false; };
  }, []);

  return <AppShell><section className="dashboard-grid league-dashboard">
    <div className="panel standings score-standings">
      <div className="section-head"><div><p className="eyebrow">Season standings</p><h1>League table</h1></div><div className="score-links"><Link className="table-link" href="/scores/weekly">Weekly scores <ChevronRight size={16}/></Link><Link className="table-link" href="/scores/monthly">Monthly scores <ChevronRight size={16}/></Link></div></div>
      <div className="score-table-scroll"><div className="score-table-head"><span>#</span><span>Team</span><span>Goals</span><span>Assists</span><span>CS</span><span>{data.latestWeek?.label || 'Week'}</span><span>{data.latestMonth?.label || 'Month'}</span><span>Total</span></div>{data.rows.map(row => <div className={`score-standing ${row.rank === 1 ? 'leader' : ''}`} key={row.id}><b>{row.rank === 1 ? <Trophy className="champion-trophy" size={17}/> : String(row.rank).padStart(2, '0')}</b><div><strong><Link className="team-link" href={`/team/${row.id}`}>{row.team}</Link>{row.rank === 1 && <Trophy className="champion-trophy team-trophy" size={16}/>}</strong><small>{row.manager}</small></div><span>{row.goals}</span><span>{row.assists}</span><span>{row.cleanSheets}</span><span>{row.weekPoints}</span><span>{row.monthPoints}</span><strong>{row.points}</strong></div>)}{!data.rows.length && !data.error && <p className="table-message">Preparing official season scores in the background…</p>}{data.error && <p className="table-message">Official fixture scores will appear after the first data refresh.</p>}</div>
      <Link className="final-season-link" href="/final-table">View the 2025 / 26 final league table <ChevronRight size={16}/></Link>
    </div>
    <aside className="side-stack"><div className="panel next"><p className="eyebrow">Score views</p><h2>Choose a period</h2><p>See a single gameweek or a calendar month, each using the players owned when fixtures began.</p><Link href="/scores/weekly">Open scores <ChevronRight size={15}/></Link></div><div className="panel scoring"><Trophy size={19}/><div><p className="eyebrow">The rulebook</p><strong>Official fixture data</strong><small>Goals, assists, clean sheets and FPL points without bonus.</small></div></div></aside>
  </section></AppShell>;
}
