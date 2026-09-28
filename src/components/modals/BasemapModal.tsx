'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Palette, X } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ALL_STYLES } from '../../gis/map';
import { ColorPicker } from '../toolbar/ColorPicker';

interface BasemapModalProps {
  mapInstance: any;
}

const STYLE_CONTROLS = [
  { id: 'expressways', label: 'Expressways', layers: [{ id: 'case_express_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_express', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'mainRoads', label: 'Main roads', layers: [{ id: 'case_major_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_major', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'secondaryRoads', label: 'Secondary roads', layers: [{ id: 'case_secondary_casing', width: 'line-width', opacity: 'line-opacity' }, { id: 'rd_secondary', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'railways', label: 'Railways', layers: [{ id: 'rd_rail', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'boundaries', label: 'Boundaries', layers: [{ id: 'bound_prov', width: 'line-width', opacity: 'line-opacity' }, { id: 'bound_city', width: 'line-width', opacity: 'line-opacity' }, { id: 'bound_brgy', width: 'line-width', opacity: 'line-opacity' }], thickness: true, opacity: true },
  { id: 'background', label: 'Background', layers: [{ id: 'bg', opacity: 'background-opacity' }], thickness: false, opacity: true },
  { id: 'buildings', label: 'Buildings', layers: [{ id: 'building-2d', opacity: 'fill-opacity' }, { id: 'building-3d', opacity: 'fill-extrusion-opacity' }], thickness: false, opacity: true },
] as const;

const INITIAL_VALUES = Object.fromEntries(
  STYLE_CONTROLS.flatMap(({ id, thickness, opacity }) => [
    ...(thickness ? [[`${id}Thickness`, 100]] : []),
    ...(opacity ? [[`${id}Opacity`, 100]] : []),
  ])
) as Record<string, number>;

export const BasemapModal: React.FC<BasemapModalProps> = ({ mapInstance }) => {
  const { activePanels, togglePanel, currentBasemap, setBasemap } = useMapStore();
  const [values, setValues] = useState(INITIAL_VALUES);
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
    for (const group of STYLE_CONTROLS) {
      for (const layer of group.layers) {
        if (!mapInstance.getLayer(layer.id)) continue;
        const paint: Record<string, any> = {};
        if ('width' in layer) paint[layer.width] = mapInstance.getPaintProperty(layer.id, layer.width);
        if ('opacity' in layer) paint[layer.opacity] = mapInstance.getPaintProperty(layer.id, layer.opacity) ?? 1;
        basePaint.set(layer.id, paint);
      }
    }
    basePaintRef.current = basePaint;
    setStyleVersion((version) => version + 1);
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance?.isStyleLoaded?.()) return;
    for (const group of STYLE_CONTROLS) {
      for (const layer of group.layers) {
        const base = basePaintRef.current.get(layer.id);
        if (!base || !mapInstance.getLayer(layer.id)) continue;
        if ('width' in layer && base[layer.width] != null) {
          mapInstance.setPaintProperty(layer.id, layer.width, ['*', base[layer.width], values[`${group.id}Thickness`] / 100]);
        }
        if ('opacity' in layer && base[layer.opacity] != null) {
          mapInstance.setPaintProperty(layer.id, layer.opacity, ['*', base[layer.opacity], values[`${group.id}Opacity`] / 100]);
        }
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

      {/* Per-feature style controls */}
      <div className="border-t border-white/10 pt-3 flex flex-col gap-2.5">
        {STYLE_CONTROLS.map((group) => (
          <div key={group.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{group.label}</span>
            {group.thickness && (
              <label className="grid grid-cols-[68px_1fr_38px] items-center gap-2 text-[10px] text-gray-400">
                <span>Thickness</span>
                <input aria-label={`${group.label} thickness`} type="range" min="50" max="250" step="10" value={values[`${group.id}Thickness`]} onChange={(e) => setValues((current) => ({ ...current, [`${group.id}Thickness`]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                <span className="text-right text-sky-300">{(values[`${group.id}Thickness`] / 100).toFixed(1)}×</span>
              </label>
            )}
            {group.opacity && (
              <label className="grid grid-cols-[68px_1fr_38px] items-center gap-2 text-[10px] text-gray-400">
                <span>Opacity</span>
                <input aria-label={`${group.label} opacity`} type="range" min="0" max="100" step="1" value={values[`${group.id}Opacity`]} onChange={(e) => setValues((current) => ({ ...current, [`${group.id}Opacity`]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                <span className="text-right text-sky-300">{values[`${group.id}Opacity`]}%</span>
              </label>
            )}
          </div>
        ))}

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
