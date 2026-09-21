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
  Map,
  Download,
  Box,
  Building2,
  Radar,
  Sun,
  Moon,
  ChevronDown,
  PenTool,
  Sparkles,
  Ruler,
  Camera,
  Flame,
  Check,
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
    isSmartHeightFilter,
    toggleSmartHeightFilter,
    isNightGlowEnabled,
    toggleNightGlow,
    isHeightCaliperEnabled,
    toggleHeightCaliper,
    isTiltShiftEnabled,
    toggleTiltShift,
    is3DHeatmapBeacons,
    toggle3DHeatmapBeacons,
    setToast,
  } = useMapStore();

  const { currentProjectName, updateProjectName, currentProjectId, saveCurrentProject } =
    useProjectStore();

  // Active flyout: 'draw' | 'studio' | null (Data tools are direct individual buttons now)
  const [openFolder, setOpenFolder] = useState<'draw' | 'studio' | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Close flyouts on click outside
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

  const toggleFlyout = (folder: 'draw' | 'studio') => {
    setOpenFolder((prev) => (prev === folder ? null : folder));
  };

  return (
    <>
      <div
        ref={toolbarRef}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-2xl backdrop-blur-xl text-zinc-200 select-none"
      >
        {/* =========================================================================
            SECTION 1: WORKSPACE & HISTORY
           ========================================================================= */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/15 shrink-0">
          {/* Workspace Switcher */}
          <button
            onClick={() => {
              togglePanel('launcher', true);
              setOpenFolder(null);
            }}
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
              className="font-bold text-white text-xs max-w-[110px] truncate cursor-pointer hover:text-zinc-300 transition"
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
            SECTION 2: DATA & LAYERS (DIRECT ICON-ONLY BUTTONS)
           ========================================================================= */}
        <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-white/15">
          {/* Data Browser */}
          <button
            type="button"
            onClick={() => {
              togglePanel('browser');
              setOpenFolder(null);
            }}
            title="Data Catalog Browser"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              activePanels.browser
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
          </button>

          {/* My Layers */}
          <button
            type="button"
            onClick={() => {
              togglePanel('myLayers');
              setOpenFolder(null);
            }}
            title="My Layers"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              activePanels.myLayers
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FolderTree className="w-4 h-4 text-sky-400" />
          </button>

          {/* Trade Area Scan */}
          <button
            type="button"
            onClick={() => {
              togglePanel('tradeArea');
              setOpenFolder(null);
            }}
            title="Trade Area & POI Scan"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              activePanels.tradeArea
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Radar className="w-4 h-4 text-amber-400" />
          </button>

          {/* Search Places */}
          <button
            type="button"
            onClick={() => {
              togglePanel('search');
              setOpenFolder(null);
            }}
            title="Search Places (Geocoding)"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              activePanels.search
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Search className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Import */}
          <button
            type="button"
            onClick={() => {
              onImportClick();
              setOpenFolder(null);
            }}
            title="Import GeoJSON / KML"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
          </button>
        </div>

        {/* =========================================================================
            SECTION 3: DRAW & 3D TOOLS (ICON-ONLY BUTTON)
           ========================================================================= */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => toggleFlyout('draw')}
            title="Draw & 3D Tools"
            className={`h-8 px-2.5 rounded-full flex items-center gap-1 transition ${
              openFolder === 'draw' || Boolean(activeTool) || activePanels.buildingCatalog
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {activeTool === 'polygon3d' ? (
              <Box className="w-4 h-4 text-sky-500" />
            ) : activeTool === 'polygon' ? (
              <Hexagon className="w-4 h-4 text-indigo-500" />
            ) : (
              <PenTool className="w-4 h-4 text-sky-400" />
            )}
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openFolder === 'draw' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'draw' && (
            <div className="absolute right-0 sm:left-0 top-full mt-2.5 w-64 bg-zinc-950/98 border border-white/20 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-[1200] animate-in fade-in zoom-in-95 space-y-0.5 max-h-[75vh] overflow-y-auto">
              <span className="px-3 py-1 text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                2D Vector Polygons
              </span>

              {/* Draw Polygon (Renamed from Draw Freeform Polygon) */}
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
                <span>Draw Polygon</span>
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
                <span>Draw Circle</span>
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

              {/* Draw 3D Polygon (Renamed from Draw 3D Building Extrusion) */}
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
                <span>Draw 3D Polygon</span>
              </button>

              {/* 3D Polygon Catalog (Renamed from 3D Architectural Catalog) */}
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
                <span>3D Polygon Catalog</span>
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
                <span>Multi-Stop Route</span>
              </button>

              {/* Place Marker (Renamed from Place Marker Pin) */}
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
                <span>Place Marker</span>
              </button>

              {/* Add Text (Renamed from Add Text Box Label) */}
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
                <span>Add Text</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: STUDIO & STYLING (STUDIO MODE + BASEMAP WITH MAP ICON + FX)
           ========================================================================= */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => toggleFlyout('studio')}
            title="Studio Mode & Visual Styling"
            className={`h-8 px-2.5 rounded-full flex items-center gap-1 transition ${
              openFolder === 'studio' || isSunDialOpen || activePanels.customMap
                ? 'bg-white/20 text-white font-bold'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${openFolder === 'studio' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'studio' && (
            <div className="absolute right-0 top-full mt-2.5 w-72 bg-zinc-950/98 border border-white/20 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-[1200] animate-in fade-in zoom-in-95 space-y-1 max-h-[80vh] overflow-y-auto">
              {/* Studio Mode (Renamed from Studio sun dial / Studio Sun Dial & Lighting) */}
              <button
                type="button"
                onClick={() => {
                  toggleSunDial(true);
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                  isSunDialOpen ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold">Studio Mode</span>
                    <p className="text-[9.5px] text-zinc-400">Sun path, shadows &amp; lighting</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Open</span>
              </button>

              {/* Basemap (Renamed from Basemap Vector Styles, using Map icon) */}
              <button
                type="button"
                onClick={() => {
                  togglePanel('customMap');
                  setOpenFolder(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                  activePanels.customMap ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-bold">Basemap</span>
                    <p className="text-[9.5px] text-zinc-400">Vector, Satellite &amp; Dark themes</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Styles</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1.5" />

              <span className="px-3 py-0.5 text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Visual FX &amp; Realism
              </span>

              {/* 1. Smart Height Filter */}
              <button
                type="button"
                onClick={() => {
                  toggleSmartHeightFilter();
                  setToast(!isSmartHeightFilter ? 'Smart Height Filter: High-res satellite roofs preserved on homes.' : 'Smart Height Filter disabled: extruding all structures.');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-200 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">Smart Height Filter</div>
                    <div className="text-[9.5px] text-zinc-400">Natural satellite roofs + glass towers</div>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isSmartHeightFilter
                      ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-white/5 text-zinc-500 border-white/10'
                  }`}
                >
                  {isSmartHeightFilter ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              {/* 2. Night Illumination & Arteries */}
              <button
                type="button"
                onClick={() => {
                  toggleNightGlow();
                  setToast(!isNightGlowEnabled ? 'Night illumination & glowing city arteries enabled.' : 'Night illumination disabled.');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-200 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-semibold text-white">Night Illumination</div>
                    <div className="text-[9.5px] text-zinc-400">Glowing city arteries &amp; window light</div>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isNightGlowEnabled
                      ? 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40'
                      : 'bg-white/5 text-zinc-500 border-white/10'
                  }`}
                >
                  {isNightGlowEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              {/* 3. Holographic Height Caliper */}
              <button
                type="button"
                onClick={() => {
                  toggleHeightCaliper();
                  setToast(!isHeightCaliperEnabled ? 'Holographic Height Caliper HUD active.' : 'Height Caliper HUD hidden.');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-200 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">Height Caliper HUD</div>
                    <div className="text-[9.5px] text-zinc-400">3D structure altitude &amp; storeys</div>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isHeightCaliperEnabled
                      ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40'
                      : 'bg-white/5 text-zinc-500 border-white/10'
                  }`}
                >
                  {isHeightCaliperEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              {/* 4. Tilt-Shift Scale Model */}
              <button
                type="button"
                onClick={() => {
                  toggleTiltShift();
                  setToast(!isTiltShiftEnabled ? 'Tilt-Shift Miniature Diorama blur enabled.' : 'Tilt-Shift Diorama disabled.');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-200 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-white">Tilt-Shift Diorama</div>
                    <div className="text-[9.5px] text-zinc-400">Miniature scale depth of field</div>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isTiltShiftEnabled
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-white/5 text-zinc-500 border-white/10'
                  }`}
                >
                  {isTiltShiftEnabled ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              {/* 5. 3D Radiant POI Pillars */}
              <button
                type="button"
                onClick={() => {
                  toggle3DHeatmapBeacons();
                  setToast(!is3DHeatmapBeacons ? '3D Radiant Sky Beacons active on POIs.' : 'Radiant Sky Beacons disabled.');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-zinc-200 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-semibold text-white">3D Radiant Pillars</div>
                    <div className="text-[9.5px] text-zinc-400">Vertical radiant beams to the sky</div>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    is3DHeatmapBeacons
                      ? 'bg-rose-400/20 text-rose-300 border-rose-400/40'
                      : 'bg-white/5 text-zinc-500 border-white/10'
                  }`}
                >
                  {is3DHeatmapBeacons ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              <div className="h-[1px] bg-white/10 my-1.5" />

              {/* Export Map to PNG */}
              <button
                type="button"
                onClick={handleExport}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-200 hover:bg-white/10 transition"
              >
                <Download className="w-4 h-4 text-zinc-300" />
                <span className="font-semibold">Export Map to PNG</span>
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
