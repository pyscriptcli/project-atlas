'use client';

import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';
import { Box, ChevronLeft, ChevronRight, Coffee, Compass, ExternalLink, Flame, LoaderCircle, Map as MapIcon, MapPin, MapPinned, Network, RotateCcw, Table2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Feature as GeoFeature, FeatureCollection, Geometry } from 'geojson';
import { ALL_STYLES, VIS_MAP } from '../gis/map';
import 'maplibre-gl/dist/maplibre-gl.css';

type AtlasFeature = { id: number; name: string; kind: string; geometry: Geometry; props?: Record<string, any> };
type AtlasProject = { id: string; name: string; basemap?: string; center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; features?: AtlasFeature[]; layer_visibilities?: Record<string, boolean>; updated_at?: string };
type Stop = { id: string; title: string; subtitle: string; tier: PriceTier; featureIds: number[]; match: (f: AtlasFeature) => boolean };
type PriceTier = 'high' | 'mid' | 'low';
type DisplayMode = 'pins' | 'heatmap' | 'clusters';
type FocusArea = { id: string; name: string; bounds: [number, number, number, number]; match: (feature: AtlasFeature) => boolean };
const TIER_COLORS: Record<PriceTier, string> = { high: '#ef4444', mid: '#facc15', low: '#22c55e' };
const FOCUS_AREAS: FocusArea[] = [
  { id: 'scout', name: 'Scout Area', bounds: [121.018, 14.625, 121.047, 14.651], match: feature => areaMatches(feature, ['scout area', 'scout neighborhood', 'scout']) },
  { id: 'maginhawa', name: 'Maginhawa', bounds: [121.055, 14.635, 121.084, 14.666], match: feature => areaMatches(feature, ['maginhawa']) },
  { id: 'katipunan', name: 'Katipunan', bounds: [121.064, 14.625, 121.096, 14.658], match: feature => areaMatches(feature, ['katipunan']) },
];
const PROJECT_NAME = 'KOPI SAIGON';
const PROJECT_ID = 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7';
const DEFAULT_SUPABASE_URL = 'https://cyczyaswxkpdcremqnkn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR';

