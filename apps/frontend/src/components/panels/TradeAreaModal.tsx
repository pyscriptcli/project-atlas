"use client";

import React, { useState } from "react";
import { X, MapPin, Search, Loader2 } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import { POI_TAXONOMY, POI_COLORS } from "@/lib/map/overpassTaxonomy";
import type { MapFeature } from "@/types/map";
import { apiRequest } from "@/services/api-client";
import { booleanPointInPolygon, centroid, distance, point } from "@turf/turf";

export function TradeAreaModal() {
  const {
    activePanel,
    setActivePanel,
    currentProject,
    addFeatures,
    showToast,
  } = useMapStore();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "RETAIL",
    "FOOD, BEVERAGE & HOSPITALITY",
    "COMMERCIAL & OFFICES",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResultsCount, setLastResultsCount] = useState<number | null>(null);
  const [areaId, setAreaId] = useState("");

  if (activePanel !== "trade-area") return null;

  const categories = Object.keys(POI_TAXONOMY);
  const areas = currentProject.features.filter(feature => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon");

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleRunScan = async () => {
    const area = areas.find(feature=>feature.properties.id===areaId);
    if (!area) { showToast("Choose a polygon, rectangle, or circle to scan."); return; }
    const center = centroid(area as any).geometry.coordinates as [number,number];
    const coordinates:number[][]=[];const walk=(value:any)=>{if(Array.isArray(value)&&typeof value[0]==="number")coordinates.push(value as number[]);else if(Array.isArray(value))value.forEach(walk)};walk((area.geometry as any).coordinates);
    const computedRadius=Math.max(50,...coordinates.map(value=>distance(point(center),point(value as [number,number]),{units:"meters"})));
    const scanRadius=Math.min(25000,Math.ceil(computedRadius));

    if (selectedCategories.length === 0) {
      showToast("Please select at least one POI category.");
      return;
    }

    setIsLoading(true);
    setLastResultsCount(null);

    try {
      // Collect tags for selected categories
      const allTags: string[] = [];
      selectedCategories.forEach((cat) => {
        const subCats = POI_TAXONOMY[cat] || [];
        subCats.forEach((s) => allTags.push(s.tagQuery));
      });

      // 3. Fetch POIs via server proxy
      showToast(`Querying Overpass API for ${allTags.length} categories...`);
      const data = await apiRequest<{pois:any[]}>("/pois/scan", {
        method: "POST",
        body: JSON.stringify({
          lat: center[1],
          lon: center[0],
          radius: scanRadius,
          tags: allTags,
        }),
      });

      const pois: any[] = (data.pois || []).filter(poi=>booleanPointInPolygon(point([poi.lon,poi.lat]),area as any));
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
        <label className="block space-y-2"><span className="font-semibold text-white">Trade Area Shape</span><select value={areaId} onChange={event=>setAreaId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 p-2 text-white"><option value="">Choose a polygon, rectangle, or circle</option>{areas.map(area=><option key={area.properties.id} value={area.properties.id}>{area.properties.name}</option>)}</select></label>
        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-slate-400">The scan radius is calculated from the selected geometry; only results contained by that shape are added.</div>

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
