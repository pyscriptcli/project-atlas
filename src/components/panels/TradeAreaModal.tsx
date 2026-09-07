"use client";

import React, { useState } from "react";
import { X, MapPin, Search, Loader2 } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import { POI_TAXONOMY, POI_COLORS } from "@/lib/map/overpassTaxonomy";
import { createCircleFeature } from "@/lib/geo/calculations";
import type { MapFeature } from "@/types/map";

export function TradeAreaModal() {
  const {
    activePanel,
    setActivePanel,
    currentProject,
    addFeature,
    addFeatures,
    showToast,
  } = useMapStore();

  const [radiusMeters, setRadiusMeters] = useState<number>(1000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "RETAIL",
    "FOOD, BEVERAGE & HOSPITALITY",
    "COMMERCIAL & OFFICES",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResultsCount, setLastResultsCount] = useState<number | null>(null);

  if (activePanel !== "trade-area") return null;

  const categories = Object.keys(POI_TAXONOMY);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleRunScan = async () => {
    const center = currentProject.center; // [lng, lat]
    if (!center || center.length < 2) return;

    if (selectedCategories.length === 0) {
      showToast("Please select at least one POI category.");
      return;
    }

    setIsLoading(true);
    setLastResultsCount(null);

    try {
      // 1. Create Trade Area Buffer Polygon on map
      const bufferFeature = createCircleFeature(center, radiusMeters, {
        id: `trade-buffer-${Date.now()}`,
        name: `Trade Area (${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`})`,
        category: "Trade Area Buffer",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
        strokeColor: "#0284c7",
        strokeWidth: 2,
        source: "user-draw",
        createdAt: new Date().toISOString(),
      }) as MapFeature;

      addFeature(bufferFeature);

      // 2. Collect tags for selected categories
      const allTags: string[] = [];
      selectedCategories.forEach((cat) => {
        const subCats = POI_TAXONOMY[cat] || [];
        subCats.forEach((s) => allTags.push(s.tagQuery));
      });

      // 3. Fetch POIs via server proxy
      showToast(`Querying Overpass API for ${allTags.length} categories...`);
      const res = await fetch("/api/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: center[1],
          lon: center[0],
          radius: radiusMeters,
          tags: allTags,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Overpass query failed");
      }

      const pois: any[] = data.pois || [];
      setLastResultsCount(pois.length);

      // 4. Convert to MapFeatures
      const poiFeatures: MapFeature[] = pois.map((poi, idx) => {
        // match category color
        const color = POI_COLORS[selectedCategories[0]] || "#f59e0b";

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [poi.lon, poi.lat],
          },
          properties: {
            id: `poi-${Date.now()}-${idx}`,
            name: poi.name && poi.name !== "Unknown" ? poi.name : `${poi.type}`,
            type: poi.type,
            category: "POI",
            color: color,
            fillColor: color,
            strokeColor: "#ffffff",
            strokeWidth: 1.5,
            tags: poi.tags,
            source: "overpass",
            createdAt: new Date().toISOString(),
          },
        };
      });

      addFeatures(poiFeatures, "Trade Area Scan");
      showToast(`Scan complete: Found ${poiFeatures.length} POIs.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Scan failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[440px] max-h-[85vh] z-[1001] bg-[#091018]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Trade Area Analysis</h3>
            <p className="text-[11px] text-slate-400">Buffer radius & OpenStreetMap POI scanner</p>
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 overflow-y-auto text-xs">
        {/* Radius selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-semibold">
            <span>Buffer Radius</span>
            <span className="text-sky-400 font-mono">
              {radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`}
            </span>
          </div>
          <input
            type="range"
            min={200}
            max={5000}
            step={100}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>200m</span>
            <span>1km</span>
            <span>2.5km</span>
            <span>5km</span>
          </div>
        </div>

        {/* Center coordinates reference */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
          <span className="text-slate-400">Center Coordinates</span>
          <span className="font-mono text-white text-[11px]">
            {currentProject.center[1].toFixed(4)}° N, {currentProject.center[0].toFixed(4)}° E
          </span>
        </div>

        {/* Category Checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Target POI Categories</span>
            <span className="text-slate-400 text-[10px]">
              {selectedCategories.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              const color = POI_COLORS[cat] || "#3b82f6";
              return (
                <div
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-white/10 border-sky-400/40 text-white"
                      : "bg-black/20 border-white/5 text-slate-400 hover:border-white/15"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-medium truncate">{cat}</span>
                </div>
              );
            })}
          </div>
        </div>

        {lastResultsCount !== null && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-center font-medium">
            Scan complete! Added {lastResultsCount} POIs to &quot;Trade Area Scan&quot; layer.
          </div>
        )}

        {/* Submit Scan */}
        <button
          onClick={handleRunScan}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Overpass API...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Generate Trade Area & Scan POIs</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
