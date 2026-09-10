'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../store/useMapStore';
import { ALL_STYLES, VIS_MAP } from '../../gis/map';
import { rectCoords, rotateGeometry, translateCoordinates, calcBounds } from '../../gis/polygons';
import { circleCoords, haversineDist } from '../../gis/circles';
import { getIconKey } from '../../gis/markers';
import { fetchMultiPointRoute } from '../../gis/routes';
import { generateLabelsGeoJSON } from '../../gis/labels';
import { GISFeature } from '../../types/gis';

interface MapCanvasProps {
  onMapReady: (map: maplibregl.Map) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ onMapReady }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const {
    currentBasemap,
    visibilities,
    features,
    activeTool,
    setActiveTool,
    draft,
    setDraft,
    cursorLL,
    setCursorLL,
    editMode,
    selectedId,
    setSelectedId,
    addFeature,
    updateFeature,
    setContextMenu,
    closeContextMenu,
    closeAllPanels,
    togglePanel,
    markerShape,
    markerColor,
    markerSize,
    customMarkerKey,
    textContent,
    textSize,
    textColor,
    textOpacity,
    routeMode,
    routeColor,
    setToast,
  } = useMapStore();

  // Internal drag state refs
  const dragRef = useRef({
    isDragging: false,
    dragFeatureId: null as number | null,
    dragStartCoord: null as [number, number] | null,
    dragOriginalCoords: null as any,
    isDraggingVertex: false,
    draggedPolyId: null as number | null,
    draggedVertexIdx: -1,
    isRadiusHandle: false,
    isDraggingRotation: false,
    rotatingPolyId: null as number | null,
    rotCenter: null as [number, number] | null,
    rotStartAngle: 0,
  });

  const nextFid = useRef(features.reduce((m, f) => Math.max(m, f.id || 0), 0));

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialStyle = ALL_STYLES[currentBasemap] || ALL_STYLES['Midnight Blue'];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [120.9842, 14.5995],
      zoom: 14,
      pitch: 60,
      bearing: -15,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as any);

    mapRef.current = map;
    map.getCanvas().addEventListener('contextmenu', (e) => e.preventDefault());

    map.on('load', () => {
      setupLayers(map);
      applyVisibilities(map, visibilities);
      onMapReady(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update basemap style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = ALL_STYLES[currentBasemap];
    if (style) {
      map.setStyle(style);
      map.once('idle', () => {
        setupLayers(map);
        applyVisibilities(map, visibilities);
        syncData(map, features);
      });
    }
  }, [currentBasemap]);

  // Update visibilities
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyVisibilities(map, visibilities);
  }, [visibilities]);

  // Update features data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncData(map, features);
    syncLabels(map, features);
    syncVertexHandles(map, features, editMode, selectedId);
  }, [features, editMode, selectedId]);

  // Update draft rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    renderDraftGeometry(map, draft, cursorLL, activeTool);
  }, [draft, cursorLL, activeTool]);

  const setupLayers = (map: maplibregl.Map) => {
    if (!map.getSource('draw')) {
      map.addSource('draw', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'draw-fill',
        type: 'fill',
        source: 'draw',
        filter: [
          'all',
          ['==', ['geometry-type'], 'Polygon'],
          ['<=', ['coalesce', ['get', 'height'], 0], 0],
        ],
        paint: {
          'fill-color': ['coalesce', ['get', 'fillColor'], ['get', 'color'], '#e8b84a'],
          'fill-opacity': ['*', ['coalesce', ['get', 'fillOpacity'], 0.35], ['get', 'visible']],
        },
      });

      map.addLayer({
        id: 'draw-outline',
        type: 'line',
        source: 'draw',
        filter: [
          'all',
          ['==', ['geometry-type'], 'Polygon'],
          ['<=', ['coalesce', ['get', 'height'], 0], 0],
        ],
        paint: {
          'line-color': ['coalesce', ['get', 'borderColor'], ['get', 'color'], '#e8b84a'],
          'line-width': ['coalesce', ['get', 'width'], 3],
          'line-opacity': ['*', ['coalesce', ['get', 'borderOpacity'], 0.9], ['get', 'visible']],
        },
      });

      map.addLayer({
        id: 'draw-extrusion',
        type: 'fill-extrusion',
        source: 'draw',
        filter: [
          'all',
          ['==', ['geometry-type'], 'Polygon'],
          ['>', ['coalesce', ['get', 'height'], 0], 0],
        ],
        paint: {
          'fill-extrusion-color': ['coalesce', ['get', 'fillColor'], ['get', 'color'], '#38bdf8'],
          'fill-extrusion-height': ['coalesce', ['get', 'height'], 35],
          'fill-extrusion-base': ['coalesce', ['get', 'baseHeight'], 0],
          'fill-extrusion-opacity': ['*', ['coalesce', ['get', 'fillOpacity'], 0.85], ['get', 'visible']],
        },
      });

      map.addLayer({
        id: 'draw-line',
        type: 'line',
        source: 'draw',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'routingFailed'], false],
            '#f85149',
            ['coalesce', ['get', 'borderColor'], ['get', 'color'], '#38bdf8'],
          ],
          'line-width': ['coalesce', ['get', 'width'], 4],
          'line-opacity': ['*', ['coalesce', ['get', 'borderOpacity'], 0.9], ['get', 'visible']],
          'line-dasharray': [
            'case',
            ['boolean', ['get', 'routingFailed'], false],
            ['literal', [2, 2]],
            ['literal', [1, 0]],
          ],
        },
      });

      map.addLayer({
        id: 'draw-marker',
        type: 'symbol',
        source: 'draw',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['!=', ['get', 'kind'], 'textbox']],
        layout: {
          'icon-image': ['get', 'iconKey'],
          'icon-size': ['coalesce', ['get', 'iconSize'], 0.9],
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
        },
        paint: { 'icon-opacity': ['get', 'visible'] },
      });

      map.addLayer({
        id: 'draw-text',
        type: 'symbol',
        source: 'draw',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'kind'], 'textbox']],
        layout: {
          'text-field': ['get', 'text'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['coalesce', ['get', 'fontSize'], 16],
          'text-allow-overlap': true,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': ['coalesce', ['get', 'color'], '#d9b451'],
          'text-opacity': ['*', ['coalesce', ['get', 'opacity'], 1], ['get', 'visible']],
          'text-halo-color': '#0a1628',
          'text-halo-width': 2,
        },
      });
    }

    if (!map.getSource('label-src')) {
      map.addSource('label-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draw-poly-labels',
        type: 'symbol',
        source: 'label-src',
        layout: {
          'text-field': ['get', 'labelText'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 13,
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-justify': 'center',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0a1628',
          'text-halo-width': 2,
        },
      });
    }

    if (!map.getSource('draft')) {
      map.addSource('draft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#38bdf8', 'line-width': 2.5, 'line-dasharray': [2, 2] },
      });
      map.addLayer({
        id: 'draft-point',
        type: 'circle',
        source: 'draft',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': ['case', ['get', 'isLastPoint'], '#38bdf8', '#e8b84a'],
          'circle-radius': ['case', ['get', 'isLastPoint'], 10, ['case', ['get', 'isOrigin'], 8, 5]],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getSource('vertex-handles')) {
      map.addSource('vertex-handles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'vertex-points',
        type: 'circle',
        source: 'vertex-handles',
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'isRotHandle'], false],
            '#e8b84a',
            ['case', ['boolean', ['get', 'isRadiusHandle'], false], '#3fb950', '#38bdf8'],
          ],
          'circle-radius': 6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  };

  const applyVisibilities = (map: maplibregl.Map, vis: any) => {
    for (const g in VIS_MAP) {
      VIS_MAP[g].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', vis[g] ? 'visible' : 'none');
        }
      });
    }
  };

  const syncData = (map: maplibregl.Map, featList: GISFeature[]) => {
    const src = map.getSource('draw') as maplibregl.GeoJSONSource;
    if (!src) return;

    src.setData({
      type: 'FeatureCollection',
      features: featList.map((f) => ({
        type: 'Feature',
        geometry: f.geometry as any,
        properties: {
          id: f.id,
          name: f.name,
          kind: f.kind,
          ...f.props,
        },
      })),
    });
  };

  const syncLabels = (map: maplibregl.Map, featList: GISFeature[]) => {
    const src = map.getSource('label-src') as maplibregl.GeoJSONSource;
    if (src) {
      src.setData(generateLabelsGeoJSON(featList) as any);
    }
  };

  const syncVertexHandles = (
    map: maplibregl.Map,
    featList: GISFeature[],
    isEdit: boolean,
    selected: number | null
  ) => {
    const src = map.getSource('vertex-handles') as maplibregl.GeoJSONSource;
    if (!src) return;

    if (!isEdit || selected == null) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const f = featList.find((x) => x.id === selected);
    if (!f || f.props.visible === 0) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const handleFeats: any[] = [];

    if (f.kind === 'circle' && f.props.centerCoord && f.props.radiusMeters) {
      const c = f.props.centerCoord;
      const r = f.props.radiusMeters;
      const edgeCoord = [c[0] + r / (111320 * Math.cos((c[1] * Math.PI) / 180)), c[1]];
      handleFeats.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: edgeCoord },
        properties: { polyId: f.id, isRadiusHandle: true },
      });
    } else if (['polygon', 'rectangle', 'polygon3d'].includes(f.kind) && f.geometry.coordinates?.[0]) {
      const coords = f.geometry.coordinates[0];
      for (let i = 0; i < coords.length - 1; i++) {
        handleFeats.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords[i] },
          properties: { polyId: f.id, vIdx: i },
        });
      }
    } else if (['polyline', 'route'].includes(f.kind) && f.geometry.coordinates) {
      const coords = f.props.waypoints || f.geometry.coordinates;
      for (let i = 0; i < coords.length; i++) {
        handleFeats.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords[i] },
          properties: { polyId: f.id, vIdx: i },
        });
      }
    }

    const b = calcBounds(f);
    if (b) {
      const cx = (b[0][0] + b[1][0]) / 2;
      const offset = (b[1][1] - b[0][1]) * 0.25 || 0.001;
      handleFeats.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [cx, b[1][1] + offset] },
        properties: { polyId: f.id, isRotHandle: true },
      });
    }

    src.setData({ type: 'FeatureCollection', features: handleFeats });
  };

  const renderDraftGeometry = (
    map: maplibregl.Map,
    pts: [number, number][],
    cursor: [number, number] | null,
    tool: any
  ) => {
    const src = map.getSource('draft') as maplibregl.GeoJSONSource;
    if (!src) return;

    const feats: any[] = [];
    const ptFeat = (c: [number, number], isOrigin = false, isLast = false) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c },
      properties: { isOrigin, isLastPoint: isLast },
    });
    const lnFeat = (c: [number, number][]) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: c },
      properties: {},
    });

    pts.forEach((p, i) => {
      feats.push(
        ptFeat(
          p,
          i === 0 && (tool === 'polygon' || tool === 'polygon3d'),
          i === pts.length - 1 && tool === 'route'
        )
      );
    });

    if ((tool === 'polyline' || tool === 'route') && pts.length) {
      feats.push(lnFeat(cursor ? [...pts, cursor] : pts));
    }
    if ((tool === 'polygon' || tool === 'polygon3d') && pts.length) {
      const allPts = cursor ? [...pts, cursor] : pts;
      if (allPts.length > 1) feats.push(lnFeat([...allPts, allPts[0]]));
    }
    if (tool === 'rectangle' && pts.length === 1 && cursor) {
      feats.push(lnFeat(rectCoords(pts[0], cursor)[0]));
    }
    if (tool === 'circle' && pts.length === 1 && cursor) {
      const { coords } = circleCoords(pts[0], cursor);
      feats.push(lnFeat(coords[0]));
    }

    src.setData({ type: 'FeatureCollection', features: feats });
  };

  // Map Event Bindings
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const ll: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setCursorLL(ll);

      const d = dragRef.current;
      if (d.isDragging && d.dragFeatureId != null && d.dragStartCoord && d.dragOriginalCoords) {
        const dx = ll[0] - d.dragStartCoord[0];
        const dy = ll[1] - d.dragStartCoord[1];
        updateFeature(d.dragFeatureId, (f) => {
          const next = { ...f, geometry: { ...f.geometry } };
          next.geometry.coordinates = translateCoordinates(d.dragOriginalCoords, dx, dy);
          if (f.kind === 'circle' && f.props.centerCoord) {
            next.props.centerCoord = [f.props.centerCoord[0] + dx, f.props.centerCoord[1] + dy];
          }
          if (f.props.waypoints) {
            next.props.waypoints = f.props.waypoints.map((pt) => [pt[0] + dx, pt[1] + dy]);
          }
          return next;
        });
      }

      if (d.isDraggingRotation && d.rotatingPolyId != null && d.rotCenter) {
        const currentAngle = Math.atan2(ll[1] - d.rotCenter[1], ll[0] - d.rotCenter[0]);
        const deltaAngle = currentAngle - d.rotStartAngle;
        updateFeature(d.rotatingPolyId, (f) => {
          const next = { ...f };
          rotateGeometry(next, deltaAngle, d.rotCenter!);
          return next;
        });
        d.rotStartAngle = currentAngle;
      }

      if (d.isDraggingVertex && d.draggedPolyId != null) {
        updateFeature(d.draggedPolyId, (f) => {
          const next = { ...f, geometry: { ...f.geometry } };
          if (d.isRadiusHandle && f.kind === 'circle' && f.props.centerCoord) {
            const newRadius = haversineDist(f.props.centerCoord, ll);
            next.props.radiusMeters = newRadius;
            next.geometry.coordinates = circleCoords(f.props.centerCoord, ll).coords;
          } else if (['polygon', 'rectangle', 'polygon3d'].includes(f.kind) && next.geometry.coordinates?.[0]) {
            const ring = [...next.geometry.coordinates[0]];
            ring[d.draggedVertexIdx] = ll;
            if (d.draggedVertexIdx === 0) ring[ring.length - 1] = ll;
            next.geometry.coordinates = [ring];
          } else if (f.kind === 'polyline') {
            const coords = [...next.geometry.coordinates];
            coords[d.draggedVertexIdx] = ll;
            next.geometry.coordinates = coords;
          } else if (f.kind === 'route' && f.props.waypoints) {
            const wp = [...f.props.waypoints];
            wp[d.draggedVertexIdx] = ll;
            next.props.waypoints = wp;
          }
          return next;
        });
      }
    };

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (!editMode) return;
      const d = dragRef.current;

      const vHits = map.queryRenderedFeatures(e.point, { layers: ['vertex-points'] });
      if (vHits.length && vHits[0].properties.polyId != null) {
        const prop = vHits[0].properties;
        if (prop.isRotHandle) {
          d.isDraggingRotation = true;
          d.rotatingPolyId = parseInt(prop.polyId, 10);
          const f = features.find((x) => x.id === d.rotatingPolyId);
          if (f) {
            const b = calcBounds(f);
            if (b) {
              d.rotCenter = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];
              d.rotStartAngle = Math.atan2(e.lngLat.lat - d.rotCenter[1], e.lngLat.lng - d.rotCenter[0]);
              map.dragPan.disable();
              return;
            }
          }
        }

        d.isDraggingVertex = true;
        d.draggedPolyId = parseInt(prop.polyId, 10);
        d.draggedVertexIdx = prop.vIdx != null ? parseInt(prop.vIdx, 10) : -1;
        d.isRadiusHandle = !!prop.isRadiusHandle;
        map.dragPan.disable();
        return;
      }

      const fs = map.queryRenderedFeatures(e.point, {
        layers: ['draw-fill', 'draw-extrusion', 'draw-line', 'draw-outline', 'draw-marker', 'draw-text'],
      });
      if (fs.length && fs[0].properties.id != null) {
        const id = parseInt(fs[0].properties.id, 10);
        d.isDragging = true;
        d.dragFeatureId = id;
        d.dragStartCoord = [e.lngLat.lng, e.lngLat.lat];
        const f = features.find((x) => x.id === id);
        if (f) d.dragOriginalCoords = JSON.parse(JSON.stringify(f.geometry.coordinates));
        map.dragPan.disable();
      }
    };

    const handleMouseUp = () => {
      const d = dragRef.current;
      if (d.isDragging || d.isDraggingVertex || d.isDraggingRotation) {
        if (d.isDraggingVertex && d.draggedPolyId != null) {
          const f = features.find((x) => x.id === d.draggedPolyId);
          if (f && f.kind === 'route' && f.props.waypoints) {
            fetchMultiPointRoute(f.props.waypoints, f.props.routeMode).then((res) => {
              updateFeature(f.id, (feat) => ({
                ...feat,
                geometry: res.geometry,
                props: {
                  ...feat.props,
                  description: res.description,
                  metadata: { distance: res.distance, duration: res.duration },
                  routingFailed: res.routingFailed,
                },
              }));
            });
          }
        }
        d.isDragging = false;
        d.dragFeatureId = null;
        d.isDraggingVertex = false;
        d.draggedPolyId = null;
        d.isDraggingRotation = false;
        d.rotatingPolyId = null;
        map.dragPan.enable();
      }
    };

    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      closeContextMenu();
      const ll: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!activeTool) {
        if (!editMode) {
          const fs = map.queryRenderedFeatures(e.point, {
            layers: ['draw-fill', 'draw-extrusion', 'draw-line', 'draw-outline', 'draw-marker', 'draw-text'],
          });
          if (fs.length && fs[0].properties.id != null) {
            const id = parseInt(fs[0].properties.id, 10);
            setSelectedId(id);
          }
        }
        return;
      }

      const id = ++nextFid.current;

      if (activeTool === 'marker') {
        const iconKey = customMarkerKey || getIconKey(markerShape, markerColor, map);
        addFeature({
          id,
          name: `Marker ${id}`,
          kind: 'marker',
          geometry: { type: 'Point', coordinates: ll },
          props: {
            shape: markerShape,
            color: markerColor,
            iconSize: markerSize,
            iconKey,
            visible: 1,
            attributes: { name: `Marker ${id}` },
          },
        });
        setActiveTool(null);
        setToast('Marker placed');
      } else if (activeTool === 'textbox') {
        addFeature({
          id,
          name: `Text ${id}`,
          kind: 'textbox',
          geometry: { type: 'Point', coordinates: ll },
          props: {
            text: textContent || 'Label',
            fontSize: textSize,
            color: textColor,
            opacity: textOpacity,
            visible: 1,
            attributes: { name: `Text ${id}` },
          },
        });
        setActiveTool(null);
        setToast('Label placed');
      } else if (activeTool === 'rectangle') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length === 2) {
          addFeature({
            id,
            name: `Rectangle ${id}`,
            kind: 'rectangle',
            geometry: { type: 'Polygon', coordinates: rectCoords(nextDraft[0], nextDraft[1]) },
            props: {
              color: '#e8b84a',
              borderColor: '#e8b84a',
              width: 3,
              fillColor: '#e8b84a',
              fillOpacity: 0.35,
              borderOpacity: 0.9,
              visible: 1,
              attributes: { name: `Rectangle ${id}` },
            },
          });
          setDraft([]);
          setActiveTool(null);
          setToast('Rectangle created');
        } else {
          setDraft(nextDraft);
        }
      } else if (activeTool === 'circle') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length === 2) {
          const { coords, r } = circleCoords(nextDraft[0], nextDraft[1]);
          addFeature({
            id,
            name: `Circle ${id}`,
            kind: 'circle',
            geometry: { type: 'Polygon', coordinates: coords },
            props: {
              color: '#e8b84a',
              borderColor: '#e8b84a',
              width: 3,
              fillColor: '#e8b84a',
              fillOpacity: 0.35,
              borderOpacity: 0.9,
              centerCoord: nextDraft[0],
              radiusMeters: r,
              visible: 1,
              attributes: { name: `Circle ${id}` },
            },
          });
          setDraft([]);
          setActiveTool(null);
          setToast('Circle created');
        } else {
          setDraft(nextDraft);
        }
      } else if (activeTool === 'polyline') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length >= 2) {
          const pScreen = map.project(ll);
          const lastScreen = map.project(draft[draft.length - 1]);
          if (Math.hypot(pScreen.x - lastScreen.x, pScreen.y - lastScreen.y) < 18) {
            addFeature({
              id,
              name: `Polyline ${id}`,
              kind: 'polyline',
              geometry: { type: 'LineString', coordinates: draft },
              props: {
                color: '#38bdf8',
                borderColor: '#38bdf8',
                width: 4,
                borderOpacity: 0.9,
                visible: 1,
                attributes: { name: `Polyline ${id}` },
              },
            });
            setDraft([]);
            setActiveTool(null);
            setToast('Polyline created');
            return;
          }
        }
        setDraft(nextDraft);
      } else if (activeTool === 'polygon') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length >= 3) {
          const pScreen = map.project(ll);
          for (const origin of draft) {
            const vScreen = map.project(origin);
            if (Math.hypot(pScreen.x - vScreen.x, pScreen.y - vScreen.y) < 18) {
              addFeature({
                id,
                name: `Polygon ${id}`,
                kind: 'polygon',
                geometry: { type: 'Polygon', coordinates: [[...draft, draft[0]]] },
                props: {
                  color: '#e8b84a',
                  borderColor: '#e8b84a',
                  width: 3,
                  fillColor: '#e8b84a',
                  fillOpacity: 0.35,
                  borderOpacity: 0.9,
                  visible: 1,
                  attributes: { name: `Polygon ${id}` },
                },
              });
              setDraft([]);
              setActiveTool(null);
              setToast('Polygon closed');
              return;
            }
          }
        }
        setDraft(nextDraft);
      } else if (activeTool === 'polygon3d') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length >= 3) {
          const pScreen = map.project(ll);
          for (const origin of draft) {
            const vScreen = map.project(origin);
            if (Math.hypot(pScreen.x - vScreen.x, pScreen.y - vScreen.y) < 18) {
              addFeature({
                id,
                name: `3D Building ${id}`,
                kind: 'polygon3d',
                geometry: { type: 'Polygon', coordinates: [[...draft, draft[0]]] },
                props: {
                  is3D: true,
                  height: 35,
                  baseHeight: 0,
                  color: '#38bdf8',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.85,
                  borderColor: '#38bdf8',
                  width: 2,
                  visible: 1,
                  attributes: { name: `3D Building ${id}`, height: '35m' },
                },
              });
              setDraft([]);
              setActiveTool(null);
              setToast('3D Polygon created');
              return;
            }
          }
        }
        setDraft(nextDraft);
      } else if (activeTool === 'route') {
        const nextDraft = [...draft, ll];
        if (nextDraft.length >= 2) {
          const pScreen = map.project(ll);
          const lastScreen = map.project(draft[draft.length - 1]);
          if (Math.hypot(pScreen.x - lastScreen.x, pScreen.y - lastScreen.y) < 22) {
            setToast('Calculating route...');
            const res = await fetchMultiPointRoute(draft, routeMode);
            addFeature({
              id,
              name: `Route ${id}`,
              kind: 'route',
              geometry: res.geometry,
              props: {
                color: routeColor,
                borderColor: routeColor,
                width: 4,
                borderOpacity: 0.9,
                routeMode,
                waypoints: draft,
                description: res.description,
                metadata: { distance: res.distance, duration: res.duration },
                routingFailed: res.routingFailed,
                showLabel: true,
                visible: 1,
                attributes: { name: `Route ${id}`, description: res.description },
              },
            });
            setDraft([]);
            setActiveTool(null);
            setToast('Route created');
            return;
          }
        }
        setDraft(nextDraft);
      }
    };

    const handleDblClick = async (e: maplibregl.MapMouseEvent) => {
      if (activeTool === 'polygon3d' && draft.length >= 3) {
        e.preventDefault();
        const id = ++nextFid.current;
        addFeature({
          id,
          name: `3D Building ${id}`,
          kind: 'polygon3d',
          geometry: { type: 'Polygon', coordinates: [[...draft, draft[0]]] },
          props: {
            is3D: true,
            height: 35,
            baseHeight: 0,
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.85,
            borderColor: '#38bdf8',
            width: 2,
            visible: 1,
            attributes: { name: `3D Building ${id}`, height: '35m' },
          },
        });
        setDraft([]);
        setActiveTool(null);
        setToast('3D Polygon finalized');
        return;
      }
      if (activeTool === 'route' && draft.length >= 2) {
        e.preventDefault();
        setToast('Calculating route...');
        const id = ++nextFid.current;
        const res = await fetchMultiPointRoute(draft, routeMode);
        addFeature({
          id,
          name: `Route ${id}`,
          kind: 'route',
          geometry: res.geometry,
          props: {
            color: routeColor,
            borderColor: routeColor,
            width: 4,
            borderOpacity: 0.9,
            routeMode,
            waypoints: draft,
            description: res.description,
            metadata: { distance: res.distance, duration: res.duration },
            routingFailed: res.routingFailed,
            showLabel: true,
            visible: 1,
            attributes: { name: `Route ${id}`, description: res.description },
          },
        });
        setDraft([]);
        setActiveTool(null);
        setToast('Route finalized');
      }
    };

    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      const fs = map.queryRenderedFeatures(e.point, {
        layers: ['draw-fill', 'draw-extrusion', 'draw-line', 'draw-outline', 'draw-marker', 'draw-text'],
      });
      const hitId = fs.length && fs[0].properties.id != null ? parseInt(fs[0].properties.id, 10) : null;

      setContextMenu({
        visible: true,
        x: e.point.x,
        y: e.point.y,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        featureId: hitId,
      });
    };

    map.on('mousemove', handleMouseMove);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    map.on('contextmenu', handleContextMenu);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      map.off('contextmenu', handleContextMenu);
    };
  }, [
    activeTool,
    editMode,
    draft,
    features,
    markerShape,
    markerColor,
    markerSize,
    customMarkerKey,
    textContent,
    textSize,
    textColor,
    textOpacity,
    routeMode,
    routeColor,
  ]);

  return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />;
};
