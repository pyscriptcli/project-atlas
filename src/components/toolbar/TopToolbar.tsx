'use client';

import React from 'react';
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
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { useProjectStore } from '../../store/useProjectStore';
import { exportMapToPNG } from '../../gis/importExport';

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
  } = useMapStore();

  const { currentProjectName, updateProjectName, currentProjectId, saveCurrentProject } =
    useProjectStore();

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
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/85 border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-2xl backdrop-blur-xl text-zinc-200">
      {/* Workspace Switcher */}
      <button
        onClick={() => togglePanel('launcher', true)}
        title="Select Workspace"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
      >
        <FolderOpen className="w-4 h-4" />
      </button>

      {/* Project Meta Info */}
      <div className="flex items-center gap-2 px-1">
        <span
          onClick={handleRename}
          title="Click to rename workspace"
          className="font-bold text-white text-xs max-w-[140px] truncate cursor-pointer hover:text-zinc-300 transition"
        >
          {currentProjectName}
        </span>
        <div
          className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
            saveStatus === 'saved'
              ? 'text-white border-white/20 bg-white/10'
              : saveStatus === 'saving'
              ? 'text-zinc-300 border-white/20 bg-white/5 animate-pulse'
              : 'text-zinc-400 border-white/10 bg-transparent'
          }`}
        >
          <span className="text-[7px]">●</span>
          <span>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
          </span>
        </div>
      </div>

      {/* Undo / Redo */}
      <button
        onClick={undo}
        title="Undo (Ctrl+Z)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={redo}
        title="Redo (Ctrl+Y)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        title="Save Workspace (Ctrl+S)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
      >
        <Save className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-white/15 mx-1" />

      {/* Data Browser & My Layers */}
      <button
        onClick={() => togglePanel('browser')}
        title="Data Browser"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.browser ? 'bg-white/20 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Layers className="w-4 h-4" />
      </button>

      <button
        onClick={() => togglePanel('myLayers')}
        title="My Layers"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.myLayers ? 'bg-white/20 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <FolderTree className="w-4 h-4" />
      </button>

      {/* Trade Area Analysis */}
      <button
        onClick={() => togglePanel('tradeArea')}
        title="Trade Area & POI Analysis"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.tradeArea ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Radar className="w-4 h-4" />
      </button>

      {/* Search Place */}
      <button
        onClick={() => togglePanel('search')}
        title="Search Place"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.search ? 'bg-white/20 text-white' : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Import Spatial Data */}
      <button
        onClick={onImportClick}
        title="Import Spatial Data (KML, KMZ, GeoJSON, SHP)"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition"
      >
        <Upload className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-white/15 mx-1" />

      {/* Drawing Tools */}
      <button
        onClick={() => setActiveTool('polygon')}
        title="Draw Polygon"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'polygon'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Hexagon className="w-4 h-4" />
      </button>

      <button
        onClick={() => {
          setActiveTool('polygon3d');
          if (mapInstance && mapInstance.getPitch() < 30) {
            mapInstance.easeTo({ pitch: 60 });
          }
        }}
        title="Draw 3D Polygon / Building Extrusion"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'polygon3d'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Box className="w-4 h-4" />
      </button>

      <button
        onClick={() => togglePanel('buildingCatalog')}
        title="3D Architectural Building Catalog"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.buildingCatalog
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Building2 className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('rectangle')}
        title="Draw Rectangle"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'rectangle'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Square className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('circle')}
        title="Draw Circle (with Radius)"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'circle'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <CircleIcon className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('polyline')}
        title="Draw Polyline"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'polyline'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Spline className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('route')}
        title="Route A to B (OSRM)"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'route'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Navigation className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('marker')}
        title="Place Marker Pin"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'marker'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <MapPin className="w-4 h-4" />
      </button>

      <button
        onClick={() => setActiveTool('textbox')}
        title="Add Text Label"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activeTool === 'textbox'
            ? 'bg-white text-black shadow-lg shadow-white/20'
            : 'text-zinc-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Type className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-white/15 mx-1" />

      {/* Basemap & Export */}
      <button
        onClick={() => togglePanel('customMap')}
        title="Basemap Styling"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          activePanels.customMap ? 'bg-white/20 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <Palette className="w-4 h-4" />
      </button>

      <button
        onClick={handleExport}
        title="Export Map to PNG"
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};
