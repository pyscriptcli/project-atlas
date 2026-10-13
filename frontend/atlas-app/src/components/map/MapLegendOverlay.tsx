'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, ListFilter } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { CATEGORY_COLORS } from '../../gis/tradeArea';

const formatCategoryLabel = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const MapLegendOverlay: React.FC = () => {
  const {
    features,
    setFeatures,
    visibilities,
    openNodeDisplayMode,
    activePanels,
  } = useMapStore();

  const [collapsed, setCollapsed] = useState(false);

  const poiCategories = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; color: string; total: number; visibleCount: number }
    >();

    features.forEach((f) => {
      if (f.props?.managedBy !== 'open-node' && !f.props?.category && !f.props?.amenityGroupLabel) {
        return;
      }
      if (f.kind !== 'marker') return;
      const key = f.props?.amenityGroupLabel || f.props?.category || 'Uncategorized';
      const color =
        f.props?.color ||
        CATEGORY_COLORS[key] ||
        CATEGORY_COLORS[f.props?.category || ''] ||
        '#38bdf8';
      const existing = map.get(key);
      const isVisible = f.props?.visible !== 0;
      if (existing) {
        existing.total += 1;
        if (isVisible) existing.visibleCount += 1;
      } else {
        map.set(key, {
          key,
          label: formatCategoryLabel(key),
          color,
          total: 1,
          visibleCount: isVisible ? 1 : 0,
        });
      }
    });

    return Array.from(map.values());
  }, [features]);

  const drawnFeatureSummary = useMemo(() => {
    let polygons = 0;
    let routes = 0;
    let buildings3d = 0;
    let pins = 0;

    features.forEach((f) => {
      if (f.props?.visible === 0) return;
      if (f.props?.managedBy === 'open-node' || f.props?.category || f.props?.amenityGroupLabel) {
        return;
      }
      if (f.kind === 'polygon3d') buildings3d += 1;
      else if (f.kind === 'route' || f.kind === 'polyline') routes += 1;
      else if (f.kind === 'polygon' || f.kind === 'rectangle' || f.kind === 'circle') polygons += 1;
      else if (f.kind === 'marker') pins += 1;
    });

    const items: Array<{ label: string; count: number; color: string; dashed?: boolean }> = [];
    if (polygons > 0) items.push({ label: 'Polygons & Boundaries', count: polygons, color: '#ff1e1e' });
    if (routes > 0) items.push({ label: 'Routes & Lines', count: routes, color: '#38bdf8' });
    if (buildings3d > 0) items.push({ label: '3D Extrusions', count: buildings3d, color: '#f59e0b' });
    if (pins > 0) items.push({ label: 'Custom Pins', count: pins, color: '#60a5fa' });
    return items;
  }, [features]);

  const activeAdminBoundaries = useMemo(() => {
    const list: string[] = [];
    if (visibilities.bound_prov) list.push('Provinces');
    if (visibilities.bound_city) list.push('Cities');
    if (visibilities.bound_brgy) list.push('Barangays');
    return list;
  }, [visibilities.bound_prov, visibilities.bound_city, visibilities.bound_brgy]);

  const hasLegendContent =
    poiCategories.length > 0 || drawnFeatureSummary.length > 0;

  if (!hasLegendContent) return null;

  const toggleCategoryVisibility = (categoryKey: string) => {
    const target = poiCategories.find((c) => c.key === categoryKey);
    if (!target) return;
    const nextVisible = target.visibleCount > 0 ? 0 : 1;
    setFeatures(
      features.map((f) => {
        const key = f.props?.amenityGroupLabel || f.props?.category || 'Uncategorized';
        if (
          f.kind === 'marker' &&
          (f.props?.managedBy === 'open-node' || f.props?.category || f.props?.amenityGroupLabel) &&
          key === categoryKey
        ) {
          return { ...f, props: { ...f.props, visible: nextVisible } };
        }
        return f;
      })
    );
  };

  const leftOffsetClass = activePanels.tradeArea
    ? 'left-4 lg:left-[31.5rem]'
    : activePanels.browser || activePanels.myLayers
      ? 'left-4 lg:left-[25.5rem]'
      : 'left-4';

  return (
    <aside
      aria-label="Map Legend"
      className={`fixed bottom-4 ${leftOffsetClass} z-[985] w-64 max-w-[calc(100vw-2rem)] bg-zinc-950/90 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-xs text-zinc-200 select-none transition-all duration-200`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left font-semibold text-white hover:bg-white/5 rounded-2xl transition"
      >
        <span className="flex items-center gap-2 text-xs">
          <ListFilter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Map Legend</span>
        </span>
        {collapsed ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-3.5 pb-3 pt-1 border-t border-white/10 space-y-2.5 max-h-64 overflow-y-auto">
          {poiCategories.length > 0 && openNodeDisplayMode === 'heatmap' && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-zinc-300">POI Heatmap Density</div>
              <div
                className="h-2 w-full rounded-full"
                style={{
                  background:
                    'linear-gradient(to right, #22d3ee 0%, #a3e635 40%, #facc15 70%, #ef4444 100%)',
                }}
              />
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          )}

          {poiCategories.length > 0 && openNodeDisplayMode === 'clusters' && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-zinc-300">Cluster Count</div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white inline-block" />
                  <span>&lt;10</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white inline-block" />
                  <span>10–29</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-white inline-block" />
                  <span>30+</span>
                </span>
              </div>
            </div>
          )}

          {poiCategories.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-zinc-400">Categories</div>
              <div className="space-y-1">
                {poiCategories.map((cat) => {
                  const isShown = cat.visibleCount > 0;
                  return (
                    <button
                      type="button"
                      key={cat.key}
                      onClick={() => toggleCategoryVisibility(cat.key)}
                      title={isShown ? `Hide ${cat.label}` : `Show ${cat.label}`}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition hover:bg-white/10 ${
                        isShown ? 'text-zinc-100' : 'text-zinc-500 opacity-60'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/25"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate text-[11px] font-medium">{cat.label}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-zinc-400">
                        <span>{cat.total}</span>
                        {isShown ? (
                          <Eye className="w-3 h-3 text-zinc-400" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-zinc-500" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {drawnFeatureSummary.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/10">
              <div className="text-[11px] font-semibold text-zinc-400">Map Features</div>
              {drawnFeatureSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 px-2 py-0.5 text-[11px]"
                >
                  <span className="flex items-center gap-2 truncate text-zinc-200">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-mono text-zinc-400">{item.count}</span>
                </div>
              ))}
            </div>
          )}

          {activeAdminBoundaries.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 px-2 text-[11px] text-zinc-300">
              <span className="flex items-center gap-2 truncate">
                <span className="w-3 h-0 border-t-2 border-dashed border-red-500 shrink-0" />
                <span className="truncate">Admin: {activeAdminBoundaries.join(', ')}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