function applyDisplayMode(map: MapLibreMap, mode: DisplayMode) {
  const visibility: Record<string, boolean> = {
    'kopi-poi-dots': mode === 'pins',
    'kopi-poi-labels': mode === 'pins',
    'kopi-poi-halo': mode === 'pins',
    'kopi-poi-heatmap': mode === 'heatmap',
    'kopi-cluster-circles': mode === 'clusters',
    'kopi-cluster-count': mode === 'clusters',
    'kopi-cluster-points': mode === 'clusters',
  };
  Object.entries(visibility).forEach(([id, visible]) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}

function applyPerspectiveLayers(map: MapLibreMap, threeD: boolean) {
  [['building-2d', !threeD], ['building-3d', threeD]].forEach(([layerId, visible]) => {
    if (map.getLayer(layerId as string)) map.setLayoutProperty(layerId as string, 'visibility', visible ? 'visible' : 'none');
  });
}

function pointCollection(collection: FeatureCollection<Geometry>, focusArea: FocusArea | null): FeatureCollection<Geometry> {
  const points = collection.features.filter(feature => feature.geometry.type === 'Point' && (!focusArea || feature.properties?.focusMatch));
  return { type: 'FeatureCollection', features: points } as FeatureCollection<Geometry>;
}

function addProjectLayers(map: MapLibreMap, features: AtlasFeature[], selectedId: string, focusArea: FocusArea | null = null, displayMode: DisplayMode = 'pins') {
  ['kopi-areas-fill', 'kopi-areas-line', 'kopi-poi-halo', 'kopi-poi-dots', 'kopi-poi-labels', 'kopi-poi-heatmap', 'kopi-cluster-circles', 'kopi-cluster-count', 'kopi-cluster-points'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
  if (map.getSource('kopi-features')) map.removeSource('kopi-features');
  if (map.getSource('kopi-clusters')) map.removeSource('kopi-clusters');
  const active = makeStops(features).find(stop => stop.id === selectedId);
  const collection = featureCollection(features, active?.match, active?.tier, focusArea);
  map.addSource('kopi-features', { type: 'geojson', data: collection });
  map.addSource('kopi-clusters', { type: 'geojson', data: pointCollection(collection, focusArea), cluster: true, clusterMaxZoom: 14, clusterRadius: 48 });
  map.addLayer({ id: 'kopi-areas-fill', type: 'fill', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['==', ['get', 'kind'], 'circle'], 0, ['case', ['get', 'selected'], 0.16, 0.035]] } });
  map.addLayer({ id: 'kopi-areas-line', type: 'line', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']]], paint: { 'line-color': ['coalesce', ['get', 'borderColor'], ['get', 'color']], 'line-width': ['case', ['get', 'selected'], 2.2, 1], 'line-opacity': ['case', ['get', 'selected'], 0.9, 0.24] } });
  map.addLayer({ id: 'kopi-poi-halo', type: 'circle', source: 'kopi-features', filter: ['all', ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]], ['==', ['get', 'focusMatch'], true]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 9, 15, 15], 'circle-color': '#38bdf8', 'circle-opacity': 0.2, 'circle-blur': 0.65 } });
  map.addLayer({ id: 'kopi-poi-dots', type: 'circle', source: 'kopi-features', filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 15, 7], 'circle-color': ['get', 'color'], 'circle-stroke-color': ['case', ['get', 'focusMatch'], '#ffffff', '#f7f8fa'], 'circle-stroke-width': ['case', ['get', 'focusMatch'], 2.5, 1.5], 'circle-opacity': ['case', ['get', 'focusMode'], ['case', ['get', 'focusMatch'], 0.98, 0.12], ['case', ['get', 'selected'], 0.96, 0.18]] } });
  map.addLayer({ id: 'kopi-poi-labels', type: 'symbol', source: 'kopi-features', filter: ['all', ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]], ['!=', ['get', 'label'], '']], layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 13], 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-max-width': 12, 'text-optional': true }, paint: { 'text-color': '#f0f6fc', 'text-halo-color': '#0a1628', 'text-halo-width': 1.5, 'text-opacity': ['case', ['get', 'focusMode'], ['case', ['get', 'focusMatch'], 0.95, 0.12], ['case', ['get', 'selected'], 0.95, 0.22]] }, minzoom: 13 });
  map.addLayer({ id: 'kopi-poi-heatmap', type: 'heatmap', source: 'kopi-features', filter: ['all', ['==', ['geometry-type'], 'Point'], ['any', ['==', ['get', 'focusMode'], false], ['==', ['get', 'focusMatch'], true]]], maxzoom: 16, paint: { 'heatmap-weight': ['case', ['get', 'selected'], 1, 0.35], 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 15, 2.2], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 18, 15, 42], 'heatmap-opacity': 0.82, 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(34,197,94,0)', 0.25, '#22c55e', 0.55, '#facc15', 0.8, '#f97316', 1, '#ef4444'] } });
  map.addLayer({ id: 'kopi-cluster-circles', type: 'circle', source: 'kopi-clusters', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#38bdf8', 15, '#facc15', 50, '#ef4444'], 'circle-radius': ['step', ['get', 'point_count'], 17, 15, 22, 50, 28], 'circle-opacity': 0.9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
  map.addLayer({ id: 'kopi-cluster-count', type: 'symbol', source: 'kopi-clusters', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 11 }, paint: { 'text-color': '#071521' } });
  map.addLayer({ id: 'kopi-cluster-points', type: 'circle', source: 'kopi-clusters', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-opacity': ['case', ['get', 'focusMode'], ['case', ['get', 'focusMatch'], 0.98, 0.12], ['case', ['get', 'selected'], 0.96, 0.18]], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#f7f8fa' } });
  applyDisplayMode(map, displayMode);
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
  const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
  const coordinates = point && point.every(Number.isFinite) ? `${point[1].toFixed(5)}, ${point[0].toFixed(5)}` : '';
  return String(address || '').trim() || coordinates || feature.name || 'Location unavailable';
}

function areaMatches(feature: AtlasFeature, terms: string[]): boolean {
  const tags = feature.props?.osmTags || {};
  const searchable = [feature.name, ...Object.values(tags), feature.props?.address, feature.props?.location]
    .filter(value => typeof value === 'string').join(' ').toLowerCase();
  if (terms.some(term => searchable.includes(term))) return true;
  const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
  if (!point || !point.every(Number.isFinite)) return false;
  const [longitude, latitude] = point;
  const area = FOCUS_AREAS.find(candidate => terms.some(term => term === candidate.id || term === candidate.name.toLowerCase()));
  return !!area && longitude >= area.bounds[0] && longitude <= area.bounds[2] && latitude >= area.bounds[1] && latitude <= area.bounds[3];
}

