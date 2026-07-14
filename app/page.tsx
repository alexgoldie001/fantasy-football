import { AppShell } from '@/components/app-shell';
import { standings } from '@/lib/demo-data';
import { ArrowUpRight, CalendarDays, ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { teamSlug } from '@/lib/teams';

export default function LeaguePage() {
  return <AppShell>
    <section className="hero hero-premium">
      <div className="hero-copy"><p className="eyebrow">Private league · Season 2025 / 26</p><h1>Bails &amp; Goldies<br/><i>Fantasy Football</i></h1><p className="sub">Gameweek 12 is live. North Bank climbed one place this week.</p><div className="hero-meta"><span><i/> LIVE NOW</span><span>6 of 10 fixtures complete</span></div></div>
      <div className="gw-card score-card"><span>North Bank</span><strong>57 <small>PTS</small></strong><div className="score-rule"/><p>Current gameweek <b>01</b></p><em>+1 place this week</em></div>
    </section>
    <section className="dashboard-grid"><div className="panel standings"><div className="section-head"><div><p className="eyebrow">The championship</p><h2>League table</h2></div><button>Full table <ChevronRight size={16}/></button></div><div className="table-head"><span>#</span><span>Team</span><span>GW</span><span>Total</span></div>{standings.map(row=><div className={'standing '+(row.rank===1?'leader':'')} key={row.name}><b>{String(row.rank).padStart(2,'0')}</b><div><Link className="team-link" href={`/team/${teamSlug(row.name)}`}>{row.name}</Link><small>{row.manager} <em>{row.change}</em></small></div><span>{row.week}</span><strong>{row.points}</strong></div>)}</div>
    <aside className="side-stack"><div className="panel next"><p className="eyebrow">Next up</p><h2>Transfer window</h2><p>Opens Friday at 18:00<br/>Closes Saturday at 11:30</p><a href="/transfers">Enter the room <ArrowUpRight size={15}/></a></div><div className="panel scoring"><Trophy size={19}/><div><p className="eyebrow">The rulebook</p><strong>Custom scoring</strong><small>Goals, assists &amp; clean sheets</small></div></div></aside></section>
    <section className="panel match-card"><div><p className="eyebrow">Gameweek head-to-head</p><h2>North Bank <span>vs</span> Clean Sheet</h2><p><CalendarDays size={15}/> Scores lock Monday, 22:00</p></div><div className="match-score"><strong>57</strong><span>—</span><strong className="muted">51</strong></div></section>
  </AppShell>;
}
