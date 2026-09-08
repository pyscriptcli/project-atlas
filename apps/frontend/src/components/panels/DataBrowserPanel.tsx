"use client";

import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Compass, MapPin } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import { apiRequest } from "@/services/api-client";

export function DataBrowserPanel() {
  const {
    activePanel,
    setActivePanel,
    is3D,
    setIs3D,
    currentProject,
    setLayerVisibility,
    showToast,
  } = useMapStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    labels: true,
    roads: false,
    buildings: false,
    water: false,
    boundaries: false,
  });

  const [boundaryQuery, setBoundaryQuery] = useState("");
  const [boundaryResults, setBoundaryResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (activePanel !== "browser") return null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const vis = currentProject.layer_visibilities || {};

  const handleBoundarySearch = async (query: string) => {
    setBoundaryQuery(query);
    if (!query || query.trim().length < 2) {
      setBoundaryResults([]);
      return;
    }
    setIsSearching(true);
    try {
      setBoundaryResults(await apiRequest<any[]>(`/boundaries?q=${encodeURIComponent(query)}`));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed top-[68px] left-4 bottom-4 w-[360px] z-[999] bg-[#091018]/95 backdrop-blur-xl border border-white/12 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-slate-300">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-sm text-white">
          <Compass className="w-4 h-4 text-sky-400" />
          <span>Data Browser</span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {/* 2D / 3D Dimension Switch */}
        <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setIs3D(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !is3D ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            2D MAP
          </button>
          <button
            onClick={() => setIs3D(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              is3D ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            3D BUILDINGS
          </button>
        </div>

        {/* Trade Area Analysis Button */}
        <div
          onClick={() => setActivePanel("trade-area")}
          className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-all flex items-center justify-between text-sky-400 font-semibold"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Trade Area & POI Analysis</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </div>

        {/* Labels Section */}
        <div className="border-b border-white/10 pb-2">
          <div
            onClick={() => toggleSection("labels")}
            className="flex items-center justify-between py-1.5 px-1 font-semibold text-white cursor-pointer hover:bg-white/5 rounded"
          >
            <span>Labels</span>
            {openSections.labels ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          {openSections.labels && (
            <div className="pt-2 pl-2 space-y-2">
              {[
                { key: "label_city", label: "City" },
                { key: "label_brgy", label: "Barangay / District" },
                { key: "label_street", label: "Street" },
                { key: "poi_icons", label: "POI Icons" },
                { key: "poi_labels", label: "POI Labels" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-slate-300">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={vis[key] !== false}
                    onChange={(e) => setLayerVisibility(key, e.target.checked)}
                    className="accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Roads & Transit */}
        <div className="border-b border-white/10 pb-2">
          <div
            onClick={() => toggleSection("roads")}
            className="flex items-center justify-between py-1.5 px-1 font-semibold text-white cursor-pointer hover:bg-white/5 rounded"
          >
            <span>Roads & Transit</span>
            {openSections.roads ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          {openSections.roads && (
            <div className="pt-2 pl-2 space-y-2">
              {[
                { key: "road_exp", label: "Expressway" },
                { key: "road_main", label: "Main Road" },
                { key: "road_sec", label: "Secondary Road" },
                { key: "road_ter", label: "Tertiary Road" },
                { key: "rd_rail", label: "Railways" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between text-slate-300">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={vis[key] !== false}
                    onChange={(e) => setLayerVisibility(key, e.target.checked)}
                    className="accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Buildings */}
        <div className="border-b border-white/10 pb-2">
          <div
            onClick={() => toggleSection("buildings")}
            className="flex items-center justify-between py-1.5 px-1 font-semibold text-white cursor-pointer hover:bg-white/5 rounded"
          >
            <span>Buildings</span>
            {openSections.buildings ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          {openSections.buildings && (
            <div className="pt-2 pl-2 space-y-2">
              <label className="flex items-center justify-between text-slate-300">
                <span>2D Buildings</span>
                <input
                  type="checkbox"
                  checked={vis.building2d === true}
                  onChange={(e) => setLayerVisibility("building2d", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
                <span>3D Buildings</span>
                <input
                  type="checkbox"
                  checked={vis.building3d !== false}
                  onChange={(e) => setLayerVisibility("building3d", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Water */}
        <div className="border-b border-white/10 pb-2">
          <div
            onClick={() => toggleSection("water")}
            className="flex items-center justify-between py-1.5 px-1 font-semibold text-white cursor-pointer hover:bg-white/5 rounded"
          >
            <span>Water</span>
            {openSections.water ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          {openSections.water && (
            <div className="pt-2 pl-2 space-y-2">
              <label className="flex items-center justify-between text-slate-300">
                <span>Water Bodies</span>
                <input
                  type="checkbox"
                  checked={vis.water !== false}
                  onChange={(e) => setLayerVisibility("water", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
                <span>Waterways</span>
                <input
                  type="checkbox"
                  checked={vis.waterway !== false}
                  onChange={(e) => setLayerVisibility("waterway", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Boundaries */}
        <div className="border-b border-white/10 pb-2">
          <div
            onClick={() => toggleSection("boundaries")}
            className="flex items-center justify-between py-1.5 px-1 font-semibold text-white cursor-pointer hover:bg-white/5 rounded"
          >
            <span>Boundaries</span>
            {openSections.boundaries ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          {openSections.boundaries && (
            <div className="pt-2 pl-2 space-y-2">
              <label className="flex items-center justify-between text-slate-300">
                <span>Provinces</span>
                <input
                  type="checkbox"
                  checked={vis.bound_prov === true}
                  onChange={(e) => setLayerVisibility("bound_prov", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
                <span>Cities & Municipalities</span>
                <input
                  type="checkbox"
                  checked={vis.bound_city === true}
                  onChange={(e) => setLayerVisibility("bound_city", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
                <span>Barangays / Districts</span>
                <input
                  type="checkbox"
                  checked={vis.bound_brgy === true}
                  onChange={(e) => setLayerVisibility("bound_brgy", e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>

              {/* Boundary Search */}
              <div className="pt-2">
                <span className="font-semibold text-[11px] text-white">Find & Zoom Boundary</span>
                <input
                  type="text"
                  placeholder="Search province, city, barangay..."
                  value={boundaryQuery}
                  onChange={(e) => handleBoundarySearch(e.target.value)}
                  className="w-full mt-1 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
                {isSearching && <div className="text-[10px] text-slate-400 mt-1">Searching...</div>}
                {boundaryResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg divide-y divide-white/5">
                    {boundaryResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          const lat = parseFloat(r.lat);
                          const lon = parseFloat(r.lon);
                          useMapStore.getState().setCamera([lon, lat], 14, 45, 0);
                          setBoundaryResults([]);
                          showToast(`Focused on ${r.display_name.split(",")[0]}`);
                        }}
                        className="p-2 cursor-pointer hover:bg-white/10 text-[11px] text-slate-200 truncate"
                      >
                        {r.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
