'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

type PlayerData = { player:{ web_name:string; team_name:string; position:string }; points:number; weeks:{ gameweek:number; date:string; points:number; goals:number; assists:number; cleanSheets:number }[] };

export function PlayerStatsModal({ playerId, onClose }:{ playerId:number | null; onClose:() => void }) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!playerId) return;
    setData(null); setError('');
    fetch(`/api/players/${playerId}/stats`, { cache:'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }).catch(reason => setError(reason.message || 'Unable to load player scores.'));
  }, [playerId]);
  if (!playerId) return null;
  return <div className="player-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="player-modal" role="dialog" aria-modal="true" aria-label="Player score details" onMouseDown={event => event.stopPropagation()}><button className="player-modal-close" onClick={onClose} aria-label="Close player scores"><X size={19}/></button>{error ? <p className="form-error">{error}</p> : !data ? <p className="helper">Loading player scores…</p> : <><div className="player-modal-heading"><p className="eyebrow">Official FPL scores · no bonus</p><h2>{data.player.web_name}</h2><p>{data.player.team_name} · {data.player.position}</p><strong>{data.points} <small>pts</small></strong></div><div className="player-week-head"><span>Gameweek</span><span>Date</span><span>Pts</span><span>G</span><span>A</span><span>CS</span></div><div className="player-week-list">{data.weeks.map(week => <div className="player-week-row" key={week.gameweek}><span>GW {week.gameweek}</span><span>{new Date(week.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'Europe/London' })}</span><strong>{week.points}</strong><span>{week.goals}</span><span>{week.assists}</span><span>{week.cleanSheets}</span></div>)}{!data.weeks.length && <p className="table-message">No scored fixtures are available for this player.</p>}</div></>}</section></div>;
}
