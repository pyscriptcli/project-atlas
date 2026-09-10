'use client';

import React from 'react';
import { X, Trash2, Check, RefreshCw } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ColorPicker } from '../toolbar/ColorPicker';
import { fetchMultiPointRoute } from '../../gis/routes';

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

          {/* 3D Extrusion Section */}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">3D Extrusion</span>
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
              <>
                <div className="flex items-center justify-between">
                  <span>Height (meters)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="300"
                      step="5"
                      value={f.props.height || 35}
                      onChange={(e) =>
                        updateFeature(f.id, (feat) => ({
                          ...feat,
                          props: { ...feat.props, height: parseFloat(e.target.value) },
                        }))
                      }
                      className="accent-blue-600 w-24 cursor-pointer"
                    />
                    <span className="font-mono text-xs w-10 text-right text-sky-400 font-bold">
                      {f.props.height || 35}m
                    </span>
                  </div>
                </div>

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
                    <span className="font-mono text-xs w-10 text-right text-gray-400">
                      {f.props.baseHeight || 0}m
                    </span>
                  </div>
                </div>
              </>
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
