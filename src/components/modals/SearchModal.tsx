'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

interface SearchModalProps {
  mapInstance: any;
}

/* ─── Animated ripple marker helpers ──────────────────────────────────────── */

const RIPPLE_SOURCE = 'search-ripple-src';
const RIPPLE_DOT = 'search-ripple-dot';
const RIPPLE_RING1 = 'search-ripple-ring1';
const RIPPLE_RING2 = 'search-ripple-ring2';
const RIPPLE_RING3 = 'search-ripple-ring3';

/** Remove all ripple layers/source from the map if they exist. */
function clearRipple(map: any) {
  [RIPPLE_DOT, RIPPLE_RING1, RIPPLE_RING2, RIPPLE_RING3].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(RIPPLE_SOURCE)) map.removeSource(RIPPLE_SOURCE);
}

/**
 * Add a pulsating ripple marker at [lng, lat].
 * Three concentric rings expand outward while fading; a solid dot sits at centre.
 * The whole thing self‑cleans after `durationMs`.
 */
function showRipple(map: any, lng: number, lat: number, durationMs = 6000) {
  // Clean up any prior ripple
  clearRipple(map);

  // Point source
  map.addSource(RIPPLE_SOURCE, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {},
    },
  });

  // Centre dot
  map.addLayer({
    id: RIPPLE_DOT,
    type: 'circle',
    source: RIPPLE_SOURCE,
    paint: {
      'circle-radius': 7,
      'circle-color': '#38bdf8',
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 1,
    },
  });

  // Three expanding rings (staggered timing)
  const ringConfigs = [
    { id: RIPPLE_RING1, delay: 0 },
    { id: RIPPLE_RING2, delay: 700 },
    { id: RIPPLE_RING3, delay: 1400 },
  ];

  ringConfigs.forEach(({ id }) => {
    map.addLayer({
      id,
      type: 'circle',
      source: RIPPLE_SOURCE,
      paint: {
        'circle-radius': 7,
        'circle-color': 'transparent',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#38bdf8',
        'circle-opacity': 0,
        'circle-stroke-opacity': 0.85,
      },
    });
  });

  // Animate
  const start = performance.now();
  const cycleDuration = 2100; // ms per ring cycle
  let rafId: number;

  function animate() {
    const elapsed = performance.now() - start;

    // Auto‑remove after total duration
    if (elapsed > durationMs) {
      try { clearRipple(map); } catch (_) {}
      return;
    }

    ringConfigs.forEach(({ id, delay }) => {
      if (!map.getLayer(id)) return;
      const t = ((elapsed - delay) % cycleDuration) / cycleDuration;
      const clamped = Math.max(0, t);
      const radius = 7 + clamped * 55; // expand from 7 → 62 px
      const opacity = Math.max(0, 0.85 * (1 - clamped));

      map.setPaintProperty(id, 'circle-radius', radius);
      map.setPaintProperty(id, 'circle-stroke-opacity', opacity);
    });

    rafId = requestAnimationFrame(animate);
  }

  rafId = requestAnimationFrame(animate);

  // Return cleanup handle
  return () => {
    cancelAnimationFrame(rafId);
    try { clearRipple(map); } catch (_) {}
  };
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export const SearchModal: React.FC<SearchModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel, setToast } = useMapStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const rippleCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup ripple on unmount or panel close
  useEffect(() => {
    return () => {
      rippleCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setErrorMsg(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) {
          throw new Error(`Search failed (HTTP ${res.status})`);
        }
        const data = await res.json();
        // Nominatim returns an array; our proxy may return { error }
        if (data && data.error) {
          throw new Error(data.error);
        }
        setResults(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setResults([]);
        setErrorMsg(e?.message || 'Search failed');
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectLocation = useCallback(
    (r: any) => {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);

      if (!isFinite(lat) || !isFinite(lon)) return;

      if (mapInstance) {
        // Clean up any prior ripple
        rippleCleanupRef.current?.();

        // Fly to location with a close zoom
        mapInstance.flyTo({
          center: [lon, lat],
          zoom: 16.5,
          pitch: 55,
          duration: 2200,
          essential: true,
        });

        // Drop the ripple marker once the fly animation finishes
        mapInstance.once('moveend', () => {
          try {
            const cleanup = showRipple(mapInstance, lon, lat, 8000);
            rippleCleanupRef.current = cleanup || null;
          } catch (_) {}
        });
      }

      togglePanel('search', false);
      setToast(`📍 ${r.display_name?.split(',').slice(0, 2).join(',') || 'Location found'}`);
      setQuery('');
      setResults([]);
    },
    [mapInstance, togglePanel, setToast]
  );

  if (!activePanels.search) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[998] w-96 bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-2xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for any place or address…"
          autoFocus
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-xs"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
        ) : query ? (
          <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-[10px]">
          {errorMsg}
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
          {results.map((r, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectLocation(r)}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition"
            >
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-white truncate">
                  {r.name || r.display_name?.split(',')[0]}
                </span>
                <span className="text-[10px] text-gray-400 truncate">{r.display_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !errorMsg && query.trim().length >= 2 && results.length === 0 && (
        <div className="px-3 py-4 text-center text-gray-500 text-[10px]">
          No locations found for "{query.trim()}"
        </div>
      )}
    </div>
  );
};
