'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

interface SearchModalProps {
  mapInstance: any;
}

type PlaceResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
};

const getPlaceTitle = (place: PlaceResult) => place.name || place.display_name?.split(',')[0] || 'Unnamed place';

const getPlaceSubtitle = (place: PlaceResult) => {
  const parts = (place.display_name || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return place.type?.replaceAll('_', ' ') || 'Place';
  return parts.slice(place.name ? 1 : 1, 4).join(', ');
};

const getZoomForPlace = (place: PlaceResult) => {
  if (place.class === 'building' || ['house', 'restaurant', 'cafe', 'shop'].includes(place.type || '')) return 17;
  if (['city', 'town', 'village', 'suburb'].includes(place.type || '')) return 13;
  if (place.class === 'boundary') return 11;
  return 15;
};

export const SearchModal: React.FC<SearchModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel, setToast } = useMapStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const closeSearch = () => {
    togglePanel('search', false);
    setQuery('');
    setResults([]);
    setErrorMsg(null);
  };

  useEffect(() => {
    if (!activePanels.search) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(focusTimer);
  }, [activePanels.search]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const requestId = ++requestIdRef.current;
    if (trimmedQuery.length < 2) {
      setResults([]);
      setErrorMsg(null);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search is unavailable right now (HTTP ${response.status}).`);
        const data = await response.json();
        if (data?.error) throw new Error(data.error);
        if (requestId !== requestIdRef.current) return;
        setResults(Array.isArray(data) ? data : []);
        setActiveIndex(-1);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setResults([]);
        setErrorMsg(error instanceof Error ? error.message : 'Could not search places. Try again.');
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) setIsLoading(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelectLocation = useCallback((place: PlaceResult) => {
    const lat = Number.parseFloat(place.lat);
    const lon = Number.parseFloat(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (mapInstance) {
      const bounds = place.boundingbox?.map(Number.parseFloat);
      if (bounds?.length === 4 && bounds.every(Number.isFinite)) {
        const [south, north, west, east] = bounds;
        if (Math.abs(north - south) > 0.001 || Math.abs(east - west) > 0.001) {
          mapInstance.fitBounds([[west, south], [east, north]], {
            padding: { top: 84, right: 48, bottom: 64, left: 48 },
            maxZoom: 16,
            duration: 1200,
          });
        } else {
          mapInstance.flyTo({ center: [lon, lat], zoom: getZoomForPlace(place), duration: 1200, essential: true });
        }
      } else {
        mapInstance.flyTo({ center: [lon, lat], zoom: getZoomForPlace(place), duration: 1200, essential: true });
      }
    }

    togglePanel('search', false);
    setToast(`Located ${getPlaceTitle(place)}`);
    setQuery('');
    setResults([]);
  }, [mapInstance, setToast, togglePanel]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex] || results[0];
      if (selected) handleSelectLocation(selected);
    } else if (event.key === 'Escape') {
      closeSearch();
    }
  };

  return (
    <section aria-label="Search places" className="relative flex shrink-0 items-center">
      {activePanels.search ? (
        <div className="flex h-9 w-[min(16rem,32vw)] min-w-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 text-zinc-200">
          <Search size={16} className="shrink-0 text-zinc-400" />
          <input ref={inputRef} type="search" role="combobox" aria-label="Search for a place or address" aria-autocomplete="list" aria-expanded={results.length > 0} aria-controls="place-search-results" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search places" autoComplete="off" className="!m-0 h-full min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-[13px] text-[#e8eaed] outline-none placeholder:text-zinc-500" />
          {isLoading ? <Loader2 size={16} className="shrink-0 animate-spin text-sky-300" /> : query ? <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"><X size={15} /></button> : null}
          <button type="button" onClick={closeSearch} aria-label="Close place search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"><X size={15} /></button>
        </div>
      ) : <button type="button" onClick={() => togglePanel('search', true)} aria-label="Search places" title="Search places" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"><Search size={17} strokeWidth={2.1} /></button>}
      {activePanels.search && (results.length > 0 || errorMsg || (!isLoading && query.trim().length >= 2)) && (
        <div className="absolute left-1/2 top-full z-[1200] mt-3 w-[min(26rem,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#17191c]/[.97] text-zinc-200 shadow-2xl backdrop-blur-xl">
          {errorMsg && <p role="status" className="px-5 py-4 text-sm text-[#f28b82]">{errorMsg}</p>}
          {!errorMsg && results.length > 0 && <ul id="place-search-results" role="listbox" aria-label="Place suggestions" className="max-h-[min(60vh,480px)] overflow-y-auto py-1">{results.map((place, index) => <li key={place.place_id} role="option" aria-selected={activeIndex === index}><button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => handleSelectLocation(place)} className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left transition ${activeIndex === index ? 'bg-white/10' : 'hover:bg-white/[0.07]'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-zinc-400"><MapPin size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-[#e8eaed]">{getPlaceTitle(place)}</span><span className="mt-0.5 block truncate text-[12px] text-[#9aa0a6]">{getPlaceSubtitle(place)}</span></span></button></li>)}</ul>}
          {!errorMsg && !isLoading && query.trim().length >= 2 && results.length === 0 && <div className="px-5 py-5 text-sm text-zinc-400">No places found. Try a different name or address.</div>}
          {results.length > 0 && <div className="border-t border-white/[0.07] px-4 py-2 text-[10px] text-zinc-500">Place results provided by OpenStreetMap</div>}
        </div>
      )}
    </section>
  );
};
