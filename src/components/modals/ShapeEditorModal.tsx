'use client';

import React from 'react';
import { X, Trash2, Check, RefreshCw } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ColorPicker } from '../toolbar/ColorPicker';
import { fetchMultiPointRoute } from '../../gis/routes';
import { ARCHETYPE_CONFIGS, FACADE_PALETTES } from '../../gis/buildings3d';
import { BuildingArchetype, FacadeTheme, RoofType } from '../../types/gis';

export const ShapeEditorModal: React.FC = () => {
  const {
    activePanels,
    togglePanel,
    selectedId,
    features,
    updateFeature,
    removeFeature,
    setEditMode,
    setSelectedId,
    setToast,
  } = useMapStore();

  if (!activePanels.shapeEditor || !selectedId) return null;
  const f = features.find((x) => x.id === selectedId);
  if (!f) return null;

  const isPolygon = ['polygon', 'rectangle', 'circle', 'polygon3d'].includes(f.kind);
  const isMarker = f.kind === 'marker';
  const isText = f.kind === 'textbox';
  const isRoute = f.kind === 'route';

  const handleRecalculateRoute = async () => {
    if (isRoute && f.props.waypoints) {
      setToast('Recalculating route...');
      const res = await fetchMultiPointRoute(f.props.waypoints, f.props.routeMode);
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
      setToast('Route updated');
    }
  };

  const handleRemoveWaypoint = async (idx: number) => {
    if (isRoute && f.props.waypoints && f.props.waypoints.length > 2) {
      const wp = [...f.props.waypoints];
      wp.splice(idx, 1);
      const res = await fetchMultiPointRoute(wp, f.props.routeMode);
      updateFeature(f.id, (feat) => ({
        ...feat,
        geometry: res.geometry,
        props: {
          ...feat.props,
          waypoints: wp,
          description: res.description,
          metadata: { distance: res.distance, duration: res.duration },
          routingFailed: res.routingFailed,
        },
      }));
    }
  };

  const handleClose = () => {
    togglePanel('shapeEditor', false);
    setSelectedId(null);
    setEditMode(false);
  };

  return (
    <div className="fixed top-16 right-4 z-[998] w-80 max-h-[80vh] overflow-y-auto bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <h3 className="font-bold text-white text-sm">Edit {f.name}</h3>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Name */}
      <div className="flex items-center justify-between">
        <span>Name</span>
        <input
          type="text"
          value={f.name}
          onChange={(e) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              name: e.target.value,
              props: { ...feat.props, attributes: { ...feat.props.attributes, name: e.target.value } },
            }))
          }
          className="w-36 bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-sky-400"
        />
      </div>

      {/* Border Color */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
        <ColorPicker
          label="Border / Stroke Color"
          color={f.props.borderColor || f.props.color || '#e8b84a'}
          onChange={(col) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              props: { ...feat.props, borderColor: col, color: col },
            }))
          }
        />
      </div>

      {/* Border Opacity & Width */}
      <div className="flex items-center justify-between">
        <span>Border Opacity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={f.props.borderOpacity ?? 0.9}
          onChange={(e) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              props: { ...feat.props, borderOpacity: parseFloat(e.target.value) },
            }))
          }
          className="accent-blue-600 w-28 cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Border Width</span>
        <input
          type="range"
          min="1"
          max="16"
          step="1"
          value={f.props.width || 3}
          onChange={(e) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              props: { ...feat.props, width: parseFloat(e.target.value) },
            }))
          }
          className="accent-blue-600 w-28 cursor-pointer"
        />
      </div>

      {/* Fill Color for Polygons */}
      {isPolygon && (
        <>
          <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
            <ColorPicker
              label="Fill Color"
              color={f.props.fillColor || '#e8b84a'}
              onChange={(col) =>
                updateFeature(f.id, (feat) => ({
                  ...feat,
                  props: { ...feat.props, fillColor: col },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Fill Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={f.props.fillOpacity ?? 0.35}
              onChange={(e) =>
                updateFeature(f.id, (feat) => ({
                  ...feat,
                  props: { ...feat.props, fillOpacity: parseFloat(e.target.value) },
                }))
              }
              className="accent-blue-600 w-28 cursor-pointer"
            />
          </div>

          {/* 3D Extrusion & Architectural Building Suite */}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">3D Building</span>
                {((f.props.height || 0) > 0 || !!f.props.is3D) && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-sky-400 border border-blue-400/30">
                    Active
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(f.props.height || 0) > 0 || !!f.props.is3D}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    updateFeature(f.id, (feat) => ({
                      ...feat,
                      kind: enabled ? 'polygon3d' : (feat.kind === 'polygon3d' ? 'polygon' : feat.kind),
                      props: {
                        ...feat.props,
                        is3D: enabled,
                        height: enabled ? (feat.props.height || 35) : 0,
                        buildingArchetype: enabled ? (feat.props.buildingArchetype || 'skyscraper') : undefined,
                        facadeTheme: enabled ? (feat.props.facadeTheme || 'glass') : undefined,
                        floors: enabled ? (feat.props.floors || 10) : undefined,
                      },
                    }));
                  }}
                  className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-[11px] text-sky-400 font-bold">
                  {(f.props.height || 0) > 0 || !!f.props.is3D ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {((f.props.height || 0) > 0 || !!f.props.is3D) && (
              <div className="flex flex-col gap-3 pt-1">
                {/* Architectural Archetype Pills */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Architectural Archetype</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.values(ARCHETYPE_CONFIGS).map((cfg) => {
                      const isSel = (f.props.buildingArchetype || 'skyscraper') === cfg.id;
                      return (
                        <button
                          key={cfg.id}
                          type="button"
                          onClick={() => {
                            const pal = FACADE_PALETTES[cfg.facadeTheme];
                            const totalH = cfg.defaultFloors * cfg.floorHeight;
                            updateFeature(f.id, (feat) => ({
                              ...feat,
                              name: `${cfg.label} ${feat.id}`,
                              props: {
                                ...feat.props,
                                buildingArchetype: cfg.id,
                                facadeTheme: cfg.facadeTheme,
                                floors: cfg.defaultFloors,
                                floorHeight: cfg.floorHeight,
                                height: totalH,
                                roofType: cfg.roofType,
                                hasPodium: cfg.hasPodium,
                                color: pal.wall,
                                fillColor: pal.wall,
                                borderColor: pal.border,
                                fillOpacity: pal.opacity,
                              },
                            }));
                          }}
                          className={`px-2 py-1.5 rounded-xl border text-[10px] font-semibold text-left truncate transition ${
                            isSel
                              ? 'bg-blue-600/30 border-sky-400 text-white shadow'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                          }`}
                        >
                          {cfg.label.split(' ')[0]} {cfg.label.split(' ')[1] || ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Facade Theme Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Facade Theme</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['glass', 'steel', 'concrete', 'brick', 'marble', 'neon'] as FacadeTheme[]).map((thm) => {
                      const pal = FACADE_PALETTES[thm];
                      const isSel = f.props.facadeTheme === thm;
                      return (
                        <button
                          key={thm}
                          type="button"
                          onClick={() => {
                            updateFeature(f.id, (feat) => ({
                              ...feat,
                              props: {
                                ...feat.props,
                                facadeTheme: thm,
                                color: pal.wall,
                                fillColor: pal.wall,
                                borderColor: pal.border,
                                fillOpacity: pal.opacity,
                              },
                            }));
                          }}
                          title={thm}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] capitalize transition ${
                            isSel
                              ? 'border-sky-400 bg-sky-500/20 text-white'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: pal.wall }} />
                          {thm}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Floors Slider */}
                <div className="flex items-center justify-between">
                  <span>Floors / Levels</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={f.props.floors || Math.max(Math.round((f.props.height || 35) / (f.props.floorHeight || 3.5)), 1)}
                      onChange={(e) => {
                        const nextFloors = parseInt(e.target.value, 10);
                        const fh = f.props.floorHeight || 3.5;
                        const nextH = Math.round(nextFloors * fh);
                        updateFeature(f.id, (feat) => ({
                          ...feat,
                          props: { ...feat.props, floors: nextFloors, height: nextH },
                        }));
                      }}
                      className="accent-blue-600 w-24 cursor-pointer"
                    />
                    <span className="font-mono text-xs w-12 text-right text-sky-400 font-bold">
                      {f.props.floors || Math.round((f.props.height || 35) / 3.5)} fl
                    </span>
                  </div>
                </div>

                {/* Total Height Slider */}
                <div className="flex items-center justify-between">
                  <span>Total Height</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="3"
                      max="400"
                      step="1"
                      value={f.props.height || 35}
                      onChange={(e) => {
                        const h = parseFloat(e.target.value);
                        const fl = Math.max(Math.round(h / (f.props.floorHeight || 3.5)), 1);
                        updateFeature(f.id, (feat) => ({
                          ...feat,
                          props: { ...feat.props, height: h, floors: fl },
                        }));
                      }}
                      className="accent-blue-600 w-24 cursor-pointer"
                    />
                    <span className="font-mono text-xs w-12 text-right text-sky-400 font-bold">
                      {f.props.height || 35}m
                    </span>
                  </div>
                </div>

                {/* Base Elevation */}
                <div className="flex items-center justify-between">
                  <span>Base Elevation</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="2"
                      value={f.props.baseHeight || 0}
                      onChange={(e) =>
                        updateFeature(f.id, (feat) => ({
                          ...feat,
                          props: { ...feat.props, baseHeight: parseFloat(e.target.value) },
                        }))
                      }
                      className="accent-blue-600 w-24 cursor-pointer"
                    />
                    <span className="font-mono text-xs w-12 text-right text-gray-400">
                      {f.props.baseHeight || 0}m
                    </span>
                  </div>
                </div>

                {/* Roof Style Selector */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[11px] text-gray-400">Rooftop Feature</span>
                  <select
                    value={f.props.roofType || 'flat'}
                    onChange={(e) => {
                      const rt = e.target.value as RoofType;
                      updateFeature(f.id, (feat) => ({
                        ...feat,
                        props: {
                          ...feat.props,
                          roofType: rt,
                          hasHelipad: rt === 'helipad',
                          hasSpire: rt === 'spire',
                        },
                      }));
                    }}
                    className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-white text-[11px] outline-none"
                  >
                    <option value="flat">Flat Roof</option>
                    <option value="penthouse">Penthouse Crown</option>
                    <option value="helipad">Helipad Deck [H]</option>
                    <option value="spire">Antenna Spire</option>
                    <option value="gable">Gable Pitch</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Marker specifics */}
      {isMarker && (
        <div className="flex items-center justify-between border-t border-white/5 pt-2">
          <span>Icon Size</span>
          <input
            type="range"
            min="0.4"
            max="2.0"
            step="0.1"
            value={f.props.iconSize || 0.9}
            onChange={(e) =>
              updateFeature(f.id, (feat) => ({
                ...feat,
                props: { ...feat.props, iconSize: parseFloat(e.target.value) },
              }))
            }
            className="accent-blue-600 w-28 cursor-pointer"
          />
        </div>
      )}

      {/* Text specifics */}
      {isText && (
        <>
          <div className="flex items-center justify-between border-t border-white/5 pt-2">
            <span>Text Label</span>
            <input
              type="text"
              value={f.props.text || ''}
              onChange={(e) =>
                updateFeature(f.id, (feat) => ({
                  ...feat,
                  props: { ...feat.props, text: e.target.value },
                }))
              }
              className="w-36 bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-white text-xs outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Font Size</span>
            <input
              type="range"
              min="10"
              max="42"
              step="1"
              value={f.props.fontSize || 16}
              onChange={(e) =>
                updateFeature(f.id, (feat) => ({
                  ...feat,
                  props: { ...feat.props, fontSize: parseInt(e.target.value, 10) },
                }))
              }
              className="accent-blue-600 w-28 cursor-pointer"
            />
          </div>
        </>
      )}

      {/* Label display */}
      <div className="flex items-center justify-between border-t border-white/5 pt-2">
        <span>Show On-Map Label</span>
        <input
          type="checkbox"
          checked={!!f.props.showLabel}
          onChange={(e) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              props: { ...feat.props, showLabel: e.target.checked },
            }))
          }
          className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Label Position</span>
        <select
          value={f.props.labelPos || 'center'}
          onChange={(e) =>
            updateFeature(f.id, (feat) => ({
              ...feat,
              props: { ...feat.props, labelPos: e.target.value as any },
            }))
          }
          className="bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-white outline-none"
        >
          <option value="center">Center</option>
          <option value="top">Above</option>
          <option value="bottom">Below</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Route Specifics */}
      {isRoute && (
        <div className="border-t border-white/10 pt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span>Routing Profile</span>
            <select
              value={f.props.routeMode || 'driving'}
              onChange={(e) => {
                const mode = e.target.value as any;
                updateFeature(f.id, (feat) => ({ ...feat, props: { ...feat.props, routeMode: mode } }));
                if (f.props.waypoints) {
                  fetchMultiPointRoute(f.props.waypoints, mode).then((res) => {
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
              }}
              className="bg-black/40 border border-white/15 rounded px-2 py-1 text-white"
            >
              <option value="driving">Driving</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div className="flex items-center justify-between text-sky-400 font-bold">
            <span>Stats</span>
            <span>{f.props.description || '-'}</span>
          </div>

          <span className="text-[10px] font-bold text-gray-400 uppercase">Waypoints</span>
          <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
            {f.props.waypoints?.map((pt, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1 rounded bg-white/5 text-[10px]"
              >
                <span>
                  Pt {i + 1}: {pt[1].toFixed(4)}, {pt[0].toFixed(4)}
                </span>
                {f.props.waypoints && f.props.waypoints.length > 2 && (
                  <button
                    onClick={() => handleRemoveWaypoint(i)}
                    className="p-0.5 rounded text-rose-400 hover:bg-rose-500/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleRecalculateRoute}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Route</span>
          </button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
        <button
          onClick={() => {
            removeFeature(f.id);
            handleClose();
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <button
          onClick={handleClose}
          className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-500/20"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
