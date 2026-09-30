'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Link2, Plus, Share2, Trash2, X } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

type Camera = { center: [number, number]; zoom: number; pitch: number; bearing: number };
type Stop = { title: string; description: string; camera: Camera };

function cameraAt(map: any): Camera {
  const c = map.getCenter();
  return { center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
}

export function PublishViewerModal({ open, onClose, projectId, projectName, mapInstance }: { open: boolean; onClose: () => void; projectId: string | null; projectName: string; mapInstance: any }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !projectId) return;
    setUrl(''); setMessage('');
    fetch(`/api/viewer-links?project_id=${encodeURIComponent(projectId)}`).then(async r => r.ok ? r.json() : null).then(existing => {
      if (!existing || existing.revoked_at) return;
      setUrl(`${window.location.origin}/view/${existing.token}`);
      setStops(Array.isArray(existing.navigation) ? existing.navigation : []);
    });
  }, [open, projectId]);

  if (!open) return null;
  const addStop = () => {
    const cleanTitle = title.trim();
    if (!mapInstance || !cleanTitle) { setMessage('Enter a name and make sure the map is ready.'); return; }
    if (stops.length >= 20) { setMessage('A presentation can have up to 20 named stops.'); return; }
    setStops([...stops, { title: cleanTitle.slice(0, 60), description: description.trim().slice(0, 180), camera: cameraAt(mapInstance) }]);
    setTitle(''); setDescription(''); setMessage('');
  };
  const moveStop = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops]; [next[index], next[target]] = [next[target], next[index]]; setStops(next);
  };
  const publish = async () => {
    if (!projectId || !mapInstance) { setMessage('Save this project to the cloud before publishing.'); return; }
    setBusy(true); setMessage('');
    try {
      const state = useMapStore.getState();
      const visibleFeatures = state.features.filter(f => f.props.visible !== 0);
      const payload = { project_id: projectId, project_name: projectName, snapshot: { camera: cameraAt(mapInstance), basemap: state.currentBasemap, features: visibleFeatures, custom_groups: state.customGroups, layer_visibilities: state.visibilities }, navigation: stops };
      const response = await fetch('/api/viewer-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not publish.');
      setUrl(result.url); setMessage('Published snapshot updated.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not publish.'); }
    finally { setBusy(false); }
  };
  const preview = () => {
    if (!mapInstance) { setMessage('Wait for the map to finish loading, then preview again.'); return; }
    const state = useMapStore.getState();
    const localPreview = { project_name: projectName, snapshot: { camera: cameraAt(mapInstance), basemap: state.currentBasemap, features: state.features.filter(f => f.props.visible !== 0), custom_groups: state.customGroups, layer_visibilities: state.visibilities }, navigation: stops };
    localStorage.setItem('atlas_viewer_preview', JSON.stringify(localPreview));
    window.open('/view/local-preview', '_blank', 'noopener,noreferrer');
  };
  const revoke = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const response = await fetch('/api/viewer-links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId }) });
      if (!response.ok) throw new Error();
      setUrl(''); setStops([]); setMessage('Viewer link revoked.');
    } catch { setMessage('Could not revoke this link.'); }
    finally { setBusy(false); }
  };
  const copyLink = async () => { await navigator.clipboard.writeText(url); setMessage('Viewer link copied.'); };

  return <div className="fixed inset-0 z-[2500] grid place-items-center bg-black/65 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="viewer-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1726] p-5 text-white shadow-2xl">
      <header className="mb-5 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Share2 size={20}/></div><div><h2 id="viewer-title" className="font-semibold">Publish viewer link</h2><p className="text-xs text-slate-400">View only · updates only when you publish again</p></div></div><button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={18}/></button></header>
      <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-300"><b className="text-white">Overview</b> is captured from the current map view. Add named stops by navigating the map, then saving each view.</p>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_auto]"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Stop name" maxLength={60} className="min-w-0 rounded-lg border border-white/15 bg-[#08111e] px-3 py-2.5 text-sm outline-none focus:border-sky-400"/><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short note (optional)" maxLength={180} className="min-w-0 rounded-lg border border-white/15 bg-[#08111e] px-3 py-2.5 text-sm outline-none focus:border-sky-400"/><button onClick={addStop} className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10"><Plus size={16}/> Add stop</button></div>
      <div className="mb-5 max-h-48 space-y-2 overflow-y-auto">{stops.map((stop, i)=><div key={`${stop.title}-${i}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"><span className="w-6 text-xs text-slate-500">{i+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{stop.title}</p>{stop.description && <p className="truncate text-xs text-slate-400">{stop.description}</p>}</div><button title="Move up" onClick={()=>moveStop(i,-1)} className="p-1.5 text-slate-400 hover:text-white"><ChevronUp size={16}/></button><button title="Move down" onClick={()=>moveStop(i,1)} className="p-1.5 text-slate-400 hover:text-white"><ChevronDown size={16}/></button><button title="Remove stop" onClick={()=>setStops(stops.filter((_,j)=>j!==i))} className="p-1.5 text-slate-400 hover:text-rose-300"><Trash2 size={15}/></button></div>)}</div>
      {url && <div className="mb-4 flex min-w-0 items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/5 p-3"><Link2 size={16} className="shrink-0 text-sky-300"/><a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-sky-200">{url}</a><button onClick={copyLink} title="Copy link" className="shrink-0 rounded-lg p-2 hover:bg-white/10"><Copy size={16}/></button></div>}
      {message && <p role="status" className="mb-3 flex items-center gap-2 text-xs text-slate-300">{message.includes('Published') && <Check size={15} className="text-emerald-300"/>}{message}</p>}
      <footer className="flex flex-col-reverse justify-between gap-2 sm:flex-row"><div className="flex items-center">{url && <button disabled={busy} onClick={revoke} className="rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-300/10 disabled:opacity-50">Revoke link</button>}</div><div className="flex flex-col-reverse gap-2 sm:flex-row"><button onClick={preview} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/10">Preview viewer</button><button disabled={busy || !projectId || projectId.startsWith('local-')} onClick={publish} title={!projectId || projectId.startsWith('local-') ? 'Save this as a cloud project before publishing a share link.' : undefined} className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Publishing…' : url ? 'Republish snapshot' : 'Publish snapshot'}</button></div></footer>
    </section>
  </div>;
}
