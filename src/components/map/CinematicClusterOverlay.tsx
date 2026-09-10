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
  RotateCcw
} from 'lucide-react';

interface CinematicClusterOverlayProps {
  mapInstance: any;
}

export const CinematicClusterOverlay: React.FC<CinematicClusterOverlayProps> = ({ mapInstance }) => {
  const { activeCinematicCluster, setActiveCinematicCluster } = useMapStore();
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
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

    // 2. Setup GeoJSON Sources & Layers for Radar Pulse & Vehicle Flow
    setupMapLayers(lon, lat);

    // 3. Animation loop for radar foot-traffic wave and vehicle dash flow
    let step = 0;
    const animate = () => {
      step += 0.025;
      updateAnimatedLayers(lon, lat, step);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cleanupMapLayers();
    };
  }, [mapInstance, activeCinematicCluster]);

  const setupMapLayers = (lon: number, lat: number) => {
    if (!mapInstance) return;

    cleanupMapLayers();

    try {
      // 1. Foot-traffic Radar Pulse Source
      mapInstance.addSource('cinematic-radar-pulse-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Radar Fill Layer (Dark Navy with Gold rim)
      mapInstance.addLayer({
        id: 'cinematic-radar-pulse-fill',
        type: 'fill',
        source: 'cinematic-radar-pulse-source',
        paint: {
          'fill-color': '#d4af37',
          'fill-opacity': ['get', 'opacity'],
        },
      });

      // Radar Stroke Layer (Crisp Gold ring)
      mapInstance.addLayer({
        id: 'cinematic-radar-pulse-stroke',
        type: 'line',
        source: 'cinematic-radar-pulse-source',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 2.5,
          'line-opacity': ['get', 'strokeOpacity'],
        },
      });

      // 2. Vehicle Corridor Flow Source (Corridor Dash & Road Highlight)
      const deltaLon = 0.0035;
      const deltaLat = 0.0018;
      const corridorLineCoords = [
        [lon - deltaLon, lat - deltaLat],
        [lon - deltaLon * 0.4, lat - deltaLat * 0.4],
        [lon, lat],
        [lon + deltaLon * 0.5, lat + deltaLat * 0.4],
        [lon + deltaLon, lat + deltaLat * 0.8],
      ];

      mapInstance.addSource('cinematic-vehicle-flow-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: corridorLineCoords,
              },
              properties: {},
            },
          ],
        },
      });

      // Road background glow (Solid Dark Navy)
      mapInstance.addLayer({
        id: 'cinematic-corridor-base',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#002244',
          'line-width': 8,
          'line-opacity': 0.8,
        },
      });

      // Vehicle flow animated dashed line (Gold)
      mapInstance.addLayer({
        id: 'cinematic-vehicle-flow-dash',
        type: 'line',
        source: 'cinematic-vehicle-flow-source',
        paint: {
          'line-color': '#d4af37',
          'line-width': 3.5,
          'line-dasharray': [2, 3],
        },
      });
    } catch (e) {
      console.warn('Could not add cinematic layers to map:', e);
    }
  };

  const updateAnimatedLayers = (lon: number, lat: number, step: number) => {
    if (!mapInstance) return;

    try {
      const radarSource = mapInstance.getSource('cinematic-radar-pulse-source');
      if (radarSource) {
        const wave1 = (step % 2) / 2;
        const wave2 = ((step + 1) % 2) / 2;

        const r1 = 20 + wave1 * 120;
        const r2 = 20 + wave2 * 120;

        const opacity1 = Math.max(0, (1 - wave1) * 0.22);
        const strokeOpacity1 = Math.max(0, (1 - wave1) * 0.95);

        const opacity2 = Math.max(0, (1 - wave2) * 0.22);
        const strokeOpacity2 = Math.max(0, (1 - wave2) * 0.95);

        const poly1 = circleCoordsFromRadius([lon, lat], r1);
        const poly2 = circleCoordsFromRadius([lon, lat], r2);

        radarSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: poly1,
              },
              properties: {
                opacity: opacity1,
                strokeOpacity: strokeOpacity1,
              },
            },
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: poly2,
              },
              properties: {
                opacity: opacity2,
                strokeOpacity: strokeOpacity2,
              },
            },
          ],
        });
      }
    } catch (e) {}
  };

  const cleanupMapLayers = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!mapInstance) return;

    try {
      if (mapInstance.getLayer('cinematic-vehicle-flow-dash')) {
        mapInstance.removeLayer('cinematic-vehicle-flow-dash');
      }
      if (mapInstance.getLayer('cinematic-corridor-base')) {
        mapInstance.removeLayer('cinematic-corridor-base');
      }
      if (mapInstance.getSource('cinematic-vehicle-flow-source')) {
        mapInstance.removeSource('cinematic-vehicle-flow-source');
      }

      if (mapInstance.getLayer('cinematic-radar-pulse-stroke')) {
        mapInstance.removeLayer('cinematic-radar-pulse-stroke');
      }
      if (mapInstance.getLayer('cinematic-radar-pulse-fill')) {
        mapInstance.removeLayer('cinematic-radar-pulse-fill');
      }
      if (mapInstance.getSource('cinematic-radar-pulse-source')) {
        mapInstance.removeSource('cinematic-radar-pulse-source');
      }
    } catch (e) {}
  };

  if (!activeCinematicCluster || !screenPos) return null;

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

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1200] overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* Anchored Luxury 3D Popup Card positioned right over the cluster */}
      <div
        className="pointer-events-auto absolute transition-transform duration-75 ease-out"
        style={{
          left: `${screenPos.x}px`,
          top: `${screenPos.y - 45}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        {/* Connection Needle line to 3D Pinball anchor */}
        <div className="absolute left-1/2 -bottom-4 w-[2px] h-4 bg-[#d4af37] -translate-x-1/2 shadow-[0_0_8px_#d4af37]" />
        <div className="absolute left-1/2 -bottom-5 w-2.5 h-2.5 rounded-full bg-[#fbbf24] -translate-x-1/2 border border-black shadow-[0_0_10px_#fbbf24]" />

        {/* Modal Container: Solid Dark Navy (#001529), Black (#000000), Gold (#d4af37) */}
        <div className="w-[380px] max-w-[92vw] bg-[#001529] border-2 border-[#d4af37] rounded-3xl p-4 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-white backdrop-blur-xl animate-in zoom-in-95 duration-200">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#000000] border border-[#d4af37] flex items-center justify-center text-[#fbbf24] shadow-sm">
                <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] block">
                  Cinematic Cluster Focus
                </span>
                <h3 className="font-extrabold text-sm text-white tracking-tight leading-none mt-0.5">
                  {activeCinematicCluster.name}
                </h3>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-xl bg-[#000000] border border-[#d4af37]/50 text-gray-300 hover:text-white hover:border-[#d4af37] flex items-center justify-center transition"
              title="Close Cinematic Focus"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Corridor & Location Subtitle */}
          <div className="py-2.5 flex items-center justify-between text-[11px] border-b border-white/10">
            <div className="flex items-center gap-1.5 text-gray-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
              <span className="truncate max-w-[210px]">{activeCinematicCluster.corridor}</span>
            </div>
            <span className="font-mono text-[#d4af37] font-bold text-[10px] px-2 py-0.5 bg-[#000000] rounded-md border border-[#d4af37]/40">
              {activeCinematicCluster.center[0].toFixed(4)}°, {activeCinematicCluster.center[1].toFixed(4)}°
            </span>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 my-3">
            <div className="bg-[#000000] border border-[#d4af37]/30 rounded-2xl p-2 text-center">
              <span className="text-[9px] text-gray-400 uppercase font-bold block">
                Density
              </span>
              <span className="text-base font-black text-[#fbbf24] font-mono leading-tight block mt-0.5">
                {activeCinematicCluster.poiCount}
              </span>
              <span className="text-[9px] text-gray-300 font-medium">POIs</span>
            </div>

            <div className="bg-[#000000] border border-[#d4af37]/30 rounded-2xl p-2 text-center">
              <span className="text-[9px] text-gray-400 uppercase font-bold block flex items-center justify-center gap-1">
                <Users className="w-2.5 h-2.5 text-[#fbbf24]" />
                <span>Traffic</span>
              </span>
              <span className="text-xs font-black text-white leading-tight block mt-1">
                {activeCinematicCluster.footTrafficRating}
              </span>
              <span className="text-[8px] text-[#fbbf24] font-bold uppercase tracking-wider block mt-0.5">
                Radar Active
              </span>
            </div>

            <div className="bg-[#000000] border border-[#d4af37]/30 rounded-2xl p-2 text-center">
              <span className="text-[9px] text-gray-400 uppercase font-bold block">
                Saturation
              </span>
              <span
                className={`text-xs font-black leading-tight block mt-1 ${
                  activeCinematicCluster.saturation === 'High'
                    ? 'text-amber-400'
                    : 'text-[#d4af37]'
                }`}
              >
                {activeCinematicCluster.saturation}
              </span>
              <span className="text-[8px] text-gray-400 font-medium block mt-0.5">
                {activeCinematicCluster.dominantCategory || 'Mixed'}
              </span>
            </div>
          </div>

          {/* Vehicle Flow & Foot-Traffic Status Pill */}
          <div className="bg-[#000000] border border-[#d4af37]/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px] text-gray-300 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fbbf24] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
              </span>
              <span className="font-semibold text-white">Corridor Vehicle Flow & Radar Active</span>
            </div>
            <Car className="w-3 h-3 text-[#d4af37]" />
          </div>

          {/* Key Tenants */}
          {activeCinematicCluster.keyTenants && activeCinematicCluster.keyTenants.length > 0 && (
            <div className="mb-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#d4af37]" />
                <span>Anchor Tenants & Hubs</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {activeCinematicCluster.keyTenants.map((tenant: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[#000000] border border-[#d4af37]/30 text-gray-200 rounded-lg text-[10px] font-medium"
                  >
                    {tenant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deep Strategic Insight */}
          <div className="bg-[#000000] border-l-2 border-[#d4af37] p-2.5 rounded-r-xl rounded-l-none text-[10px] text-gray-300 italic leading-relaxed mb-3">
            "{activeCinematicCluster.insight}"
          </div>

          {/* Bottom Action Controls */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button
              onClick={handleResetCamera}
              className="flex-1 py-1.5 px-3 bg-[#000000] hover:bg-[#002244] border border-[#d4af37]/50 hover:border-[#d4af37] text-[#fbbf24] font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Camera</span>
            </button>
            <button
              onClick={handleClose}
              className="py-1.5 px-4 bg-[#d4af37] hover:bg-[#fbbf24] text-[#000000] font-black rounded-xl text-[11px] transition flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
