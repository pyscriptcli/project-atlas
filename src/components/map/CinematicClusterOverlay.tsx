'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { circleCoordsFromRadius } from '../../gis/circles';
import {
  X,
  Radar,
  Users,
  Car,
  TrendingUp,
  Building2,
  Sparkles,
  MapPin,
  RotateCcw,
  PanelRightClose,
  Map
} from 'lucide-react';

interface CinematicClusterOverlayProps {
  mapInstance: any;
}

// Fetch real street geometries from OpenStreetMap via Overpass API
async function fetchOsmStreetGeometry(lat: number, lon: number): Promise<any[]> {
  try {
    const ql = `[out:json][timeout:25];(way["highway"~"primary|secondary|tertiary|trunk|residential|unclassified"](around:300,${lat},${lon}););out geom;`;
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ql, timeout: 25 }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.elements) {
        return data.elements
          .filter((el: any) => el.geometry && el.geometry.length > 1)
          .map((el: any) => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: el.geometry.map((pt: any) => [pt.lon, pt.lat]),
            },
            properties: {
              name: el.tags?.name || 'Street Corridor',
              highway: el.tags?.highway,
            },
          }));
      }
    }
  } catch (e) {
    console.warn('Failed to fetch OSM street geometry:', e);
  }
  return [];
}

