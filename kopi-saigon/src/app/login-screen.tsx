'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type LoginScreenProps = { onAuthenticated: () => void };

const TEST_USERNAME = 'kopi.saigon';
const TEST_PASSWORD = 'kopi.saigon.2026';

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (username === TEST_USERNAME && password === TEST_PASSWORD) {
      onAuthenticated();
      return;
    }
    setError('The username or password is incorrect. Please try again.');
  }

  return (
    <main className="kopi-login-layout">
      <section className="kopi-login-story" aria-label="Kopi Saigon introduction">
        <a className="kopi-login-brand" href="#login" aria-label="Kopi Saigon home">
          <span className="kopi-login-brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo-white.svg" alt="" />
          </span>
          <span className="kopi-login-brand-name">KOPI <b>SAIGON</b></span>
        </a>

        <div className="kopi-login-story-copy">
          <p className="kopi-login-eyebrow">COFFEE COMPETITOR INTELLIGENCE</p>
          <h2>Every cup<br />has a story.</h2>
          <p className="kopi-login-story-description">
            Explore KOPI SAIGON’s competitor landscape, pricing tiers, and coffee hotspots in Quezon City.
          </p>
        </div>
        <p className="kopi-login-story-footer">TIADA HARI TANPA KOPI</p>
      </section>

      <section className="kopi-login-stage" aria-label="Log in to PrimeCore">
        <div className="kopi-login-grid" aria-hidden="true" />
        <div className="kopi-login-chevron kopi-login-chevron-gold" aria-hidden="true" />
        <div className="kopi-login-chevron kopi-login-chevron-silver" aria-hidden="true" />

        <form className="kopi-login-card" onSubmit={handleSubmit}>
          <p className="kopi-login-card-eyebrow">WELCOME BACK</p>
          <h1>Log in to PrimeCore</h1>
          <p className="kopi-login-card-description">Enter your credentials to access your account</p>

          <label className="kopi-login-label" htmlFor="kopi-login-username">Username<span aria-hidden="true">*</span></label>
          <input
            className="kopi-login-input"
            id="kopi-login-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={event => { setUsername(event.target.value); setError(''); setNotice(''); }}
            required
          />

          <label className="kopi-login-label kopi-login-password-label" htmlFor="kopi-login-password">Password<span aria-hidden="true">*</span></label>
          <div className="kopi-login-password-field">
            <input
              className="kopi-login-input"
              id="kopi-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={event => { setPassword(event.target.value); setError(''); setNotice(''); }}
              required
            />
            <button
              className="kopi-login-password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <div className="kopi-login-forgot">
            <button type="button" onClick={() => { setError(''); setNotice('Password reset is not available for this testing login.'); }}>Forgot password?</button>
          </div>
          {notice && <p className="kopi-login-notice" role="status">{notice}</p>}

          {error && <p className="kopi-login-error" role="alert">{error}</p>}
          <button className="kopi-login-submit" type="submit">Log in</button>
        </form>
      </section>
    </main>
  );
}
