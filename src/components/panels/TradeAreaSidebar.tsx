'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Download,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Sliders,
  Palette,
  Send,
  MessageSquare,
  Bot,
  User,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import {
  POI_CONFIG,
  CATEGORY_COLORS,
  scanTradeAreaCoordinates,
  scanTradeAreaPolygon,
  ScannedPOI,
  compileFeaturesKml,
} from '../../gis/tradeArea';
import { circleCoordsFromRadius } from '../../gis/circles';
import { getIconKey } from '../../gis/markers';
import { GISFeature, MarkerShape } from '../../types/gis';
import { AIInsightsPayload, CommercialCluster } from '../../app/api/ai/insights/route';

interface TradeAreaSidebarProps {
  mapInstance: any;
}

interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const TradeAreaSidebar: React.FC<TradeAreaSidebarProps> = ({ mapInstance }) => {
  const {
    activePanels,
    togglePanel,
    features,
    addFeature,
    updateFeature,
    removeFeature,
    customGroups,
    setCustomGroups,
    setToast,
    setActiveCinematicCluster,
    activeTool,
    setActiveTool,
  } = useMapStore();

  // Primary 2-Tab Workflow: 'target_layers' (Setup & Mapped Assets) | 'ai' (Spatial Intelligence & Q&A)
  const [activeTab, setActiveTab] = useState<'target_layers' | 'ai'>('target_layers');

  // Target Mode: 'coords' (Open Node default) | 'circle' (Map circle) | 'shape' (Drawn polygon)
  const [areaMode, setAreaMode] = useState<'coords' | 'circle' | 'shape'>('coords');
  const [coordsInput, setCoordsInput] = useState<string>('14.5995, 120.9842');
  const [radiusMeters, setRadiusMeters] = useState<number>(1000);
  const [showRadiusGraphics, setShowRadiusGraphics] = useState<boolean>(true);

  // Center Marker & Radius Feature IDs
  const [centerMarkerId, setCenterMarkerId] = useState<number | null>(null);
  const [activeBufferFeatureId, setActiveBufferFeatureId] = useState<number | null>(null);

  // Selected Drawn shapes
  const [selectedCircleId, setSelectedCircleId] = useState<number | ''>('');
  const [selectedShapeId, setSelectedShapeId] = useState<number | ''>('');

  // Taxonomy & Search State - CLEARED BY DEFAULT
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [customTag, setCustomTag] = useState<string>('');

  // Scanning, Multi-Stage Progress, & Cancel State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [scannedPois, setScannedPois] = useState<ScannedPOI[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});

  // Global Marker Styling State (Monochrome Defaults)
  const [globalMarkerStyle, setGlobalMarkerStyle] = useState<MarkerShape>('modern-pin');
  const [globalMarkerSize, setGlobalMarkerSize] = useState<number>(20);
  const [globalMarkerColor, setGlobalMarkerColor] = useState<string>('#ffffff');
  const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Visual AI Intelligence Dashboard State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AIInsightsPayload | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [showRawBrief, setShowRawBrief] = useState<boolean>(false);

  // Interactive Spatial AI Q&A State
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([]);
  const [qaInput, setQaInput] = useState<string>('');
  const [isQaLoading, setIsQaLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Drawn circles and shapes on MapLibre
  const drawnCircles = useMemo(() => features.filter((f) => f.kind === 'circle'), [features]);
  const drawnShapes = useMemo(() => features.filter((f) => ['polygon', 'rectangle'].includes(f.kind)), [features]);

  // Scanned POI features currently in the store
  const scannedFeatureIds = useMemo(() => {
    return customGroups['Trade Area Scan']?.ids || [];
  }, [customGroups]);

  const activeScannedFeatures = useMemo(() => {
    return features.filter((f) => scannedFeatureIds.includes(f.id));
  }, [features, scannedFeatureIds]);

  // Group active scanned features by category
  const featuresByCategory = useMemo(() => {
    const map: Record<string, GISFeature[]> = {};
    activeScannedFeatures.forEach((f) => {
      const cat = f.props?.category || 'OTHER';
      if (!map[cat]) map[cat] = [];
      map[cat].push(f);
    });
    return map;
  }, [activeScannedFeatures]);

  // Progressive scan stages
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      setScanStage(0);
      timer = setInterval(() => {
        setScanStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 750);
    } else {
      setScanStage(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'ai') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaMessages, isQaLoading, activeTab]);

  if (!activePanels.tradeArea) return null;

  // Coordinate parser
  const parseCoords = (): { lat: number; lon: number } | null => {
    const match = coordsInput.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) {
      return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    return null;
  };

  // Sync center target and buffer circle on map (Monochrome glass styling)
  const syncTargetRadiusGraphics = (targetLat: number, targetLon: number, targetRadius: number) => {
    if (!showRadiusGraphics) return;

    // 1. Center Target Marker (Monochrome Silver/White)
    const cId = centerMarkerId || Date.now() + 9999;
    const centerIconKey = mapInstance
      ? getIconKey('center-pinball', '#ffffff', mapInstance)
      : 'ico_center-pinball_ffffff';

    addFeature({
      id: cId,
      name: `Target Center (${targetLat.toFixed(4)}, ${targetLon.toFixed(4)})`,
      kind: 'marker',
      geometry: { type: 'Point', coordinates: [targetLon, targetLat] },
      props: {
        shape: 'center-pinball',
        color: '#ffffff',
        iconSize: 1.1,
        iconKey: centerIconKey,
        visible: 1,
        attributes: {
          Type: 'Scan Center Target',
          Latitude: targetLat.toFixed(5),
          Longitude: targetLon.toFixed(5),
        },
      },
    });
    setCenterMarkerId(cId);

    // 2. Radius Buffer Circle (Monochrome Glass Stroke & Fill)
    const bufId = activeBufferFeatureId || Date.now() + 8888;
    const ringCoords = circleCoordsFromRadius([targetLon, targetLat], targetRadius);
    addFeature({
      id: bufId,
      name: `Scan Radius (${(targetRadius / 1000).toFixed(1)} km)`,
      kind: 'circle',
      geometry: { type: 'Polygon', coordinates: ringCoords },
      props: {
        color: '#ffffff',
        fillOpacity: 0.05,
        borderColor: '#ffffff',
        borderOpacity: 0.45,
        width: 1.75,
        visible: 1,
        centerCoord: [targetLon, targetLat],
        radiusMeters: targetRadius,
        attributes: {
          Radius: `${targetRadius} m`,
          Center: `${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}`,
        },
      },
    });
    setActiveBufferFeatureId(bufId);
  };

  // Set coordinates from map center
  const handleSetFromMapCenter = () => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      const newStr = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
      setCoordsInput(newStr);
      syncTargetRadiusGraphics(center.lat, center.lng, radiusMeters);
      setToast(`Target set to map center: ${newStr}`);
    }
  };

  // Set coordinates from GPS
  const handleSetFromCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newStr = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setCoordsInput(newStr);
          syncTargetRadiusGraphics(pos.coords.latitude, pos.coords.longitude, radiusMeters);
          if (mapInstance) {
            mapInstance.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14 });
          }
          setToast(`Target set to your GPS location: ${newStr}`);
        },
        () => {
          setToast('Unable to retrieve your current location.');
        }
      );
    }
  };

  // Toggle single tag
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Select/Deselect all tags in a category
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

  // Quick preset selections
  const handleSelectPreset = (preset: 'commercial' | 'all' | 'clear') => {
    if (preset === 'clear') {
      setSelectedTags([]);
      return;
    }
    if (preset === 'all') {
      const allTags = Object.values(POI_CONFIG).flatMap((items) => items.map(([_, tag]) => tag));
      setSelectedTags(Array.from(new Set(allTags)));
      return;
    }
    if (preset === 'commercial') {
      const commTags = (POI_CONFIG['COMMERCIAL & OFFICES'] || []).map(([_, t]) => t);
      const retTags = (POI_CONFIG['RETAIL'] || []).map(([_, t]) => t);
      const fbTags = (POI_CONFIG['FOOD, BEVERAGE & HOSPITALITY'] || []).map(([_, t]) => t);
      setSelectedTags(Array.from(new Set([...commTags, ...retTags, ...fbTags])));
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

  // Clear / Reset all scan results
  const handleClearScan = () => {
    if (isScanning && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setScannedPois([]);
    setCategoryBreakdown({});
    setAiData(null);
    setQaMessages([]);
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
    let radius = radiusMeters;
    let targetShapeFeature: GISFeature | undefined;

    if (areaMode === 'coords') {
      const parsed = parseCoords();
      if (!parsed) {
        setToast('Invalid coordinates format. Use "lat, lon" (e.g., 14.5995, 120.9842)');
        return;
      }
      lat = parsed.lat;
      lon = parsed.lon;
      syncTargetRadiusGraphics(lat, lon, radius);
    } else if (areaMode === 'shape') {
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
    setToast(`Scanning Overpass & OSMnx for ${selectedTags.length} categories...`);

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
      setToast('No matching POIs found within this area. Try expanding your radius or selecting tags.');
      setScannedPois([]);
      setCategoryBreakdown({});
      return;
    }

    setScannedPois(result.features);
    setCategoryBreakdown(result.categoryCounts);

    if (mapInstance && (areaMode === 'coords' || areaMode === 'circle')) {
      mapInstance.easeTo({ center: [lon, lat], zoom: radius > 5000 ? 12 : 14, duration: 1200 });
    }

    let updatedGroups = { ...customGroups };
    if (!updatedGroups['Trade Area Scan']) {
      updatedGroups['Trade Area Scan'] = { collapsed: false, ids: [] };
    }

    const groupIds = [...updatedGroups['Trade Area Scan'].ids];

    result.features.forEach((poi, idx) => {
      const poiId = Date.now() + idx + 1;
      const color = CATEGORY_COLORS[poi.category] || globalMarkerColor;
      const iconKey = mapInstance
        ? getIconKey(globalMarkerStyle, color, mapInstance)
        : `ico_${globalMarkerStyle}_${color.replace('#', '')}`;

      addFeature({
        id: poiId,
        name: poi.name,
        kind: 'marker',
        geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
        props: {
          shape: globalMarkerStyle,
          color,
          iconSize: globalMarkerSize / 20,
          iconKey,
          visible: 1,
          category: poi.category,
          poiType: poi.type,
          osmTags: poi.tags,
          attributes: {
            Name: poi.name,
            Category: poi.category,
            Type: poi.type,
            Latitude: poi.lat.toFixed(6),
            Longitude: poi.lon.toFixed(6),
          },
        },
      });
      groupIds.push(poiId);
    });

    updatedGroups['Trade Area Scan'].ids = groupIds;
    setCustomGroups(updatedGroups);

    setToast(`Found and mapped ${result.features.length} POIs!`);
  };

  // Apply global styling to all scanned features
  const handleApplyGlobalStyle = (style: MarkerShape) => {
    setGlobalMarkerStyle(style);
    activeScannedFeatures.forEach((f) => {
      const color = f.props.color || '#ffffff';
      const iconKey = mapInstance ? getIconKey(style, color, mapInstance) : undefined;
      updateFeature(f.id, (prev) => ({
        ...prev,
        props: {
          ...prev.props,
          shape: style,
          iconKey: iconKey || prev.props.iconKey,
        },
      }));
    });
    setToast(`Applied ${style} style to all scanned POIs.`);
  };

  // Batch toggle visibility of a category
  const handleToggleCategoryVisibility = (category: string) => {
    const feats = featuresByCategory[category] || [];
    const isAnyVisible = feats.some((f) => f.props.visible !== 0);
    const nextVis = isAnyVisible ? 0 : 1;

    feats.forEach((f) => {
      updateFeature(f.id, (prev) => ({
        ...prev,
        props: { ...prev.props, visible: nextVis },
      }));
    });
  };

  // Delete all features in a category
  const handleDeleteCategory = (category: string) => {
    const feats = featuresByCategory[category] || [];
    if (confirm(`Remove all ${feats.length} POIs in "${category}"?`)) {
      feats.forEach((f) => removeFeature(f.id));
      setScannedPois((prev) => prev.filter((p) => p.category !== category));
      setCategoryBreakdown((prev) => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      setToast(`Deleted category ${category}`);
    }
  };

  // Fly to single POI
  const handleFlyToPoi = (f: GISFeature) => {
    if (mapInstance && f.geometry.type === 'Point') {
      const coords = f.geometry.coordinates;
      mapInstance.flyTo({ center: coords, zoom: 17, duration: 1000 });
    }
  };

  // Fly to Commercial Cluster
  const handleFlyToCluster = (cluster: CommercialCluster) => {
    if (mapInstance && cluster.center) {
      mapInstance.flyTo({
        center: [cluster.center[1], cluster.center[0]],
        zoom: 16.5,
        duration: 1200,
      });
      setActiveCinematicCluster(cluster.name);
      setToast(`Focused on cluster: ${cluster.name}`);
    }
  };

  // Export to GeoJSON
  const handleExportGeoJSON = () => {
    const visibleFeats = activeScannedFeatures.filter((f) => f.props.visible !== 0);
    const geojson = {
      type: 'FeatureCollection',
      features: visibleFeats.map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          id: f.id,
          name: f.name,
          category: f.props.category,
          type: f.props.poiType,
          ...f.props.attributes,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_area_pois_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setToast(`Exported ${visibleFeats.length} POIs to GeoJSON!`);
  };

  // Export to KML (Google Earth)
  const handleExportKML = () => {
    const visibleFeats = activeScannedFeatures.filter((f) => f.props.visible !== 0);
    const kmlData = visibleFeats.map((f) => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      name: f.name,
      type: f.props.poiType || f.props.category || 'Node',
      visible: true,
    }));

    const kmlString = compileFeaturesKml(kmlData);
    const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_area_pois_${Date.now()}.kml`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setToast(`Exported ${visibleFeats.length} POIs to KML!`);
  };

  // DeepSeek AI Insights trigger
  const handleTriggerAiAnalysis = async () => {
    if (scannedPois.length === 0) {
      setToast('Run a POI scan first to provide data for the AI analysis.');
      return;
    }

    setIsAiLoading(true);
    try {
      const parsed = parseCoords();
      const centerCoords = parsed ? [parsed.lat, parsed.lon] : [14.5995, 120.9842];

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
          center: centerCoords,
          summary: categoryBreakdown,
          radiusMeters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI insights');
      }

      setAiData(data);
      setToast('Spatial AI commercial analysis complete!');
    } catch (e: any) {
      console.error(e);
      setToast(e.message || 'Error running AI analysis');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy report
  const handleCopyReport = () => {
    if (!aiData) return;
    const text = aiData.rawMarkdown || JSON.stringify(aiData, null, 2);
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    setToast('Commercial dossier copied to clipboard!');
  };

  // Send interactive Spatial Q&A message
  const handleSendQaMessage = async (queryText?: string) => {
    const text = (queryText || qaInput).trim();
    if (!text || isQaLoading) return;

    if (scannedPois.length === 0) {
      setToast('Please scan an area first so the AI has real spatial data to answer from.');
      return;
    }

    const userMsg: QAMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setQaMessages((prev) => [...prev, userMsg]);
    setQaInput('');
    setIsQaLoading(true);

    try {
      const parsed = parseCoords();
      const centerCoords = parsed ? [parsed.lat, parsed.lon] : [14.5995, 120.9842];

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          history: qaMessages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
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
          center: centerCoords,
          summary: categoryBreakdown,
          radiusMeters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to formulate response');
      }

      const assistantMsg: QAMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No analysis generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setQaMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: QAMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to analyze spatial query. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setQaMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQaLoading(false);
    }
  };

  return (
    <div className="fixed top-16 left-4 bottom-4 w-[480px] max-w-[calc(100vw-2rem)] z-[1000] bg-zinc-950/85 border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-zinc-300 animate-in fade-in slide-in-from-left-4 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shadow-inner">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-tight leading-none">
                Open Node
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/20 uppercase font-mono font-bold tracking-wider">
                Spatial Engine
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              Overpass Multi-Mirror & AI Trade Area Suite
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 relative">
          {/* Export Dropdown Trigger */}
          {activeScannedFeatures.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 text-[11px] font-medium"
                title="Export Data"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in">
                  <button
                    type="button"
                    onClick={handleExportGeoJSON}
                    className="w-full text-left px-3 py-2 text-[11px] text-zinc-200 hover:bg-white/10 rounded-xl transition flex items-center gap-2 font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>GeoJSON FeatureCollection</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportKML}
                    className="w-full text-left px-3 py-2 text-[11px] text-zinc-200 hover:bg-white/10 rounded-xl transition flex items-center gap-2 font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Google Earth (KML)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reset Scan */}
          {(activeScannedFeatures.length > 0 || scannedPois.length > 0) && (
            <button
              type="button"
              onClick={handleClearScan}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition"
              title="Clear all scan results and pins"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Sidebar */}
          <button
            onClick={() => togglePanel('tradeArea', false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary 2-Tab Navigation (Decluttered, Modern Apple / Linear Aesthetic) */}
      <div className="px-5 pt-3.5 pb-2 shrink-0">
        <div className="flex gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab('target_layers')}
            className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-2 ${
              activeTab === 'target_layers'
                ? 'bg-white text-black shadow-lg shadow-white/10 font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radar className={`w-3.5 h-3.5 ${activeTab === 'target_layers' ? 'text-black' : 'text-zinc-400'}`} />
            <span>Target & POIs</span>
            {activeScannedFeatures.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  activeTab === 'target_layers'
                    ? 'bg-black text-white'
                    : 'bg-white/15 text-zinc-200 border border-white/20'
                }`}
              >
                {activeScannedFeatures.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-2 ${
              activeTab === 'ai'
                ? 'bg-white text-black shadow-lg shadow-white/10 font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'ai' ? 'text-black' : 'text-zinc-400'}`} />
            <span>Spatial AI & Q&A</span>
            {aiData && (
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTab === 'ai' ? 'bg-black' : 'bg-emerald-400'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
        {/* =========================================================================
            TAB 1: TARGET DEFINITION, COMPACT POI TAXONOMY, & MAPPED ASSETS
           ========================================================================= */}
        {activeTab === 'target_layers' && (
          <div className="space-y-4">
            {/* Target Area Definition Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 space-y-3 shrink-0 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-white" />
                  <span>Target Area Definition</span>
                </span>
                <div className="flex gap-1 p-0.5 bg-black/60 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAreaMode('coords')}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      areaMode === 'coords'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('circle')}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      areaMode === 'circle'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Map Circle
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('shape')}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
                      areaMode === 'shape'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Polygon
                  </button>
                </div>
              </div>

              {/* Coordinates Mode */}
              {areaMode === 'coords' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                        Target Coordinates (Lat, Lon)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSetFromMapCenter}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] text-zinc-300 hover:text-white font-semibold transition"
                        >
                          Map Center
                        </button>
                        <button
                          type="button"
                          onClick={handleSetFromCurrentLocation}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] text-zinc-300 hover:text-white font-semibold transition"
                        >
                          GPS
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={coordsInput}
                      onChange={(e) => setCoordsInput(e.target.value)}
                      placeholder="14.5995, 120.9842"
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-white/40 transition backdrop-blur-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                        Search Radius
                      </label>
                      <span className="text-[11px] font-mono font-bold text-white">
                        {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(1)} km` : `${radiusMeters} m`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="100"
                        max="50000"
                        step="100"
                        value={radiusMeters}
                        onChange={(e) => setRadiusMeters(Number(e.target.value))}
                        className="flex-1 accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="100"
                        max="50000"
                        step="100"
                        value={radiusMeters}
                        onChange={(e) => setRadiusMeters(Math.max(100, Number(e.target.value)))}
                        className="w-20 bg-black/50 border border-white/15 rounded-xl px-2 py-1 text-white font-mono text-xs text-right outline-none focus:border-white/40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-[10px]">
                    <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showRadiusGraphics}
                        onChange={(e) => setShowRadiusGraphics(e.target.checked)}
                        className="accent-white rounded"
                      />
                      <span>Display Target Pin & Buffer Circle on Map</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Map Circle Mode */}
              {areaMode === 'circle' && (
                <div className="space-y-2 pt-1">
                  {drawnCircles.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedCircleId}
                        onChange={(e) => setSelectedCircleId(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none focus:border-white/40"
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
                      <button
                        type="button"
                        onClick={handleStartDrawingCircle}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] border border-white/15 transition flex items-center justify-center gap-1.5"
                      >
                        <CircleIcon className="w-3.5 h-3.5 text-white" />
                        <span>Draw New Circle on Map</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartDrawingCircle}
                      className="w-full py-2.5 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-md hover:bg-zinc-200"
                    >
                      <CircleIcon className="w-4 h-4 text-black" />
                      <span>Draw Circle Area on Map</span>
                    </button>
                  )}
                </div>
              )}

              {/* Polygon Mode */}
              {areaMode === 'shape' && (
                <div className="space-y-2 pt-1">
                  <select
                    value={selectedShapeId}
                    onChange={(e) => setSelectedShapeId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-white/40 text-xs"
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

            {/* In-Flight Scanning Progress */}
            {isScanning && (
              <div className="p-4 bg-zinc-950/90 border border-white/20 rounded-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-3.5 shadow-2xl animate-in fade-in shrink-0">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-30" />
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white">
                    <Radar className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '2.5s' }} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-bold text-white text-xs tracking-tight">
                    Spatial POI Query Running
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Querying Overpass Multi-Mirror Gateways & OSMnx
                  </p>
                </div>

                <div className="w-full space-y-1.5 text-left bg-black/60 p-2.5 rounded-xl border border-white/10">
                  {[
                    { label: 'Connecting to OpenStreetMap Gateway', done: scanStage > 0, active: scanStage === 0 },
                    { label: `Querying ${selectedTags.length} active taxonomy layers`, done: scanStage > 1, active: scanStage === 1 },
                    { label: 'Parsing coordinates & building node geometry', done: scanStage > 2, active: scanStage === 2 },
                    { label: 'Rendering modern drop-pins and attributes', done: scanStage > 3, active: scanStage === 3 },
                  ].map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10.5px]">
                      {st.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : st.active ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                      )}
                      <span className={st.active ? 'text-white font-semibold' : st.done ? 'text-zinc-400' : 'text-zinc-600'}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCancelScan}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Scan</span>
                </button>
              </div>
            )}

            {/* POI Taxonomy Selector (Decluttered, Compact Hierarchical Checklist) */}
            <div className="space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                  <span>POI Taxonomy ({Object.keys(POI_CONFIG).length} Sectors)</span>
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
                  placeholder="Filter parameters (e.g. office, bank, restaurant, pharmacy)..."
                  className="w-full bg-black/50 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-white/40 text-xs transition backdrop-blur-sm"
                />
              </div>

              {/* Quick Preset Selector Chips */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('commercial')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-zinc-300 hover:text-white transition"
                >
                  Commercial & Retail
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-zinc-300 hover:text-white transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('clear')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-zinc-400 hover:text-white transition"
                >
                  Clear
                </button>
              </div>

              {/* Sleek Vertical Category Tree (No button cloud, clean checkboxes) */}
              <div className="space-y-1.5">
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
                  const catTags = items.map(([_, tag]) => tag);
                  const selectedCount = catTags.filter((t) => selectedTags.includes(t)).length;
                  const isAllSelected = selectedCount === catTags.length;
                  const isPartiallySelected = selectedCount > 0 && selectedCount < catTags.length;
                  const color = CATEGORY_COLORS[category] || '#ffffff';

                  return (
                    <div
                      key={category}
                      className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden shrink-0 transition hover:border-white/20 backdrop-blur-sm"
                    >
                      {/* Category Master Row */}
                      <div className="flex items-center justify-between p-2.5 hover:bg-white/[0.04] transition">
                        <div
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                          onClick={() => handleCategorySelectAll(category)}
                        >
                          {/* Tri-state Checkbox */}
                          <div className="text-white hover:text-zinc-300 shrink-0">
                            {isAllSelected ? (
                              <CheckSquare className="w-4 h-4 text-white" />
                            ) : isPartiallySelected ? (
                              <MinusSquare className="w-4 h-4 text-zinc-300" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>

                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-sm border border-white/30"
                            style={{ backgroundColor: color }}
                          />

                          <span className="font-semibold text-white text-[11px] truncate">
                            {category}
                          </span>
                        </div>

                        {/* Right: Count Badge & Expand Toggle */}
                        <div
                          className="flex items-center gap-2 shrink-0 cursor-pointer pl-2"
                          onClick={() =>
                            setOpenCategories((prev) => ({ ...prev, [category]: !isOpen }))
                          }
                        >
                          <span
                            className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border transition ${
                              selectedCount > 0
                                ? 'bg-white/10 border-white/20 text-white font-bold'
                                : 'bg-black/30 border-white/5 text-zinc-500'
                            }`}
                          >
                            {selectedCount}/{items.length}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Sub-items Checklist */}
                      {isOpen && (
                        <div className="px-3 py-2 border-t border-white/5 bg-black/40 max-h-52 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-1.5">
                            {filteredItems.map(([label, tag]) => {
                              const isChecked = selectedTags.includes(tag);
                              return (
                                <div
                                  key={label}
                                  onClick={() => handleTagToggle(tag)}
                                  className={`flex items-center gap-2 p-1.5 rounded-xl cursor-pointer transition select-none ${
                                    isChecked
                                      ? 'bg-white/10 text-white font-semibold'
                                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                  }`}
                                >
                                  <div className="shrink-0">
                                    {isChecked ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-zinc-600" />
                                    )}
                                  </div>
                                  <span className="text-[10.5px] truncate" title={label}>
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom OSM Tag Filter */}
              <div className="pt-1 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Custom OSM Filter Tag
                </span>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder='e.g. "amenity"="clinic" or "shop"="bakery"'
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-white/40 transition"
                />
              </div>
            </div>

            {/* Mapped Assets Section */}
            {activeScannedFeatures.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-white" />
                      <span>Mapped Assets ({activeScannedFeatures.length})</span>
                    </span>
                  </div>

                  {/* Marker Style Switcher */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalStyle('modern-pin')}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold transition ${
                        globalMarkerStyle === 'modern-pin'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Pins
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalStyle('dots')}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold transition ${
                        globalMarkerStyle === 'dots'
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Dots
                    </button>
                  </div>
                </div>

                {/* Categories Breakdown List */}
                <div className="space-y-1.5">
                  {Object.entries(featuresByCategory).map(([category, feats]) => {
                    const isVisible = feats.some((f) => f.props.visible !== 0);
                    const color = CATEGORY_COLORS[category] || '#ffffff';

                    return (
                      <div
                        key={category}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-white text-[11px] truncate">
                            {category}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({feats.length})
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryVisibility(category)}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                            title="Toggle Visibility"
                          >
                            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            className="p-1 rounded text-zinc-400 hover:text-red-400"
                            title="Remove Category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: SPATIAL AI INTELLIGENCE & INTERACTIVE Q&A
           ========================================================================= */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* Header / Trigger Card */}
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Spatial AI Commercial Intelligence</span>
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Empirical trade area assessment & interactive Q&A analyst
                  </p>
                </div>
                <button
                  onClick={handleTriggerAiAnalysis}
                  disabled={isAiLoading || scannedPois.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-black rounded-xl text-xs transition shadow-lg shadow-white/5"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-black" />
                  )}
                  <span>{aiData ? 'Regenerate' : 'Generate Dossier'}</span>
                </button>
              </div>

              {/* Notice if no scan */}
              {scannedPois.length === 0 && (
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center space-y-1">
                  <p className="text-zinc-300 text-[11px] font-medium">
                    No active POI scan detected
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    Switch to <strong>Target & POIs</strong>, select categories, and run a scan to unlock AI analysis and question answering.
                  </p>
                </div>
              )}
            </div>

            {/* AI Dossier Analysis (When Generated) */}
            {aiData && (
              <div className="space-y-3 animate-in fade-in">
                {/* Vitality & Saturation Scorecard */}
                <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl flex items-center justify-between backdrop-blur-xl">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                      Commercial Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-white font-mono">
                        {aiData.summary.commercialScore}
                      </span>
                      <span className="text-zinc-500 font-mono text-xs">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                      Saturation Level
                    </span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {aiData.summary.saturationRating}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {aiData.summary.totalPois} POIs • {aiData.summary.dominantCategory}
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Executive Brief
                  </span>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {aiData.summary.brief}
                  </p>
                </div>

                {/* Commercial Corridors & Clusters */}
                {aiData.clusters && aiData.clusters.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Commercial Clusters & Corridors
                    </span>
                    <div className="space-y-2">
                      {aiData.clusters.map((cl, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2 hover:border-white/20 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="truncate pr-2">
                              <h5 className="font-bold text-white text-[11px] truncate">
                                {cl.name}
                              </h5>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {cl.corridor} • {cl.poiCount} POIs
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFlyToCluster(cl)}
                              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-[10px] transition shrink-0 flex items-center gap-1"
                            >
                              <span>Focus</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[10.5px] text-zinc-300 leading-normal">
                            {cl.insight}
                          </p>
                          {cl.keyTenants && cl.keyTenants.length > 0 && (
                            <div className="text-[9.5px] text-zinc-400 font-mono truncate">
                              Tenants: {cl.keyTenants.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Dossier Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition font-medium"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span className="text-white font-bold">Dossier Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Dossier Text</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRawBrief(!showRawBrief)}
                    className="text-[10px] text-zinc-400 hover:text-white font-semibold transition"
                  >
                    {showRawBrief ? 'Hide Raw JSON' : 'View Raw JSON'}
                  </button>
                </div>

                {showRawBrief && (
                  <pre className="p-3 bg-black/80 border border-white/10 rounded-2xl text-[9.5px] text-zinc-300 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(aiData, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Interactive Spatial AI Q&A Chat */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span>Interactive Spatial Q&A</span>
                </span>
                <span className="text-[9.5px] text-zinc-400 font-mono">
                  Grounded on {scannedPois.length} POIs
                </span>
              </div>

              {/* Quick Inquiry Prompt Chips */}
              <div className="space-y-1">
                <span className="text-[9.5px] text-zinc-500 uppercase tracking-wide block">
                  Suggested inquiries
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'What retail or dining gaps exist in this radius?',
                    'Evaluate competitor saturation along main roads',
                    'Is this trade area viable for a cafe / quick-serve?',
                    'Summarize anchor tenants and foot-traffic drivers',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendQaMessage(chip)}
                      disabled={isQaLoading || scannedPois.length === 0}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Feed */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {qaMessages.length === 0 ? (
                  <div className="p-5 border border-white/10 rounded-2xl bg-black/40 text-center space-y-1.5">
                    <Bot className="w-5 h-5 text-zinc-400 mx-auto" />
                    <p className="text-zinc-300 text-[11px] font-medium">
                      Ask the Spatial Analyst
                    </p>
                    <p className="text-zinc-500 text-[10px]">
                      Query competitor density, whitespace gaps, tenant viability, or arterial traffic.
                    </p>
                  </div>
                ) : (
                  qaMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-3 text-[11px] leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-white text-black font-medium rounded-tr-sm'
                            : 'bg-black/60 border border-white/10 text-zinc-200 rounded-tl-sm backdrop-blur-md'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[9px] font-mono uppercase">
                          {msg.role === 'user' ? (
                            <>
                              <User className="w-2.5 h-2.5" />
                              <span>You</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Spatial Analyst</span>
                            </>
                          )}
                          <span>• {msg.timestamp}</span>
                        </div>
                        <div className="whitespace-pre-wrap font-sans">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading Indicator */}
                {isQaLoading && (
                  <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/10 rounded-2xl text-zinc-300 text-[11px] animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Analyzing empirical POI coordinates and density...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQaMessage();
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  placeholder={
                    scannedPois.length > 0
                      ? 'Ask about this trade area (e.g. competitor density, retail gaps)...'
                      : 'Scan an area first to ask questions...'
                  }
                  disabled={scannedPois.length === 0 || isQaLoading}
                  className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-3.5 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-white/40 text-xs transition disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!qaInput.trim() || isQaLoading || scannedPois.length === 0}
                  className="p-2.5 bg-white text-black disabled:opacity-30 rounded-2xl font-bold transition hover:bg-zinc-200 shadow-md shrink-0"
                  title="Send inquiry"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar (Setup Tab) */}
      {activeTab === 'target_layers' && (
        <div className="p-4 pt-3 border-t border-white/10 shrink-0 bg-black/60 backdrop-blur-2xl flex gap-2">
          {isScanning ? (
            <>
              <button
                type="button"
                disabled
                className="flex-1 py-3.5 bg-white/20 text-zinc-300 font-black rounded-2xl flex items-center justify-center gap-2 text-xs border border-white/15"
              >
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Scanning OpenStreetMap...</span>
              </button>
              <button
                type="button"
                onClick={handleCancelScan}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-xs transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-zinc-300" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleRunScan}
              className="flex-1 py-3.5 bg-white hover:bg-zinc-200 text-black font-black rounded-2xl shadow-xl shadow-white/10 flex items-center justify-center gap-2 text-xs transition active:scale-[0.99] border border-white/40"
            >
              <Radar className="w-4 h-4 text-black" />
              <span className="tracking-wider uppercase font-black">SCAN AREA</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
