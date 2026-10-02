'use client';

import { Activity, AlertCircle, ArrowUpRight, Check, CirclePause, CirclePlay, Clock3, Coffee, LogOut, MailPlus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AdminUser = { id: string; email: string; name: string; createdAt: string; lastSignInAt: string | null; emailConfirmed: boolean; isAdmin: boolean; enabled: boolean; status: 'active' | 'invited' | 'suspended' };
type Analytics = {
  clientAccounts: number; activeAccounts7d: number; sessions30d: number; neverSignedIn: number;
  totalEvents30d: number; dailySessions: { day: string; sessions: number }[];
  featureUsage: { event: string; count: number }[];
  recentActivity: { email: string; event: string; properties: Record<string, unknown>; createdAt: string }[];
};
type Panel = 'overview' | 'accounts';

const EVENT_LABELS: Record<string, string> = {
  area_selected: 'Explored an area', tier_selected: 'Filtered by price tier',
  display_mode_changed: 'Changed map display', price_table_opened: 'Opened price table',
  project_loaded: 'Loaded the competitor map', project_load_failed: 'Map failed to load',
};
const EMPTY_ANALYTICS: Analytics = { clientAccounts: 0, activeAccounts7d: 0, sessions30d: 0, neverSignedIn: 0, totalEvents30d: 0, dailySessions: [], featureUsage: [], recentActivity: [] };

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [panel, setPanel] = useState<Panel>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAdminData = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersResponse, analyticsResponse] = await Promise.all([
        fetch('/api/admin/users', { headers, cache: 'no-store' }),
        fetch('/api/admin/analytics', { headers, cache: 'no-store' }),
      ]);
      const [usersBody, analyticsBody] = await Promise.all([usersResponse.json(), analyticsResponse.json()]);
      if (!usersResponse.ok) throw new Error(usersBody.error || 'Could not load accounts.');
      if (!analyticsResponse.ok) throw new Error(analyticsBody.error || 'Could not load activity.');
      setUsers(usersBody.users || []);
      setAnalytics(analyticsBody);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the admin workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (session?.access_token) void loadAdminData(session.access_token);
    else { setUsers([]); setAnalytics(EMPTY_ANALYTICS); }
  }, [loadAdminData, session?.access_token]);

  async function handleAdminSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError || !data.session) { setError('We could not sign you in. Check your email and password.'); return; }
    setPassword('');
    const response = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || 'This account does not have admin access.');
      await supabase.auth.signOut();
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not send the invitation.');
      setInviteEmail(''); setInviteName('');
      setNotice(`Invitation sent to ${body.user.email}.`);
      await loadAdminData(session.access_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the invitation.');
    } finally { setBusy(false); }
  }

  async function setAccountEnabled(user: AdminUser) {
    if (!session || user.isAdmin) return;
    const enabled = !user.enabled;
    if (!enabled && !window.confirm(`Suspend access for ${user.email}? They will be signed out of the viewer.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not update account access.');
      setNotice(`${user.email} access ${enabled ? 'enabled' : 'suspended'}.`);
      await loadAdminData(session.access_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update account access.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (session) {
      await supabase.auth.signOut();
      window.location.assign('/admin');
    }
  }

  const filteredUsers = users.filter(user => `${user.email} ${user.name}`.toLowerCase().includes(search.toLowerCase()));
  const maxSessions = Math.max(1, ...analytics.dailySessions.map(item => item.sessions));

  if (!session) return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-mark"><ShieldCheck size={20} /><span>PRIME · KOPI SAIGON</span></div>
        <p className="admin-eyebrow">ADMINISTRATION</p>
        <h1>Admin access</h1>
        <p className="admin-intro">Sign in with your authorized administrator account to manage client access and usage.</p>
        {error && <p className="admin-alert" role="alert"><AlertCircle size={16}/>{error}</p>}
        <form onSubmit={handleAdminSignIn} className="admin-form">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" />
          <button className="admin-primary-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in to admin'}</button>
        </form>
        <a className="admin-back-link" href="/">Back to client login <ArrowUpRight size={14}/></a>
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><span className="admin-brand-icon"><Coffee size={19}/></span><span><strong>KOPI SAIGON</strong><small>ADMIN CONSOLE</small></span></a>
        <p className="admin-nav-label">WORKSPACE</p>
        <button className={`admin-nav-item ${panel === 'overview' ? 'active' : ''}`} onClick={() => setPanel('overview')}><Activity size={17}/> Usage overview</button>
        <button className={`admin-nav-item ${panel === 'accounts' ? 'active' : ''}`} onClick={() => setPanel('accounts')}><Users size={17}/> Client accounts <span>{users.filter(user => !user.isAdmin).length}</span></button>
        <div className="admin-sidebar-bottom"><span className="admin-secure-label"><ShieldCheck size={15}/> Admin verified</span><span className="admin-account-email">{session.user.email}</span></div>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">CLIENT OPERATIONS</p><h1>{panel === 'overview' ? 'Usage overview' : 'Client accounts'}</h1></div>
          <div className="admin-top-actions">
            <button className="admin-icon-button" aria-label="Refresh data" title="Refresh" disabled={loading} onClick={() => session && loadAdminData(session.access_token)}><RefreshCw size={17}/></button>
            <button className="admin-secondary-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
          </div>
        </header>
        {error && <p className="admin-alert" role="alert"><AlertCircle size={16}/>{error}</p>}
        {notice && <p className="admin-notice" role="status"><Check size={16}/>{notice}</p>}
        {loading && <p className="admin-loading"><RefreshCw size={15}/> Updating workspace…</p>}

        {panel === 'overview' ? <>
          <div className="admin-metric-grid">
            <article className="admin-metric-card"><span>CLIENT ACCOUNTS</span><strong>{analytics.clientAccounts}</strong><small>Invited and active</small><Users className="metric-icon" size={18}/></article>
            <article className="admin-metric-card"><span>ACTIVE · 7 DAYS</span><strong>{analytics.activeAccounts7d}</strong><small>Accounts with activity</small><Activity className="metric-icon" size={18}/></article>
            <article className="admin-metric-card"><span>SESSIONS · 30 DAYS</span><strong>{analytics.sessions30d}</strong><small>Viewer sessions started</small><Clock3 className="metric-icon" size={18}/></article>
            <article className="admin-metric-card"><span>NEVER SIGNED IN</span><strong>{analytics.neverSignedIn}</strong><small>Invites needing follow-up</small><MailPlus className="metric-icon" size={18}/></article>
          </div>
          <div className="admin-overview-grid">
            <section className="admin-panel-card admin-chart-card">
              <div className="admin-panel-heading"><div><h2>Sessions</h2><p>Daily sign-ins · last 14 days</p></div><span className="admin-period-chip">14 DAYS</span></div>
              <div className="admin-bar-chart" role="img" aria-label="Daily session starts over the last 14 days">
                {analytics.dailySessions.map(item => <div className="admin-bar-column" key={item.day} title={`${item.day}: ${item.sessions} sessions`}><span style={{ height: `${Math.max(item.sessions ? 10 : 3, Math.round(item.sessions / maxSessions * 100))}%` }} /><small>{item.day.slice(8)}</small></div>)}
              </div>
              {!analytics.sessions30d && <p className="admin-empty-hint">No client sessions yet. Invite a client to begin seeing usage.</p>}
            </section>
            <section className="admin-panel-card">
              <div className="admin-panel-heading"><div><h2>Feature activity</h2><p>Actions clients take in the viewer</p></div></div>
              {analytics.featureUsage.length ? <div className="admin-feature-list">{analytics.featureUsage.map(item => <div className="admin-feature-row" key={item.event}><span>{EVENT_LABELS[item.event] || item.event}</span><strong>{item.count}</strong></div>)}</div> : <p className="admin-empty-hint">Feature activity appears here after clients explore the map.</p>}
            </section>
          </div>
          <section className="admin-panel-card admin-recent-card">
            <div className="admin-panel-heading"><div><h2>Recent activity</h2><p>Recent client use · last 30 days</p></div><button className="admin-text-button" onClick={() => setPanel('accounts')}>Manage accounts <ArrowUpRight size={14}/></button></div>
            {analytics.recentActivity.length ? <div className="admin-activity-list">{analytics.recentActivity.map((item, index) => <div className="admin-activity-row" key={`${item.createdAt}-${index}`}><span className="admin-activity-dot"/><div><strong>{item.email}</strong><small>{EVENT_LABELS[item.event] || item.event}</small></div><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</div> : <p className="admin-empty-hint">No recorded client activity yet.</p>}
          </section>
        </> : <>
          <section className="admin-panel-card admin-invite-card">
            <div className="admin-panel-heading"><div><h2>Invite a client</h2><p>They’ll receive an email link to set their password.</p></div><MailPlus size={19}/></div>
            <form className="admin-invite-form" onSubmit={handleInvite}>
              <label><span>Client name</span><input value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Optional" maxLength={100}/></label>
              <label><span>Email address</span><input type="email" required value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="client@company.com"/></label>
              <button className="admin-primary-button" type="submit" disabled={busy}><MailPlus size={16}/>{busy ? 'Sending…' : 'Send invitation'}</button>
            </form>
          </section>
          <section className="admin-panel-card admin-users-card">
            <div className="admin-panel-heading"><div><h2>Accounts</h2><p>Enable or suspend access to the KOPI SAIGON viewer.</p></div><label className="admin-search"><Search size={15}/><input aria-label="Search accounts" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search email or name"/></label></div>
            <div className="admin-table-wrap"><table className="admin-users-table"><thead><tr><th>CLIENT</th><th>STATUS</th><th>LAST ACTIVE</th><th>ADDED</th><th></th></tr></thead><tbody>
              {filteredUsers.map(user => <tr key={user.id}><td><strong>{user.name || user.email}</strong>{user.name && <small>{user.email}</small>}</td><td><span className={`admin-status ${user.status}`}>{user.status === 'active' ? 'Active' : user.status === 'invited' ? 'Invited' : 'Suspended'}</span></td><td>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td>{user.isAdmin ? <span className="admin-role-label"><ShieldCheck size={14}/> Admin</span> : <button className={`admin-access-button ${user.enabled ? 'suspend' : 'enable'}`} disabled={busy} onClick={() => void setAccountEnabled(user)}>{user.enabled ? <><CirclePause size={15}/> Suspend</> : <><CirclePlay size={15}/> Enable</>}</button>}</td></tr>)}
              {!filteredUsers.length && <tr><td colSpan={5} className="admin-empty-cell">{search ? 'No accounts match this search.' : 'No accounts yet. Send your first invitation above.'}</td></tr>}
            </tbody></table></div>
          </section>
        </>}
        <footer className="admin-footer"><span>Usage is tied to signed-in client accounts.</span><span>{analytics.totalEvents30d.toLocaleString()} tracked actions · last 30 days</span></footer>
      </section>
    </main>
  );
}