export const CinematicClusterOverlay: React.FC<CinematicClusterOverlayProps> = ({ mapInstance }) => {
  const {
    activeCinematicCluster,
    setActiveCinematicCluster,
    focusDisplayMode,
    setFocusDisplayMode
  } = useMapStore();

  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedStreets, setHighlightedStreets] = useState<string[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Sync screen projection of the cluster center on map move/zoom/pitch
  useEffect(() => {
    if (!mapInstance || !activeCinematicCluster || !activeCinematicCluster.center) {
      setScreenPos(null);
      return;
    }

    const [lat, lon] = activeCinematicCluster.center;

    const updateScreenPos = () => {
      try {
        const point = mapInstance.project([lon, lat]);
        setScreenPos({ x: point.x, y: point.y });
      } catch (e) {}
    };

    updateScreenPos();
    mapInstance.on('move', updateScreenPos);
    mapInstance.on('zoom', updateScreenPos);
    mapInstance.on('pitch', updateScreenPos);
    mapInstance.on('rotate', updateScreenPos);

    return () => {
      mapInstance.off('move', updateScreenPos);
      mapInstance.off('zoom', updateScreenPos);
      mapInstance.off('pitch', updateScreenPos);
      mapInstance.off('rotate', updateScreenPos);
    };
  }, [mapInstance, activeCinematicCluster]);

  // Handle camera flight and map animation layers
  useEffect(() => {
    if (!mapInstance || !activeCinematicCluster || !activeCinematicCluster.center) {
      cleanupMapLayers();
      setHighlightedStreets([]);
      return;
    }

    const [lat, lon] = activeCinematicCluster.center;

    // 1. Cinematic 3D oblique camera flight
    mapInstance.easeTo({
      center: [lon, lat],
      zoom: 16.5,
      pitch: 62,
      bearing: -28,
      duration: 2000,
    });

    // 2. Fetch real street geometry from OpenStreetMap API & Setup Layers
    let isCancelled = false;

    const initMapLayers = async () => {
      setupRadarLayers(lon, lat);

      // Fetch actual street geometries from OpenStreetMap
      const streetFeatures = await fetchOsmStreetGeometry(lat, lon);
      if (isCancelled) return;

      if (streetFeatures.length > 0) {
        const names = Array.from(
          new Set(streetFeatures.map((f: any) => f.properties.name).filter((n: string) => n && n !== 'Street Corridor'))
        ) as string[];
        setHighlightedStreets(names);
        setupOsmCorridorLayers(streetFeatures);
      } else {
        // Fallback to local tangent corridor if OSM ways unavailable
        setupFallbackCorridorLayers(lon, lat);
      }
    };

    initMapLayers();

    // 3. Animation loop for radar wave & vehicle dash flow
    let step = 0;
    const animate = () => {
      step += 0.025;
      updateAnimatedRadar(lon, lat, step);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isCancelled = true;
      cleanupMapLayers();
    };
  }, [mapInstance, activeCinematicCluster]);

  const setupRadarLayers = (lon: number, lat: number) => {
    if (!mapInstance) return;

    cleanupRadarLayers();

    try {
      // Foot-traffic Radar Pulse Source
      mapInstance.addSource('cinematic-radar-pulse-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Radar Fill Layer (Monochrome Silver Glow)
      mapInstance.addLayer({
        id: 'cinematic-radar-pulse-fill',
        type: 'fill',
        source: 'cinematic-radar-pulse-source',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['get', 'opacity'],
        },
      });

      // Radar Stroke Layer (Crisp Silver Ring)
      mapInstance.addLayer({
        id: 'cinematic-radar-pulse-stroke',
        type: 'line',
        source: 'cinematic-radar-pulse-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': ['get', 'strokeOpacity'],
        },
      });
    } catch (e) {
      console.warn('Could not add radar layers:', e);
    }
  };

  const setupOsmCorridorLayers = (features: any[]) => {
    if (!mapInstance) return;

    cleanupCorridorLayers();

    try {
      mapInstance.addSource('cinematic-vehicle-flow-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      // Real road background glow (Deep Obsidian Halo)
      mapInstance.addLayer({
        id: 'cinematic-corridor-base',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#000000',
          'line-width': 9,
          'line-opacity': 0.85,
        },
      });

      // Road boundary highlight
      mapInstance.addLayer({
        id: 'cinematic-corridor-edge',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#52525b',
          'line-width': 5,
          'line-opacity': 0.5,
        },
      });

      // Animated vehicle flow dashed line along actual OSM streets
      mapInstance.addLayer({
        id: 'cinematic-vehicle-flow-dash',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-dasharray': [2, 3],
        },
      });
    } catch (e) {
      console.warn('Could not add OSM corridor layers:', e);
    }
  };

  const setupFallbackCorridorLayers = (lon: number, lat: number) => {
    if (!mapInstance) return;

    cleanupCorridorLayers();

    try {
      const delta = 0.0025;
      const fallbackCoords = [
        [lon - delta, lat - delta * 0.4],
        [lon, lat],
        [lon + delta, lat + delta * 0.4],
      ];

      mapInstance.addSource('cinematic-vehicle-flow-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: fallbackCoords },
              properties: {},
            },
          ],
        },
      });

      mapInstance.addLayer({
        id: 'cinematic-corridor-base',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#000000',
          'line-width': 8,
          'line-opacity': 0.8,
        },
      });

      mapInstance.addLayer({
        id: 'cinematic-vehicle-flow-dash',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-dasharray': [2, 3],
        },
      });
    } catch (e) {}
  };

  const updateAnimatedRadar = (lon: number, lat: number, step: number) => {
    if (!mapInstance) return;

    try {
      const radarSource = mapInstance.getSource('cinematic-radar-pulse-source');
      if (radarSource) {
        const wave1 = (step % 2) / 2;
        const wave2 = ((step + 1) % 2) / 2;

        const r1 = 20 + wave1 * 120;
        const r2 = 20 + wave2 * 120;

        const opacity1 = Math.max(0, (1 - wave1) * 0.18);
        const strokeOpacity1 = Math.max(0, (1 - wave1) * 0.9);

        const opacity2 = Math.max(0, (1 - wave2) * 0.18);
        const strokeOpacity2 = Math.max(0, (1 - wave2) * 0.9);

        const poly1 = circleCoordsFromRadius([lon, lat], r1);
        const poly2 = circleCoordsFromRadius([lon, lat], r2);

        radarSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: poly1 },
              properties: { opacity: opacity1, strokeOpacity: strokeOpacity1 },
            },
            {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: poly2 },
              properties: { opacity: opacity2, strokeOpacity: strokeOpacity2 },
            },
          ],
        });
      }
    } catch (e) {}
  };

  const cleanupRadarLayers = () => {
    if (!mapInstance) return;
    try {
      if (mapInstance.getLayer('cinematic-radar-pulse-stroke')) mapInstance.removeLayer('cinematic-radar-pulse-stroke');
      if (mapInstance.getLayer('cinematic-radar-pulse-fill')) mapInstance.removeLayer('cinematic-radar-pulse-fill');
      if (mapInstance.getSource('cinematic-radar-pulse-source')) mapInstance.removeSource('cinematic-radar-pulse-source');
    } catch (e) {}
  };

  const cleanupCorridorLayers = () => {
    if (!mapInstance) return;
    try {
      if (mapInstance.getLayer('cinematic-vehicle-flow-dash')) mapInstance.removeLayer('cinematic-vehicle-flow-dash');
      if (mapInstance.getLayer('cinematic-corridor-edge')) mapInstance.removeLayer('cinematic-corridor-edge');
      if (mapInstance.getLayer('cinematic-corridor-base')) mapInstance.removeLayer('cinematic-corridor-base');
      if (mapInstance.getSource('cinematic-vehicle-flow-source')) mapInstance.removeSource('cinematic-vehicle-flow-source');
    } catch (e) {}
  };

  const cleanupMapLayers = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    cleanupRadarLayers();
    cleanupCorridorLayers();
  };

  if (!activeCinematicCluster) return null;

  const handleResetCamera = () => {
    if (!mapInstance || !activeCinematicCluster.center) return;
    const [lat, lon] = activeCinematicCluster.center;
    mapInstance.easeTo({
      center: [lon, lat],
      zoom: 14.5,
      pitch: 0,
      bearing: 0,
      duration: 1500,
    });
  };

  const handleClose = () => {
    setActiveCinematicCluster(null);
  };

  // Shared inner content component for both Popup and Right Panel presentations
  const renderClusterContent = (isPanelMode: boolean) => (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Controls: Mode Switcher & Close */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center text-white shadow-sm">
            <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block">
              Cinematic Spotlight
            </span>
            <h3 className="font-extrabold text-sm text-white tracking-tight leading-none mt-0.5">
              {activeCinematicCluster.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex bg-black/60 p-0.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setFocusDisplayMode('popup')}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition flex items-center gap-1 ${
                focusDisplayMode === 'popup'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Switch to On-Map Floating Popup"
            >
              <Map className="w-3 h-3" />
              <span className="hidden sm:inline">Popup</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusDisplayMode('rightPanel')}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition flex items-center gap-1 ${
                focusDisplayMode === 'rightPanel'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Switch to Right Slide-in Panel"
            >
              <PanelRightClose className="w-3 h-3" />
              <span className="hidden sm:inline">Panel</span>
            </button>
          </div>

          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-xl bg-zinc-900 border border-white/15 text-zinc-400 hover:text-white hover:border-white/30 flex items-center justify-center transition shrink-0"
            title="Close Cinematic Focus"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corridor & Coordinates Subtitle */}
      <div className="py-2 flex items-center justify-between text-[11px] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
          <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="truncate max-w-[220px]">{activeCinematicCluster.corridor}</span>
        </div>
        <span className="font-mono text-zinc-300 font-bold text-[10px] px-2 py-0.5 bg-black/60 rounded-md border border-white/15">
          {activeCinematicCluster.center[0].toFixed(4)}°, {activeCinematicCluster.center[1].toFixed(4)}°
        </span>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Density</span>
          <span className="text-base font-black text-white font-mono leading-tight block mt-0.5">
            {activeCinematicCluster.poiCount}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">POIs</span>
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
          <span className="text-[9px] text-zinc-400 uppercase font-bold block flex items-center justify-center gap-1">
            <Users className="w-2.5 h-2.5 text-white" />
            <span>Traffic</span>
          </span>
          <span className="text-xs font-black text-white leading-tight block mt-1">
            {activeCinematicCluster.footTrafficRating}
          </span>
          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider block mt-0.5">
            Radar Active
          </span>
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 text-center">
          <span className="text-[9px] text-zinc-400 uppercase font-bold block">Saturation</span>
          <span className="text-xs font-black text-white leading-tight block mt-1">
            {activeCinematicCluster.saturation}
          </span>
          <span className="text-[8px] text-zinc-400 font-medium block mt-0.5">
            {activeCinematicCluster.dominantCategory || 'Commercial'}
          </span>
        </div>
      </div>

      {/* OpenStreetMap Real Street Highlight Indicator */}
      <div className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 flex items-center justify-between text-[10px] text-zinc-300 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <div className="truncate">
            <span className="font-semibold text-white block truncate">
              {highlightedStreets.length > 0
                ? `OSM Street: ${highlightedStreets.slice(0, 2).join(', ')}`
                : 'OpenStreetMap Road Network Active'}
            </span>
            <span className="text-[9px] text-zinc-400 block">Real geometry highway query</span>
          </div>
        </div>
        <Car className="w-3.5 h-3.5 text-zinc-300 shrink-0 ml-1.5" />
      </div>

      {/* Anchor Tenants */}
      {activeCinematicCluster.keyTenants && activeCinematicCluster.keyTenants.length > 0 && (
        <div className="space-y-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-zinc-300" />
            <span>Anchor Tenants & Establishments</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {activeCinematicCluster.keyTenants.map((tenant: string, idx: number) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-black/60 border border-white/10 text-zinc-200 rounded-xl text-[10px] font-medium"
              >
                {tenant}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deep Strategic Insight */}
      <div className="bg-black/60 border-l-2 border-white p-3 rounded-r-2xl rounded-l-none text-[11px] text-zinc-300 italic leading-relaxed shrink-0">
        "{activeCinematicCluster.insight}"
      </div>

      {/* Bottom Action Controls */}
      <div className="flex gap-2 pt-2 border-t border-white/10 mt-auto shrink-0">
        <button
          onClick={handleResetCamera}
          className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/15 hover:border-white/30 text-white font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Camera</span>
        </button>
        <button
          onClick={handleClose}
          className="py-2 px-4 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl text-[11px] transition flex items-center justify-center gap-1 shadow-md"
        >
          <span>Dismiss</span>
        </button>
      </div>
    </div>
  );

  // 1. Right Side-Docked Slide-In Panel
  if (focusDisplayMode === 'rightPanel') {
    return (
      <div className="fixed top-16 right-4 bottom-4 w-[420px] max-w-[calc(100vw-2rem)] z-[1200] bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] p-4 overflow-y-auto text-xs text-zinc-300 animate-in slide-in-from-right-4 duration-200">
        {renderClusterContent(true)}
      </div>
    );
  }

  // 2. On-Map Anchored Floating Popup Card
  if (!screenPos) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1200] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="pointer-events-auto absolute transition-transform duration-75 ease-out"
        style={{
          left: `${screenPos.x}px`,
          top: `${screenPos.y - 45}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        {/* Connection Needle line to 3D Pinball anchor in pure monochrome */}
        <div className="absolute left-1/2 -bottom-4 w-[2px] h-4 bg-white -translate-x-1/2 shadow-[0_0_8px_#ffffff]" />
        <div className="absolute left-1/2 -bottom-5 w-2.5 h-2.5 rounded-full bg-white -translate-x-1/2 border border-black shadow-[0_0_10px_#ffffff]" />

        {/* Modal Container: Monochrome Glassmorphism */}
        <div className="w-[380px] max-w-[92vw] bg-black/85 border border-white/20 rounded-3xl p-4 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-white backdrop-blur-2xl animate-in zoom-in-95 duration-200">
          {renderClusterContent(false)}
        </div>
      </div>
    </div>
  );
};
