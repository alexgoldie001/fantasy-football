'use client';
import { AppShell } from '@/components/app-shell';
import { players } from '@/lib/demo-data';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
export default function PlayersPage(){
 const [search,setSearch]=useState(''); const [position,setPosition]=useState('All'); const [ownership,setOwnership]=useState('All');
 const filtered=useMemo(()=>players.filter(p=>(position==='All'||p.position===position)&&(ownership==='All'||(ownership==='Available'?!p.ownedBy:!!p.ownedBy))&&p.name.toLowerCase().includes(search.toLowerCase())),[search,position,ownership]);
 return <AppShell><section className="page-heading"><p className="eyebrow">Player market</p><h1>Every player. Your scoring.</h1><p className="sub">Points are calculated using The Draft League’s custom rules.</p></section>
 <section className="filters"><label><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players"/></label><div className="selects"><select value={position} onChange={e=>setPosition(e.target.value)}><option>All</option><option>GK</option><option>DEF</option><option>MID</option><option>FWD</option></select><select value={ownership} onChange={e=>setOwnership(e.target.value)}><option>All</option><option>Available</option><option>Owned</option></select><button><SlidersHorizontal size={16}/> More filters</button></div></section>
 <section className="panel player-table"><div className="table-head players-head"><span>Player</span><span>Position</span><span>Price</span><span>Form</span><span>Points</span><span>Ownership</span></div>{filtered.map(p=><div className="player-row" key={p.id}><div className="avatar">{p.name[0]}<span className={p.position.toLowerCase()}>{p.position}</span></div><div><strong>{p.name}</strong><small>{p.team}</small></div><span className="mobile-hide">{p.position}</span><span>£{(p.price/10).toFixed(1)}m</span><span>{p.form}</span><strong>{p.points}</strong><span className={p.ownedBy?'owner':'available'}>{p.ownedBy||'Available'}</span></div>)}</section></AppShell>
}
