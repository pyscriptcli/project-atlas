'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

interface SearchModalProps {
  mapInstance: any;
}

export const SearchModal: React.FC<SearchModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel } = useMapStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
            query.trim()
          )}`
        );
        const data = await res.json();
        setResults(data || []);
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  if (!activePanels.search) return null;

  const handleSelectLocation = (r: any) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);

    if (mapInstance) {
      mapInstance.flyTo({
        center: [lon, lat],
        zoom: 15,
        duration: 1500,
      });
    }

    togglePanel('search', false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[998] w-96 bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-2xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search location (Press Enter)..."
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
                  {r.name || r.display_name.split(',')[0]}
                </span>
                <span className="text-[10px] text-gray-400 truncate">{r.display_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
