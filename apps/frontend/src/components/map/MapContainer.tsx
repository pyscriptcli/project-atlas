"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store/useMapStore";
import { getMapStyle } from "@/lib/map/themes";
import { MapContextMenu } from "./MapContextMenu";
import { createCircleFeature } from "@/lib/geo/calculations";
import type { MapFeature } from "@/types/map";
import { apiRequest } from "@/services/api-client";

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const {
    currentProject,
    activeTool,
    setActiveTool,
    setCamera,
    addFeature,
    setSelectedFeatureId,
    showToast,
    is3D,
  } = useMapStore();

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const drawingPointsRef = useRef<[number, number][]>([]);
  drawingPointsRef.current = drawingPoints;

  // Circle radius drawing state: [centerLng, centerLat]
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const circleCenterRef = useRef<[number, number] | null>(null);
  circleCenterRef.current = circleCenter;

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    lngLat: [number, number];
    featureId?: string;
  } | null>(null);

  // Basemap ref to avoid redundant/premature setStyle calls on mount
  const currentBasemapRef = useRef(currentProject.basemap);

  // Feature Click Handler
  const handleFeatureClick = (e: maplibregl.MapLayerMouseEvent) => {
    if (activeTool !== "select") return;
    const feat = e.features?.[0];
    if (feat && feat.properties?.id) {
      setSelectedFeatureId(feat.properties.id);
      showToast(`Selected: ${feat.properties.name || feat.properties.id}`);
    }
  };

  // Setup GeoJSON layers for custom drawings & POIs
  const setupFeatureLayers = (map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;
    const latestProject = useMapStore.getState().currentProject;
    if (map.getSource("atlas-features")) {
      updateFeaturesSource(map, latestProject.features);
      return;
    }

    map.addSource("atlas-features", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: latestProject.features as any,
      },
    });

    // 1. Polygon Fill
    if (!map.getLayer("atlas-polygons-fill")) {
      map.addLayer({
        id: "atlas-polygons-fill",
        type: "fill",
        source: "atlas-features",
        filter: ["all",["==", ["geometry-type"], "Polygon"],["!=",["get","visible"],false]],
        paint: {
          "fill-color": ["coalesce", ["get", "fillColor"], ["get", "color"], "#3b82f6"],
          "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.25],
        },
      });
    }

    // 2. Polygon & Line Outline
    if (!map.getLayer("atlas-lines")) {
      map.addLayer({
        id: "atlas-lines",
        type: "line",
        source: "atlas-features",
        filter: ["all",[
          "match",
          ["geometry-type"],
          ["LineString", "Polygon"],
          true,
          false,
        ],["!=",["get","visible"],false]],
        paint: {
          "line-color": [
            "coalesce",
            ["get", "strokeColor"],
            ["get", "color"],
            "#2563eb",
          ],
          "line-width": ["coalesce", ["get", "strokeWidth"], 2.5],
          "line-opacity": ["coalesce", ["get", "strokeOpacity"], 0.9],
        },
      });
    }

    // 3. Points (Markers & POIs)
    if (!map.getLayer("atlas-points")) {
      map.addLayer({
        id: "atlas-points",
        type: "circle",
        source: "atlas-features",
        filter: ["all",["==", ["geometry-type"], "Point"],["!=",["get","visible"],false]],
        paint: {
          "circle-radius": 7,
          "circle-color": ["coalesce", ["get", "fillColor"], ["get", "color"], "#ef4444"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    // 4. Labels & Text
    if (!map.getLayer("atlas-labels")) {
      map.addLayer({
        id: "atlas-labels",
        type: "symbol",
        source: "atlas-features",
        filter:["all",["!=",["get","visible"],false],["!=",["get","labelVisible"],false]],
        layout: {
          "text-field": ["coalesce", ["get", "name"], ""],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    // Feature Click Handlers - remove existing before adding
    map.off("click", "atlas-polygons-fill", handleFeatureClick);
    map.off("click", "atlas-lines", handleFeatureClick);
    map.off("click", "atlas-points", handleFeatureClick);

    map.on("click", "atlas-polygons-fill", handleFeatureClick);
    map.on("click", "atlas-lines", handleFeatureClick);
    map.on("click", "atlas-points", handleFeatureClick);

    // Hover cursors
    map.on("mouseenter", "atlas-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "atlas-points", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "atlas-polygons-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "atlas-polygons-fill", () => {
      map.getCanvas().style.cursor = "";
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyle = getMapStyle(currentProject.basemap);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: currentProject.center,
      zoom: currentProject.zoom,
      pitch: currentProject.pitch,
      bearing: currentProject.bearing,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("error", (e) => {
      console.error("MapLibre GL Event Error:", e.error ?? e);
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      setCamera([c.lng, c.lat], map.getZoom(), map.getPitch(), map.getBearing());
    });

    map.on("contextmenu", (e) => {
      const hit=map.queryRenderedFeatures(e.point,{layers:["atlas-polygons-fill","atlas-lines","atlas-points"]})[0];
      setContextMenu({
        x: e.point.x,
        y: e.point.y,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        featureId: hit?.properties?.id,
      });
    });

    map.on("click", () => {
      setContextMenu(null);
    });

    map.on("load", () => {
      setupFeatureLayers(map);
      syncLayersVisibility(map, useMapStore.getState().currentProject.layer_visibilities);
      map.resize();
    });

    // Resize handling for clean rendering
    const resizeTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 250);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    mapRef.current = map;
    const exportPng=()=>{map.triggerRepaint();requestAnimationFrame(()=>{try{const link=document.createElement("a");const stamp=new Date().toISOString().replace(/[:.]/g,"-");const name=useMapStore.getState().currentProject.name;link.download=`${name.replace(/[^a-z0-9]+/gi,"-")}-${stamp}.png`;link.href=map.getCanvas().toDataURL("image/png",1);link.click();showToast("Exported visible map as PNG.")}catch{showToast("PNG export failed. A map tile may not permit capture.")}})};
    window.addEventListener("atlas:export-png",exportPng);

    return () => {
      clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("atlas:export-png",exportPng);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Basemap Theme (only when basemap actually changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentBasemapRef.current === currentProject.basemap) return;
    currentBasemapRef.current = currentProject.basemap;

    const onStyleReady = () => {
      const latestProject=useMapStore.getState().currentProject;
      setupFeatureLayers(map);
      syncLayersVisibility(map, latestProject.layer_visibilities);
      updateFeaturesSource(map, latestProject.features);
      map.resize();
    };
    map.once("style.load", onStyleReady);
    map.setStyle(getMapStyle(currentProject.basemap));
  }, [currentProject.basemap]);

  // Sync Layer Visibilities (2D/3D, roads, boundaries, etc.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncLayersVisibility(map, currentProject.layer_visibilities);
  }, [currentProject.layer_visibilities]);

  // Update Features Source whenever features change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateFeaturesSource(map, currentProject.features);
  }, [currentProject.features]);

  // Sync 3D pitch toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 800,
    });
  }, [is3D]);

  const updateFeaturesSource = (map: maplibregl.Map, features: MapFeature[]) => {
    const src = map.getSource("atlas-features") as maplibregl.GeoJSONSource;
    if (src) {
      src.setData({
        type: "FeatureCollection",
        features: features as any,
      });
    }
  };

  const syncLayersVisibility = (
    map: maplibregl.Map,
    vis: Record<string, boolean> = {}
  ) => {
    const setVis = (layerId: string, isVisible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          isVisible ? "visible" : "none"
        );
      }
    };

    // 2D vs 3D Buildings
    setVis("building-2d", vis.building2d === true);
    setVis("building-3d", vis.building3d !== false);

    // Labels
    setVis("label_city", vis.label_city !== false);
    setVis("label_brgy", vis.label_brgy !== false);
    setVis("label_street", vis.label_street !== false);

    // Roads
    setVis("rd_express", vis.road_exp !== false);
    setVis("case_express", vis.road_exp !== false);
    setVis("case_express_casing", vis.road_exp !== false);
    setVis("rd_major", vis.road_main !== false);
    setVis("case_major", vis.road_main !== false);
    setVis("case_major_casing", vis.road_main !== false);
    setVis("rd_secondary", vis.road_sec !== false);
    setVis("case_secondary", vis.road_sec !== false);
    setVis("case_secondary_casing", vis.road_sec !== false);
    setVis("rd_tertiary", vis.road_ter !== false);
    setVis("case_tertiary", vis.road_ter !== false);
    setVis("case_tertiary_casing", vis.road_ter !== false);
    setVis("rd_rail", vis.rd_rail !== false);

    // Water
    setVis("water", vis.water !== false);
    setVis("waterway", vis.waterway !== false);

    // Boundaries
    setVis("bound_prov", vis.bound_prov === true);
    setVis("bound_city", vis.bound_city === true);
    setVis("bound_brgy", vis.bound_brgy === true);
  };

  // Drawing event listeners
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTool === "select") {
      map.getCanvas().style.cursor = "";
      setDrawingPoints([]);
      setCircleCenter(null);
      return;
    }

    map.getCanvas().style.cursor = "crosshair";

    const handleMapClick = async (e: maplibregl.MapMouseEvent) => {
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (activeTool === "marker") {
        const newMarker: MapFeature = {
          type: "Feature",
          geometry: { type: "Point", coordinates: pt },
          properties: {
            id: `marker-${Date.now()}`,
            name: `Marker Pin ${currentProject.features.length + 1}`,
            category: "Marker",
            color: "#ef4444",
            fillColor: "#ef4444",
            strokeColor: "#ffffff",
            strokeWidth: 2,
            source: "user-draw",
            createdAt: new Date().toISOString(),
          },
        };
        addFeature(newMarker);
        setActiveTool("select");
        showToast("Marker pin placed.");
        return;
      }

      if (activeTool === "textbox") {
        const label = prompt("Enter text label:", "My Landmark");
        if (label && label.trim()) {
          const newText: MapFeature = {
            type: "Feature",
            geometry: { type: "Point", coordinates: pt },
            properties: {
              id: `text-${Date.now()}`,
              name: label.trim(),
              category: "Text Annotation",
              color: "#38bdf8",
              source: "user-draw",
              createdAt: new Date().toISOString(),
            },
          };
          addFeature(newText);
        }
        setActiveTool("select");
        return;
      }

      if (activeTool === "circle") {
        if (!circleCenterRef.current) {
          setCircleCenter(pt);
          showToast("Click second point to set radius.");
        } else {
          // Calculate distance between center and second point
          const center = circleCenterRef.current;
          const R = 6371e3; // metres
          const phi1 = (center[1] * Math.PI) / 180;
          const phi2 = (pt[1] * Math.PI) / 180;
          const deltaPhi = ((pt[1] - center[1]) * Math.PI) / 180;
          const deltaLambda = ((pt[0] - center[0]) * Math.PI) / 180;
          const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) *
              Math.cos(phi2) *
              Math.sin(deltaLambda / 2) *
              Math.sin(deltaLambda / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const radiusMeters = Math.max(50, Math.round(R * c));

          const circleFeat = createCircleFeature(center, radiusMeters, {
            id: `circle-${Date.now()}`,
            name: `Circle (${radiusMeters}m radius)`,
            category: "Circle Buffer",
            fillColor: "#38bdf8",
            fillOpacity: 0.2,
            strokeColor: "#0284c7",
            strokeWidth: 2,
            source: "user-draw",
            createdAt: new Date().toISOString(),
          }) as MapFeature;

          addFeature(circleFeat);
          setCircleCenter(null);
          setActiveTool("select");
          showToast(`Circle created with ${radiusMeters}m radius.`);
        }
        return;
      }

      if (activeTool === "polygon") {
        const pts = [...drawingPointsRef.current, pt];
        if (pts.length >= 3) {
          // Check if clicked close to start point to close polygon
          const first = pts[0];
          const distSq =
            Math.pow(pt[0] - first[0], 2) + Math.pow(pt[1] - first[1], 2);
          if (distSq < 0.00005 && pts.length >= 4) {
            // Close polygon
            const ring = [...pts.slice(0, -1), first];
            const polyFeat: MapFeature = {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [ring],
              },
              properties: {
                id: `poly-${Date.now()}`,
                name: `Polygon ${currentProject.features.length + 1}`,
                category: "Polygon",
                fillColor: "#3b82f6",
                fillOpacity: 0.3,
                strokeColor: "#1d4ed8",
                strokeWidth: 2,
                source: "user-draw",
                createdAt: new Date().toISOString(),
              },
            };
            addFeature(polyFeat);
            setDrawingPoints([]);
            setActiveTool("select");
            showToast("Polygon closed and saved.");
            return;
          }
        }
        setDrawingPoints(pts);
        showToast(`Point ${pts.length} added. Double-click or click start point to close.`);
        return;
      }

      if (activeTool === "polyline") {
        const pts = [...drawingPointsRef.current, pt];
        if (pts.length >= 2) {
          const lineFeat: MapFeature = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: pts,
            },
            properties: {
              id: `line-${Date.now()}`,
              name: `Line ${currentProject.features.length + 1}`,
              category: "Polyline",
              strokeColor: "#f59e0b",
              strokeWidth: 3,
              source: "user-draw",
              createdAt: new Date().toISOString(),
            },
          };
          addFeature(lineFeat);
        }
        setDrawingPoints(pts);
        return;
      }

      if (activeTool === "route") {
        const pts = [...drawingPointsRef.current, pt];
        if (pts.length === 1) {
          setDrawingPoints(pts);
          showToast("Point A set. Click destination Point B.");
        } else if (pts.length >= 2) {
          let routed:{geometry:{type:"LineString";coordinates:number[][]};distanceMeters:number;durationSeconds:number}|null=null;
          try{routed=await apiRequest("/routes",{method:"POST",body:JSON.stringify({mode:"driving",waypoints:pts})})}catch{showToast("Routing unavailable; saved a straight fallback line.")}
          const routeFeat: MapFeature = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routed?.geometry.coordinates??pts,
            },
            properties: {
              id: `route-${Date.now()}`,
              name: `Route A to B`,
              category: "Route",
              strokeColor: "#10b981",
              strokeWidth: 4,
              source: "route",
              createdAt: new Date().toISOString(),
              route:{mode:"driving",waypoints:pts,distanceMeters:routed?.distanceMeters,durationSeconds:routed?.durationSeconds},
            },
          };
          addFeature(routeFeat);
          setDrawingPoints([]);
          setActiveTool("select");
          showToast(routed?"Road-following route created.":"Fallback route created.");
        }
        return;
      }
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      if (activeTool === "polygon" && drawingPointsRef.current.length >= 3) {
        const ring = [...drawingPointsRef.current, drawingPointsRef.current[0]];
        const polyFeat: MapFeature = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [ring],
          },
          properties: {
            id: `poly-${Date.now()}`,
            name: `Polygon ${currentProject.features.length + 1}`,
            category: "Polygon",
            fillColor: "#3b82f6",
            fillOpacity: 0.3,
            strokeColor: "#1d4ed8",
            strokeWidth: 2,
            source: "user-draw",
            createdAt: new Date().toISOString(),
          },
        };
        addFeature(polyFeat);
        setDrawingPoints([]);
        setActiveTool("select");
        showToast("Polygon created.");
      }
    };

    map.on("click", handleMapClick);
    map.on("dblclick", handleDblClick);

    return () => {
      map.off("click", handleMapClick);
      map.off("dblclick", handleDblClick);
    };
  }, [activeTool, currentProject.features.length]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#0a1628]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Drawing points indicator */}
      {drawingPoints.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-3">
          <span>Drawing {activeTool}: {drawingPoints.length} points placed</span>
          <button
            onClick={() => {
              setDrawingPoints([]);
              setActiveTool("select");
            }}
            className="bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 text-[10px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lngLat={contextMenu.lngLat}
          featureId={contextMenu.featureId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
