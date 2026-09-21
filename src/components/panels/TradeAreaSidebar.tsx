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
  Plus,
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
    updateFeature,
    removeFeature,
    customGroups,
    setCustomGroups,
    setToast,
    setActiveCinematicCluster,
    activeTool,
    setActiveTool,
  } = useMapStore();

  // 3-Tab Workflow: 'setup' (Target & Scan) | 'layers' (Active Layers & Styling) | 'export_ai' (Export & AI)
  const [activeTab, setActiveTab] = useState<'setup' | 'layers' | 'export_ai'>('setup');

  // Scan Target Mode: 'coords' (Open Node default) | 'circle' (Draw on map) | 'shape' (Draw polygon)
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

  // Taxonomy & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '"building"~"office|commercial",i',
    '"shop"~"mall|department_store",i',
    '"shop"~"market|grocery",i',
    '"amenity"="restaurant"',
    '"amenity"~"cafe|coffee",i',
    '"amenity"="bank"',
  ]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'COMMERCIAL & OFFICES': true,
    RETAIL: true,
  });
  const [customTag, setCustomTag] = useState<string>('');

  // Scanning, Multi-Stage Progress, & Cancel State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [scannedPois, setScannedPois] = useState<ScannedPOI[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});

  // Global & Per-Layer Marker Styling State
  const [globalMarkerStyle, setGlobalMarkerStyle] = useState<'modern-pin' | 'pinball' | 'dots' | 'pin'>('modern-pin');
  const [globalMarkerSize, setGlobalMarkerSize] = useState<number>(20);
  const [globalMarkerColor, setGlobalMarkerColor] = useState<string>('#003366');

  // Custom Layer Clusters: { clusterName: [categoryKey1, categoryKey2] }
  const [clusters, setClusters] = useState<Record<string, string[]>>({});
  const [showClusterModal, setShowClusterModal] = useState<boolean>(false);
  const [newClusterName, setNewClusterName] = useState<string>('');
  const [selectedClusterCategories, setSelectedClusterCategories] = useState<string[]>([]);

  // Visual AI Intelligence Dashboard State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AIInsightsPayload | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [showRawBrief, setShowRawBrief] = useState<boolean>(false);

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
      }, 800);
    } else {
      setScanStage(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  if (!activePanels.tradeArea) return null;

  // Coordinate parser
  const parseCoords = (): { lat: number; lon: number } | null => {
    const match = coordsInput.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match) {
      return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
    }
    return null;
  };

  // Sync center target and buffer circle on map
  const syncTargetRadiusGraphics = (targetLat: number, targetLon: number, targetRadius: number) => {
    if (!showRadiusGraphics) return;

    // 1. Center Target Marker
    const cId = centerMarkerId || Date.now() + 9999;
    const centerIconKey = mapInstance
      ? getIconKey('center-pinball', '#C9AB4C', mapInstance)
      : 'ico_center-pinball_C9AB4C';

    addFeature({
      id: cId,
      name: `Target Center (${targetLat.toFixed(4)}, ${targetLon.toFixed(4)})`,
      kind: 'marker',
      geometry: { type: 'Point', coordinates: [targetLon, targetLat] },
      props: {
        shape: 'center-pinball',
        color: '#C9AB4C',
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

    // 2. Radius Buffer Circle
    const bufId = activeBufferFeatureId || Date.now() + 8888;
    const ringCoords = circleCoordsFromRadius([targetLon, targetLat], targetRadius);
    addFeature({
      id: bufId,
      name: `Scan Radius (${(targetRadius / 1000).toFixed(1)} km)`,
      kind: 'circle',
      geometry: { type: 'Polygon', coordinates: ringCoords },
      props: {
        color: '#003366',
        fillOpacity: 0.08,
        borderColor: '#C9AB4C',
        borderOpacity: 0.9,
        width: 2,
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
  const handleSelectPreset = (preset: 'commercial' | 'retail' | 'all' | 'clear') => {
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
      setSelectedTags(Array.from(new Set([...commTags, ...retTags])));
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
      setToast('No matching POIs found within this area. Try expanding your radius or selecting more tags.');
      setScannedPois([]);
      setCategoryBreakdown({});
      return;
    }

    setScannedPois(result.features);
    setCategoryBreakdown(result.categoryCounts);

    // Smooth camera transition to encompass the scanned area
    if (mapInstance && (areaMode === 'coords' || areaMode === 'circle')) {
      mapInstance.easeTo({ center: [lon, lat], zoom: radius > 5000 ? 12 : 14, duration: 1200 });
    }

    // Add scanned POIs to Zustand store and custom group
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
    setActiveTab('layers'); // Automatically switch to layers tab to view results
  };

  // Apply global styling to all scanned features
  const handleApplyGlobalMarkerStyle = (
    style: 'modern-pin' | 'pinball' | 'dots' | 'pin',
    size: number,
    color: string
  ) => {
    setGlobalMarkerStyle(style);
    setGlobalMarkerSize(size);
    setGlobalMarkerColor(color);

    activeScannedFeatures.forEach((f) => {
      const fColor = color || f.props?.color || '#003366';
      const iconKey = mapInstance ? getIconKey(style, fColor, mapInstance) : undefined;
      updateFeature(f.id, (prev) => ({
        ...prev,
        props: {
          ...prev.props,
          shape: style,
          iconSize: size / 20,
          color: fColor,
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

  // Rename a category
  const handleRenameCategory = (oldCategory: string) => {
    const newName = prompt('Enter new category designation:', oldCategory);
    if (newName && newName.trim() && newName !== oldCategory) {
      const feats = featuresByCategory[oldCategory] || [];
      feats.forEach((f) => {
        updateFeature(f.id, (prev) => ({
          ...prev,
          props: { ...prev.props, category: newName.trim() },
        }));
      });
      setScannedPois((prev) =>
        prev.map((p) => (p.category === oldCategory ? { ...p, category: newName.trim() } : p))
      );
      setToast(`Renamed ${oldCategory} to ${newName}`);
    }
  };

  // Rename individual POI
  const handleRenamePoi = (fId: number, oldName: string) => {
    const newName = prompt('Rename POI:', oldName);
    if (newName && newName.trim()) {
      updateFeature(fId, (prev) => ({
        ...prev,
        name: newName.trim(),
        props: {
          ...prev.props,
          attributes: { ...prev.props.attributes, Name: newName.trim() },
        },
      }));
    }
  };

  // Delete individual POI
  const handleDeletePoi = (fId: number) => {
    removeFeature(fId);
  };

  // Toggle single POI visibility
  const handleTogglePoiVisibility = (fId: number) => {
    const f = features.find((item) => item.id === fId);
    if (f) {
      const nextVis = f.props.visible === 0 ? 1 : 0;
      updateFeature(fId, (prev) => ({
        ...prev,
        props: { ...prev.props, visible: nextVis },
      }));
    }
  };

  // Fly to single POI
  const handleFlyToPoi = (f: GISFeature) => {
    if (mapInstance && f.geometry.type === 'Point') {
      const coords = f.geometry.coordinates;
      mapInstance.flyTo({ center: coords, zoom: 17, duration: 1000 });
    }
  };

  // Commit Custom Cluster
  const handleCreateCluster = () => {
    const name = newClusterName.trim();
    if (!name) {
      alert('Please enter a cluster designation name.');
      return;
    }
    if (selectedClusterCategories.length === 0) {
      alert('Please select at least one category to include.');
      return;
    }
    setClusters((prev) => ({ ...prev, [name]: selectedClusterCategories }));
    setNewClusterName('');
    setSelectedClusterCategories([]);
    setShowClusterModal(false);
    setToast(`Created cluster group: "${name}"`);
  };

  // Batch toggle cluster visibility
  const handleToggleClusterVisibility = (clusterName: string) => {
    const catKeys = clusters[clusterName] || [];
    const targetedFeats = activeScannedFeatures.filter((f) => catKeys.includes(f.props.category || ''));
    const isAnyVisible = targetedFeats.some((f) => f.props.visible !== 0);
    const nextVis = isAnyVisible ? 0 : 1;

    targetedFeats.forEach((f) => {
      updateFeature(f.id, (prev) => ({
        ...prev,
        props: { ...prev.props, visible: nextVis },
      }));
    });
  };

  // Batch style cluster
  const handleBatchStyleCluster = (
    clusterName: string,
    style: 'modern-pin' | 'pinball' | 'dots' | 'pin',
    color: string,
    size: number
  ) => {
    const catKeys = clusters[clusterName] || [];
    const targetedFeats = activeScannedFeatures.filter((f) => catKeys.includes(f.props.category || ''));

    targetedFeats.forEach((f) => {
      const iconKey = mapInstance ? getIconKey(style, color, mapInstance) : undefined;
      updateFeature(f.id, (prev) => ({
        ...prev,
        props: {
          ...prev.props,
          shape: style,
          color,
          iconSize: size / 20,
          iconKey: iconKey || prev.props.iconKey,
        },
      }));
    });
    setToast(`Updated styling for cluster: ${clusterName}`);
  };

  // Dissolve Cluster
  const handleDissolveCluster = (clusterName: string) => {
    setClusters((prev) => {
      const next = { ...prev };
      delete next[clusterName];
      return next;
    });
    setToast(`Dissolved cluster: ${clusterName}`);
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
      setToast('AI Analysis generated successfully!');
    } catch (err: any) {
      console.error('AI error:', err);
      setToast(`AI Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy AI dossier to clipboard
  const handleCopyReport = () => {
    if (!aiData) return;
    const text = `
TRADE AREA INTELLIGENCE REPORT
Vitality: ${aiData.summary.commercialScore}/100 | Saturation: ${aiData.summary.saturationRating}

EXECUTIVE SUMMARY:
${aiData.summary.brief}

STRATEGIC RECOMMENDATIONS:
${aiData.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <div className="fixed top-16 left-4 bottom-4 w-[430px] max-w-[calc(100vw-2rem)] z-[1000] bg-black/85 border border-white/15 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-zinc-300 animate-in fade-in slide-in-from-left-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/20 flex items-center justify-center text-white shadow-sm">
            <Radar className="w-5 h-5 text-[#C9AB4C]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight leading-tight flex items-center gap-2">
              <span>Open Node</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#003366] text-white border border-[#C9AB4C]/50 uppercase font-mono font-extrabold tracking-wider">
                GIS Scanner
              </span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">
              Spatial Overpass Engine & Marker Suite
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(activeScannedFeatures.length > 0 || scannedPois.length > 0) && (
            <button
              type="button"
              onClick={handleClearScan}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 text-[11px] font-semibold"
              title="Reset and clear all scan results and pins"
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

      {/* 3-Tab Workflow Navigation Header */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-1 p-1 bg-zinc-950/70 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
              activeTab === 'setup'
                ? 'bg-[#003366] text-white shadow-lg shadow-black/50 border border-[#C9AB4C]/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-[#C9AB4C]" />
            <span>Target & Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
              activeTab === 'layers'
                ? 'bg-[#003366] text-white shadow-lg shadow-black/50 border border-[#C9AB4C]/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#C9AB4C]" />
            <span>Layers & Style</span>
            {activeScannedFeatures.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#C9AB4C] text-[#003366] rounded-full font-mono text-[9px] font-black">
                {activeScannedFeatures.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export_ai')}
            className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
              activeTab === 'export_ai'
                ? 'bg-[#003366] text-white shadow-lg shadow-black/50 border border-[#C9AB4C]/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#C9AB4C]" />
            <span>Export & AI</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {/* =========================================================================
            TAB 1: TARGET & CATEGORIES SETUP
           ========================================================================= */}
        {activeTab === 'setup' && (
          <>
            {/* Target Mode Selector Card */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-3 shrink-0 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  <span>Target Area Definition</span>
                </span>
                <div className="flex gap-1 p-0.5 bg-black/60 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAreaMode('coords')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      areaMode === 'coords'
                        ? 'bg-[#003366] text-white border border-[#C9AB4C]/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('circle')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      areaMode === 'circle'
                        ? 'bg-[#003366] text-white border border-[#C9AB4C]/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Map Circle
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('shape')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      areaMode === 'shape'
                        ? 'bg-[#003366] text-white border border-[#C9AB4C]/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Polygon
                  </button>
                </div>
              </div>

              {/* Coordinates Mode (Open Node Classic) */}
              {areaMode === 'coords' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                        Target Coordinates (Lat, Lon)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSetFromMapCenter}
                          className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[9px] text-[#C9AB4C] font-semibold transition"
                        >
                          Map Center
                        </button>
                        <button
                          type="button"
                          onClick={handleSetFromCurrentLocation}
                          className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[9px] text-zinc-300 font-semibold transition"
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
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-[#C9AB4C] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                        Search Radius
                      </label>
                      <span className="text-[11px] font-mono font-bold text-[#C9AB4C]">
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
                        className="flex-1 accent-[#C9AB4C] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="100"
                        max="50000"
                        step="100"
                        value={radiusMeters}
                        onChange={(e) => setRadiusMeters(Math.max(100, Number(e.target.value)))}
                        className="w-20 bg-black/60 border border-white/15 rounded-xl px-2 py-1 text-white font-mono text-xs text-right outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showRadiusGraphics}
                        onChange={(e) => setShowRadiusGraphics(e.target.checked)}
                        className="accent-[#003366] rounded"
                      />
                      <span>Display Target Pin & Buffer on Map</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Map Circle Mode */}
              {areaMode === 'circle' && (
                <div className="space-y-2">
                  {drawnCircles.length > 0 ? (
                    <div className="space-y-2">
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
                      <button
                        type="button"
                        onClick={handleStartDrawingCircle}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] border border-white/15 transition flex items-center justify-center gap-1.5"
                      >
                        <CircleIcon className="w-3.5 h-3.5 text-[#C9AB4C]" />
                        <span>Draw New Circle on Map</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartDrawingCircle}
                      className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white border border-[#C9AB4C]/50 font-bold rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-md"
                    >
                      <CircleIcon className="w-4 h-4 text-[#C9AB4C]" />
                      <span>Draw Circle Area on Map</span>
                    </button>
                  )}
                </div>
              )}

              {/* Polygon Mode */}
              {areaMode === 'shape' && (
                <div className="space-y-2">
                  <select
                    value={selectedShapeId}
                    onChange={(e) => setSelectedShapeId(e.target.value ? parseInt(e.target.value, 10) : '')}
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

            {/* Scanning In-Progress Feedback Card */}
            {isScanning && (
              <div className="p-5 bg-zinc-950/90 border border-[#C9AB4C]/40 rounded-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 shrink-0">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#C9AB4C]/40 animate-ping opacity-40" />
                  <div className="w-10 h-10 rounded-full bg-[#003366] border border-[#C9AB4C] flex items-center justify-center text-[#C9AB4C]">
                    <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs tracking-tight">
                    Spatial POI Query Running
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Querying Overpass Multi-Mirror Gateways & OSMnx Engine
                  </p>
                </div>

                <div className="w-full space-y-2 text-left bg-black/60 p-3 rounded-xl border border-white/10">
                  {[
                    { label: 'Connecting to OpenStreetMap Gateway', done: scanStage > 0, active: scanStage === 0 },
                    { label: `Querying ${selectedTags.length} active taxonomy layers`, done: scanStage > 1, active: scanStage === 1 },
                    { label: 'Parsing coordinates & building node geometry', done: scanStage > 2, active: scanStage === 2 },
                    { label: 'Rendering modern drop-pins and attributes', done: scanStage > 3, active: scanStage === 3 },
                  ].map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      {st.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C9AB4C] shrink-0" />
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
                  className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Scan</span>
                </button>
              </div>
            )}

            {/* POI Taxonomy Categories Selection */}
            <div className="space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  <span>POI Categories ({Object.keys(POI_CONFIG).length})</span>
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
                  placeholder="Filter parameters (e.g. office, bank, hospital, restaurant)..."
                  className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 outline-none focus:border-[#C9AB4C] text-xs transition"
                />
              </div>

              {/* Quick Preset Selector Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('commercial')}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-zinc-300 hover:text-white transition"
                >
                  Commercial & Retail
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-[#C9AB4C] transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('clear')}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[9px] font-semibold text-zinc-400 hover:text-white transition"
                >
                  Clear Selection
                </button>
              </div>

              {/* Category Accordion Cards */}
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
                  const color = CATEGORY_COLORS[category] || '#003366';

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
                                    ? 'bg-[#003366] border-[#C9AB4C] text-white font-semibold shadow-sm'
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

              {/* Custom OSM Tag Filter */}
              <div className="pt-2 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Custom OSM Filter Query
                </span>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder='e.g. "amenity"="clinic" or "shop"="bakery"'
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-[#C9AB4C] transition"
                />
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            TAB 2: ACTIVE LAYERS & MARKER STYLING
           ========================================================================= */}
        {activeTab === 'layers' && (
          <div className="space-y-4">
            {/* Header with Group Layers button & Results count */}
            <div className="p-3.5 bg-zinc-950/80 border border-white/15 rounded-2xl flex items-center justify-between backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">Mapped Assets</span>
                <span className="px-2 py-0.5 rounded-full bg-[#003366] border border-[#C9AB4C]/50 text-[#C9AB4C] font-mono font-bold text-[10px]">
                  {activeScannedFeatures.length} PINS
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowClusterModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#003366] hover:bg-[#002244] border border-[#C9AB4C] text-[#C9AB4C] font-bold text-[10px] flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Group Layers</span>
                </button>
                {activeScannedFeatures.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearScan}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                    title="Clear All Scan Results"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal: Create Cluster Group */}
            {showClusterModal && (
              <div className="p-3.5 bg-zinc-950 border border-[#C9AB4C] rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wide">
                    Create Layer Cluster Group
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowClusterModal(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  placeholder="Enter cluster name (e.g. Commercial Core)..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-[#C9AB4C]"
                />
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {Object.keys(featuresByCategory).map((cat) => (
                    <label key={cat} className="flex items-center gap-2 p-1 text-[11px] text-zinc-300 hover:bg-white/5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClusterCategories.includes(cat)}
                        onChange={(e) => {
                          setSelectedClusterCategories((prev) =>
                            e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                          );
                        }}
                        className="accent-[#003366]"
                      />
                      <span>{cat} ({featuresByCategory[cat].length})</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateCluster}
                    className="flex-1 py-1.5 bg-[#003366] text-[#C9AB4C] border border-[#C9AB4C] font-bold rounded-xl text-xs hover:bg-[#002244] transition"
                  >
                    Build Cluster
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClusterModal(false)}
                    className="flex-1 py-1.5 bg-white/10 text-zinc-300 font-bold rounded-xl text-xs hover:bg-white/20 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Global Marker Styling Suite Card */}
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-3 shrink-0 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  <span>Global Marker Styling Suite</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-medium">Pin Style</label>
                  <select
                    value={globalMarkerStyle}
                    onChange={(e) =>
                      handleApplyGlobalMarkerStyle(
                        e.target.value as any,
                        globalMarkerSize,
                        globalMarkerColor
                      )
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#C9AB4C]"
                  >
                    <option value="modern-pin">Modern Drop-Pin</option>
                    <option value="pinball">3D Pinball</option>
                    <option value="dots">Clean Dots</option>
                    <option value="pin">Classic Pin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-medium">Size</label>
                    <span className="text-[10px] font-mono text-white">{globalMarkerSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={globalMarkerSize}
                    onChange={(e) =>
                      handleApplyGlobalMarkerStyle(
                        globalMarkerStyle,
                        Number(e.target.value),
                        globalMarkerColor
                      )
                    }
                    className="w-full accent-[#C9AB4C] h-1.5 bg-white/10 rounded-lg cursor-pointer mt-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-medium">Marker Color & Presets</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={globalMarkerColor}
                    onChange={(e) =>
                      handleApplyGlobalMarkerStyle(
                        globalMarkerStyle,
                        globalMarkerSize,
                        e.target.value
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20"
                  />
                  <div className="flex items-center gap-1.5 flex-1">
                    {[
                      { label: 'Midnight', color: '#003366' },
                      { label: 'Gold', color: '#C9AB4C' },
                      { label: 'Crimson', color: '#AA2E20' },
                      { label: 'Steel', color: '#1A5A8A' },
                      { label: 'Emerald', color: '#059669' },
                    ].map((swatch) => (
                      <button
                        key={swatch.label}
                        type="button"
                        onClick={() =>
                          handleApplyGlobalMarkerStyle(
                            globalMarkerStyle,
                            globalMarkerSize,
                            swatch.color
                          )
                        }
                        style={{ backgroundColor: swatch.color }}
                        className="flex-1 py-1.5 rounded-lg border border-white/20 text-[8px] font-bold text-white shadow-sm hover:scale-105 transition"
                        title={swatch.label}
                      >
                        {swatch.label[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Layer Clusters */}
            {Object.keys(clusters).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Active Cluster Groups
                </span>
                {Object.entries(clusters).map(([clusterName, catKeys]) => {
                  const clusterFeats = activeScannedFeatures.filter((f) =>
                    catKeys.includes(f.props.category || '')
                  );
                  const isVisible = clusterFeats.some((f) => f.props.visible !== 0);

                  return (
                    <div
                      key={clusterName}
                      className="p-3 bg-zinc-900 border-l-4 border-l-[#C9AB4C] border border-white/10 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#C9AB4C] font-bold">⚡</span>
                          <span className="font-bold text-white text-xs">{clusterName}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({clusterFeats.length} PINS)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleClusterVisibility(clusterName)}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                            title="Toggle Cluster Visibility"
                          >
                            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDissolveCluster(clusterName)}
                            className="p-1 rounded text-zinc-400 hover:text-red-400"
                            title="Dissolve Cluster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Cluster Batch Styling mini-controls */}
                      <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px]">
                        <select
                          onChange={(e) =>
                            handleBatchStyleCluster(
                              clusterName,
                              e.target.value as any,
                              globalMarkerColor,
                              globalMarkerSize
                            )
                          }
                          className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white text-[10px]"
                        >
                          <option value="modern-pin">Modern Pin</option>
                          <option value="dots">Dots</option>
                          <option value="pinball">3D Pinball</option>
                        </select>
                        <input
                          type="color"
                          defaultValue="#003366"
                          onChange={(e) =>
                            handleBatchStyleCluster(
                              clusterName,
                              'modern-pin',
                              e.target.value,
                              globalMarkerSize
                            )
                          }
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border border-white/20"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mapped Categories & POI Hierarchy List */}
            {Object.keys(featuresByCategory).length === 0 ? (
              <div className="p-8 border border-white/10 rounded-2xl bg-black/30 flex flex-col items-center justify-center text-center gap-2">
                <MapPin className="w-8 h-8 text-zinc-500" />
                <span className="font-bold text-white text-xs">No POIs Mapped Yet</span>
                <span className="text-[10px] text-zinc-400 max-w-xs">
                  Go to the <strong>Target & Scan</strong> tab and click "Scan Area" to discover POIs.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Scanned Categories Breakdown
                </span>
                {Object.entries(featuresByCategory).map(([category, feats]) => {
                  const isVisible = feats.some((f) => f.props.visible !== 0);
                  const color = CATEGORY_COLORS[category] || '#003366';

                  return (
                    <div
                      key={category}
                      className="border border-white/10 rounded-2xl bg-black/40 overflow-hidden"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between p-3 hover:bg-white/5 transition select-none">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/20"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-white text-[11px] truncate">
                            {category}
                          </span>
                          <span className="text-[10px] text-[#C9AB4C] font-mono shrink-0">
                            ({feats.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRenameCategory(category)}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                            title="Rename Category"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
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
                            title="Delete Category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* POI Items List */}
                      <div className="p-2 pt-0 max-h-40 overflow-y-auto space-y-1 bg-black/20">
                        {feats.map((f) => {
                          const itemVisible = f.props.visible !== 0;
                          return (
                            <div
                              key={f.id}
                              className={`p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[10px] transition ${
                                itemVisible ? '' : 'opacity-40'
                              }`}
                            >
                              <div
                                onClick={() => handleFlyToPoi(f)}
                                className="flex-1 truncate pr-2 cursor-pointer hover:text-white font-medium"
                                title="Click to center map on POI"
                              >
                                {f.name || 'Unknown Location'}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRenamePoi(f.id, f.name)}
                                  className="p-1 text-zinc-400 hover:text-white"
                                  title="Rename"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePoiVisibility(f.id)}
                                  className="p-1 text-zinc-400 hover:text-white"
                                  title="Hide/Show"
                                >
                                  {itemVisible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePoi(f.id)}
                                  className="p-1 text-zinc-400 hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: EXPORT & AI INSIGHTS
           ========================================================================= */}
        {activeTab === 'export_ai' && (
          <div className="space-y-4">
            {/* Export Card */}
            <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 backdrop-blur-md">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#C9AB4C]" />
                <span>Export Spatial Data</span>
              </span>
              <p className="text-[10px] text-zinc-400">
                Download your scanned POIs in open GIS formats compatible with Google Earth, QGIS, and Project Atlas.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportGeoJSON}
                  disabled={activeScannedFeatures.length === 0}
                  className="py-2.5 bg-[#003366] hover:bg-[#002244] disabled:opacity-40 text-white border border-[#C9AB4C]/50 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  <span>GeoJSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportKML}
                  disabled={activeScannedFeatures.length === 0}
                  className="py-2.5 bg-[#003366] hover:bg-[#002244] disabled:opacity-40 text-white border border-[#C9AB4C]/50 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  <span>Google KML</span>
                </button>
              </div>
            </div>

            {/* DeepSeek AI Commercial Intelligence */}
            <div className="p-4 bg-zinc-950/80 border border-white/15 rounded-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C9AB4C]" />
                    <span>DeepSeek AI Commercial Analyst</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Trade area vitality & tenant opportunity assessment
                  </span>
                </div>
                <button
                  onClick={handleTriggerAiAnalysis}
                  disabled={isAiLoading || scannedPois.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9AB4C] hover:bg-[#b0933c] disabled:opacity-50 text-[#003366] font-black rounded-xl text-xs transition shadow-lg"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#003366]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#003366]" />
                  )}
                  <span>{aiData ? 'Regenerate' : 'Analyze'}</span>
                </button>
              </div>

              {isAiLoading ? (
                <div className="p-8 border border-white/10 rounded-2xl bg-black/60 flex flex-col items-center justify-center text-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C9AB4C]" />
                  <span className="text-white font-semibold text-xs">
                    Synthesizing Commercial Clusters...
                  </span>
                  <span className="text-zinc-400 text-[10px] max-w-xs">
                    DeepSeek AI is identifying competitor corridors and tenant whitespace gaps.
                  </span>
                </div>
              ) : aiData ? (
                <div className="space-y-4 pt-1">
                  {/* Gauge Card */}
                  <div className="p-3 bg-black/60 border border-white/10 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Commercial Vitality
                      </span>
                      <span className="text-xl font-black text-[#C9AB4C] font-mono">
                        {aiData.summary.commercialScore}/100
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Saturation Rating
                      </span>
                      <span className="text-xs font-bold text-white">
                        {aiData.summary.saturationRating}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      Executive Summary
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10">
                      {aiData.summary.brief}
                    </p>
                  </div>

                  {/* Strategic Recommendations */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      Strategic Recommendations
                    </span>
                    <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/10">
                      {aiData.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-[#C9AB4C] shrink-0 mt-0.5" />
                          <span className="text-zinc-300 leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Copy Report Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
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
                      className="text-[10px] text-zinc-400 hover:text-white font-semibold transition"
                    >
                      {showRawBrief ? 'Hide Full Text' : 'View Full Text'}
                    </button>
                  </div>

                  {showRawBrief && (
                    <div className="p-3 bg-black/80 border border-white/10 rounded-xl max-h-40 overflow-y-auto text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {aiData.rawMarkdown || JSON.stringify(aiData, null, 2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 border border-white/10 rounded-xl bg-black/40 flex flex-col items-center justify-center text-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#C9AB4C]" />
                  <span className="text-white font-bold text-xs">Ready for AI Assessment</span>
                  <span className="text-zinc-400 text-[10px] max-w-xs">
                    Click "Analyze" to detect commercial clusters and strategic tenant recommendations.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar for Setup Tab */}
      {activeTab === 'setup' && (
        <div className="p-4 pt-3 border-t border-white/10 shrink-0 bg-zinc-950/90 backdrop-blur-xl flex gap-2">
          {isScanning ? (
            <>
              <button
                type="button"
                disabled
                className="flex-1 py-3 bg-[#003366] text-white font-black rounded-2xl flex items-center justify-center gap-2 text-xs opacity-75"
              >
                <Loader2 className="w-4 h-4 animate-spin text-[#C9AB4C]" />
                <span>Scanning OpenStreetMap...</span>
              </button>
              <button
                type="button"
                onClick={handleCancelScan}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-xs transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-zinc-300" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleRunScan}
              className="flex-1 py-3.5 bg-[#003366] hover:bg-[#002244] text-[#C9AB4C] border border-[#C9AB4C] font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs transition active:scale-[0.99]"
            >
              <Radar className="w-4 h-4 text-[#C9AB4C]" />
              <span className="tracking-wide">SCAN AREA</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
