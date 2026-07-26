'use client';

import { AppShell } from '@/components/app-shell';
import { Search, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Player = { id:number; fullName:string; lookupLabel:string; team:string; position:string; price:number };
type SquadRow = { key:number; playerId:number | null; query:string };
const starterRows = Array.from({ length:11 }, (_, index) => index + 1);
const substituteRows = Array.from({ length:4 }, (_, index) => index + 12);

export default function SquadSelectorPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<SquadRow[]>(Array.from({ length:15 }, (_, index) => ({ key:index + 1, playerId:null, query:'' })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/players/2026-27', { cache:'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setPlayers(data.players || []); }).catch(reason => setError(reason.message || 'Unable to load the 2026/27 player list.')).finally(() => setLoading(false)); }, []);
  const byId = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const byLabel = useMemo(() => new Map(players.map(player => [player.lookupLabel, player])), [players]);
  const total = rows.reduce((sum, row) => sum + (byId.get(row.playerId || 0)?.price || 0), 0);
  const updateRow = (key:number, query:string) => { const player = byLabel.get(query); setRows(current => current.map(row => row.key === key ? { ...row, query, playerId:player?.id || null } : row)); };
  const renderRows = (keys:number[]) => keys.map(key => { const row = rows.find(item => item.key === key)!; const player = byId.get(row.playerId || 0); return <div className="web-squad-row" key={key}><label><input list="squad-player-options" value={row.query} onChange={event => updateRow(key, event.target.value)} placeholder="Start typing a player name"/></label><span>{player?.position || '—'}</span><span>{player?.team || '—'}</span><strong>{player ? `£${(player.price / 10).toFixed(1)}m` : '—'}</strong></div>; });
  return <AppShell><section className="page-heading compact"><p className="eyebrow">Commissioner tools · 2026/27 planning</p><h1>BGFF · 2026/27 Squad Selector.</h1><p className="sub">Start typing in a player box, then choose the full name and club from the matching list.</p></section><section className="panel web-squad-selector">{loading ? <p className="helper">Loading 2026/27 players…</p> : error ? <p className="form-error">{error}</p> : <><datalist id="squad-player-options">{players.map(player => <option key={player.id} value={player.lookupLabel}/>)}</datalist><div className="web-squad-head"><span><Search size={15}/> Player — full name and club</span><span>Position</span><span>Team</span><span>Price</span></div><div className="web-squad-section"><div><UsersRound size={16}/> Starting XI</div>{renderRows(starterRows)}</div><div className="web-squad-section substitutes"><div><UsersRound size={16}/> Substitutes</div>{renderRows(substituteRows)}</div><div className="web-squad-total"><span>Total price</span><strong>£{(total / 10).toFixed(1)}m</strong></div></>}</section></AppShell>;
}
