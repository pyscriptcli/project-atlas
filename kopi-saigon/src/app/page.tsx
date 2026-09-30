'use client';

import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Coffee, Compass, ExternalLink, LoaderCircle, MapPinned, RotateCcw, Table2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Feature as GeoFeature, FeatureCollection, Geometry } from 'geojson';
import { ALL_STYLES, VIS_MAP } from '../gis/map';
import 'maplibre-gl/dist/maplibre-gl.css';

type AtlasFeature = { id: number; name: string; kind: string; geometry: Geometry; props?: Record<string, any> };
type AtlasProject = { id: string; name: string; basemap?: string; center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; features?: AtlasFeature[]; layer_visibilities?: Record<string, boolean>; updated_at?: string };
type Stop = { id: string; title: string; subtitle: string; featureIds: number[]; match: (f: AtlasFeature) => boolean };
type PriceTier = 'high' | 'mid' | 'low';
const PROJECT_NAME = 'KOPI SAIGON';
const PROJECT_ID = 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7';
const DEFAULT_SUPABASE_URL = 'https://cyczyaswxkpdcremqnkn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR';

function addProjectLayers(map: MapLibreMap, features: AtlasFeature[], selectedId: string) {
  ['kopi-areas-fill', 'kopi-areas-line', 'kopi-poi-dots', 'kopi-poi-labels'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
  if (map.getSource('kopi-features')) map.removeSource('kopi-features');
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

function formatResearchPrice(value: unknown, currency: 'PHP' | 'MYR'): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!raw || /^(unknown|unclear|not available|n\/?a|—|-)$/i.test(raw)) return null;
  const withoutCurrency = raw.replace(currency === 'PHP' ? /(?:\bPHP\b|₱)\s*/gi : /(?:\bMYR\b|\bRM\b)\s*/gi, '').trim();
  const range = withoutCurrency.replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1–');
  return range ? `${currency} ${range}` : null;
}

function getPriceRanges(feature: AtlasFeature): { php: string | null; myr: string | null } {
  const research = feature.props?.researchData;
  if (!research || typeof research !== 'object') return { php: null, myr: null };
  return {
    php: formatResearchPrice(research.priceRangePhp ?? research.priceRangePHP, 'PHP'),
    myr: formatResearchPrice(research.priceRangeMyr ?? research.priceRangeMYR, 'MYR'),
  };
}

function getPriceLabel(feature: AtlasFeature): string {
  const { php, myr } = getPriceRanges(feature);
  return php || myr ? `${php || 'PHP —'} / ${myr || 'MYR —'}` : 'Price not available';
}

function getLocationLabel(feature: AtlasFeature): string {
  const tags = feature.props?.osmTags || {};
  const address = tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', ');
  return String(address || '').trim() || 'View on Google Maps';
}

function getGoogleMapsUrl(feature: AtlasFeature): string {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
  url.searchParams.set('query', point && point.every(Number.isFinite) ? `${point[1]},${point[0]}` : feature.name);
  return url.toString();
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
        priceLabel: getPriceLabel(f),
        selected: !selectedIds || selectedIds.has(f.id),
      },
    })) as GeoFeature<Geometry>[],
  };
}

