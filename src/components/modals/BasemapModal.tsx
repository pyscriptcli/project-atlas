'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Palette, X } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ALL_STYLES } from '../../gis/map';
import { ColorPicker } from '../toolbar/ColorPicker';

interface BasemapModalProps {
  mapInstance: any;
}

export const BasemapModal: React.FC<BasemapModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel, currentBasemap, setBasemap } = useMapStore();
  const [lineThickness, setLineThickness] = useState(100);
  const [basemapOpacity, setBasemapOpacity] = useState(100);
  const [styleVersion, setStyleVersion] = useState(0);
  const basePaintRef = useRef<Map<string, Record<string, any>>>(new Map());

  const setMapPaint = (layerId: string, prop: string, val: any) => {
    if (mapInstance && mapInstance.getLayer(layerId)) {
      mapInstance.setPaintProperty(layerId, prop, val);
    }
  };

  const captureStyle = useCallback(() => {
    if (!mapInstance?.isStyleLoaded?.()) return;
    const basePaint = new Map<string, Record<string, any>>();
    for (const layer of mapInstance.getStyle().layers ?? []) {
      const paint: Record<string, any> = {};
      if (layer.type === 'line') paint['line-width'] = mapInstance.getPaintProperty(layer.id, 'line-width');
      const opacityProp: Record<string, [string, number]> = {
        background: ['background-opacity', 1], fill: ['fill-opacity', 1], line: ['line-opacity', 1],
        'fill-extrusion': ['fill-extrusion-opacity', 1], raster: ['raster-opacity', 1], symbol: ['text-opacity', 1],
      };
      const opacity = opacityProp[layer.type];
      if (opacity) paint[opacity[0]] = mapInstance.getPaintProperty(layer.id, opacity[0]) ?? opacity[1];
      if (layer.type === 'symbol') paint['icon-opacity'] = mapInstance.getPaintProperty(layer.id, 'icon-opacity') ?? 1;
      basePaint.set(layer.id, paint);
    }
    basePaintRef.current = basePaint;
    setStyleVersion((version) => version + 1);
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance?.isStyleLoaded?.()) return;
    for (const layer of mapInstance.getStyle().layers ?? []) {
      const base = basePaintRef.current.get(layer.id);
      if (!base) continue;
      const width = base['line-width'];
      if (width != null) mapInstance.setPaintProperty(layer.id, 'line-width', ['*', width, lineThickness / 100]);
      for (const prop of ['background-opacity', 'fill-opacity', 'line-opacity', 'fill-extrusion-opacity', 'raster-opacity', 'text-opacity', 'icon-opacity']) {
        if (base[prop] != null) mapInstance.setPaintProperty(layer.id, prop, ['*', base[prop], basemapOpacity / 100]);
      }
    }
  }, [mapInstance, lineThickness, basemapOpacity, styleVersion]);

  useEffect(() => {
    if (!mapInstance) return;
    if (mapInstance.isStyleLoaded?.()) captureStyle();
    mapInstance.on('style.load', captureStyle);
    return () => mapInstance.off('style.load', captureStyle);
  }, [mapInstance, currentBasemap, captureStyle]);

  if (!activePanels.customMap) return null;

  return (
    <div className="fixed top-16 right-4 z-[998] w-80 max-h-[82vh] overflow-y-auto bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Palette className="w-4 h-4 text-sky-400" />
          <span>Vector & Basemap Style</span>
        </div>
        <button
          onClick={() => togglePanel('customMap', false)}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preset List */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Basemap Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(ALL_STYLES).map((name) => (
            <button
              key={name}
              onClick={() => setBasemap(name)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                currentBasemap === name
                  ? 'bg-blue-600 border-blue-500 text-white shadow'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Fine-grain vector controls */}
      <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span>Vector line thickness</span><span className="text-sky-300">{(lineThickness / 100).toFixed(2)}×</span>
          </span>
          <input aria-label="Vector line thickness" type="range" min="50" max="250" step="10" value={lineThickness} onChange={(e) => setLineThickness(Number(e.target.value))} className="w-full accent-sky-400" />
          <span className="flex justify-between text-[9px] text-gray-500"><span>Smallest</span><span>Biggest</span></span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span>Basemap opacity</span><span className="text-sky-300">{basemapOpacity}%</span>
          </span>
          <input aria-label="Basemap opacity" type="range" min="0" max="100" step="1" value={basemapOpacity} onChange={(e) => setBasemapOpacity(Number(e.target.value))} className="w-full accent-sky-400" />
          <span className="flex justify-between text-[9px] text-gray-500"><span>Transparent</span><span>Opaque</span></span>
        </label>

        <ColorPicker
          label="Background"
          color="#0a1628"
          onChange={(col) => setMapPaint('bg', 'background-color', col)}
        />

        <ColorPicker
          label="Expressways"
          color="#ffaa00"
          onChange={(col) => setMapPaint('rd_express', 'line-color', col)}
        />

        <ColorPicker
          label="Main Roads"
          color="#e8b84a"
          onChange={(col) => setMapPaint('rd_major', 'line-color', col)}
        />

        <ColorPicker
          label="Secondary Roads"
          color="#c99c37"
          onChange={(col) => setMapPaint('rd_secondary', 'line-color', col)}
        />

        <ColorPicker
          label="Railways"
          color="#d9b451"
          onChange={(col) => setMapPaint('rd_rail', 'line-color', col)}
        />

        <ColorPicker
          label="Boundaries"
          color="#ff1e1e"
          onChange={(col) => {
            ['bound_prov', 'bound_city', 'bound_brgy'].forEach((id) =>
              setMapPaint(id, 'line-color', col)
            );
          }}
        />

        <ColorPicker
          label="Buildings"
          color="#8e7258"
          onChange={(col) => {
            setMapPaint('building-2d', 'fill-color', col);
            setMapPaint('building-3d', 'fill-extrusion-color', col);
          }}
        />

        <ColorPicker
          label="Water Bodies"
          color="#0a1424"
          onChange={(col) => {
            setMapPaint('water', 'fill-color', col);
            setMapPaint('waterway', 'line-color', col);
          }}
        />
      </div>
    </div>
  );
};