function getGoogleMapsUrl(feature: AtlasFeature): string {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
  url.searchParams.set('query', point && point.every(Number.isFinite) ? `${point[1]},${point[0]}` : feature.name);
  return url.toString();
}

function featureCollection(features: AtlasFeature[], selectedPoi?: (feature: AtlasFeature) => boolean, selectedTier?: PriceTier, focusArea: FocusArea | null = null): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    // Tier navigation filters POIs by feature data, not numeric feature IDs.
    // Imported Atlas IDs can collide when markers are created in quick scans.
    features: features.filter(f => f?.geometry && f.props?.visible !== 0 && (!selectedPoi || f.kind !== 'marker' || selectedPoi(f))).map(f => ({
      type: 'Feature', id: f.id,
      geometry: f.geometry,
      properties: {
        id: f.id, name: f.name || 'Unnamed place', kind: f.kind,
        color: f.kind === 'marker' && selectedTier && selectedPoi?.(f) ? TIER_COLORS[selectedTier] : f.props?.color || f.props?.fillColor || '#39c6be',
        borderColor: f.props?.borderColor || f.props?.color || f.props?.fillColor || '#39c6be',
        label: f.props?.showLabel === false ? '' : (f.name || ''),
        category: f.props?.amenityGroupLabel || f.props?.category || f.props?.poiType || f.kind,
        priceLabel: getPriceLabel(f),
        selected: !selectedPoi || selectedPoi(f),
        focusMatch: !!focusArea?.match(f),
        focusMode: !!focusArea,
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
  const inferred = new Map<AtlasFeature, PriceTier>();
  ranked.forEach((feature, index) => {
    const percentile = (index + 0.5) / ranked.length;
    inferred.set(feature, percentile < 1 / 3 ? 'low' : percentile < 2 / 3 ? 'mid' : 'high');
  });
  const tierFor = (feature: AtlasFeature): PriceTier | null => getExplicitPriceTier(feature) || inferred.get(feature) || null;
  return (['high', 'mid', 'low'] as const).map(tier => {
    const matching = places.filter(feature => tierFor(feature) === tier);
    const title = `${tier[0].toUpperCase()}${tier.slice(1)} tier`;
    return {
      id: `tier:${tier}`, title, subtitle: `${matching.length} places · ${tier} recorded coffee prices`,
      tier, featureIds: matching.map(feature => feature.id), match: feature => tierFor(feature) === tier,
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
  const focusAreaRef = useRef<FocusArea | null>(null);
  const displayModeRef = useRef<DisplayMode>('pins');
  const styleNameRef = useRef('');
  const editorCameraRef = useRef('');
  const [project, setProject] = useState<AtlasProject | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('overview');
  const [menuOpen, setMenuOpen] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableTier, setTableTier] = useState<PriceTier>('high');
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('pins');
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

  useEffect(() => {
    if (project) setIs3D(true);
  }, [project?.id]);

  const refreshMap = useCallback((focus?: Stop, area?: FocusArea | null) => {
    const map = mapRef.current;
    if (!map || !sourceReady.current) return;
    const chosenStop = focus || stops.find(stop => stop.id === selectedRef.current);
    const activeArea = area === undefined ? focusAreaRef.current : area;
    const source = map.getSource('kopi-features') as maplibregl.GeoJSONSource | undefined;
    const collection = featureCollection(features, chosenStop?.match, chosenStop?.tier, activeArea);
    source?.setData(collection);
    (map.getSource('kopi-clusters') as maplibregl.GeoJSONSource | undefined)?.setData(pointCollection(collection, activeArea));
    const targetFeatures = activeArea ? features.filter(activeArea.match) : chosenStop ? features.filter(chosenStop.match) : features;
    const points = targetFeatures.flatMap(f => positions(f.geometry));
    if (activeArea) {
      map.fitBounds([[activeArea.bounds[0], activeArea.bounds[1]], [activeArea.bounds[2], activeArea.bounds[3]]], { padding: { top: 100, bottom: 80, left: menuOpen ? 420 : 90, right: 90 }, maxZoom: 15.5, duration: 1100 });
    } else if (points.length) {
      const bounds = new LngLatBounds(points[0] as [number, number], points[0] as [number, number]);
      points.slice(1).forEach(p => bounds.extend(p as [number, number]));
      if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 80) map.flyTo({ center: points[0] as [number, number], zoom: 16.5, speed: 0.9, curve: 1.25 });
      else map.fitBounds(bounds, { padding: { top: 105, bottom: 90, left: menuOpen ? 420 : 90, right: 100 }, maxZoom: 16, duration: 1100 });
    }
  }, [features, menuOpen, stops]);

  useEffect(() => {
    if (sourceReady.current) refreshMap(stops.find(stop => stop.id === selectedRef.current), focusAreaRef.current);
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
        addProjectLayers(map, features, selectedRef.current, focusAreaRef.current, displayModeRef.current);
        Object.entries(VIS_MAP).forEach(([key, layerIds]) => {
          const visible = project.layer_visibilities?.[key] !== false;
          layerIds.forEach(layerId => { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none'); });
        });
        sourceReady.current = true;
      });
      map.setStyle(FALLBACK_OSM_STYLE as any);
    };
    map.on('error', event => {
      console.error('KOPI SAIGON map error:', event.error);
      switchToOsmFallback();
    });
    map.on('load', () => {
      addProjectLayers(map, features, selectedRef.current, focusAreaRef.current, displayModeRef.current);
      Object.entries(VIS_MAP).forEach(([key, layerIds]) => {
        const visible = project.layer_visibilities?.[key] !== false;
        layerIds.forEach(layerId => { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none'); });
      });
      applyPerspectiveLayers(map, true);
      sourceReady.current = true;
      const coordinates = features.flatMap(feature => positions(feature.geometry));
      if (coordinates.length) {
        const bounds = new LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
        coordinates.slice(1).forEach(point => bounds.extend(point as [number, number]));
        map.fitBounds(bounds, { padding: { top: 100, bottom: 90, left: menuOpen ? 390 : 90, right: 90 }, maxZoom: 15.5, duration: 0 });
      }
      map.easeTo({ pitch: 60, bearing: -15, duration: 800 });
      map.once('idle', () => {
        const basemapLayers = ['landcover', 'landuse', 'park', 'water', 'rd_major', 'rd_secondary', 'label_city']
          .filter(layerId => map.getLayer(layerId));
        if (basemapLayers.length && map.queryRenderedFeatures({ layers: basemapLayers }).length === 0) switchToOsmFallback();
      });
    });
    const openPoiPopup = (e: maplibregl.MapLayerMouseEvent) => {
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
    };
    ['kopi-poi-dots', 'kopi-cluster-points', 'kopi-poi-heatmap'].forEach(layerId => {
      map.on('click', layerId, openPoiPopup);
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
    });
    map.on('click', 'kopi-cluster-circles', event => {
      const cluster = event.features?.[0];
      const clusterId = cluster?.properties?.cluster_id;
      const source = map.getSource('kopi-clusters') as maplibregl.GeoJSONSource | undefined;
      if (!cluster || typeof clusterId !== 'number' || !source || cluster.geometry.type !== 'Point') return;
      const center = cluster.geometry.coordinates as [number, number];
      void source.getClusterExpansionZoom(clusterId).then(zoom => map.easeTo({ center, zoom, duration: 450 }));
    });
    map.on('mouseenter', 'kopi-cluster-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'kopi-cluster-circles', () => { map.getCanvas().style.cursor = ''; });
    mapRef.current = map;
    return () => { sourceReady.current = false; mapRef.current = null; map.remove(); };
  }, [project?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!project || !map) return;
    const stop = makeStops(features).find(item => item.id === selectedRef.current);
    const updateSource = () => {
      const source = map.getSource('kopi-features') as maplibregl.GeoJSONSource | undefined;
      const collection = featureCollection(features, stop?.match, stop?.tier, focusAreaRef.current);
      source?.setData(collection);
      (map.getSource('kopi-clusters') as maplibregl.GeoJSONSource | undefined)?.setData(pointCollection(collection, focusAreaRef.current));
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
      map.once('style.load', () => { addProjectLayers(map, features, selectedRef.current, focusAreaRef.current, displayModeRef.current); sourceReady.current = true; });
      map.setStyle(ALL_STYLES[desiredStyle] || ALL_STYLES['Midnight Blue']);
    } else updateSource();
  }, [features, project]);

  const navigate = (stop?: Stop) => {
    selectedRef.current = stop?.id || 'overview';
    setSelected(stop?.id || 'overview');
    refreshMap(stop, focusAreaRef.current);
    setMenuOpen(true);
  };
  const toggleArea = (area: FocusArea) => {
    const nextArea = focusAreaRef.current?.id === area.id ? null : area;
    focusAreaRef.current = nextArea;
    setFocusArea(nextArea);
    refreshMap(stops.find(stop => stop.id === selectedRef.current), nextArea);
    setMenuOpen(true);
  };
  const chooseDisplayMode = (mode: DisplayMode) => {
    displayModeRef.current = mode;
    setDisplayMode(mode);
    if (mapRef.current) applyDisplayMode(mapRef.current, mode);
  };
  const setMapMode = (threeD: boolean) => {
    setIs3D(threeD);
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: threeD ? 60 : 0, bearing: threeD ? -15 : 0, duration: 800 });
    applyPerspectiveLayers(map, threeD);
  };
  const selectedStop = stops.find(s => s.id === selected);
  const visibleCount = focusArea
    ? features.filter(feature => feature.kind === 'marker' && focusArea.match(feature) && (!selectedStop || selectedStop.match(feature))).length
    : selectedStop ? selectedStop.featureIds.length : features.length;

  return <main className="viewer-shell">
    <div ref={mapNode} className="map-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-label="KOPI SAIGON competitor map" />
    <header className="topbar"><a className="brand" href="#overview" onClick={e => { e.preventDefault(); navigate(); }}><span className="brand-mark"><Coffee size={19}/></span><span><strong>KOPI SAIGON</strong><small>COMPETITOR LANDSCAPE</small></span></a><div className="top-actions"><div className="map-view-toggle" role="group" aria-label="Map perspective"><button type="button" className={`map-view-button ${!is3D ? 'active' : ''}`} aria-label="Switch to 2D map" aria-pressed={!is3D} onClick={() => setMapMode(false)}><MapIcon size={14}/><span>2D</span></button><button type="button" className={`map-view-button ${is3D ? 'active' : ''}`} aria-label="Switch to 3D map" aria-pressed={is3D} onClick={() => setMapMode(true)}><Box size={14}/><span>3D</span></button></div><button className="icon-button menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(v => !v)}><MapPinned size={18}/></button></div></header>
    <aside className={`navigation ${menuOpen ? 'is-open' : 'is-closed'}`}>
      <div className="nav-heading"><div><span className="eyebrow">COFFEE COMPETITOR MAP</span><h1>{PROJECT_NAME}</h1><p>{loading ? 'Loading places…' : `${features.length.toLocaleString()} places on the map`}</p></div><button className="icon-button nav-collapse" aria-label="Hide menu" onClick={() => setMenuOpen(false)}><ChevronLeft size={18}/></button></div>
      {loading && <div className="state-card"><LoaderCircle className="spin" size={21}/> Loading project from Atlas…</div>}
      {error && <div className="state-card state-error"><strong>Map unavailable</strong><p>{error}</p><button onClick={() => location.reload()}>Try again</button></div>}
      {project && <>
        <button className={`nav-item overview-item ${selected === 'overview' ? 'active' : ''}`} onClick={() => navigate()}><span className="nav-icon"><Compass size={17}/></span><span><b>All places</b><small>Clear price filter</small></span><span className="nav-count">{features.length}</span></button>
        <div className="display-section"><span className="eyebrow">MAP DISPLAY</span><div className="display-toggle" role="group" aria-label="POI map display">{([
          { id: 'pins', name: 'Pins', icon: MapPin },
          { id: 'heatmap', name: 'Heatmap', icon: Flame },
          { id: 'clusters', name: 'Clusters', icon: Network },
        ] as const).map(option => <button key={option.id} type="button" className={`display-button ${displayMode === option.id ? 'active' : ''}`} aria-pressed={displayMode === option.id} onClick={() => chooseDisplayMode(option.id)}><option.icon size={14}/><span>{option.name}</span></button>)}</div></div>
        <div className="nav-section area-section"><span className="eyebrow">EXPLORE AN AREA</span><p className="section-hint">Zoom to an area and highlight nearby cafés.</p>{FOCUS_AREAS.map(area => {
          const areaCount = features.filter(feature => feature.kind === 'marker' && area.match(feature)).length;
          return <button key={area.id} className={`area-button ${focusArea?.id === area.id ? 'active' : ''}`} aria-pressed={focusArea?.id === area.id} onClick={() => toggleArea(area)}><span className="area-button-icon"><MapPinned size={16}/></span><span><b>{area.name}</b><small>{areaCount} places</small></span><span className="area-check">{focusArea?.id === area.id ? 'On' : 'View'}</span></button>;
        })}</div>
        <div className="nav-section tier-section"><span className="eyebrow">FILTER BY PRICE</span>{stops.map(stop => <button key={stop.id} className={`tier-button ${selected === stop.id ? 'active' : ''}`} aria-pressed={selected === stop.id} onClick={() => navigate(stop)}><span className={`tier-dot tier-${stop.id.slice(5)}`} /><span><b>{stop.title}</b><small>{stop.featureIds.length} cafés</small></span><span className="nav-count">{stop.featureIds.length}</span></button>)}<button className="open-table-button" onClick={() => setTableOpen(true)}><Table2 size={16}/><span>Open price table</span><ChevronRight size={15}/></button></div>
        <div className="nav-foot"><div className="active-view"><span className="eyebrow">SHOWING</span><b>{focusArea?.name || selectedStop?.title || 'All places'}</b><small>{visibleCount.toLocaleString()} places</small></div><button className="reset-view-button" onClick={() => { selectedRef.current = 'overview'; focusAreaRef.current = null; setSelected('overview'); setFocusArea(null); refreshMap(undefined, null); }}><RotateCcw size={15}/><span>Reset map</span></button></div>
      </>}
    </aside>
    {!menuOpen && project && <button className="reopen-nav" onClick={() => setMenuOpen(true)}><MapPinned size={16}/> Explore map <ChevronRight size={16}/></button>}
    <dialog ref={tableDialogRef} className="poi-table-dialog" aria-labelledby="poi-table-title" onClose={() => setTableOpen(false)}>
      <div className="table-dialog-shell">
        <div className="table-dialog-header"><div><span className="eyebrow">KOPI SAIGON · COMPETITOR LANDSCAPE</span><h2 id="poi-table-title">Places by coffee price tier</h2><p>{tableCount.toLocaleString()} places grouped by High, Mid, and Low tier</p></div><button className="table-close-button" onClick={() => setTableOpen(false)} aria-label="Close places table"><X size={18}/></button></div>
        <div className="table-tier-tabs" role="tablist" aria-label="Filter places by price tier">{tierGroups.map(({ stop, places }) => <button key={stop.id} id={`tab-${stop.tier}`} type="button" role="tab" aria-selected={tableTier === stop.tier} aria-controls="tier-table-panel" className={`table-tier-tab ${tableTier === stop.tier ? 'active' : ''} tier-${stop.tier}`} onClick={() => setTableTier(stop.tier)}><span className={`tier-dot tier-${stop.id.slice(5)}`}/><span>{stop.title}</span><small>{places.length}</small></button>)}</div>
        <div className="table-dialog-body" id="tier-table-panel" role="tabpanel" aria-labelledby={`tab-${tableTier}`}>{tierGroups.filter(group => group.stop.tier === tableTier).map(({ stop, places }) => <section key={stop.id} className="table-tier-section" aria-label={`${stop.title}: ${places.length} places`}>
          <div className="table-tier-heading"><span className={`tier-dot tier-${stop.id.slice(5)}`}/><h3>{stop.title}</h3><span>{places.length.toLocaleString()} places</span></div>
          <div className="table-scroll"><table className="poi-table"><thead><tr><th scope="col">Name</th><th scope="col">Tier</th><th scope="col">Price range · PHP</th><th scope="col">Price range · MYR</th><th scope="col">Location · Google Maps</th></tr></thead><tbody>{places.map(feature => {
            const { php, myr } = getPriceRanges(feature);
            return <tr key={feature.id}><td className="table-place-name">{feature.name || 'Unnamed place'}</td><td><span className={`table-tier-chip tier-${stop.id.slice(5)}`}>{stop.title}</span></td><td>{php || '—'}</td><td>{myr || '—'}</td><td><a className="table-location-link" href={getGoogleMapsUrl(feature)} target="_blank" rel="noopener noreferrer"><span>{getLocationLabel(feature)}</span><ExternalLink size={14}/></a></td></tr>;
          })}</tbody></table></div>
        </section>)}</div>
      </div>
    </dialog>
  </main>;
}
