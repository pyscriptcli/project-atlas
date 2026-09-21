'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Trash2,
  Check,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Search,
  Globe,
  Shield,
  Hexagon,
  Circle,
  Square,
  MapPin,
  Tag,
  Store,
  Layers,
  Palette,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { ColorPicker } from '../toolbar/ColorPicker';
import { fetchMultiPointRoute } from '../../gis/routes';
import { ARCHETYPE_CONFIGS, FACADE_PALETTES } from '../../gis/buildings3d';
import { BuildingArchetype, FacadeTheme, RoofType, MarkerShape } from '../../types/gis';
import {
  SHAPE_OPTIONS,
  ICON_SVGS,
  VICINITY_PRESET_LOGOS,
  renderUniformLogoMarker,
  VicinityPresetLogo,
} from '../../gis/markers';

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

  // Vicinity Logo & Shape Customization State
  const [markerSubTab, setMarkerSubTab] = useState<'shapes' | 'logos'>(
    f.props.shape === 'vicinity-logo' ? 'logos' : 'shapes'
  );
  const [shapeCategory, setShapeCategory] = useState<string>('All');
  const [logoCategory, setLogoCategory] = useState<string>('All');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(f.props.logoUrl || '');
  const [monogramInput, setMonogramInput] = useState<string>(f.props.logoText || '');
  const [logoFrame, setLogoFrame] = useState<'circle' | 'squircle' | 'hexagon' | 'pin-badge'>(
    f.props.logoFrame || 'circle'
  );
  const [logoBg, setLogoBg] = useState<string>(f.props.logoBg || '#ffffff');
  const [logoBorder, setLogoBorder] = useState<string>(f.props.logoBorder || '#ffffff');
  const [logoScale, setLogoScale] = useState<number>(f.props.logoScale || 0.72);
  const [isRenderingLogo, setIsRenderingLogo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyPresetLogo = async (preset: VicinityPresetLogo) => {
    setIsRenderingLogo(true);
    setToast(`Formatting symmetric ${preset.name} badge...`);
    try {
      const map = (window as any).__map;
      const { key, dataUrl } = await renderUniformLogoMarker(
        {
          logoUrl: preset.logoUrl,
          monogramText: preset.monogram,
          frame: logoFrame,
          bg: logoBg,
          border: logoBorder,
          scale: logoScale,
          color: preset.color,
        },
        map
      );

      updateFeature(f.id, (feat) => ({
        ...feat,
        name: preset.name,
        props: {
          ...feat.props,
          shape: 'vicinity-logo',
          iconKey: key,
          customImageDataUrl: dataUrl,
          logoUrl: preset.logoUrl,
          logoFrame,
          logoBg,
          logoBorder,
          logoText: preset.monogram,
          logoScale,
          color: preset.color,
          borderColor: preset.border,
        },
      }));
      setToast(`Applied ${preset.name} uniform badge!`);
    } catch (err) {
      console.error(err);
      setToast('Failed to format logo');
    } finally {
      setIsRenderingLogo(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customLogoUrl.trim()) return;
    setIsRenderingLogo(true);
    setToast('Generating symmetric logo badge from URL...');
    try {
      const map = (window as any).__map;
      const { key, dataUrl } = await renderUniformLogoMarker(
        {
          logoUrl: customLogoUrl.trim(),
          monogramText: 'POI',
          frame: logoFrame,
          bg: logoBg,
          border: logoBorder,
          scale: logoScale,
        },
        map
      );

      updateFeature(f.id, (feat) => ({
        ...feat,
        props: {
          ...feat.props,
          shape: 'vicinity-logo',
          iconKey: key,
          customImageDataUrl: dataUrl,
          logoUrl: customLogoUrl.trim(),
          logoFrame,
          logoBg,
          logoBorder,
          logoScale,
        },
      }));
      setToast('Applied custom logo badge!');
      setCustomLogoUrl('');
    } catch (err) {
      console.error(err);
      setToast('Could not load logo from URL');
    } finally {
      setIsRenderingLogo(false);
    }
  };

  const handleApplyMonogram = async () => {
    if (!monogramInput.trim()) return;
    setIsRenderingLogo(true);
    setToast('Generating monogram logo badge...');
    try {
      const map = (window as any).__map;
      const { key, dataUrl } = await renderUniformLogoMarker(
        {
          monogramText: monogramInput.trim().toUpperCase(),
          frame: logoFrame,
          bg: logoBg,
          border: logoBorder,
          scale: logoScale,
          color: f.props.color || '#003366',
        },
        map
      );

      updateFeature(f.id, (feat) => ({
        ...feat,
        props: {
          ...feat.props,
          shape: 'vicinity-logo',
          iconKey: key,
          customImageDataUrl: dataUrl,
          logoText: monogramInput.trim().toUpperCase(),
          logoFrame,
          logoBg,
          logoBorder,
          logoScale,
        },
      }));
      setToast(`Generated ${monogramInput.trim().toUpperCase()} monogram badge!`);
      setMonogramInput('');
    } catch (err) {
      console.error(err);
      setToast('Failed to generate monogram');
    } finally {
      setIsRenderingLogo(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setIsRenderingLogo(true);
      setToast('Formatting symmetric badge from uploaded logo...');
      try {
        const map = (window as any).__map;
        const { key, dataUrl } = await renderUniformLogoMarker(
          {
            logoUrl: result,
            monogramText: 'LOGO',
            frame: logoFrame,
            bg: logoBg,
            border: logoBorder,
            scale: logoScale,
          },
          map
        );

        updateFeature(f.id, (feat) => ({
          ...feat,
          name: file.name.split('.')[0] || feat.name,
          props: {
            ...feat.props,
            shape: 'vicinity-logo',
            iconKey: key,
            customImageDataUrl: dataUrl,
            logoUrl: result,
            logoFrame,
            logoBg,
            logoBorder,
            logoScale,
          },
        }));
        setToast('Uniform logo badge placed!');
      } catch (err) {
        console.error(err);
        setToast('Failed to format uploaded logo');
      } finally {
        setIsRenderingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

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
    <div className="fixed top-16 right-4 z-[998] w-88 sm:w-[380px] max-h-[85vh] overflow-y-auto bg-[#0c1322] border border-white/20 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl flex flex-col gap-3 text-xs text-gray-300 animate-in fade-in slide-in-from-top-4 select-none">
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

      {/* Marker Color (if marker) or Border Color (for polygons/lines) */}
      {isMarker ? (
        <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
          <ColorPicker
            label="Marker Color"
            color={f.props.color || f.props.borderColor || '#1e40af'}
            onChange={(col) =>
              updateFeature(f.id, (feat) => {
                const shp = feat.props.shape || 'pin';
                const clean = (col || '#1e40af').replace('#', '');
                return {
                  ...feat,
                  props: {
                    ...feat.props,
                    color: col,
                    borderColor: col,
                    iconKey: `ico_${shp}_${clean}`,
                  },
                };
              })
            }
          />
        </div>
      ) : (
        <>
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
        </>
      )}

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
        <div className="border-t border-white/10 pt-2.5 flex flex-col gap-2.5">
          {/* Sub-tab switcher: Shapes & Icons vs Vicinity Logo Studio */}
          <div className="flex rounded-xl p-1 bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setMarkerSubTab('shapes')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                markerSubTab === 'shapes'
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Shapes &amp; Icons</span>
            </button>
            <button
              type="button"
              onClick={() => setMarkerSubTab('logos')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                markerSubTab === 'logos'
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Vicinity Logos</span>
            </button>
          </div>

          {markerSubTab === 'shapes' ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                {['All', 'Pins & Needles', '3D Pinballs', 'Geometric Badges', 'Beacons & Targets', 'Symbols'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setShapeCategory(cat)}
                    className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition ${
                      shapeCategory === cat
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Shape Grid */}
              <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {SHAPE_OPTIONS
                  .filter((shp) => shapeCategory === 'All' || shp.category === shapeCategory)
                  .map((shp) => {
                    const isSel = (f.props.shape || 'pin') === shp.id;
                    const svgHtml = ICON_SVGS[shp.id] || ICON_SVGS.pin;
                    return (
                      <button
                        key={shp.id}
                        type="button"
                        onClick={() =>
                          updateFeature(f.id, (feat) => {
                            const clean = (feat.props.color || '#1e40af').replace('#', '');
                            return {
                              ...feat,
                              props: {
                                ...feat.props,
                                shape: shp.id,
                                iconKey: `ico_${shp.id}_${clean}`,
                                customImageDataUrl: undefined,
                              },
                            };
                          })
                        }
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${
                          isSel
                            ? 'bg-white/15 border-white text-white shadow'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                        title={shp.label}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={isSel ? (f.props.color || '#ffffff') : 'currentColor'}
                          stroke={isSel ? '#ffffff' : 'currentColor'}
                          strokeWidth="1.5"
                          className="w-5 h-5 mb-1"
                          dangerouslySetInnerHTML={{ __html: svgHtml }}
                        />
                        <span className="text-[9px] font-medium truncate w-full text-center">
                          {shp.label}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span>Icon Size</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={f.props.iconSize || 0.9}
                    onChange={(e) =>
                      updateFeature(f.id, (feat) => ({
                        ...feat,
                        props: { ...feat.props, iconSize: parseFloat(e.target.value) },
                      }))
                    }
                    className="accent-blue-600 w-24 cursor-pointer"
                  />
                  <span className="font-mono text-xs w-10 text-right text-white font-bold">
                    {(f.props.iconSize || 0.9).toFixed(1)}x
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* VICINITY LOGO STUDIO */
            <div className="flex flex-col gap-3">
              {/* Badge Housing & Uniformity Controls */}
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-white uppercase tracking-wider">
                    Symmetric Housing Frame
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                    Uniform Geometry
                  </span>
                </div>

                {/* Frame Shape Toggle */}
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {[
                    { id: 'circle', label: 'Circle Disc' },
                    { id: 'squircle', label: 'Squircle' },
                    { id: 'hexagon', label: 'Hexagon' },
                    { id: 'pin-badge', label: 'Pin Stalk' },
                  ].map((fm) => (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() => {
                        setLogoFrame(fm.id as any);
                        if (f.props.shape === 'vicinity-logo') {
                          renderUniformLogoMarker(
                            {
                              logoUrl: f.props.logoUrl,
                              monogramText: f.props.logoText,
                              frame: fm.id as any,
                              bg: logoBg,
                              border: logoBorder,
                              scale: logoScale,
                              color: f.props.color,
                            },
                            (window as any).__map
                          ).then(({ key, dataUrl }) => {
                            updateFeature(f.id, (feat) => ({
                              ...feat,
                              props: {
                                ...feat.props,
                                iconKey: key,
                                customImageDataUrl: dataUrl,
                                logoFrame: fm.id as any,
                              },
                            }));
                          });
                        }
                      }}
                      className={`py-1 rounded-lg border text-center transition ${
                        logoFrame === fm.id
                          ? 'bg-white text-black font-bold border-white'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      {fm.label}
                    </button>
                  ))}
                </div>

                {/* Frame Background & Border */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-zinc-400">Badge Background</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { col: '#ffffff', label: 'White' },
                      { col: '#0c1322', label: 'Dark' },
                      { col: '#00205b', label: 'Navy' },
                      { col: '#da291c', label: 'Red' },
                    ].map((b) => (
                      <button
                        key={b.col}
                        type="button"
                        onClick={() => {
                          setLogoBg(b.col);
                          setLogoBorder(b.col === '#ffffff' ? '#ffffff' : '#ffffff');
                        }}
                        className={`w-4 h-4 rounded-full border ${
                          logoBg === b.col ? 'ring-2 ring-white scale-110' : 'border-white/30'
                        }`}
                        style={{ backgroundColor: b.col }}
                        title={b.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Inner Padding / Scale */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Logo Scale (Fit)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="0.85"
                      step="0.05"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                      className="accent-blue-600 w-20 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white w-7 text-right">
                      {Math.round(logoScale * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 1-Click Popular Brand Logo Presets */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Popular Brand Catalogs</span>
                  <span className="text-[10px] text-zinc-400">1-Click Apply</span>
                </div>

                {/* Brand Category Filter */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9.5px] no-scrollbar">
                  {['All', 'Cafe & Dining', 'Retail & Malls', 'Banking', 'Fuel & Transit', 'Convenience'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLogoCategory(cat)}
                      className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition ${
                        logoCategory === cat
                          ? 'bg-white text-black border-white font-bold'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid of Brand Logos */}
                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {VICINITY_PRESET_LOGOS
                    .filter((p) => logoCategory === 'All' || p.category === logoCategory)
                    .map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPresetLogo(preset)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 flex flex-col items-center justify-center gap-1 transition group active:scale-95"
                        title={`${preset.name} (${preset.category})`}
                      >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow-sm overflow-hidden group-hover:scale-105 transition">
                          {preset.logoUrl ? (
                            <img
                              src={preset.logoUrl}
                              alt={preset.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="font-black text-[10px] text-zinc-900">{preset.monogram}</span>
                          )}
                        </div>
                        <span className="text-[8.5px] text-zinc-300 truncate w-full text-center font-medium">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Custom Logo Upload & Monogram Input */}
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[10.5px] font-bold text-white uppercase tracking-wider block">
                  Custom Logo Ingestion
                </span>

                {/* File Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo Image (PNG / SVG)</span>
                </button>

                {/* Monogram / Brand Acronym Generator */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Monogram (e.g. PRIME, BDO, HQ)"
                    value={monogramInput}
                    maxLength={5}
                    onChange={(e) => setMonogramInput(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyMonogram}
                    className="px-2.5 py-1 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition"
                  >
                    Generate
                  </button>
                </div>

                {/* Direct Image URL */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    placeholder="Paste Logo Image URL"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Logo Marker Size */}
              <div className="flex items-center justify-between pt-1">
                <span>Marker Badge Size</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={f.props.iconSize || 1.0}
                    onChange={(e) =>
                      updateFeature(f.id, (feat) => ({
                        ...feat,
                        props: { ...feat.props, iconSize: parseFloat(e.target.value) },
                      }))
                    }
                    className="accent-blue-600 w-24 cursor-pointer"
                  />
                  <span className="font-mono text-xs w-10 text-right text-white font-bold">
                    {(f.props.iconSize || 1.0).toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>
          )}
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
