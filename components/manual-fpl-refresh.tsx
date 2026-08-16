'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './manual-fpl-refresh.module.css';

export function ManualFplRefresh(_: { isAdmin?: boolean } = {}) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function refresh() {
    setState('running'); setMessage('');
    const { data: { session } } = await supabaseBrowser().auth.getSession();
    const response = await fetch('/api/admin/sync', { method: 'POST', headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
    const result = await response.json();
    if (response.status === 202) { setState('done'); setMessage(`${result.message}. Try again in about ${Math.ceil((result.retryAfter || 60) / 60)} minute.`); return; }
    if (!response.ok) { setState('error'); setMessage(result.error || 'Update failed. Please try again.'); return; }
    const playerMessage = result.playersAdded ? ` Added ${result.playersAdded} new player${result.playersAdded === 1 ? '' : 's'}.` : ' No new players found.';
    setState('done'); setMessage(`Stats refreshed.${playerMessage}`);
    window.setTimeout(() => window.location.reload(), 1200);
  }
  return <div className={styles.refresh}><div className={styles.copy}><strong>Latest FPL stats</strong><span>Fetch the latest official FPL data and update league stats now.</span></div><button onClick={refresh} disabled={state === 'running'}><RefreshCw size={15} className={state === 'running' ? styles.spin : ''}/>{state === 'running' ? 'Updating…' : 'Update stats'}</button>{message && <small className={state === 'error' ? styles.error : ''}>{message}</small>}</div>;
}
