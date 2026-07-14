import { AppShell } from '@/components/app-shell';
import { standings } from '@/lib/demo-data';
import { ArrowUpRight, CalendarDays, ChevronRight, Trophy } from 'lucide-react';

export default function LeaguePage() {
 return <AppShell><section className="hero"><div><p className="eyebrow">Gameweek 12 of 38</p><h1>Good evening, Alex.</h1><p className="sub">You climbed one place this week. Keep the momentum.</p></div><div className="gw-card"><span>Current gameweek</span><strong>57 <small>PTS</small></strong><div><i/> Live · 6 matches played</div></div></section>
 <section className="dashboard-grid"><div className="panel standings"><div className="section-head"><div><p className="eyebrow">The table</p><h2>League standings</h2></div><button>Full table <ChevronRight size={16}/></button></div><div className="table-head"><span>#</span><span>Team</span><span>GW</span><span>Total</span></div>{standings.map(row=><div className={'standing '+(row.rank===1?'leader':'')} key={row.name}><b>{row.rank}</b><div><strong>{row.name}</strong><small>{row.manager} <em>{row.change}</em></small></div><span>{row.week}</span><strong>{row.points}</strong></div>)}</div>
 <aside className="side-stack"><div className="panel next"><p className="eyebrow">Next up</p><h2>Transfer window</h2><p>Opens Friday at 18:00<br/>Closes Saturday at 11:30</p><a href="/transfers">View transfer room <ArrowUpRight size={15}/></a></div><div className="panel scoring"><Trophy size={19}/><div><p className="eyebrow">Your system</p><strong>Custom scoring is live</strong><small>Goals, assists & clean sheets</small></div></div></aside></section>
 <section className="panel match-card"><div><p className="eyebrow">Your gameweek</p><h2>North Bank <span>vs</span> Clean Sheet</h2><p><CalendarDays size={15}/> Gameweek ends Monday, 22:00</p></div><div className="match-score"><strong>57</strong><span>—</span><strong className="muted">51</strong></div></section>
 </AppShell>;
}
