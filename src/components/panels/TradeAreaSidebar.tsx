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
  Flame,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Building2,
  CheckCircle2,
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
import { AIInsightsPayload, CommercialCluster } from '../../app/api/ai/insights/route';

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

  // Center Marker & Buffer Tracking
  const [centerMarkerId, setCenterMarkerId] = useState<number | null>(null);
  const [activeBufferFeatureId, setActiveBufferFeatureId] = useState<number | null>(null);

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

  // Visual AI Intelligence Dashboard State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AIInsightsPayload | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [showRawBrief, setShowRawBrief] = useState<boolean>(false);

  // Initialize coordinates from map center
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

  // Update Center 3D Pinball Marker on map whenever coordinates change
  const updateCenterMarkerOnMap = (lat: number, lon: number) => {
    if (centerMarkerId) {
      removeFeature(centerMarkerId);
    }
    const newId = Date.now() + 9999;
    const iconKey = mapInstance
      ? getIconKey('center-pinball', '#fbbf24', mapInstance)
      : 'ico_center-pinball_fbbf24';

    const anchorFeature: GISFeature = {
      id: newId,
      name: 'Trade Area Center Anchor',
      kind: 'marker',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      props: {
        shape: 'pinball',
        color: '#fbbf24',
        iconSize: 1.1,
        iconKey,
        visible: 1,
        showLabel: true,
        attributes: {
          Type: 'Trade Area Center',
          Coordinates: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        },
      },
    };

    addFeature(anchorFeature);
    setCenterMarkerId(newId);
  };

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
      setToast('Map not loaded yet.');
      return;
    }
    setIsPickingOnMap(true);
    setToast('Click anywhere on the map to place the 3D Trade Area center pinball.');

    const onMapClick = (e: any) => {
      const { lng, lat } = e.lngLat;
      const formatted = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setCoordsInput(formatted);
      setIsPickingOnMap(false);
      mapInstance.getCanvas().style.cursor = '';
      mapInstance.off('click', onMapClick);

      // Render 3D Gold Pinball with drop shadow at clicked point
      updateCenterMarkerOnMap(lat, lng);
      setToast(`Center anchored at ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    };

    mapInstance.getCanvas().style.cursor = 'crosshair';
    mapInstance.once('click', onMapClick);
  };

  // Set to current map viewport center
  const handleUseCurrentCenter = () => {
    if (!mapInstance) return;
    const center = mapInstance.getCenter();
    setCoordsInput(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    updateCenterMarkerOnMap(center.lat, center.lng);
    setToast(`Center set to current viewport center.`);
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
      updateCenterMarkerOnMap(lat, lon);
    }

    setIsScanning(true);
    setToast(`Scanning Overpass multi-endpoint API for ${selectedTags.length} categories...`);

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

    // 1. Draw/Update the semi-transparent Trade Area Buffer Circle on map
    if (locationMode === 'coords') {
      if (activeBufferFeatureId) {
        removeFeature(activeBufferFeatureId);
      }

      const bufferCircleId = Date.now();
      const circlePolygonCoords = circleCoordsFromRadius([lon, lat], radiusMeters);

      const bufferFeature: GISFeature = {
        id: bufferCircleId,
        name: `Trade Area Buffer (${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`})`,
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

      // Smooth camera transition to encompass the buffer
      if (mapInstance) {
        mapInstance.easeTo({ center: [lon, lat], zoom: radiusMeters > 5000 ? 12 : 14, duration: 1200 });
      }
    }

    // 2. Add scanned POIs as 3D Pinball markers with drop shadows into dedicated group
    let updatedGroups = { ...customGroups };
    if (!updatedGroups['Trade Area Scan']) {
      updatedGroups['Trade Area Scan'] = { collapsed: false, ids: [] };
    }

    const groupIds = [...updatedGroups['Trade Area Scan'].ids];

    result.features.forEach((poi, idx) => {
      const poiId = Date.now() + idx + 1;
      const color = CATEGORY_COLORS[poi.category] || '#3b82f6';
      // Register 3D pinball with realistic drop shadow
      const iconKey = mapInstance
        ? getIconKey('pinball', color, mapInstance)
        : `ico_pinball_${color.replace('#', '')}`;

      addFeature({
        id: poiId,
        name: poi.name,
        kind: 'marker',
        geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
        props: {
          shape: 'pinball',
          color,
          iconSize: 0.9,
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

    setToast(`Scan complete: Added ${result.features.length} 3D pinball locations to "Trade Area Scan"!`);
  };

  // Trigger DeepSeek AI Market Analysis (ONLY on explicit user click)
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

      setAiData(data);
    } catch (err: any) {
      console.error('AI error:', err);
      setToast(`AI Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fly to and highlight a specific commercial cluster on the map
  const handleFocusClusterOnMap = (cluster: CommercialCluster) => {
    if (!mapInstance || !cluster.center) return;
    const [lat, lon] = cluster.center;

    mapInstance.easeTo({
      center: [lon, lat],
      zoom: 16,
      pitch: 45,
      bearing: -15,
      duration: 1600,
    });

    setToast(`Focusing on ${cluster.name} (${cluster.poiCount} POIs)...`);
  };

  const handleCopyReport = () => {
    if (!aiData) return;
    const text = `
=== TRADE AREA STRATEGIC MARKET REPORT ===
Score: ${aiData.summary.commercialScore}/100 (${aiData.summary.saturationRating})
Total POIs: ${aiData.summary.totalPois} | Dominant: ${aiData.summary.dominantCategory}

SUMMARY:
${aiData.summary.brief}

KEY COMMERCIAL CLUSTERS:
${aiData.clusters
  .map(
    (c) =>
      `• ${c.name} (${c.corridor}): ${c.poiCount} POIs | Saturation: ${c.saturation} | Foot Traffic: ${c.footTrafficRating}\n  Key Tenants: ${c.keyTenants.join(', ')}\n  Insight: ${c.insight}`
  )
  .join('\n\n')}

HIGH-POTENTIAL WHITESPACE GAPS:
${aiData.gaps.map((g) => `• ${g.sector} [Opportunity: ${g.opportunity}]: ${g.rationale}`).join('\n')}

STRATEGIC RECOMMENDATIONS:
${aiData.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <div className="fixed top-16 left-4 bottom-4 w-[430px] max-w-[calc(100vw-2rem)] z-[1000] bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-gray-300 animate-in fade-in slide-in-from-left-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 flex items-center justify-center text-sky-400 shadow-inner">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight leading-tight">
              Trade Area & POI Analysis
            </h3>
            <span className="text-[10px] text-gray-400 font-medium">
              3D Pinball & AI Intelligence Suite
            </span>
          </div>
        </div>
        <button
          onClick={() => togglePanel('tradeArea', false)}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Header */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-1.5 p-1 bg-black/50 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Cluster Deep-Dive</span>
            {scannedPois.length > 0 && (
              <span className="px-2 py-0.5 bg-sky-400/25 text-sky-300 rounded-full font-mono text-[10px]">
                {scannedPois.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Smooth Scroll Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {activeTab === 'scan' ? (
          <>
            {/* 1. Target Location Card */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>Target Location</span>
                </span>
                <div className="flex gap-1 p-0.5 bg-black/40 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setLocationMode('coords')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      locationMode === 'coords'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
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
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Drawn Shape
                  </button>
                </div>
              </div>

              {locationMode === 'coords' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={coordsInput}
                      onChange={(e) => setCoordsInput(e.target.value)}
                      placeholder="14.5995, 120.9842"
                      className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-sky-400 transition"
                    />
                    <button
                      type="button"
                      onClick={handlePickOnMap}
                      className={`px-3 py-2 rounded-xl border transition flex items-center gap-1.5 font-semibold text-[11px] shrink-0 ${
                        isPickingOnMap
                          ? 'bg-amber-500 text-black border-amber-400 animate-pulse font-bold'
                          : 'bg-white/5 border-white/15 text-gray-200 hover:text-white hover:bg-white/15'
                      }`}
                      title="Click anywhere on map to drop center 3D pinball"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pick on Map</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <button
                      type="button"
                      onClick={handleUseCurrentCenter}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      + Use current viewport center
                    </button>
                    <span>Drop shadow 3D anchor</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    value={selectedShapeId}
                    onChange={(e) =>
                      setSelectedShapeId(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 text-xs"
                  >
                    <option value="">-- Choose Drawn Polygon or Circle --</option>
                    {drawnShapes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.kind})
                      </option>
                    ))}
                  </select>
                  {drawnShapes.length === 0 && (
                    <span className="text-[10px] text-amber-400/90 block">
                      No shapes drawn yet. Draw a polygon on the map or switch to Coordinates mode.
                    </span>
                  )}
                </div>
              )}

              {/* Buffer Radius Slider & Quick Pills */}
              <div className="pt-2.5 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between font-semibold text-[11px]">
                  <span className="text-gray-300">Buffer Radius</span>
                  <span className="text-sky-400 font-mono font-bold text-xs">
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
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />
                <div className="flex gap-1 justify-between">
                  {[500, 1000, 2000, 3000, 5000, 10000].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusMeters(r)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono transition border ${
                        radiusMeters === r
                          ? 'bg-sky-400/20 text-sky-300 font-bold border-sky-400/40 shadow-sm'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {r >= 1000 ? `${r / 1000}k` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. POI Taxonomy Selection (Unsquished Card List) */}
            <div className="space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>POI Taxonomy Categories</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {selectedTags.length} tags selected
                </span>
              </div>

              {/* Tag Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tags (e.g. cafe, hospital, grocery, bank)..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-500 outline-none focus:border-sky-400 text-xs transition"
                />
              </div>

              {/* Category Cards with shrink-0 and clean spacing */}
              <div className="space-y-2">
                {Object.entries(POI_CONFIG).map(([category, items]) => {
                  const filteredItems = searchQuery.trim()
                    ? items.filter(
                        ([label, tag]) =>
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
                      className="border border-white/10 rounded-2xl bg-black/30 overflow-hidden shrink-0 transition"
                    >
                      <div
                        onClick={() =>
                          setOpenCategories((prev) => ({ ...prev, [category]: !isOpen }))
                        }
                        className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition select-none"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-white text-[11px] truncate">
                            {category}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            ({catSelectedCount}/{filteredItems.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategorySelectAll(category);
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 transition"
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
                        <div className="p-3 pt-1 border-t border-white/5 flex flex-wrap gap-1.5 bg-black/40">
                          {filteredItems.map(([label, tag]) => {
                            const isChecked = selectedTags.includes(tag);
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium transition flex items-center gap-1.5 ${
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

              {/* Custom Tag Input */}
              <div className="pt-2 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Custom POI Tag Filter
                </span>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="e.g. amenity=dentist or shop=bakery"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-400 transition"
                />
              </div>
            </div>

            {/* Scan Results Breakdown */}
            {scannedPois.length > 0 && (
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Scan Results Breakdown
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Found {scannedPois.length} locations (3D Pinballs active)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-[11px] shadow transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>View AI Deep-Dive &rarr;</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {Object.entries(categoryBreakdown).map(([cat, count]) => {
                    const color = CATEGORY_COLORS[cat] || '#3b82f6';
                    return (
                      <div
                        key={cat}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
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
          /* Visual AI Cluster & Competitor Deep-Dive Tab */
          <div className="space-y-4">
            {scannedPois.length === 0 ? (
              <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-sky-400">
                  <Radar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">No Scanned POI Data Yet</h4>
                  <p className="text-gray-400 text-xs mt-1 max-w-xs">
                    Run a scan in the <strong>Scanner</strong> tab first. Once POIs are found, click the DeepSeek button to generate competitive cluster cards and whitespace maps!
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
                {/* AI Header & Trigger Button */}
                <div className="p-3.5 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-white/15 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Intelligence Dashboard</span>
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {scannedPois.length} locations ready for analysis
                    </span>
                  </div>
                  <button
                    onClick={handleTriggerAiAnalysis}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/30"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{aiData ? 'Regenerate' : 'Analyze with DeepSeek AI'}</span>
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="p-12 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                    <span className="text-white font-semibold">
                      DeepSeek AI is Clustering POIs...
                    </span>
                    <span className="text-gray-400 text-[11px] max-w-xs">
                      Detecting competitive density, foot-traffic hubs, and whitespace gap opportunities.
                    </span>
                  </div>
                ) : aiData ? (
                  <div className="space-y-4">
                    {/* Scorecard Gauge */}
                    <div className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center gap-4">
                      <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-sky-400/30">
                        <div className="text-center">
                          <span className="text-xl font-black text-white font-mono block leading-none">
                            {aiData.summary.commercialScore}
                          </span>
                          <span className="text-[8px] text-gray-400 uppercase font-semibold">
                            Score
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {aiData.summary.saturationRating}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {aiData.summary.dominantCategory}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          {aiData.summary.brief}
                        </p>
                      </div>
                    </div>

                    {/* High-Density Competitor & Commercial Hubs */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Identified Commercial Clusters ({aiData.clusters.length})</span>
                        </span>
                        <span className="text-[10px] text-gray-400">Click to fly on map</span>
                      </div>

                      <div className="space-y-2.5">
                        {aiData.clusters.map((cluster, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2.5 hover:border-white/20 transition group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white text-xs group-hover:text-sky-300 transition">
                                  {cluster.name}
                                </h4>
                                <span className="text-[10px] text-gray-400 block font-medium">
                                  {cluster.corridor}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFocusClusterOnMap(cluster)}
                                className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-sky-300 hover:text-white font-bold text-[10px] border border-blue-500/30 flex items-center gap-1 transition shrink-0"
                              >
                                <span>Focus</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/5 border border-white/10 text-gray-300">
                                {cluster.poiCount} POIs
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                                  cluster.saturation === 'High'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                Saturation: {cluster.saturation}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Traffic: {cluster.footTrafficRating}
                              </span>
                            </div>

                            {/* Tenants & Insights */}
                            <div className="space-y-1 text-[11px]">
                              {cluster.keyTenants && cluster.keyTenants.length > 0 && (
                                <div className="text-[10px] text-gray-400">
                                  <strong className="text-gray-300">Key Tenants: </strong>
                                  {cluster.keyTenants.join(', ')}
                                </div>
                              )}
                              <p className="text-gray-300 text-[10px] leading-relaxed italic bg-white/[0.02] p-2 rounded-xl border border-white/5">
                                "{cluster.insight}"
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Whitespace Gaps */}
                    <div className="space-y-2">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>High-Potential Whitespace Gaps</span>
                      </span>
                      <div className="space-y-2">
                        {aiData.gaps.map((gap, i) => (
                          <div
                            key={i}
                            className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-300 text-xs">
                                {gap.sector}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-200">
                                {gap.opportunity} Opportunity
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                              {gap.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strategic Recommendations */}
                    <div className="space-y-2">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                        <span>Commercial Action Items</span>
                      </span>
                      <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                        {aiData.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span className="text-gray-200 leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy and Raw Brief Drawer */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      >
                        {hasCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Report Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Dossier</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRawBrief(!showRawBrief)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        {showRawBrief ? 'Hide Full Text' : 'View Full Text Brief'}
                      </button>
                    </div>

                    {showRawBrief && (
                      <div className="p-4 bg-black/60 border border-white/10 rounded-2xl max-h-48 overflow-y-auto text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {aiData.rawMarkdown || JSON.stringify(aiData, null, 2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Ready to Generate Insights</h4>
                      <p className="text-gray-400 text-xs mt-1 max-w-xs">
                        Click <strong>Analyze with DeepSeek AI</strong> above to detect commercial clusters, saturation ratings, and whitespace gaps.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar for Scanner */}
      {activeTab === 'scan' && (
        <div className="p-4 pt-3 border-t border-white/10 shrink-0 bg-black/40">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-600 hover:from-blue-500 hover:to-sky-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition active:scale-[0.99]"
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
        </div>
      )}
    </div>
  );
};
