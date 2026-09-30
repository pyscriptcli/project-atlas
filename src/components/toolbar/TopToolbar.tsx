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
  ChevronDown,
  PenTool,
  Check,
  Store,
  Share2,
  LogOut,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { useProjectStore } from '../../store/useProjectStore';
import { exportMapToPNG } from '../../gis/importExport';
import { SHAPE_OPTIONS, ICON_SVGS } from '../../gis/markers';
import { PublishViewerModal } from '../modals/PublishViewerModal';

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

  // Active flyout: 'draw' | 'studio' | null (Data tools are direct individual buttons now)
  const [openFolder, setOpenFolder] = useState<'draw' | 'studio' | null>(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
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
            <FolderOpen className="w-4 h-4 text-zinc-300" />
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
                  ? 'text-zinc-200 border-white/30 bg-white/10 animate-pulse'
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
            <Undo2 className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <button
            onClick={redo}
            title="Redo (Ctrl+Y)"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <Redo2 className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            title="Save Workspace (Ctrl+S)"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <Save className="w-3.5 h-3.5 text-zinc-300" />
          </button>
          <button
            onClick={() => { setViewerModalOpen(true); setOpenFolder(null); }}
            title="Publish view-only link"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
          ><Share2 className="w-3.5 h-3.5" /></button>
          <button
            onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.assign('/login'); }}
            title="Sign out"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
          ><LogOut className="w-3.5 h-3.5" /></button>
        </div>

        {/* =========================================================================
            SECTION 2: DATA & LAYERS (DIRECT ICON-ONLY BUTTONS - MONOCHROME)
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
            <Layers className={`w-4 h-4 ${activePanels.browser ? 'text-black' : 'text-zinc-300'}`} />
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
            <FolderTree className={`w-4 h-4 ${activePanels.myLayers ? 'text-black' : 'text-zinc-300'}`} />
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
            <Radar className={`w-4 h-4 ${activePanels.tradeArea ? 'text-black' : 'text-zinc-300'}`} />
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
            <Search className={`w-4 h-4 ${activePanels.search ? 'text-black' : 'text-zinc-300'}`} />
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
            <Upload className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* =========================================================================
            SECTION 3: DRAW & 3D TOOLS (ICON-ONLY BUTTON - MONOCHROME)
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
              <Box className={`w-4 h-4 ${openFolder === 'draw' || Boolean(activeTool) ? 'text-black' : 'text-zinc-300'}`} />
            ) : activeTool === 'polygon' ? (
              <Hexagon className={`w-4 h-4 ${openFolder === 'draw' || Boolean(activeTool) ? 'text-black' : 'text-zinc-300'}`} />
            ) : (
              <PenTool className={`w-4 h-4 ${openFolder === 'draw' || Boolean(activeTool) ? 'text-black' : 'text-zinc-300'}`} />
            )}
            <ChevronDown className={`w-3 h-3 ${openFolder === 'draw' || Boolean(activeTool) ? 'text-black' : 'text-zinc-400'} transition-transform ${openFolder === 'draw' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'draw' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 bg-[#0c1322] border border-white/20 rounded-2xl p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-[1200] space-y-1 max-h-[75vh] overflow-y-auto">
              {/* Upward pointer caret */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c1322] border-t border-l border-white/20 rotate-45 pointer-events-none" />

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
                  activeTool === 'marker' && useMapStore.getState().markerShape !== 'vicinity-logo'
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                <span>Place Marker</span>
              </button>

              {/* Place Vicinity Brand Logo */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('marker');
                  useMapStore.setState({ markerShape: 'vicinity-logo' });
                  setOpenFolder(null);
                  useMapStore.getState().setToast('Click map to place a Vicinity Brand Logo, then choose brand or upload logo in Editor');
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                  activeTool === 'marker' && useMapStore.getState().markerShape === 'vicinity-logo'
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-200 hover:bg-white/10'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-zinc-300" />
                <span>Place Vicinity Logo</span>
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
            <Sun className="w-4 h-4 text-zinc-300" />
            <ChevronDown className={`w-3 h-3 ${openFolder === 'studio' || isSunDialOpen ? 'text-white' : 'text-zinc-400'} transition-transform ${openFolder === 'studio' ? 'rotate-180' : ''}`} />
          </button>

          {openFolder === 'studio' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-72 bg-[#0c1322] border border-white/20 rounded-2xl p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-[1200] space-y-1.5 max-h-[80vh] overflow-y-auto">
              {/* Upward pointer caret */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c1322] border-t border-l border-white/20 rotate-45 pointer-events-none" />

              {/* Basemap */}
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

              {/* Studio Mode */}
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
      <PublishViewerModal open={viewerModalOpen} onClose={() => setViewerModalOpen(false)} projectId={currentProjectId} projectName={currentProjectName} mapInstance={mapInstance} />
    </>
  );
};
