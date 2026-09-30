'use client';

import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Coffee, Compass, ExternalLink, LoaderCircle, MapPinned, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Feature as GeoFeature, FeatureCollection, Geometry } from 'geojson';
import { ALL_STYLES, VIS_MAP } from '../gis/map';
import 'maplibre-gl/dist/maplibre-gl.css';

type AtlasFeature = { id: number; name: string; kind: string; geometry: Geometry; props?: Record<string, any> };
type AtlasProject = { id: string; name: string; basemap?: string; center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; features?: AtlasFeature[]; layer_visibilities?: Record<string, boolean>; updated_at?: string };
type Stop = { id: string; title: string; subtitle: string; featureIds: number[]; match: (f: AtlasFeature) => boolean };
const PROJECT_NAME = 'KOPI SAIGON';
const PROJECT_ID = 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7';
const DEFAULT_SUPABASE_URL = 'https://cyczyaswxkpdcremqnkn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR';

function addProjectLayers(map: MapLibreMap, features: AtlasFeature[], selectedId: string) {
  const active = makeStops(features).find(stop => stop.id === selectedId);
  map.addSource('kopi-features', { type: 'geojson', data: featureCollection(features, active ? new Set(active.featureIds) : undefined) });
  map.addLayer({ id: 'kopi-areas-fill', type: 'fill', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'selected'], 0.16, 0.035] } });
  map.addLayer({ id: 'kopi-areas-line', type: 'line', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']]], paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 2.2, 1], 'line-opacity': ['case', ['get', 'selected'], 0.9, 0.24] } });
  map.addLayer({ id: 'kopi-poi-dots', type: 'circle', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 15, 7], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#f7f8fa', 'circle-stroke-width': 1.5, 'circle-opacity': ['case', ['get', 'selected'], 0.96, 0.18] } });
  map.addLayer({ id: 'kopi-poi-labels', type: 'symbol', source: 'kopi-features', filter: ['all', ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]], ['!=', ['get', 'label'], '']], layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 13], 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-max-width': 12, 'text-optional': true }, paint: { 'text-color': '#f0f6fc', 'text-halo-color': '#0a1628', 'text-halo-width': 1.5, 'text-opacity': ['case', ['get', 'selected'], 0.95, 0.22] }, minzoom: 13 });
}

function positions(geometry: Geometry): number[][] {
  const out: number[][] = [];
  const visit = (value: any): void => {
    if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') out.push([value[0], value[1]]);
    else if (Array.isArray(value)) value.forEach(visit);
  };
  if (geometry.type === 'GeometryCollection') geometry.geometries.forEach(g => out.push(...positions(g)));
  else visit((geometry as any).coordinates);
  return out;
}

function featureCollection(features: AtlasFeature[], selectedIds?: Set<number>): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    features: features.filter(f => f?.geometry && f.props?.visible !== 0).map(f => ({
      type: 'Feature', id: f.id,
      geometry: f.geometry,
      properties: {
        id: f.id, name: f.name || 'Unnamed place', kind: f.kind,
        color: f.props?.color || f.props?.fillColor || '#39c6be',
        label: f.props?.showLabel === false ? '' : (f.name || ''),
        category: f.props?.amenityGroupLabel || f.props?.category || f.props?.poiType || f.kind,
        selected: !selectedIds || selectedIds.has(f.id),
      },
    })) as GeoFeature<Geometry>[],
  };
}

