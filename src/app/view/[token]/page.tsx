'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPinned, RotateCcw } from 'lucide-react';
import { MapCanvas } from '../../../components/map/MapCanvas';
import { useMapStore } from '../../../store/useMapStore';

type Camera = { center: [number, number]; zoom: number; pitch?: number; bearing?: number };
type Published = { project_name: string; snapshot: { camera: Camera; basemap: string; features: any[]; layer_visibilities: Record<string, boolean> }; navigation: { title: string; description?: string; camera: Camera }[] };

export default function ViewerPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Published | null>(null);
  const [error, setError] = useState('');
  const [map, setMap] = useState<any>(null);
  const [active, setActive] = useState(-1);
  const { setFeatures, setBasemap, setVisibility } = useMapStore();

  useEffect(() => {
    if (token === 'local-preview') {
      try {
        const preview = JSON.parse(localStorage.getItem('atlas_viewer_preview') || 'null');
        if (!preview?.snapshot) throw new Error('Create a preview from the editor first.');
        setData(preview);
        useMapStore.getState().setFeatures((preview.snapshot.features || []).filter((f: any) => f.props?.visible !== 0), false);
        if (preview.snapshot.basemap) useMapStore.getState().setBasemap(preview.snapshot.basemap);
        Object.entries(preview.snapshot.layer_visibilities || {}).forEach(([key, value]) => setVisibility(key, Boolean(value)));
      } catch (e) { setError(e instanceof Error ? e.message : 'Local preview is unavailable.'); }
      return;
    }
    fetch(`/api/public-view/${encodeURIComponent(token)}`, { cache: 'no-store' }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error || 'This viewer link is unavailable.');
      setData(body);
      useMapStore.getState().setFeatures((body.snapshot.features || []).filter((f: any) => f.props?.visible !== 0), false);
      if (body.snapshot.basemap) useMapStore.getState().setBasemap(body.snapshot.basemap);
      Object.entries(body.snapshot.layer_visibilities || {}).forEach(([key, value]) => setVisibility(key, Boolean(value)));
    }).catch(e => setError(e.message));
  }, [token]);

  const stops = useMemo(() => data?.navigation || [], [data]);
  const goTo = (index: number) => {
    const camera = index < 0 ? data?.snapshot.camera : stops[index]?.camera;
    if (!camera || !map) return;
    map.flyTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch ?? 0, bearing: camera.bearing ?? 0, duration: 1000 });
    setActive(index);
  };

  if (error) return <main className="grid min-h-screen place-items-center bg-[#0a1628] p-6 text-white"><section className="max-w-md rounded-2xl border border-white/10 bg-[#111b2b] p-7 text-center"><MapPinned className="mx-auto mb-3 text-sky-300"/><h1 className="text-xl font-semibold">Viewer link unavailable</h1><p className="mt-2 text-sm text-slate-400">{error}</p></section></main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-[#0a1628] text-slate-300">Loading published map…</main>;

  return <main className="relative h-screen w-screen overflow-hidden bg-[#0a1628] text-white">
    <MapCanvas onMapReady={mapRef => { setMap(mapRef); mapRef.getCanvas().style.cursor = 'grab'; }} readOnly initialView={data.snapshot.camera}/>
    <header className="absolute left-4 right-4 top-4 z-[1000] flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#08111e]/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex min-w-0 items-center gap-3"><MapPinned className="shrink-0 text-sky-300"/><div className="min-w-0"><p className="truncate font-semibold">{data.project_name}</p><p className="text-xs text-slate-400">Atlas viewer · published snapshot</p></div></div>
      <button onClick={() => goTo(-1)} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10">Overview</button>
    </header>
    {stops.length > 0 && <section className="absolute bottom-5 left-1/2 z-[1000] w-[min(720px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#08111e]/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{active < 0 ? 'Overview' : stops[active]?.title}</p><p className="truncate text-xs text-slate-400">{active < 0 ? 'Explore the published map' : stops[active]?.description || 'Map stop'}</p></div><div className="flex shrink-0 gap-2"><button aria-label="Previous stop" disabled={active <= -1} onClick={() => goTo(active - 1)} className="rounded-lg border border-white/15 p-2 disabled:opacity-40"><ChevronLeft size={17}/></button><button aria-label="Next stop" disabled={active >= stops.length - 1} onClick={() => goTo(active < 0 ? 0 : active + 1)} className="rounded-lg border border-white/15 p-2 disabled:opacity-40"><ChevronRight size={17}/></button><button aria-label="Return to overview" onClick={() => goTo(-1)} className="rounded-lg border border-white/15 p-2"><RotateCcw size={16}/></button></div></div>
      <nav className="flex gap-2 overflow-x-auto">{stops.map((stop, i) => <button key={`${stop.title}-${i}`} onClick={() => goTo(i)} className={`shrink-0 rounded-lg px-3 py-2 text-xs ${active === i ? 'bg-sky-400 text-slate-950' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}>{i + 1}. {stop.title}</button>)}</nav>
    </section>}
  </main>;
}
