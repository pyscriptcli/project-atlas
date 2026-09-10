'use client';

import React, { useState, useEffect } from 'react';
import {
  Radar,
  X,
  Crosshair,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Layers,
  ChevronUp,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import {
  POI_CONFIG,
  CATEGORY_COLORS,
  scanTradeAreaCoordinates,
  scanTradeAreaPolygon,
  ScannedPOI,
} from '../../gis/tradeArea';
import { circleCoordsFromRadius } from '../../gis/circles';
import { getIconKey } from '../../gis/markers';
import { GISFeature } from '../../types/gis';

interface TradeAreaSidebarProps {
  mapInstance: any;
}

export const TradeAreaSidebar: React.FC<TradeAreaSidebarProps> = ({ mapInstance }) => {
  const {
    activePanels,
    togglePanel,
    features,
    addFeature,
    removeFeature,
    customGroups,
    setCustomGroups,
    setToast,
  } = useMapStore();

  const [activeTab, setActiveTab] = useState<'scan' | 'ai'>('scan');

  // Center & Radius Location State
  const [locationMode, setLocationMode] = useState<'coords' | 'shape'>('coords');
  const [coordsInput, setCoordsInput] = useState<string>('14.5995, 120.9842');
  const [radiusMeters, setRadiusMeters] = useState<number>(1000);
  const [isPickingOnMap, setIsPickingOnMap] = useState<boolean>(false);
  const [selectedShapeId, setSelectedShapeId] = useState<number | ''>('');

  // Taxonomy & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '"shop"~"mall|department_store",i',
    '"shop"~"market|grocery",i',
    '"amenity"="restaurant"',
    '"amenity"~"cafe|coffee",i',
    '"amenity"="fast_food"',
  ]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    RETAIL: true,
    'FOOD, BEVERAGE & HOSPITALITY': true,
  });
  const [customTag, setCustomTag] = useState<string>('');

  // Scanning & Output State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedPois, setScannedPois] = useState<ScannedPOI[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [activeBufferFeatureId, setActiveBufferFeatureId] = useState<number | null>(null);

  // AI Insights State (Triggers ONLY on user demand)
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Update initial coordinates from map center when mapInstance mounts
  useEffect(() => {
    if (mapInstance && coordsInput === '14.5995, 120.9842') {
      try {
        const center = mapInstance.getCenter();
        if (center) {
          setCoordsInput(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
        }
      } catch (e) {}
    }
  }, [mapInstance]);

  if (!activePanels.tradeArea) return null;

  const drawnShapes = features.filter((f) => ['polygon', 'rectangle', 'circle'].includes(f.kind));

  // Toggle single tag
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Bulk select all tags in category
  const handleCategorySelectAll = (category: string) => {
    const items = POI_CONFIG[category] || [];
    const catTags = items.map(([_, tag]) => tag);
    const allSelected = catTags.every((t) => selectedTags.includes(t));

    if (allSelected) {
      setSelectedTags((prev) => prev.filter((t) => !catTags.includes(t)));
    } else {
      setSelectedTags((prev) => Array.from(new Set([...prev, ...catTags])));
    }
  };

  // Pick on Map tool: click anywhere on MapLibre canvas
  const handlePickOnMap = () => {
    if (!mapInstance) {
      setToast('Map not fully loaded yet.');
      return;
    }
    setIsPickingOnMap(true);
    setToast('Click anywhere on the map to set the trade area center point.');

    const onMapClick = (e: any) => {
      const { lng, lat } = e.lngLat;
      setCoordsInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setIsPickingOnMap(false);
      mapInstance.getCanvas().style.cursor = '';
      mapInstance.off('click', onMapClick);
      setToast(`Center set: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    };

    mapInstance.getCanvas().style.cursor = 'crosshair';
    mapInstance.once('click', onMapClick);
  };

  // Set to current map viewport center
  const handleUseCurrentCenter = () => {
    if (!mapInstance) return;
    const center = mapInstance.getCenter();
    setCoordsInput(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    setToast(`Set to current viewport center.`);
  };

  // Parse [lat, lon] from coordsInput string
  const parseCoordinates = (): [number, number] | null => {
    const match = coordsInput.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
  };

  // Execute Trade Area Scan
  const handleRunScan = async () => {
    if (selectedTags.length === 0 && !customTag.trim()) {
      setToast('Please select at least one POI category or enter a custom tag.');
      return;
    }

    let lat: number = 14.5995;
    let lon: number = 120.9842;
    let targetShapeFeature: GISFeature | undefined;

    if (locationMode === 'shape') {
      if (!selectedShapeId) {
        setToast('Please choose a target drawn shape.');
        return;
      }
      targetShapeFeature = features.find((f) => f.id === selectedShapeId);
      if (!targetShapeFeature) {
        setToast('Target shape not found.');
        return;
      }
    } else {
      const parsed = parseCoordinates();
      if (!parsed) {
        setToast('Invalid coordinates format. Use: latitude, longitude');
        return;
      }
      [lat, lon] = parsed;
    }

    setIsScanning(true);
    setToast(`Scanning Overpass API for ${selectedTags.length} POI types...`);

    let result = null;
    if (locationMode === 'shape' && targetShapeFeature) {
      result = await scanTradeAreaPolygon(targetShapeFeature, selectedTags, customTag);
    } else {
      result = await scanTradeAreaCoordinates(lat, lon, radiusMeters, selectedTags, customTag);
    }

    setIsScanning(false);

    if (!result || !result.features.length) {
      setToast('No matching POIs found within this area. Try increasing the radius.');
      setScannedPois([]);
      setCategoryBreakdown({});
      return;
    }

    setScannedPois(result.features);
    setCategoryBreakdown(result.categoryCounts);

    // 1. Draw/Update the Trade Area Buffer Circle on map if in coordinates mode
    if (locationMode === 'coords') {
      if (activeBufferFeatureId) {
        removeFeature(activeBufferFeatureId);
      }

      const bufferCircleId = Date.now();
      const circlePolygonCoords = circleCoordsFromRadius([lon, lat], radiusMeters);

      const bufferFeature: GISFeature = {
        id: bufferCircleId,
        name: `Trade Area (${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`})`,
        kind: 'circle',
        geometry: {
          type: 'Polygon',
          coordinates: circlePolygonCoords,
        },
        props: {
          color: '#0284c7',
          borderColor: '#0284c7',
          borderOpacity: 0.85,
          width: 2,
          fillColor: '#38bdf8',
          fillOpacity: 0.12,
          radiusMeters: radiusMeters,
          showLabel: true,
          visible: 1,
        },
      };

      addFeature(bufferFeature);
      setActiveBufferFeatureId(bufferCircleId);

      // Pan & zoom map to fit buffer
      if (mapInstance) {
        mapInstance.easeTo({ center: [lon, lat], zoom: radiusMeters > 5000 ? 12 : 14 });
      }
    }

    // 2. Add scanned POIs into a dedicated "Trade Area Scan" layer group
    let updatedGroups = { ...customGroups };
    if (!updatedGroups['Trade Area Scan']) {
      updatedGroups['Trade Area Scan'] = { collapsed: false, ids: [] };
    }

    const groupIds = [...updatedGroups['Trade Area Scan'].ids];

    result.features.forEach((poi, idx) => {
      const poiId = Date.now() + idx + 1;
      const color = CATEGORY_COLORS[poi.category] || '#3b82f6';
      const iconKey = mapInstance ? getIconKey('pin', color, mapInstance) : `ico_pin_${color.slice(1)}`;

      addFeature({
        id: poiId,
        name: poi.name,
        kind: 'marker',
        geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
        props: {
          shape: 'pin',
          color,
          iconSize: 0.85,
          iconKey,
          visible: 1,
          osmTags: poi.tags,
          attributes: {
            Name: poi.name,
            Category: poi.category,
            Type: poi.type,
            ...poi.tags,
          },
        },
      });
      groupIds.push(poiId);
    });

    updatedGroups['Trade Area Scan'].ids = groupIds;
    setCustomGroups(updatedGroups);

    setToast(`Scan complete: Added ${result.features.length} POIs to "Trade Area Scan" layer!`);
  };

  // Trigger DeepSeek AI Market Analysis (ONLY on user click)
  const handleTriggerAiAnalysis = async () => {
    if (scannedPois.length === 0) {
      setToast('Run a POI scan first to provide data for the AI analysis.');
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pois: scannedPois.slice(0, 150).map((p) => ({
            name: p.name,
            type: p.type,
            category: p.category,
            lat: p.lat,
            lon: p.lon,
          })),
          summary: categoryBreakdown,
          radiusMeters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI insights');
      }

      setAiInsight(data.insight || 'No analysis generated.');
    } catch (err: any) {
      console.error('AI error:', err);
      setToast(`AI Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyInsight = () => {
    if (!aiInsight) return;
    navigator.clipboard.writeText(aiInsight);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <div className="fixed top-16 left-4 bottom-4 w-[420px] max-w-[calc(100vw-2rem)] z-[1000] bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-gray-300 animate-in fade-in slide-in-from-left-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-sky-400 shadow-inner">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight leading-none">
              Trade Area & POI Analysis
            </h3>
            <span className="text-[10px] text-gray-400">Open Node Geoprocessing Engine</span>
          </div>
        </div>
        <button
          onClick={() => togglePanel('tradeArea', false)}
          className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 mt-3">
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'scan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Scanner</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>AI Insights</span>
          {scannedPois.length > 0 && (
            <span className="px-1.5 py-0.2 bg-sky-400/20 text-sky-300 rounded-full font-mono text-[10px]">
              {scannedPois.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1 py-3 flex flex-col gap-4">
        {activeTab === 'scan' ? (
          <>
            {/* 1. Location & Center Point */}
            <div className="flex flex-col gap-2.5 bg-black/30 border border-white/10 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                  Target Location
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLocationMode('coords')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      locationMode === 'coords'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('shape')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      locationMode === 'shape'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Drawn Shape
                  </button>
                </div>
              </div>

              {locationMode === 'coords' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={coordsInput}
                      onChange={(e) => setCoordsInput(e.target.value)}
                      placeholder="14.5995, 120.9842"
                      className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={handlePickOnMap}
                      className={`p-2 rounded-xl border transition flex items-center gap-1 font-semibold text-[11px] ${
                        isPickingOnMap
                          ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                      }`}
                      title="Click anywhere on map to drop center"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                      <span>Pick on Map</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentCenter}
                    className="text-[10px] text-sky-400 hover:text-sky-300 text-left font-medium"
                  >
                    + Use current map center
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <select
                    value={selectedShapeId}
                    onChange={(e) =>
                      setSelectedShapeId(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                  >
                    <option value="">-- Choose Drawn Polygon or Circle --</option>
                    {drawnShapes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.kind})
                      </option>
                    ))}
                  </select>
                  {drawnShapes.length === 0 && (
                    <span className="text-[10px] text-amber-400/80">
                      No shapes drawn yet. Draw a polygon/circle or switch to Coordinates mode.
                    </span>
                  )}
                </div>
              )}

              {/* Radius Control */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Buffer Radius</span>
                  <span className="text-sky-400 font-mono font-bold">
                    {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(1)} km` : `${radiusMeters} m`}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={20000}
                  step={100}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex gap-1.5 justify-between">
                  {[500, 1000, 2000, 3000, 5000, 10000].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusMeters(r)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                        radiusMeters === r
                          ? 'bg-sky-400/20 text-sky-300 font-bold border border-sky-400/40'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {r >= 1000 ? `${r / 1000}k` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. POI Category Selection & Tag Search */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                  POI Taxonomy Selection
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {selectedTags.length} tags selected
                </span>
              </div>

              {/* Tag Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags (e.g. cafe, pharmacy, school, mall)..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-500 outline-none focus:border-sky-400 text-xs"
                />
              </div>

              {/* Accordions */}
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {Object.entries(POI_CONFIG).map(([category, items]) => {
                  const filteredItems = searchQuery.trim()
                    ? items.filter(([label, tag]) =>
                        label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : items;

                  if (filteredItems.length === 0) return null;

                  const isOpen = openCategories[category] || searchQuery.trim().length > 0;
                  const catSelectedCount = filteredItems.filter(([_, tag]) =>
                    selectedTags.includes(tag)
                  ).length;
                  const color = CATEGORY_COLORS[category] || '#3b82f6';

                  return (
                    <div
                      key={category}
                      className="border border-white/10 rounded-2xl bg-black/20 overflow-hidden"
                    >
                      <div
                        onClick={() =>
                          setOpenCategories((prev) => ({ ...prev, [category]: !isOpen }))
                        }
                        className="flex items-center justify-between p-2.5 hover:bg-white/5 cursor-pointer transition select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-white text-[11px]">
                            {category}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({catSelectedCount}/{filteredItems.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategorySelectAll(category);
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold px-1.5 py-0.5 rounded bg-sky-500/10"
                          >
                            {catSelectedCount === filteredItems.length ? 'Clear' : 'All'}
                          </button>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-2.5 pt-1 border-t border-white/5 flex flex-wrap gap-1.5 bg-black/30">
                          {filteredItems.map(([label, tag]) => {
                            const isChecked = selectedTags.includes(tag);
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className={`px-2 py-1 rounded-lg border text-[10px] font-medium transition flex items-center gap-1 ${
                                  isChecked
                                    ? 'bg-blue-600/30 border-blue-500 text-white font-semibold shadow-sm'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom POI Tag */}
              <div className="flex flex-col gap-1 border-t border-white/10 pt-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Custom Tag Filter (Optional)
                </span>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="e.g. amenity=dentist or shop=bakery"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Scan Action Button */}
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition active:scale-[0.99]"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Querying Overpass Multi-Endpoint API...</span>
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  <span>Execute Trade Area Scan</span>
                </>
              )}
            </button>

            {/* Results Breakdown */}
            {scannedPois.length > 0 && (
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Scan Results Summary
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Found {scannedPois.length} locations
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-[11px] shadow transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>View AI Tab &rarr;</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {Object.entries(categoryBreakdown).map(([cat, count]) => {
                    const color = CATEGORY_COLORS[cat] || '#3b82f6';
                    return (
                      <div
                        key={cat}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="truncate text-[10px]">{cat}</span>
                        </div>
                        <span className="font-bold font-mono text-white text-[11px]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* AI Insights Tab */
          <div className="flex flex-col gap-3.5">
            {scannedPois.length === 0 ? (
              <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-sky-400">
                  <Radar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">No Scanned POI Data Yet</h4>
                  <p className="text-gray-400 text-xs mt-1 max-w-xs">
                    Run a scan in the <strong>Scanner</strong> tab first. Once POIs are found, you can request DeepSeek to analyze market density, competitive clusters, and commercial whitespace opportunities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('scan')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition mt-2"
                >
                  Go to Scanner
                </button>
              </div>
            ) : (
              <>
                {/* Status bar */}
                <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Market Data Ready
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {scannedPois.length} locations ready for analysis
                    </span>
                  </div>
                  <button
                    onClick={handleTriggerAiAnalysis}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/20"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{aiInsight ? 'Re-Analyze with AI' : 'Analyze with DeepSeek AI'}</span>
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="p-12 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                    <span className="text-white font-semibold">Consulting DeepSeek AI Analyst...</span>
                    <span className="text-gray-400 text-[11px] max-w-xs">
                      Evaluating retail density, competitive footprint, underserved commercial sectors, and spatial foot-traffic drivers.
                    </span>
                  </div>
                ) : aiInsight ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>DeepSeek Strategic Market Report</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyInsight}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition px-2 py-1 rounded-lg bg-white/5"
                      >
                        {hasCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Report</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-4 bg-black/50 border border-white/10 rounded-2xl max-h-[52vh] overflow-y-auto text-gray-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {aiInsight}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Ready to Generate Insights</h4>
                      <p className="text-gray-400 text-xs mt-1 max-w-xs">
                        Click the button above to run on-demand DeepSeek AI analysis over the {scannedPois.length} scanned POIs.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
