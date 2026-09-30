'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPinned, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      router.replace('/'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen grid place-items-center bg-[#0a1628] text-white px-5">
    <form onSubmit={submit} className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#111b2b] p-7 shadow-2xl">
      <div className="mb-7 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><MapPinned size={22}/></div><div><h1 className="text-xl font-semibold">Project Atlas</h1><p className="text-sm text-slate-400">Editor access</p></div></div>
      <label className="mb-1.5 block text-sm text-slate-300" htmlFor="email">Work email</label>
      <input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@primephilippines.com" className="mb-4 w-full rounded-lg border border-white/15 bg-[#08111e] px-3.5 py-3 text-sm outline-none focus:border-sky-400"/>
      <label className="mb-1.5 block text-sm text-slate-300" htmlFor="password">Editor password</label>
      <div className="relative mb-5"><LockKeyhole size={16} className="absolute left-3.5 top-3.5 text-slate-500"/><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-white/15 bg-[#08111e] py-3 pl-10 pr-3.5 text-sm outline-none focus:border-sky-400"/></div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in to Atlas'}</button>
      <p className="mt-4 text-center text-xs text-slate-500">Use your @primephilippines.com work email.</p>
    </form>
  </main>;
}
