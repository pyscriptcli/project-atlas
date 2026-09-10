'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Circle as CircleIcon,
  RotateCcw,
  Trash2,
  Square,
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
    setActiveCinematicCluster,
    focusDisplayMode,
    setFocusDisplayMode,
    activeTool,
    setActiveTool,
  } = useMapStore();

  const [activeTab, setActiveTab] = useState<'scan' | 'ai'>('scan');

  // Target Scan Area State: Circle Polygon vs Drawn Shape
  const [areaMode, setAreaMode] = useState<'circle' | 'shape'>('circle');
  const [selectedCircleId, setSelectedCircleId] = useState<number | ''>('');
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

  // Scanning, Multi-Stage Progress, & Cancel State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [scannedPois, setScannedPois] = useState<ScannedPOI[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});

  // Visual AI Intelligence Dashboard State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AIInsightsPayload | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [showRawBrief, setShowRawBrief] = useState<boolean>(false);

  // Auto-detect and select the latest drawn circle
  const drawnCircles = features.filter((f) => f.kind === 'circle');
  const drawnShapes = features.filter((f) => ['polygon', 'rectangle'].includes(f.kind));

  useEffect(() => {
    if (drawnCircles.length > 0) {
      if (!selectedCircleId || !drawnCircles.some((c) => c.id === selectedCircleId)) {
        setSelectedCircleId(drawnCircles[drawnCircles.length - 1].id);
      }
    }
  }, [features, selectedCircleId, drawnCircles.length]);

  // Progressive scan stages
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      setScanStage(0);
      timer = setInterval(() => {
        setScanStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 800);
    } else {
      setScanStage(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  if (!activePanels.tradeArea) return null;

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

  // Direct Circle Polygon Tool activator
  const handleStartDrawingCircle = () => {
    setActiveTool('circle');
    setToast('Click center on map, then move cursor and click edge to define radius.');
  };

  // Cancel in-flight scan
  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setToast('Trade area scan cancelled.');
  };

  // Clear / Reset all scan results and pinballs
  const handleClearScan = () => {
    if (isScanning && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setScannedPois([]);
    setCategoryBreakdown({});
    setAiData(null);
    setActiveCinematicCluster(null);

    if (activeBufferFeatureId) {
      removeFeature(activeBufferFeatureId);
      setActiveBufferFeatureId(null);
    }
    if (centerMarkerId) {
      removeFeature(centerMarkerId);
      setCenterMarkerId(null);
    }

    if (customGroups['Trade Area Scan']?.ids?.length) {
      customGroups['Trade Area Scan'].ids.forEach((id) => removeFeature(id));
      const nextGroups = { ...customGroups };
      delete nextGroups['Trade Area Scan'];
      setCustomGroups(nextGroups);
    }

    setToast('Trade area scan results and markers cleared.');
  };

  // Execute Trade Area Scan
  const handleRunScan = async () => {
    if (selectedTags.length === 0 && !customTag.trim()) {
      setToast('Please select at least one POI category or enter a custom tag.');
      return;
    }

    let lat: number = 14.5995;
    let lon: number = 120.9842;
    let radius = 1000;
    let targetShapeFeature: GISFeature | undefined;

    if (areaMode === 'shape') {
      if (!selectedShapeId) {
        setToast('Please choose a target drawn polygon.');
        return;
      }
      targetShapeFeature = features.find((f) => f.id === selectedShapeId);
      if (!targetShapeFeature) {
        setToast('Target polygon not found.');
        return;
      }
    } else {
      // Circle mode: find selected or latest drawn circle
      const activeCircle =
        features.find((f) => f.id === selectedCircleId && f.kind === 'circle') ||
        drawnCircles[drawnCircles.length - 1];

      if (!activeCircle) {
        handleStartDrawingCircle();
        return;
      }

      if (activeCircle.props?.centerCoord) {
        lon = activeCircle.props.centerCoord[0];
        lat = activeCircle.props.centerCoord[1];
      } else if (activeCircle.geometry.type === 'Polygon' && activeCircle.geometry.coordinates?.[0]?.[0]) {
        lon = activeCircle.geometry.coordinates[0][0][0];
        lat = activeCircle.geometry.coordinates[0][0][1];
      }
      radius = activeCircle.props?.radiusMeters || 1000;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsScanning(true);
    setToast(`Scanning Overpass multi-endpoint API for ${selectedTags.length} categories...`);

    let result = null;
    try {
      if (areaMode === 'shape' && targetShapeFeature) {
        result = await scanTradeAreaPolygon(targetShapeFeature, selectedTags, customTag, signal);
      } else {
        result = await scanTradeAreaCoordinates(lat, lon, radius, selectedTags, customTag, signal);
      }
    } catch (e: any) {
      if (e.name === 'AbortError' || signal.aborted) {
        setToast('Scan cancelled.');
        setIsScanning(false);
        return;
      }
      console.error(e);
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }

    if (!result || !result.features.length) {
      setToast('No matching POIs found within this area. Try expanding your circle.');
      setScannedPois([]);
      setCategoryBreakdown({});
      return;
    }

    setScannedPois(result.features);
    setCategoryBreakdown(result.categoryCounts);

    // Smooth camera transition to encompass the area
    if (mapInstance && areaMode === 'circle') {
      mapInstance.easeTo({ center: [lon, lat], zoom: radius > 5000 ? 12 : 14, duration: 1200 });
    }

    // Add scanned POIs as monochrome 3D Pinball markers with realistic drop shadows into dedicated group
    let updatedGroups = { ...customGroups };
    if (!updatedGroups['Trade Area Scan']) {
      updatedGroups['Trade Area Scan'] = { collapsed: false, ids: [] };
    }

    const groupIds = [...updatedGroups['Trade Area Scan'].ids];

    result.features.forEach((poi, idx) => {
      const poiId = Date.now() + idx + 1;
      const color = CATEGORY_COLORS[poi.category] || '#18181b';
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
            street: p.tags?.['addr:street'] || p.tags?.street,
            city: p.tags?.['addr:city'],
            suburb: p.tags?.['addr:suburb'] || p.tags?.neighbourhood || p.tags?.place,
            lat: p.lat,
            lon: p.lon,
            tags: p.tags,
          })),
          center:
            drawnCircles.length > 0 && drawnCircles[0].props?.centerCoord
              ? [drawnCircles[0].props.centerCoord[1], drawnCircles[0].props.centerCoord[0]]
              : scannedPois.length
              ? [scannedPois[0].lat, scannedPois[0].lon]
              : [14.5995, 120.9842],
          summary: categoryBreakdown,
          radiusMeters: drawnCircles.length > 0 ? drawnCircles[0].props?.radiusMeters || 1000 : 1000,
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

  // Trigger cinematic focus on a commercial cluster on the map
  const handleFocusClusterOnMap = (cluster: CommercialCluster) => {
    if (!cluster.center) return;
    setActiveCinematicCluster(cluster);
    setToast(`Cinematic focus on ${cluster.name} (${cluster.poiCount} POIs)...`);
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
    <div className="fixed top-16 left-4 bottom-4 w-[430px] max-w-[calc(100vw-2rem)] z-[1000] bg-black/80 border border-white/15 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-zinc-300 animate-in fade-in slide-in-from-left-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/20 flex items-center justify-center text-white shadow-sm">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight leading-tight">
              Trade Area & POI Analysis
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">
              3D Pinball & AI Intelligence Suite
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(scannedPois.length > 0 || Object.keys(categoryBreakdown).length > 0 || (customGroups['Trade Area Scan']?.ids?.length ?? 0) > 0) && (
            <button
              type="button"
              onClick={handleClearScan}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold"
              title="Reset and clear all scan results and pinballs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={() => togglePanel('tradeArea', false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-1.5 p-1 bg-zinc-950/70 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'scan'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
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
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Cluster Deep-Dive</span>
            {scannedPois.length > 0 && (
              <span className="px-2 py-0.5 bg-black/40 text-zinc-300 border border-white/15 rounded-full font-mono text-[10px]">
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
            {/* 1. Target Scan Area Card (Circle Polygon Tool) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-3 shrink-0 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <CircleIcon className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Scan Area</span>
                </span>
                <div className="flex gap-1 p-0.5 bg-black/60 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAreaMode('circle')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      areaMode === 'circle'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Circle Area
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('shape')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      areaMode === 'shape'
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Drawn Polygon
                  </button>
                </div>
              </div>

              {areaMode === 'circle' ? (
                <div className="space-y-2.5">
                  {/* If user is actively in circle drawing mode */}
                  {activeTool === 'circle' ? (
                    <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2">
                        <CircleIcon className="w-4 h-4 text-white animate-spin" />
                        <div>
                          <span className="font-bold text-white text-xs block">Drawing Circle on Map</span>
                          <span className="text-[10px] text-zinc-300">Click center point, then click edge for radius</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTool(null)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : drawnCircles.length > 0 ? (
                    // One or more drawn circles available
                    <div className="space-y-2">
                      {(() => {
                        const activeCircle =
                          features.find((f) => f.id === selectedCircleId && f.kind === 'circle') ||
                          drawnCircles[drawnCircles.length - 1];
                        const r = activeCircle?.props?.radiusMeters || 1000;
                        return (
                          <div className="p-3 bg-zinc-950/70 border border-white/15 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
                                  <CircleIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="font-bold text-white text-xs block truncate max-w-[170px]">
                                    {activeCircle?.name || 'Active Circle Area'}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    Radius: {r >= 1000 ? `${(r / 1000).toFixed(2)} km` : `${Math.round(r)} m`}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleStartDrawingCircle}
                                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[10px] border border-white/15 transition"
                              >
                                Redraw Circle
                              </button>
                            </div>
                            {drawnCircles.length > 1 && (
                              <select
                                value={selectedCircleId}
                                onChange={(e) => setSelectedCircleId(Number(e.target.value))}
                                className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none"
                              >
                                {drawnCircles.map((c) => {
                                  const cR = c.props?.radiusMeters || 0;
                                  return (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({cR >= 1000 ? `${(cR / 1000).toFixed(1)}km` : `${Math.round(cR)}m`})
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    // No circle drawn on map yet
                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Draw a circular trade area directly on the map to define your search boundary.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartDrawingCircle}
                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-white/5 text-xs"
                      >
                        <CircleIcon className="w-4 h-4 text-black" />
                        <span>Draw Circle Scan Area on Map</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedShapeId}
                    onChange={(e) =>
                      setSelectedShapeId(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-white/40 text-xs"
                  >
                    <option value="">-- Choose Drawn Polygon or Rectangle --</option>
                    {drawnShapes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.kind})
                      </option>
                    ))}
                  </select>
                  {drawnShapes.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTool('polygon')}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/15 transition"
                    >
                      Draw Polygon on Map
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Multi-Stage Animated Loading Screen with Cancel */}
            {isScanning && (
              <div className="p-5 bg-zinc-950/90 border border-white/20 rounded-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 shrink-0">
                {/* Monochrome Radar Ping */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-30" />
                  <div className="absolute inset-1 rounded-full border border-white/40 animate-pulse" />
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white">
                    <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs tracking-tight">
                    High-Speed Multi-Mirror Overpass Scan
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Optimized query across high-throughput OSM endpoints
                  </p>
                </div>

                {/* Live Stages Checklist */}
                <div className="w-full space-y-2 text-left bg-black/60 p-3 rounded-xl border border-white/10">
                  {[
                    { label: 'Connecting to Overpass High-Speed Gateway', done: scanStage > 0, active: scanStage === 0 },
                    { label: `Querying POI tags (${selectedTags.length} active categories)`, done: scanStage > 1, active: scanStage === 1 },
                    { label: 'Filtering coordinates & building node geometry', done: scanStage > 2, active: scanStage === 2 },
                    { label: 'Rendering monochrome 3D pinballs & drop shadows', done: scanStage > 3, active: scanStage === 3 },
                  ].map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      {st.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : st.active ? (
                        <Loader2 className="w-3.5 h-3.5 text-zinc-300 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                      )}
                      <span
                        className={
                          st.active
                            ? 'text-white font-semibold'
                            : st.done
                            ? 'text-zinc-400'
                            : 'text-zinc-600'
                        }
                      >
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cancel Scan Button */}
                <button
                  type="button"
                  onClick={handleCancelScan}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cancel Scan</span>
                </button>
              </div>
            )}

            {/* 2. POI Taxonomy Selection */}
            <div className="space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span>POI Taxonomy Categories</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {selectedTags.length} tags selected
                </span>
              </div>

              {/* Tag Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tags (e.g. cafe, hospital, grocery, bank)..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-white/30 text-xs transition"
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
                  const color = CATEGORY_COLORS[category] || '#ffffff';

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
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/20"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-white text-[11px] truncate">
                            {category}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono shrink-0">
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
                            className="text-[10px] text-white hover:text-zinc-200 font-semibold px-2 py-0.5 rounded-md bg-white/10 border border-white/20 transition"
                          >
                            {catSelectedCount === filteredItems.length ? 'Clear' : 'All'}
                          </button>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
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
                                    ? 'bg-white/20 border-white/40 text-white font-semibold shadow-sm'
                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
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
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Custom POI Tag Filter
                </span>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="e.g. amenity=dentist or shop=bakery"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-white/30 transition"
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
                    <span className="text-[10px] text-zinc-400">
                      Found {scannedPois.length} locations (3D Pinballs active)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearScan}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-semibold rounded-xl text-[10px] border border-white/10 transition"
                      title="Clear scan results"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ai')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white text-white hover:text-black font-bold rounded-xl text-[11px] border border-white/20 shadow transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                      <span>AI Deep-Dive &rarr;</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {Object.entries(categoryBreakdown).map(([cat, count]) => {
                    const color = CATEGORY_COLORS[cat] || '#002244';
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
              <div className="p-8 border border-[#d4af37]/30 rounded-2xl bg-[#001529]/60 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#000000] border border-[#d4af37]/50 flex items-center justify-center text-[#fbbf24]">
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
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition mt-2 shadow-md"
                >
                  Go to Scanner
                </button>
              </div>
            ) : (
              <>
                {/* AI Header & Trigger Button */}
                <div className="p-3.5 bg-zinc-950/80 border border-white/15 rounded-2xl flex items-center justify-between backdrop-blur-xl">
                  <div>
                    <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                      <span>AI Intelligence Dashboard</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {scannedPois.length} locations ready for analysis
                    </span>
                  </div>
                  <button
                    onClick={handleTriggerAiAnalysis}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs transition shadow-lg shadow-white/5"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-black" />
                    )}
                    <span>{aiData ? 'Regenerate' : 'Analyze with DeepSeek AI'}</span>
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="p-12 border border-white/10 rounded-2xl bg-zinc-950/60 flex flex-col items-center justify-center text-center gap-3 backdrop-blur-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                    <span className="text-white font-semibold">
                      DeepSeek AI is Analyzing Real POIs...
                    </span>
                    <span className="text-zinc-400 text-[11px] max-w-xs">
                      Detecting competitive density, street corridors, and whitespace opportunities.
                    </span>
                  </div>
                ) : aiData ? (
                  <div className="space-y-4">
                    {/* Scorecard Gauge */}
                    <div className="p-4 bg-zinc-950/70 border border-white/10 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
                      <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-black/80 border border-white/20 shadow-inner">
                        <div className="text-center">
                          <span className="text-xl font-black text-white font-mono block leading-none">
                            {aiData.summary.commercialScore}
                          </span>
                          <span className="text-[8px] text-zinc-400 uppercase font-semibold">
                            Score
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {aiData.summary.saturationRating}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-zinc-200 border border-white/15">
                            {aiData.summary.dominantCategory}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          {aiData.summary.brief}
                        </p>
                      </div>
                    </div>

                    {/* Focus Presentation Mode Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-md">
                      <span className="text-[11px] font-semibold text-zinc-300">Focus Mode:</span>
                      <div className="flex gap-1 p-0.5 bg-black/60 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setFocusDisplayMode('popup')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                            focusDisplayMode === 'popup'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>📍 On-Map Popup</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFocusDisplayMode('rightPanel')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                            focusDisplayMode === 'rightPanel'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>📑 Right Panel</span>
                        </button>
                      </div>
                    </div>

                    {/* High-Density Competitor & Commercial Hubs */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Identified Commercial Clusters ({aiData.clusters.length})</span>
                        </span>
                        <span className="text-[10px] text-zinc-400">Click to fly on map</span>
                      </div>

                      <div className="space-y-2.5">
                        {aiData.clusters.map((cluster, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-zinc-950/70 border border-white/10 rounded-2xl space-y-2.5 hover:border-white/20 transition group backdrop-blur-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white text-xs group-hover:text-zinc-200 transition">
                                  {cluster.name}
                                </h4>
                                <span className="text-[10px] text-zinc-400 block font-medium">
                                  {cluster.corridor}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFocusClusterOnMap(cluster)}
                                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-extrabold text-[10px] border border-white/20 flex items-center gap-1 transition shrink-0 shadow-sm"
                              >
                                <span>Focus</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                                {cluster.poiCount} POIs
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                                Saturation: {cluster.saturation}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/5 border border-white/10 text-zinc-200">
                                Traffic: {cluster.footTrafficRating}
                              </span>
                            </div>

                            {/* Tenants & Insights */}
                            <div className="space-y-1 text-[11px]">
                              {cluster.keyTenants && cluster.keyTenants.length > 0 && (
                                <div className="text-[10px] text-zinc-400">
                                  <strong className="text-zinc-300">Key Tenants: </strong>
                                  {cluster.keyTenants.join(', ')}
                                </div>
                              )}
                              <p className="text-zinc-300 text-[10px] leading-relaxed italic bg-white/[0.02] p-2 rounded-xl border border-white/5">
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
                        <TrendingUp className="w-3.5 h-3.5 text-zinc-300" />
                        <span>High-Potential Whitespace Gaps</span>
                      </span>
                      <div className="space-y-2">
                        {aiData.gaps.map((gap, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">
                                {gap.sector}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-zinc-300 border border-white/10">
                                {gap.opportunity} Opportunity
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {gap.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strategic Recommendations */}
                    <div className="space-y-2">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Commercial Action Items</span>
                      </span>
                      <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                        {aiData.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                            <span className="text-zinc-300 leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy and Raw Brief Drawer */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      >
                        {hasCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span className="text-white font-bold">Report Copied</span>
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
                        className="text-[11px] text-zinc-400 hover:text-white font-semibold transition"
                      >
                        {showRawBrief ? 'Hide Full Text' : 'View Full Text Brief'}
                      </button>
                    </div>

                    {showRawBrief && (
                      <div className="p-4 bg-black/60 border border-white/10 rounded-2xl max-h-48 overflow-y-auto text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {aiData.rawMarkdown || JSON.stringify(aiData, null, 2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Ready to Generate Insights</h4>
                      <p className="text-zinc-400 text-xs mt-1 max-w-xs">
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
        <div className="p-4 pt-3 border-t border-white/10 shrink-0 bg-zinc-950/90 backdrop-blur-xl flex gap-2">
          {isScanning ? (
            <>
              <button
                type="button"
                disabled
                className="flex-1 py-3 bg-white/20 text-zinc-300 font-black rounded-2xl flex items-center justify-center gap-2 text-xs"
              >
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Scanning Mirrors...</span>
              </button>
              <button
                type="button"
                onClick={handleCancelScan}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-xs transition flex items-center gap-1.5 active:scale-[0.98]"
              >
                <X className="w-4 h-4 text-zinc-300" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRunScan}
                className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black font-black rounded-2xl shadow-xl shadow-white/5 flex items-center justify-center gap-2 text-xs transition active:scale-[0.99]"
              >
                <Radar className="w-4 h-4 text-black" />
                <span>Execute Trade Area Scan</span>
              </button>
              {(scannedPois.length > 0 || (customGroups['Trade Area Scan']?.ids?.length ?? 0) > 0) && (
                <button
                  type="button"
                  onClick={handleClearScan}
                  className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-2xl text-xs transition flex items-center justify-center"
                  title="Clear scan and pinballs"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
