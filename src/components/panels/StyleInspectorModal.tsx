"use client";

import React from "react";
import { X, Palette, Check } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import type { ThemeName } from "@/types/map";

const THEME_OPTIONS: { id: ThemeName; name: string; desc: string; previewColor: string }[] = [
  {
    id: "Midnight Blue",
    name: "Midnight Blue",
    desc: "Cyberpunk luxury dark vector styling with gold accents",
    previewColor: "#0a1628",
  },
  {
    id: "Monochrome",
    name: "Monochrome",
    desc: "Minimalist high-contrast architectural paper map",
    previewColor: "#ece9e2",
  },
  {
    id: "White Gold",
    name: "White Gold",
    desc: "Clean warm daytime palette with golden road tiers",
    previewColor: "#ffffff",
  },
  {
    id: "CartoDB Dark",
    name: "CartoDB Dark",
    desc: "Raster dark tiles optimized for spatial analysis overlays",
    previewColor: "#111827",
  },
  {
    id: "CartoDB Light",
    name: "CartoDB Light",
    desc: "Crisp light gray tiles for clean thematic presentations",
    previewColor: "#f3f4f6",
  },
  {
    id: "OSM",
    name: "OpenStreetMap",
    desc: "Standard worldwide crowdsourced street map tiles",
    previewColor: "#dbeafe",
  },
  {
    id: "Satellite",
    name: "ESRI World Imagery",
    desc: "High-resolution satellite and aerial photography",
    previewColor: "#1e3a2f",
  },
];

export function StyleInspectorModal() {
  const { activePanel, setActivePanel, currentProject, setBasemap, showToast } =
    useMapStore();

  if (activePanel !== "style") return null;

  return (
    <div className="fixed top-20 right-4 w-[340px] z-[1001] bg-[#091018]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Basemap Styling</h3>
            <p className="text-[11px] text-slate-400">Select map theme & vector shaders</p>
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Themes List */}
      <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto text-xs">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = currentProject.basemap === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => {
                setBasemap(theme.id);
                showToast(`Switched basemap to ${theme.name}`);
              }}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                  : "bg-black/30 border-white/8 text-slate-300 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-lg border border-white/20 shadow-inner flex-shrink-0"
                  style={{ backgroundColor: theme.previewColor }}
                />
                <div>
                  <div className="font-bold text-xs">{theme.name}</div>
                  <div className="text-[10px] text-slate-400">{theme.desc}</div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
