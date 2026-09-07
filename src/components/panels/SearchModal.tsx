"use client";

import React, { useState } from "react";
import { X, Search, MapPin, Loader2 } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";

export function SearchModal() {
  const { activePanel, setActivePanel, setCamera, showToast } = useMapStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (activePanel !== "search") return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      showToast("Geocoding failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setCamera([lon, lat], 15, 45, 0);
    setActivePanel(null);
    showToast(`Jumped to ${item.display_name.split(",")[0]}`);
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[420px] z-[1001] bg-[#091018]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-200">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="p-3 border-b border-white/10 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search any place or address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
        />
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
        <button
          type="button"
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </form>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
        {results.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs italic">
            Type an address, city, or landmark and press Enter.
          </div>
        ) : (
          results.map((r, i) => (
            <div
              key={i}
              onClick={() => handleSelect(r)}
              className="p-3.5 hover:bg-white/5 cursor-pointer flex items-start gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <div className="font-bold text-xs text-white truncate">
                  {r.display_name.split(",")[0]}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{r.display_name}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
