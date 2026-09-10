'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapCanvas } from '../components/map/MapCanvas';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { DataBrowserPanel } from '../components/panels/DataBrowserPanel';
import { MyLayersPanel } from '../components/panels/MyLayersPanel';
import { MapContextMenu } from '../components/map/MapContextMenu';
import { FeaturePopup } from '../components/map/FeaturePopup';
import { ShapeEditorModal } from '../components/modals/ShapeEditorModal';
import { TradeAreaSidebar } from '../components/panels/TradeAreaSidebar';
import { AttributeTableModal } from '../components/modals/AttributeTableModal';
import { BasemapModal } from '../components/modals/BasemapModal';
import { SearchModal } from '../components/modals/SearchModal';
import { WorkspaceLauncherModal } from '../components/modals/WorkspaceLauncherModal';
import { BuildingCatalogModal } from '../components/modals/BuildingCatalogModal';
import { useMapStore } from '../store/useMapStore';
import { useProjectStore } from '../store/useProjectStore';
import { normalizeGeoJSON } from '../gis/importExport';

export default function WorkspacePage() {
  const [mapInstance, setMapInstance] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isDirty,
    toastMessage,
    setToast,
    undo,
    redo,
    setActiveTool,
    closeContextMenu,
    features,
    setFeatures,
  } = useMapStore();

  const { saveCurrentProject } = useProjectStore();

  // Auto-save every 20 seconds if dirty
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty) {
        saveCurrentProject(mapInstance);
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [isDirty, mapInstance]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveCurrentProject(mapInstance);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Escape') {
        closeContextMenu();
        setActiveTool(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapInstance]);

  // Handle spatial file imports
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setToast(`Importing ${file.name}...`);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const geojson = data.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: [data] };

      const maxId = features.reduce((m, f) => Math.max(m, f.id || 0), 0);
      const imported = normalizeGeoJSON(geojson, maxId);

      setFeatures([...features, ...imported]);
      setToast(`Imported ${imported.length} spatial features successfully!`);
    } catch (err: any) {
      setToast('Import failed: Ensure valid GeoJSON format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a1628]">
      {/* Hidden Spatial Data File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".geojson,.json,.kml,.kmz"
        className="hidden"
      />

      {/* MapLibre Canvas Viewport */}
      <MapCanvas onMapReady={setMapInstance} />

      {/* Top Floating Pill Toolbar */}
      <TopToolbar
        mapInstance={mapInstance}
        onImportClick={() => fileInputRef.current?.click()}
      />

      {/* Left Panels */}
      <DataBrowserPanel
        mapInstance={mapInstance}
        onImportClick={() => fileInputRef.current?.click()}
      />
      <MyLayersPanel mapInstance={mapInstance} />

      {/* Context Menu & Feature Inspection Popup */}
      <MapContextMenu />
      <FeaturePopup />

      {/* Floating Modals & Sidebars */}
      <ShapeEditorModal />
      <TradeAreaSidebar mapInstance={mapInstance} />
      <AttributeTableModal />
      <BasemapModal mapInstance={mapInstance} />
      <SearchModal mapInstance={mapInstance} />
      <WorkspaceLauncherModal />
      <BuildingCatalogModal mapInstance={mapInstance} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 bg-[rgba(9,16,24,0.98)] border border-white/20 text-white font-semibold text-xs rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
