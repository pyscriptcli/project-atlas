'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SetupPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (password.length < 10) { setError('Use at least 10 characters for your password.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError('This invitation has expired or could not be used. Ask your administrator to send a new invitation.'); return; }
    await supabase.auth.signOut();
    setComplete(true);
    window.setTimeout(() => router.replace('/'), 1800);
  }

  return <main className="admin-login-page"><section className="admin-login-card">
    <div className="admin-mark"><ShieldCheck size={20}/><span>KOPI SAIGON · CLIENT ACCESS</span></div>
    <p className="admin-eyebrow">ACCOUNT SETUP</p><h1>Create your password</h1>
    <p className="admin-intro">{session?.user.email ? `Set a password for ${session.user.email}.` : 'Open the invitation link from your email to finish setting up your account.'}</p>
    {error && <p className="admin-alert" role="alert"><AlertCircle size={16}/>{error}</p>}
    {complete ? <p className="admin-notice" role="status"><CheckCircle2 size={16}/>Password saved. Returning to client login…</p> : session ? <form className="admin-form" onSubmit={submitPassword}>
      <label htmlFor="setup-password">New password</label><input id="setup-password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 10 characters"/>
      <label htmlFor="setup-confirm-password">Confirm password</label><input id="setup-confirm-password" type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter it again"/>
      <button className="admin-primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
    </form> : null}
    <a className="admin-back-link" href="/">Back to client login</a>
  </section></main>;
}
