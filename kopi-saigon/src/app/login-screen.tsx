'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { startActivitySession, trackActivity } from '@/lib/telemetry';

type LoginScreenProps = { onAuthenticated: () => void };

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError || !data.user) {
      setError('We could not sign you in. Check your email and password, or ask your administrator to verify account access.');
      return;
    }
    startActivitySession();
    void trackActivity('session_started');
    setPassword('');
    onAuthenticated();
  }

  return (
    <main className="prime-login-layout">
      <section className="prime-login-story" aria-label="PRIME Philippines">
        <a className="prime-login-brand" href="#login" aria-label="PRIME Philippines">
          <img className="prime-login-brand-mark" src="/logos/prime-white.png" alt="PRIME Philippines" />
        </a>

        <div className="prime-login-story-copy">
          <p className="prime-login-eyebrow">COMMERCIAL REAL ESTATE INTELLIGENCE</p>
          <h2>Data That<br />Drives Deals.</h2>
          <p className="prime-login-story-description">
            The Philippines’ leading commercial real estate platform for brokers, analysts, and property managers.
          </p>
        </div>
      </section>
      <section className="prime-login-stage" aria-label="Log in">
        <div className="prime-login-grid" aria-hidden="true" />
        <form className="prime-login-card" onSubmit={handleSubmit}>
          <p className="prime-login-card-eyebrow">WELCOME BACK</p>
          <h1>Log in</h1>
          <p className="prime-login-card-description">Enter your credentials to access your account</p>

          <label className="prime-login-label" htmlFor="prime-login-email">Email<span aria-hidden="true">*</span></label>
          <input
            className="prime-login-input"
            id="prime-login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={event => { setEmail(event.target.value); setError(''); }}
            required
          />

          <label className="prime-login-label prime-login-password-label" htmlFor="prime-login-password">Password<span aria-hidden="true">*</span></label>
          <div className="prime-login-password-field">
            <input
              className="prime-login-input"
              id="prime-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={event => { setPassword(event.target.value); setError(''); }}
              required
            />
            <button
              className="prime-login-password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && <p className="prime-login-error" role="alert">{error}</p>}
          <button className="prime-login-submit" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
      </section>
    </main>
  );
}