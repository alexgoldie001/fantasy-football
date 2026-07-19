'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Your email or password is incorrect.');
      return;
    }
    router.replace('/league');
    router.refresh();
  }

  return <main className="login-page">
    <section className="login-brand">
      <div className="login-crest-frame">
        <img className="login-crest" src="/branding/login-crest-option-5.png" alt="Bails & Goldie Fantasy Football" />
      </div>
    </section>
    <section className="login-card">
      <p className="eyebrow">Manager access</p>
      <h2>Welcome back.</h2>
      <p className="helper">Sign in to see your squad, the league table and transfers.</p>
      <form onSubmit={login}>
        <label className="field">Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" /></label>
        <label className="field">Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Your password" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary login-button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <a className="forgot-link" href="/forgot-password">Forgotten password?</a>
    </section>
  </main>;
}
