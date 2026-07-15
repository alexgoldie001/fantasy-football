'use client';
import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const router = useRouter();
  async function login(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password }); setLoading(false); if (error) { setError('Your email or password is incorrect.'); return; } router.replace('/league'); router.refresh(); }
  return <main className="login-page"><section className="login-brand"><div className="login-mark">B<span>G</span></div><p className="eyebrow">Private league · 2025 / 26</p><h1>Bails &amp; Goldies<br/><i>Fantasy Football</i></h1><p>Private fantasy football, built around your league.</p></section><section className="login-card"><p className="eyebrow">Manager access</p><h2>Welcome back.</h2><p className="helper">Sign in to see your squad, the league table and transfers.</p><form onSubmit={login}><label className="field">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/></label><label className="field">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>{error&&<p className="form-error">{error}</p>}<button className="primary login-button" disabled={loading}>{loading?'Signing in…':'Sign in'}</button></form></section></main>;
}
