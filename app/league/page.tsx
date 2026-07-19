'use client';

import { AppShell } from '@/components/app-shell';
import { ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ScoreRow = { id:string; rank:number; previousRank?:number; manager:string; team:string; points:number; goals:number; assists:number; cleanSheets:number; weekPoints:number; monthPoints:number };
type ScoreData = { rows:ScoreRow[]; latestWeek?:{ label:string }; latestMonth?:{ label:string }; error?:string };

export default function LeaguePage() {
  const [data, setData] = useState<ScoreData>({ rows:[] });
  const [mySquadId, setMySquadId] = useState('');
  useEffect(() => {
    let active = true;
    supabaseBrowser().auth.getSession().then(async ({ data:{ session } }) => {
      if (!session) return;
      const response = await fetch('/api/me', { headers:{ Authorization:`Bearer ${session.access_token}` }, cache:'no-store' });
      const result = await response.json();
      if (active) setMySquadId(result.user?.squad?.id || '');
    }).catch(() => undefined);
    const load = () => fetch('/api/scores?period=season', { cache:'no-store' }).then(response => response.json()).then((result:ScoreData) => {
      if (!active) return;
      setData(result);
      if (!result.error && !result.rows.length) fetch('/api/scores?sync=1', { cache:'no-store' }).finally(() => active && load());
    }).catch(() => active && setData({ rows:[] }));
    load();
    return () => { active = false; };
  }, []);

  const weekHeader = `Week ${data.latestWeek?.label.match(/Week\s+(\d+)/i)?.[1] || '—'}`;
  const monthHeader = (data.latestMonth?.label || 'Month').replace(/\s+20(\d{2})$/, " ’$1");
  const myRow = data.rows.find(row => row.id === mySquadId);
  const rankChange = myRow ? (myRow.previousRank || myRow.rank) - myRow.rank : 0;
  const movement = !myRow ? 'Your team is loading…' : rankChange > 0 ? `Up ${rankChange} place${rankChange === 1 ? '' : 's'} last week` : rankChange < 0 ? `Down ${Math.abs(rankChange)} place${Math.abs(rankChange) === 1 ? '' : 's'} last week` : 'Held position last week';

  return <AppShell><section className="dashboard-grid league-dashboard">
    <div className="panel standings score-standings">
      <div className="section-head"><div><p className="eyebrow">Season standings</p><h1>League table</h1></div><div className="score-links"><Link className="table-link" href="/scores/weekly">Weekly scores <ChevronRight size={16}/></Link><Link className="table-link" href="/scores/monthly">Monthly scores <ChevronRight size={16}/></Link></div></div>
      <div className="score-table-scroll"><div className="score-table-head"><span>#</span><span>Team</span><span>Goals</span><span>Assists</span><span>CS</span><span>{weekHeader}</span><span>{monthHeader}</span><span>Total</span></div>{data.rows.map(row => <div className={`score-standing ${row.rank === 1 ? 'leader' : ''}`} key={row.id}><b>{row.rank === 1 ? <Trophy className="champion-trophy" size={17}/> : String(row.rank).padStart(2, '0')}</b><div><strong><Link className="team-link" href={`/team/${row.id}`}>{row.team}</Link>{row.rank === 1 && <Trophy className="champion-trophy team-trophy" size={16}/>}</strong><small>{row.manager}</small></div><span>{row.goals}</span><span>{row.assists}</span><span>{row.cleanSheets}</span><span>{row.weekPoints}</span><span>{row.monthPoints}</span><strong>{row.points}</strong></div>)}{!data.rows.length && !data.error && <p className="table-message">Preparing official season scores in the background…</p>}{data.error && <p className="table-message">Official fixture scores will appear after the first data refresh.</p>}</div>
      <Link className="final-season-link" href="/final-table">View the 2025 / 26 final league table <ChevronRight size={16}/></Link>
    </div>
    <aside className="side-stack"><div className="panel next personal-performance"><p className="eyebrow">Your team</p><h2>{myRow?.team || 'Your league team'}</h2><strong>{myRow ? `${myRow.weekPoints} pts` : '— pts'}</strong><p>{movement}</p><Link href={myRow ? `/team/${myRow.id}` : '/team'}>View my team <ChevronRight size={15}/></Link></div><div className="panel scoring"><Trophy size={19}/><div><p className="eyebrow">The rulebook</p><strong>100 million budget, monthly transfers</strong><small>Official FPL scores minus bonus points.<br/>Limit of 2 players from one Premier League team.</small></div></div></aside>
  </section></AppShell>;
}