function getPricePhp(feature: AtlasFeature): number | null {
  const research = feature.props?.researchData;
  if (!research || typeof research !== 'object') return null;
  const rawRange = research.priceRangePhp ?? research.priceRangePHP;
  if (rawRange != null) {
    const values = String(rawRange).match(/\d+(?:[,.]\d+)?/g)?.map(value => Number(value.replace(',', ''))).filter(Number.isFinite) || [];
    if (values.length) return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  const menuPrices = research.menuPrices;
  if (Array.isArray(menuPrices)) {
    const values = menuPrices.flatMap((entry: any) => {
      if (!entry || typeof entry !== 'object' || !/^(PHP|₱|P)$/i.test(String(entry.currency || ''))) return [];
      const match = String(entry.amount ?? entry.price ?? '').match(/\d+(?:[,.]\d+)?/);
      return match ? [Number(match[0].replace(',', ''))] : [];
    }).filter(Number.isFinite);
    if (values.length) return values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
  }
  return null;
}

function getExplicitPriceTier(feature: AtlasFeature): PriceTier | null {
  const research = feature.props?.researchData;
  const value = String(research?.priceTier ?? research?.priceLevel ?? '').trim().toLowerCase();
  if (value === 'high' || value === 'premium' || value === 'expensive') return 'high';
  if (value === 'mid' || value === 'medium' || value === 'moderate') return 'mid';
  if (value === 'low' || value === 'budget' || value === 'affordable') return 'low';
  return null;
}

function makeStops(features: AtlasFeature[]): Stop[] {
  const places = features.filter(feature => feature.kind === 'marker' && feature.geometry?.type === 'Point');
  const ranked = places.filter(feature => getExplicitPriceTier(feature) == null && getPricePhp(feature) != null)
    .sort((a, b) => (getPricePhp(a) || 0) - (getPricePhp(b) || 0));
  const inferred = new Map<number, PriceTier>();
  ranked.forEach((feature, index) => {
    const percentile = (index + 0.5) / ranked.length;
    inferred.set(feature.id, percentile < 1 / 3 ? 'low' : percentile < 2 / 3 ? 'mid' : 'high');
  });
  const tierFor = (feature: AtlasFeature): PriceTier | null => getExplicitPriceTier(feature) || inferred.get(feature.id) || null;
  return (['high', 'mid', 'low'] as const).map(tier => {
    const matching = places.filter(feature => tierFor(feature) === tier);
    const title = `${tier[0].toUpperCase()}${tier.slice(1)} tier`;
    return {
      id: `tier:${tier}`, title, subtitle: `${matching.length} places · ${tier} recorded coffee prices`,
      featureIds: matching.map(feature => feature.id), match: feature => tierFor(feature) === tier,
    };
  });
}

const FALLBACK_OSM_STYLE = {
  version: 8 as const,
  sources: { fallback: { type: 'raster' as const, tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 } },
  layers: [
    { id: 'fallback-background', type: 'background' as const, paint: { 'background-color': '#e9e7df' } },
    { id: 'fallback-osm', type: 'raster' as const, source: 'fallback' },
  ],
};

export default function KopiSaigonPage() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tableDialogRef = useRef<HTMLDialogElement>(null);
  const sourceReady = useRef(false);
  const selectedRef = useRef('overview');
  const styleNameRef = useRef('');
  const editorCameraRef = useRef('');
  const [project, setProject] = useState<AtlasProject | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('overview');
  const [menuOpen, setMenuOpen] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);
  const features = useMemo(() => project?.features || [], [project]);
  const stops = useMemo(() => makeStops(features), [features]);
  const tierGroups = useMemo(() => stops.map(stop => ({
    stop,
    places: features.filter(stop.match).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
  })), [features, stops]);
  const tableCount = tierGroups.reduce((total, group) => total + group.places.length, 0);

  useEffect(() => {
    const dialog = tableDialogRef.current;
    if (!dialog) return;
    if (tableOpen && !dialog.open) dialog.showModal();
    if (!tableOpen && dialog.open) dialog.close();
  }, [tableOpen]);

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

  useEffect(() => {
    if (sourceReady.current) refreshMap(stops.find(stop => stop.id === selectedRef.current));
  }, [menuOpen, refreshMap, stops]);

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
      // Atlas is the source of truth. Compare the full row as a fallback in
      // case two saves share the same timestamp precision.
      setProject(current => current && JSON.stringify(current) === JSON.stringify(latest) ? current : latest);
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
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadProject();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
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
    let fallbackApplied = false;
    const switchToOsmFallback = () => {
      if (fallbackApplied) return;
      fallbackApplied = true;
      sourceReady.current = false;
      map.once('style.load', () => {
        addProjectLayers(map, features, selectedRef.current);
        Object.entries(VIS_MAP).forEach(([key, layerIds]) => {
          const visible = project.layer_visibilities?.[key] !== false;
          layerIds.forEach(layerId => { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none'); });
        });
        sourceReady.current = true;
        const visibleSource = map.getSource('kopi-features') as maplibregl.GeoJSONSource | undefined;
        visibleSource?.setData(featureCollection(features));
      });
      map.setStyle(FALLBACK_OSM_STYLE as any);
    };
    map.on('error', event => {
      console.error('KOPI SAIGON map error:', event.error);
      switchToOsmFallback();
    });
    map.on('load', () => {
      addProjectLayers(map, features, selectedRef.current);
      Object.entries(VIS_MAP).forEach(([key, layerIds]) => {
        const visible = project.layer_visibilities?.[key] !== false;
        layerIds.forEach(layerId => { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none'); });
      });
      sourceReady.current = true;
      const coordinates = features.flatMap(feature => positions(feature.geometry));
      if (coordinates.length) {
        const bounds = new LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
        coordinates.slice(1).forEach(point => bounds.extend(point as [number, number]));
        map.fitBounds(bounds, { padding: { top: 100, bottom: 90, left: menuOpen ? 390 : 90, right: 90 }, maxZoom: 15.5, duration: 0 });
      }
      map.once('idle', () => {
        const basemapLayers = ['landcover', 'landuse', 'park', 'water', 'rd_major', 'rd_secondary', 'label_city']
          .filter(layerId => map.getLayer(layerId));
        if (basemapLayers.length && map.queryRenderedFeatures({ layers: basemapLayers }).length === 0) switchToOsmFallback();
      });
    });
    map.on('click', 'kopi-poi-dots', e => {
      const f = e.features?.[0]; if (!f || !e.lngLat) return;
      const name = String(f.properties?.name || 'Unnamed place');
      const price = String(f.properties?.priceLabel || 'Price not available');
      const coordinates = f.geometry.type === 'Point' ? f.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat];
      const mapsUrl = new URL('https://www.google.com/maps/search/');
      mapsUrl.searchParams.set('api', '1');
      mapsUrl.searchParams.set('query', `${coordinates[1]},${coordinates[0]}`);
      const card = document.createElement('div');
      card.className = 'poi-card';
      const heading = document.createElement('strong');
      heading.className = 'poi-card-name';
      heading.textContent = name;
      const priceLabel = document.createElement('span');
      priceLabel.className = 'poi-card-kicker';
      priceLabel.textContent = 'COFFEE PRICE';
      const priceValue = document.createElement('span');
      priceValue.className = 'poi-card-price';
      priceValue.textContent = price;
      const mapsLink = document.createElement('a');
      mapsLink.className = 'poi-card-link';
      mapsLink.href = mapsUrl.toString();
      mapsLink.target = '_blank';
      mapsLink.rel = 'noopener noreferrer';
      mapsLink.textContent = 'View in Google Maps ↗';
      card.append(heading, priceLabel, priceValue, mapsLink);
      new maplibregl.Popup({ closeButton: true, offset: 12, className: 'kopi-popup' }).setLngLat(e.lngLat).setDOMContent(card).addTo(map);
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
    <div ref={mapNode} className="map-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-label="KOPI SAIGON competitor map" />
    <header className="topbar"><a className="brand" href="#overview" onClick={e => { e.preventDefault(); navigate(); }}><span className="brand-mark"><Coffee size={19}/></span><span><strong>KOPI SAIGON</strong><small>COMPETITOR LANDSCAPE</small></span></a><div className="top-actions"><span className="live-pill"><i/> LIVE VIEW</span><button className="icon-button menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(v => !v)}><MapPinned size={18}/></button></div></header>
    <aside className={`navigation ${menuOpen ? 'is-open' : 'is-closed'}`}>
      <div className="nav-heading"><div><span className="eyebrow">COMPETITOR LANDSCAPE</span><h1>{PROJECT_NAME}</h1><p>{loading ? 'Connecting to Atlas…' : `${features.length.toLocaleString()} mapped places and features`}</p></div><button className="icon-button nav-collapse" aria-label="Collapse navigation" onClick={() => setMenuOpen(false)}><ChevronLeft size={18}/></button></div>
      {loading && <div className="state-card"><LoaderCircle className="spin" size={21}/> Loading project from Atlas…</div>}
      {error && <div className="state-card state-error"><strong>Map unavailable</strong><p>{error}</p><button onClick={() => location.reload()}>Try again</button></div>}
      {project && <>
        <button className={`nav-item overview-item ${selected === 'overview' ? 'active' : ''}`} onClick={() => navigate()}><span className="nav-icon"><Compass size={17}/></span><span><b>All places</b><small>Full competitor map</small></span><span className="nav-count">{features.length}</span></button>
        <div className="nav-section tier-section"><span className="eyebrow">COFFEE PRICE TIERS</span>{stops.map(stop => <button key={stop.id} className={`nav-item ${selected === stop.id ? 'active' : ''}`} onClick={() => navigate(stop)}><span className={`tier-dot tier-${stop.id.slice(5)}`} /><span><b>{stop.title}</b><small>{stop.subtitle}</small></span><span className="nav-count">{stop.featureIds.length}</span></button>)}<button className="open-table-button" onClick={() => setTableOpen(true)}><Table2 size={16}/><span>View places table</span><span className="nav-count">{tableCount}</span></button></div>
        <div className="nav-foot"><div className="active-view"><span className="eyebrow">CURRENT VIEW</span><b>{selectedStop?.title || 'Overview'}</b><small>{visibleCount.toLocaleString()} places and features</small></div><div className="stepper"><button aria-label="Previous view" onClick={() => { const i = selected === 'overview' ? 0 : stops.findIndex(s => s.id === selected); navigate(i > 0 ? stops[i - 1] : undefined); }}><ArrowUp size={16}/></button><button aria-label="Next view" onClick={() => { const i = selected === 'overview' ? -1 : stops.findIndex(s => s.id === selected); navigate(stops[Math.min(stops.length - 1, i + 1)]); }}><ArrowDown size={16}/></button><button aria-label="Reset map view" onClick={() => navigate()}><RotateCcw size={16}/></button></div></div>
      </>}
    </aside>
    {!menuOpen && project && <button className="reopen-nav" onClick={() => setMenuOpen(true)}><MapPinned size={16}/> Explore map <ChevronRight size={16}/></button>}
    <div className={`map-caption ${menuOpen ? 'with-nav' : ''}`}><span className="caption-dot"/><span className="caption-title">{selectedStop ? selectedStop.title : 'KOPI SAIGON · Competitor overview'}</span><span className="caption-divider"/><span className="caption-count">{visibleCount.toLocaleString()} places</span></div>
    <dialog ref={tableDialogRef} className="poi-table-dialog" aria-labelledby="poi-table-title" onClose={() => setTableOpen(false)}>
      <div className="table-dialog-shell">
        <div className="table-dialog-header"><div><span className="eyebrow">KOPI SAIGON · COMPETITOR LANDSCAPE</span><h2 id="poi-table-title">Places by coffee price tier</h2><p>{tableCount.toLocaleString()} places grouped by High, Mid, and Low tier</p></div><button className="table-close-button" onClick={() => setTableOpen(false)} aria-label="Close places table"><X size={18}/></button></div>
        <div className="table-dialog-body">{tierGroups.map(({ stop, places }) => <section key={stop.id} className="table-tier-section" aria-label={`${stop.title}: ${places.length} places`}>
          <div className="table-tier-heading"><span className={`tier-dot tier-${stop.id.slice(5)}`}/><h3>{stop.title}</h3><span>{places.length.toLocaleString()} places</span></div>
          <div className="table-scroll"><table className="poi-table"><thead><tr><th scope="col">Name</th><th scope="col">Tier</th><th scope="col">Price range · PHP</th><th scope="col">Price range · MYR</th><th scope="col">Location</th></tr></thead><tbody>{places.map(feature => {
            const { php, myr } = getPriceRanges(feature);
            return <tr key={feature.id}><td className="table-place-name">{feature.name || 'Unnamed place'}</td><td><span className={`table-tier-chip tier-${stop.id.slice(5)}`}>{stop.title}</span></td><td>{php || '—'}</td><td>{myr || '—'}</td><td><a className="table-location-link" href={getGoogleMapsUrl(feature)} target="_blank" rel="noopener noreferrer"><span>{getLocationLabel(feature)}</span><ExternalLink size={14}/></a></td></tr>;
          })}</tbody></table></div>
        </section>)}</div>
      </div>
    </dialog>
  </main>;
}