function makeStops(features: AtlasFeature[]): Stop[] {
  const stops: Stop[] = [];
  const areas = new Map<string, number[]>();
  const types = new Map<string, number[]>();
  for (const f of features) {
    for (const label of (f.props?.searchAreaLabels || []) as string[]) {
      const name = String(label).trim();
      if (name) areas.set(name, [...(areas.get(name) || []), f.id]);
    }
    if (f.kind === 'marker' && f.geometry?.type === 'Point') {
      const name = String(f.props?.amenityGroupLabel || f.props?.category || f.props?.poiType || 'Other places').trim();
      types.set(name, [...(types.get(name) || []), f.id]);
    }
  }
  for (const [title, ids] of [...areas.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    stops.push({ id: `area:${title}`, title, subtitle: `${ids.length} places in this search area`, featureIds: [...new Set(ids)], match: f => (f.props?.searchAreaLabels || []).includes(title) });
  }
  for (const [title, ids] of [...types.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    stops.push({ id: `type:${title}`, title, subtitle: `${ids.length} mapped places`, featureIds: [...new Set(ids)], match: f => f.kind === 'marker' && String(f.props?.amenityGroupLabel || f.props?.category || f.props?.poiType || 'Other places') === title });
  }
  return stops;
}

export default function KopiSaigonPage() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const sourceReady = useRef(false);
  const selectedRef = useRef('overview');
  const styleNameRef = useRef('');
  const editorCameraRef = useRef('');
  const [project, setProject] = useState<AtlasProject | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('overview');
  const [menuOpen, setMenuOpen] = useState(true);
  const features = useMemo(() => project?.features || [], [project]);
  const stops = useMemo(() => makeStops(features), [features]);

  const refreshMap = useCallback((focus?: Stop) => {
    const map = mapRef.current;
    if (!map || !sourceReady.current) return;
    const chosen = focus ? new Set(focus.featureIds) : undefined;
    const source = map.getSource('kopi-features') as maplibregl.GeoJSONSource | undefined;
    source?.setData(featureCollection(features, chosen));
    const targetFeatures = focus ? features.filter(f => focus.match(f)) : features;
    const points = targetFeatures.flatMap(f => positions(f.geometry));
    if (points.length) {
      const bounds = new LngLatBounds(points[0] as [number, number], points[0] as [number, number]);
      points.slice(1).forEach(p => bounds.extend(p as [number, number]));
      if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 80) map.flyTo({ center: points[0] as [number, number], zoom: 16.5, speed: 0.9 });
      else map.fitBounds(bounds, { padding: { top: 105, bottom: 90, left: menuOpen ? 420 : 90, right: 100 }, maxZoom: 16, duration: 1100 });
    }
  }, [features, menuOpen]);

  const loadProject = useCallback(async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
      const query = new URLSearchParams({ select: '*', id: `eq.${PROJECT_ID}`, limit: '1' });
      const response = await fetch(`${url}/rest/v1/map_projects?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Atlas could not read the KOPI SAIGON project. Check Supabase read permissions.' : `Could not load the KOPI SAIGON project (HTTP ${response.status}).`);
      const projects = await response.json() as AtlasProject[];
      if (!projects.length) throw new Error(`KOPI SAIGON project ${PROJECT_ID} was not found or is not readable.`);
      const latest = projects[0];
      if (latest.id !== PROJECT_ID) throw new Error('The KOPI SAIGON viewer received an unexpected project.');
      setProject(current => current && current.updated_at === latest.updated_at ? current : latest);
      setError('');
    } catch (err) {
      setError(current => current || (err instanceof Error ? err.message : 'Could not load the KOPI SAIGON project.'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadProject();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadProject();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadProject]);

  useEffect(() => {
    if (!project || !mapNode.current || mapRef.current) return;
    const styleName = project.basemap || 'Midnight Blue';
    styleNameRef.current = styleName;
    editorCameraRef.current = JSON.stringify([project.center, project.zoom, project.pitch, project.bearing]);
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: ALL_STYLES[styleName] || ALL_STYLES['Midnight Blue'],
      center: project.center || [120.9842, 14.5995], zoom: project.zoom || 12, pitch: project.pitch || 0, bearing: project.bearing || 0,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      addProjectLayers(map, features, selectedRef.current);
      Object.entries(VIS_MAP).forEach(([key, layerIds]) => {
        const visible = project.layer_visibilities?.[key] !== false;
        layerIds.forEach(layerId => { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none'); });
      });
      sourceReady.current = true;
    });
    map.on('click', 'kopi-poi-dots', e => {
      const f = e.features?.[0]; if (!f || !e.lngLat) return;
      const name = String(f.properties?.name || 'Place');
      new maplibregl.Popup({ closeButton: true, offset: 12, className: 'kopi-popup' }).setLngLat(e.lngLat).setHTML(`<strong>${name.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))}</strong>`).addTo(map);
    });
    map.on('mouseenter', 'kopi-poi-dots', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'kopi-poi-dots', () => { map.getCanvas().style.cursor = ''; });
    mapRef.current = map;
    return () => { sourceReady.current = false; mapRef.current = null; map.remove(); };
  }, [project?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!project || !map) return;
    const stop = makeStops(features).find(item => item.id === selectedRef.current);
    const updateSource = () => {
      const source = map.getSource('kopi-features') as maplibregl.GeoJSONSource | undefined;
      source?.setData(featureCollection(features, stop ? new Set(stop.featureIds) : undefined));
    };
    const desiredStyle = project.basemap || 'Midnight Blue';
    const editorCamera = JSON.stringify([project.center, project.zoom, project.pitch, project.bearing]);
    if (map.isStyleLoaded() && editorCamera !== editorCameraRef.current) {
      editorCameraRef.current = editorCamera;
      map.easeTo({ center: project.center || [120.9842, 14.5995], zoom: project.zoom || 12, pitch: project.pitch || 0, bearing: project.bearing || 0, duration: 850 });
    }
    if (sourceReady.current && styleNameRef.current !== desiredStyle) {
      styleNameRef.current = desiredStyle;
      sourceReady.current = false;
      map.once('style.load', () => { addProjectLayers(map, features, selectedRef.current); sourceReady.current = true; });
      map.setStyle(ALL_STYLES[desiredStyle] || ALL_STYLES['Midnight Blue']);
    } else updateSource();
  }, [features, project]);

  const navigate = (stop?: Stop) => {
    selectedRef.current = stop?.id || 'overview';
    setSelected(stop?.id || 'overview');
    refreshMap(stop);
    setMenuOpen(true);
  };
  const selectedStop = stops.find(s => s.id === selected);
  const visibleCount = selectedStop ? selectedStop.featureIds.length : features.length;

  return <main className="viewer-shell">
    <div ref={mapNode} className="map-canvas" aria-label="KOPI SAIGON competitor map" />
    <header className="topbar"><a className="brand" href="#overview" onClick={e => { e.preventDefault(); navigate(); }}><span className="brand-mark"><Coffee size={19}/></span><span><strong>KOPI SAIGON</strong><small>COMPETITOR LANDSCAPE</small></span></a><div className="top-actions"><span className="live-pill"><i/> LIVE VIEW</span><button className="icon-button menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(v => !v)}><MapPinned size={18}/></button></div></header>
    <aside className={`navigation ${menuOpen ? 'is-open' : 'is-closed'}`}>
      <div className="nav-heading"><div><span className="eyebrow">ATLAS PRESENTATION</span><h1>{project?.name || PROJECT_NAME}</h1><p>{loading ? 'Connecting to Atlas…' : `${features.length.toLocaleString()} mapped places and features`}</p></div><button className="icon-button nav-collapse" aria-label="Collapse navigation" onClick={() => setMenuOpen(false)}><ChevronLeft size={18}/></button></div>
      {loading && <div className="state-card"><LoaderCircle className="spin" size={21}/> Loading project from Atlas…</div>}
      {error && <div className="state-card state-error"><strong>Map unavailable</strong><p>{error}</p><button onClick={() => location.reload()}>Try again</button></div>}
      {project && <>
        <button className={`nav-item overview-item ${selected === 'overview' ? 'active' : ''}`} onClick={() => navigate()}><span className="nav-icon"><Compass size={17}/></span><span><b>Overview</b><small>Full competitor map</small></span><span className="nav-count">{features.length}</span></button>
        {stops.some(s => s.id.startsWith('area:')) && <div className="nav-section"><span className="eyebrow">SEARCH AREAS</span>{stops.filter(s => s.id.startsWith('area:')).map(stop => <button key={stop.id} className={`nav-item ${selected === stop.id ? 'active' : ''}`} onClick={() => navigate(stop)}><span className="nav-icon"><MapPinned size={16}/></span><span><b>{stop.title}</b><small>{stop.subtitle}</small></span><ChevronRight className="nav-chevron" size={15}/></button>)}</div>}
        {stops.some(s => s.id.startsWith('type:')) && <div className="nav-section"><span className="eyebrow">PLACE TYPES</span>{stops.filter(s => s.id.startsWith('type:')).map(stop => <button key={stop.id} className={`nav-item ${selected === stop.id ? 'active' : ''}`} onClick={() => navigate(stop)}><span className="nav-icon"><Coffee size={16}/></span><span><b>{stop.title}</b><small>{stop.subtitle}</small></span><ChevronRight className="nav-chevron" size={15}/></button>)}</div>}
        <div className="nav-foot"><div className="active-view"><span className="eyebrow">CURRENT VIEW</span><b>{selectedStop?.title || 'Overview'}</b><small>{visibleCount.toLocaleString()} places and features</small></div><div className="stepper"><button aria-label="Previous view" onClick={() => { const i = selected === 'overview' ? 0 : stops.findIndex(s => s.id === selected); navigate(i > 0 ? stops[i - 1] : undefined); }}><ArrowUp size={16}/></button><button aria-label="Next view" onClick={() => { const i = selected === 'overview' ? -1 : stops.findIndex(s => s.id === selected); navigate(stops[Math.min(stops.length - 1, i + 1)]); }}><ArrowDown size={16}/></button><button aria-label="Reset map view" onClick={() => navigate()}><RotateCcw size={16}/></button></div></div>
      </>}
    </aside>
    {!menuOpen && project && <button className="reopen-nav" onClick={() => setMenuOpen(true)}><MapPinned size={16}/> Explore map <ChevronRight size={16}/></button>}
    <div className="map-caption"><span className="caption-dot"/><span>{selectedStop ? selectedStop.title : 'KOPI SAIGON · Competitor overview'}</span><span className="caption-divider"/><span>{visibleCount.toLocaleString()} places</span></div>
    <a className="atlas-credit" href="https://project-atlas-next.vercel.app" target="_blank" rel="noreferrer">Powered by Atlas <ExternalLink size={12}/></a>
    <div className="map-hint"><span>Click any point to see its name</span><button onClick={() => navigate()} aria-label="Show all map features"><RotateCcw size={15}/></button></div>
  </main>;
}
