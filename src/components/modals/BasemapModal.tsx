'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Palette, X } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ALL_STYLES } from '../../gis/map';
import { ColorPicker } from '../toolbar/ColorPicker';

interface BasemapModalProps {
  mapInstance: any;
}

const STYLE_CONTROLS = [
  { id: 'expressways', label: 'Expressways', color: '#ffaa00', colorLayers: ['rd_express'], layers: [{ id: 'case_express_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_express', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'mainRoads', label: 'Main roads', color: '#e8b84a', colorLayers: ['rd_major'], layers: [{ id: 'case_major_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_major', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'secondaryRoads', label: 'Secondary roads', color: '#c99c37', colorLayers: ['rd_secondary'], layers: [{ id: 'case_secondary_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_secondary', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'railways', label: 'Railways', color: '#d9b451', colorLayers: ['rd_rail'], layers: [{ id: 'rd_rail', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'boundaries', label: 'Boundaries', color: '#ff1e1e', colorLayers: ['bound_prov', 'bound_city', 'bound_brgy'], layers: [{ id: 'bound_prov', width: 'line-width', opacity: 'line-opacity' }, { id: 'bound_city', width: 'line-width', opacity: 'line-opacity' }, { id: 'bound_brgy', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'background', label: 'Background', layers: [{ id: 'bg', opacity: 'background-opacity' }], thickness: false, opacity: true },
  { id: 'buildings', label: 'Buildings', layers: [{ id: 'building-2d', opacity: 'fill-opacity' }, { id: 'building-3d', opacity: 'fill-extrusion-opacity' }], thickness: false, opacity: true },
] as const;

const INITIAL_VALUES = Object.fromEntries(
  STYLE_CONTROLS.flatMap(({ id, thickness, opacity }) => [
    ...(thickness ? [[`${id}Thickness`, 100]] : []),
    ...(opacity ? [[`${id}Opacity`, 100]] : []),
  ])
) as Record<string, number>;

function scaleLineWidth(width: any, scale: number) {
  if (typeof width === 'number') return width * scale;
  if (!Array.isArray(width)) return width;

  // Keep zoom as the top-level camera expression; MapLibre rejects wrapping it in `*`.
  if (width[0] === 'interpolate' || width[0] === 'step') {
    const scaled = [...width];
    const firstOutput = width[0] === 'step' ? 2 : 4;
    for (let index = firstOutput; index < scaled.length; index += 2) {
      if (typeof scaled[index] === 'number') scaled[index] *= scale;
      else scaled[index] = ['*', scaled[index], scale];
    }
    return scaled;
  }

  return ['*', width, scale];
}

export const BasemapModal: React.FC<BasemapModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel, currentBasemap, setBasemap } = useMapStore();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [colors, setColors] = useState<Record<string, string>>(
    Object.fromEntries(STYLE_CONTROLS.filter((group) => 'color' in group).map((group) => [group.id, group.color!]))
  );
  const [openRoadGroup, setOpenRoadGroup] = useState<string | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);
  const basePaintRef = useRef<Map<string, Record<string, any>>>(new Map());

  const setMapPaint = (layerId: string, prop: string, val: any) => {
    if (mapInstance && mapInstance.getLayer(layerId)) {
      mapInstance.setPaintProperty(layerId, prop, val);
    }
  };

  const hasRoadLayers = STYLE_CONTROLS
    .filter((group) => 'colorLayers' in group)
    .some((group) => group.layers.some((layer) => mapInstance?.getLayer(layer.id)));

  const captureStyle = useCallback(() => {
    if (!mapInstance?.isStyleLoaded?.()) return;
    const basePaint = new Map<string, Record<string, any>>();
    const styleColors: Record<string, string> = {};
    for (const group of STYLE_CONTROLS) {
      if ('colorLayers' in group) {
        const colorLayer = group.colorLayers.find((id) => mapInstance.getLayer(id));
        const color = colorLayer && mapInstance.getPaintProperty(colorLayer, 'line-color');
        if (typeof color === 'string') styleColors[group.id] = color;
      }
      for (const layer of group.layers) {
        if (!mapInstance.getLayer(layer.id)) continue;
        const paint: Record<string, any> = {};
        if ('width' in layer) paint[layer.width] = mapInstance.getPaintProperty(layer.id, layer.width);
        if ('opacity' in layer) paint[layer.opacity] = mapInstance.getPaintProperty(layer.id, layer.opacity) ?? 1;
        basePaint.set(layer.id, paint);
      }
    }
    basePaintRef.current = basePaint;
    if (Object.keys(styleColors).length) setColors((current) => ({ ...current, ...styleColors }));
    setStyleVersion((version) => version + 1);
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance?.isStyleLoaded?.()) return;
    // Apply opacity first so a malformed width on one layer cannot block opacity controls.
    for (const group of STYLE_CONTROLS) {
      for (const layer of group.layers) {
        const base = basePaintRef.current.get(layer.id);
        if (!base || !mapInstance.getLayer(layer.id)) continue;
        if ('opacity' in layer && base[layer.opacity] != null) {
          mapInstance.setPaintProperty(layer.id, layer.opacity, ['*', base[layer.opacity], values[`${group.id}Opacity`] / 100]);
        }
      }
    }
    for (const group of STYLE_CONTROLS) {
      for (const layer of group.layers) {
        const base = basePaintRef.current.get(layer.id);
        if (!base || !mapInstance.getLayer(layer.id) || !('width' in layer) || base[layer.width] == null) continue;
        mapInstance.setPaintProperty(layer.id, layer.width, scaleLineWidth(base[layer.width], values[`${group.id}Thickness`] / 100));
      }
    }
  }, [mapInstance, values, styleVersion]);

  useEffect(() => {
    if (!mapInstance) return;
    if (mapInstance.isStyleLoaded?.()) captureStyle();
    mapInstance.on('style.load', captureStyle);
    return () => mapInstance.off('style.load', captureStyle);
  }, [mapInstance, currentBasemap, captureStyle]);

  if (!activePanels.customMap) return null;

  return (
    <div className="fixed top-16 right-4 z-[998] w-[calc(100vw_-_2rem)] max-w-80 max-h-[82vh] overflow-y-auto bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4">
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

      {/* Per-road controls stay compact until the user opens a group. */}
      <section className="border-t border-white/10 pt-3 flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Road & boundary styles</h2>
        {hasRoadLayers ? STYLE_CONTROLS.filter((group) => 'color' in group).map((group) => {
          const isOpen = openRoadGroup === group.id;
          return (
            <div key={group.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? `style-controls-${group.id}` : undefined}
                onClick={() => setOpenRoadGroup(isOpen ? null : group.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <span className="w-3 h-3 shrink-0 rounded-sm border border-white/30" style={{ backgroundColor: colors[group.id] }} />
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-gray-200">{group.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div id={`style-controls-${group.id}`} className="border-t border-white/10 px-3 py-3 flex flex-col gap-3">
                  <ColorPicker
                    label="Color preset or custom"
                    color={colors[group.id]}
                    onChange={(color) => {
                      setColors((current) => ({ ...current, [group.id]: color }));
                      group.colorLayers!.forEach((layerId) => setMapPaint(layerId, 'line-color', color));
                    }}
                  />
                  <label className="grid grid-cols-[60px_1fr_38px] items-center gap-2 text-[10px] text-gray-400">
                    <span>Thickness</span>
                    <input aria-label={`${group.label} thickness`} type="range" min="50" max="250" step="10" value={values[`${group.id}Thickness`]} onChange={(e) => setValues((current) => ({ ...current, [`${group.id}Thickness`]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                    <span className="text-right text-sky-300">{(values[`${group.id}Thickness`] / 100).toFixed(1)}×</span>
                  </label>
                  <label className="grid grid-cols-[60px_1fr_38px] items-center gap-2 text-[10px] text-gray-400">
                    <span>Opacity</span>
                    <input aria-label={`${group.label} opacity`} type="range" min="0" max="100" step="1" value={values[`${group.id}Opacity`]} onChange={(e) => setValues((current) => ({ ...current, [`${group.id}Opacity`]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                    <span className="text-right text-sky-300">{values[`${group.id}Opacity`]}%</span>
                  </label>
                </div>
              )}
            </div>
          );
        }) : <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-gray-400">Road styling is available on vector basemaps.</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Layer opacity</h2>
        {STYLE_CONTROLS.filter((group) => group.id === 'background' || group.id === 'buildings').map((group) => (
          <label key={group.id} className="grid grid-cols-[70px_1fr_38px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[10px] text-gray-400">
            <span className="font-bold uppercase tracking-wide">{group.label}</span>
            <input aria-label={`${group.label} opacity`} type="range" min="0" max="100" step="1" value={values[`${group.id}Opacity`]} onChange={(e) => setValues((current) => ({ ...current, [`${group.id}Opacity`]: Number(e.target.value) }))} className="w-full accent-sky-400" />
            <span className="text-right text-sky-300">{values[`${group.id}Opacity`]}%</span>
          </label>
        ))}
      </section>

      <details className="rounded-xl border border-white/10 bg-white/[0.03]">
        <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Other colors</summary>
        <div className="border-t border-white/10 px-3 py-3 flex flex-col gap-4">
          <ColorPicker label="Background color" color="#0a1628" onChange={(color) => setMapPaint('bg', 'background-color', color)} />
          <ColorPicker label="Buildings" color="#8e7258" onChange={(color) => {
            setMapPaint('building-2d', 'fill-color', color);
            setMapPaint('building-3d', 'fill-extrusion-color', color);
          }} />
          <ColorPicker label="Water bodies" color="#0a1424" onChange={(color) => {
            setMapPaint('water', 'fill-color', color);
            setMapPaint('waterway', 'line-color', color);
          }} />
        </div>
      </details>
    </div>
  );
};
