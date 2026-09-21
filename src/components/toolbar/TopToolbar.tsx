'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Undo2,
  Redo2,
  Save,
  Layers,
  FolderTree,
  Search,
  Upload,
  Hexagon,
  Square,
  Circle as CircleIcon,
  Spline,
  Navigation,
  MapPin,
  Type,
  Palette,
  Download,
  Box,
  Building2,
  Radar,
  Sun,
  ChevronDown,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { useProjectStore } from '../../store/useProjectStore';
import { exportMapToPNG } from '../../gis/importExport';
import { SHAPE_OPTIONS, ICON_SVGS } from '../../gis/markers';

interface TopToolbarProps {
  mapInstance: any;
  onImportClick: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ mapInstance, onImportClick }) => {
  const {
    activeTool,
    setActiveTool,
    activePanels,
    togglePanel,
    saveStatus,
    undo,
    redo,
    markerShape,
    markerColor,
    markerSize,
    setToolConfig,
    isSunDialOpen,
    toggleSunDial,
  } = useMapStore();

  const { currentProjectName, updateProjectName, currentProjectId, saveCurrentProject } =
    useProjectStore();

  // Active folder flyout: 'data' | 'draw' | 'studio' | null
  const [openFolder, setOpenFolder] = useState<'data' | 'draw' | 'studio' | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Close folder flyouts on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenFolder(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRename = () => {
    const nextName = prompt('Rename workspace:', currentProjectName);
    if (nextName && nextName.trim() && nextName.trim() !== currentProjectName) {
      if (currentProjectId) {
        updateProjectName(currentProjectId, nextName.trim());
      }
    }
  };

  const handleSave = () => {
    saveCurrentProject(mapInstance);
  };

  const handleExport = () => {
    if (mapInstance) {
      exportMapToPNG(mapInstance, currentProjectName);
      setOpenFolder(null);
    }
  };

  const toggleFolder = (folder: 'data' | 'draw' | 'studio') => {
    setOpenFolder((prev) => (prev === folder ? null : folder));
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/85 border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-2xl backdrop-blur-xl text-zinc-200 select-none"
      >
        {/* =========================================================================
            FOLDER 1: WORKSPACE & HISTORY
           ========================================================================= */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/15">
          {/* Workspace Switcher */}
          <button
            onClick={() => togglePanel('launcher', true)}
            title="Switch Workspace"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <FolderOpen className="w-4 h-4 text-sky-400" />
          </button>

          {/* Project Meta Info */}
          <div className="flex items-center gap-1.5 px-1">
            <span
              onClick={handleRename}
              title="Click to rename workspace"
              className="font-bold text-white text-xs max-w-[130px] truncate cursor-pointer hover:text-zinc-300 transition"
            >
              {currentProjectName}
            </span>
            <div
              className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-mono font-semibold border flex items-center gap-1 ${
                saveStatus === 'saved'
                  ? 'text-zinc-300 border-white/20 bg-white/10'
                  : saveStatus === 'saving'
                  ? 'text-amber-300 border-amber-400/30 bg-amber-400/10 animate-pulse'
                  : 'text-zinc-400 border-white/10 bg-transparent'
              }`}
            >
              <span className="text-[6px]">●</span>
              <span>{saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving' : 'Unsaved'}</span>
            </div>
          </div>

          {/* Undo / Redo */}
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            title="Redo (Ctrl+Y)"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            title="Save Workspace (Ctrl+S)"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* =========================================================================
            FOLDER 2: DATA & ANALYSIS FOLDER
           ========================================================================= */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleFolder('data')}
            className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition ${
              openFolder === 'data' || activePanels.browser || activePanels.myLayers || activePanels.tradeArea || activePanels.search
                ? 'bg-white/20 text-white font-bold'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Data &amp; Layers</span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openFolder === 'data' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'data' && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-zinc-950/95 border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  togglePanel('browser');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.browser ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Data Catalog Browser</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePanel('myLayers');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.myLayers ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                <span>My Layer Tree</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePanel('tradeArea');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.tradeArea ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Radar className="w-3.5 h-3.5 text-amber-400" />
                <span>Trade Area &amp; POI Scan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePanel('search');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.search ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-zinc-300" />
                <span>Search Places (Geocode)</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  onImportClick();
                  setOpenFolder(null);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-200 hover:bg-white/10 transition"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import GeoJSON / KML</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOLDER 3: DRAW & 3D TOOLS FOLDER
           ========================================================================= */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleFolder('draw')}
            className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition ${
              openFolder === 'draw' || Boolean(activeTool) || activePanels.buildingCatalog
                ? 'bg-white text-black font-bold shadow-lg shadow-white/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {activeTool === 'polygon3d' ? (
              <Box className="w-3.5 h-3.5 text-sky-500" />
            ) : activeTool === 'polygon' ? (
              <Hexagon className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <PenTool className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="text-[11px]">Draw &amp; 3D</span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openFolder === 'draw' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'draw' && (
            <div className="absolute left-0 top-full mt-2 w-60 bg-zinc-950/95 border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in space-y-0.5 max-h-[75vh] overflow-y-auto">
              <span className="px-3 py-1 text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                2D Vector Polygons
              </span>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('polygon');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'polygon' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Hexagon className="w-3.5 h-3.5 text-sky-400" />
                <span>Draw Freeform Polygon</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('rectangle');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'rectangle' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Square className="w-3.5 h-3.5 text-indigo-400" />
                <span>Draw Rectangle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('circle');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'circle' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <CircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Draw Circle with Radius</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('polyline');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'polyline' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Spline className="w-3.5 h-3.5 text-amber-400" />
                <span>Draw Polyline</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1" />

              <span className="px-3 py-1 text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                3D Digital Twin Architecture
              </span>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('polygon3d');
                  if (mapInstance && mapInstance.getPitch() < 30) {
                    mapInstance.easeTo({ pitch: 60 });
                  }
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'polygon3d' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>Draw 3D Building Extrusion</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePanel('buildingCatalog');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.buildingCatalog ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-violet-400" />
                <span>3D Architectural Catalog</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1" />

              <span className="px-3 py-1 text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Routing &amp; Annotations
              </span>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('route');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'route' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Stop Route (OSRM)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('marker');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'marker' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>Place Marker Pin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTool('textbox');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'textbox' ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-zinc-300" />
                <span>Add Text Box Label</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOLDER 4: STUDIO & VISUAL STYLING FOLDER
           ========================================================================= */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleFolder('studio')}
            className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition ${
              openFolder === 'studio' || isSunDialOpen || activePanels.customMap
                ? 'bg-white/20 text-white font-bold'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Studio &amp; Style</span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openFolder === 'studio' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'studio' && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950/95 border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  toggleSunDial(true);
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  isSunDialOpen ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Studio Sun Dial &amp; Lighting</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  togglePanel('customMap');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                  activePanels.customMap ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Basemap Vector Styles</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1" />

              <button
                type="button"
                onClick={handleExport}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-200 hover:bg-white/10 transition"
              >
                <Download className="w-3.5 h-3.5 text-zinc-300" />
                <span>Export Map to PNG</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Marker Options Bar when placing a marker */}
      {activeTool === 'marker' && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-2xl backdrop-blur-xl text-zinc-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs pr-2 border-r border-white/10">
            <MapPin className="w-4 h-4" />
            <span>Pin Config</span>
          </div>

          <div className="flex items-center gap-1.5">
            {SHAPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setToolConfig({ markerShape: s.id as any })}
                className={`p-1.5 rounded-lg border transition ${
                  markerShape === s.id
                    ? 'bg-white/20 border-white text-white'
                    : 'border-white/10 hover:bg-white/10 text-zinc-400'
                }`}
              >
                <svg
                  className="w-3.5 h-3.5 fill-none stroke-current"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  dangerouslySetInnerHTML={{ __html: ICON_SVGS[s.id] || '' }}
                />
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-white/10" />

          {/* Color Picker */}
          <input
            type="color"
            value={markerColor}
            onChange={(e) => setToolConfig({ markerColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            title="Marker Color"
          />

          <div className="w-[1px] h-4 bg-white/10" />

          {/* Size Slider */}
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={markerSize}
            onChange={(e) => setToolConfig({ markerSize: parseFloat(e.target.value) })}
            className="w-20 accent-sky-400 h-1"
            title="Marker Size"
          />
        </div>
      )}
    </>
  );
};
