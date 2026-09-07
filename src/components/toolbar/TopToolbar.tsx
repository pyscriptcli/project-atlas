"use client";

import React, { useRef } from "react";
import {
  Home,
  Undo2,
  Redo2,
  Save,
  Layers,
  FolderTree,
  Search,
  Upload,
  Hexagon,
  Square,
  Circle,
  Spline,
  MapPin,
  Type,
  Route,
  Palette,
  Download,
  TableProperties,
} from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import { parseSpatialFile } from "@/lib/geo/parsers";
import type { DrawTool } from "@/types/map";

export function TopToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentProject,
    saveStatus,
    activeTool,
    activePanel,
    past,
    future,
    setProjectName,
    setActiveTool,
    setActivePanel,
    undo,
    redo,
    saveProject,
    addFeatures,
    showToast,
  } = useMapStore();

  const handleRename = () => {
    const newName = prompt("Rename Workspace:", currentProject.name);
    if (newName && newName.trim() && newName.trim() !== currentProject.name) {
      setProjectName(newName.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(`Importing ${file.name}...`);
      const features = await parseSpatialFile(file);
      if (features.length === 0) {
        showToast("No valid features found in file.");
      } else {
        addFeatures(features, "Imported Layers");
        showToast(`Imported ${features.length} features successfully.`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Import error: ${err.message || "Failed to parse file"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const tools: { id: DrawTool; icon: React.ReactNode; label: string }[] = [
    { id: "polygon", icon: <Hexagon className="w-3.5 h-3.5" />, label: "Draw Polygon" },
    { id: "rectangle", icon: <Square className="w-3.5 h-3.5" />, label: "Draw Rectangle" },
    { id: "circle", icon: <Circle className="w-3.5 h-3.5" />, label: "Draw Circle with Radius" },
    { id: "polyline", icon: <Spline className="w-3.5 h-3.5" />, label: "Draw Polyline" },
    { id: "route", icon: <Route className="w-3.5 h-3.5" />, label: "Route A to B" },
    { id: "marker", icon: <MapPin className="w-3.5 h-3.5" />, label: "Place Marker Pin" },
    { id: "textbox", icon: <Type className="w-3.5 h-3.5" />, label: "Add Text Label" },
  ];

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".geojson,.json,.kml,.kmz,.zip"
        className="hidden"
      />

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#091018]/95 backdrop-blur-md border border-white/12 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-[0_12px_36px_rgba(0,0,0,0.6)] text-slate-200">
        {/* Workspace Launcher */}
        <button
          onClick={() => setActivePanel(activePanel === "launcher" ? null : "launcher")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "launcher"
              ? "bg-white/20 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Select Workspace"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Project Name & Save Status */}
        <div className="flex items-center gap-2 px-2">
          <span
            onClick={handleRename}
            className="font-bold text-sky-400 text-xs max-w-[140px] truncate cursor-pointer hover:underline"
            title="Click to rename workspace"
          >
            {currentProject.name}
          </span>
          <div
            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${
              saveStatus === "saving"
                ? "text-amber-400 border-amber-400/40 bg-amber-400/10"
                : saveStatus === "saved"
                ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/10"
                : "text-rose-400 border-rose-400/40 bg-rose-400/10"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === "saving"
                  ? "bg-amber-400 animate-ping"
                  : saveStatus === "saved"
                  ? "bg-emerald-400"
                  : "bg-rose-400"
              }`}
            />
            {saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : "Unsaved"}
          </div>
        </div>

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={past.length === 0}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Manual Save */}
        <button
          onClick={() => saveProject()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          title="Save Workspace (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-1" />

        {/* Panel Toggles */}
        <button
          onClick={() => setActivePanel(activePanel === "browser" ? null : "browser")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "browser"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Data Browser"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "layers"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="My Layers"
        >
          <FolderTree className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setActivePanel(activePanel === "attributes" ? null : "attributes")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "attributes"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Attribute Table"
        >
          <TableProperties className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setActivePanel(activePanel === "search" ? null : "search")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "search"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Search Place"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          title="Import Spatial Data (KML, KMZ, GeoJSON, SHP)"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-1" />

        {/* Drawing Tools */}
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(isActive ? "select" : t.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}

        <div className="w-[1px] h-4 bg-white/15 mx-1" />

        {/* Basemap / Custom Style */}
        <button
          onClick={() => setActivePanel(activePanel === "style" ? null : "style")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            activePanel === "style"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Basemap Styling"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>

        {/* Quick Export */}
        <button
          onClick={() => {
            const dataStr =
              "data:text/json;charset=utf-8," +
              encodeURIComponent(
                JSON.stringify(
                  {
                    type: "FeatureCollection",
                    features: currentProject.features,
                  },
                  null,
                  2
                )
              );
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute(
              "download",
              `${currentProject.name.replace(/\s+/g, "_")}.geojson`
            );
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast("Exported GeoJSON successfully.");
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          title="Export Features to GeoJSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
}
