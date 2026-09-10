'use client';

import React, { useState } from 'react';
import {
  FolderTree,
  X,
  Plus,
  Eye,
  EyeOff,
  CheckSquare,
  ChevronRight,
  ChevronDown,
  Trash2,
  Table,
  Maximize2,
  Palette,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { calcBounds } from '../../gis/polygons';
import { bulkStyleGroupMarkers, moveFeatureToGroup, reorderFeatures } from '../../gis/layers';
import { GISFeature } from '../../types/gis';

interface MyLayersPanelProps {
  mapInstance: any;
}

export const MyLayersPanel: React.FC<MyLayersPanelProps> = ({ mapInstance }) => {
  const {
    activePanels,
    togglePanel,
    features,
    setFeatures,
    customGroups,
    setCustomGroups,
    selectedLayerIds,
    toggleLayerSelection,
    selectAllLayers,
    clearLayerSelection,
    removeFeature,
    updateFeature,
    setSelectedId,
    setToast,
  } = useMapStore();

  const [stylingGroupId, setStylingGroupId] = useState<string | null>(null);
  const [bulkColor, setBulkColor] = useState('#003366');
  const [bulkShape, setBulkShape] = useState('');
  const [bulkSize, setBulkSize] = useState(0.9);

  if (!activePanels.myLayers) return null;

  const handleAddGroup = () => {
    const name = prompt('Enter group name:', `Group ${Object.keys(customGroups).length + 1}`);
    if (name && name.trim() && !customGroups[name.trim()]) {
      setCustomGroups({
        ...customGroups,
        [name.trim()]: { collapsed: false, ids: [] },
      });
    }
  };

  const handleToggleGroupCollapse = (gName: string) => {
    setCustomGroups({
      ...customGroups,
      [gName]: {
        ...customGroups[gName],
        collapsed: !customGroups[gName].collapsed,
      },
    });
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    if (!newName || newName === oldName || customGroups[newName]) return;
    const next = { ...customGroups };
    next[newName] = next[oldName];
    delete next[oldName];
    setCustomGroups(next);
  };

  const handleDeleteGroup = (gName: string) => {
    const next = { ...customGroups };
    delete next[gName];
    setCustomGroups(next);
  };

  const handleToggleGroupEye = (gName: string) => {
    const ids = customGroups[gName]?.ids || [];
    const anyVisible = features.some((f) => ids.includes(f.id) && f.props.visible !== 0);
    const newVis = anyVisible ? 0 : 1;

    setFeatures(
      features.map((f) => (ids.includes(f.id) ? { ...f, props: { ...f.props, visible: newVis } } : f))
    );
  };

  const handleBulkStyleApply = (gName: string) => {
    const ids = customGroups[gName]?.ids || [];
    setFeatures(bulkStyleGroupMarkers(features, ids, bulkColor, bulkShape || undefined, bulkSize));
    setStylingGroupId(null);
    setToast(`Styling applied to "${gName}"`);
  };

  const handleZoomTo = (f: GISFeature) => {
    if (!mapInstance) return;
    const b = calcBounds(f);
    if (b) {
      mapInstance.fitBounds(b, { padding: 60, maxZoom: 18 });
    }
  };

  const handleBulkHideUnhide = () => {
    if (!selectedLayerIds.length) {
      setToast('Select at least one layer');
      return;
    }
    const allHidden = selectedLayerIds.every((id) => {
      const f = features.find((x) => x.id === id);
      return f && f.props.visible === 0;
    });
    const newVis = allHidden ? 1 : 0;
    setFeatures(
      features.map((f) =>
        selectedLayerIds.includes(f.id) ? { ...f, props: { ...f.props, visible: newVis } } : f
      )
    );
    setToast(allHidden ? 'Selected layers shown' : 'Selected layers hidden');
  };

  const handleBulkDeleteSelected = () => {
    if (!selectedLayerIds.length) return;
    const count = selectedLayerIds.length;
    const remaining = features.filter((f) => !selectedLayerIds.includes(f.id));
    setFeatures(remaining);
    clearLayerSelection();
    setToast(`Deleted ${count} selected layer(s)`);
  };

  // Grouped vs Ungrouped
  const groupedIds = new Set<number>();
  Object.values(customGroups).forEach((g) => g.ids.forEach((id) => groupedIds.add(id)));
  const ungroupedFeats = features.filter((f) => !groupedIds.has(f.id));

  const renderLayerCard = (f: GISFeature) => {
    const isSelected = selectedLayerIds.includes(f.id);
    let subInfo: string = f.kind;
    if (f.kind === 'circle' && f.props.radiusMeters) {
      subInfo = `Radius: ${
        f.props.radiusMeters > 1000
          ? (f.props.radiusMeters / 1000).toFixed(2) + ' km'
          : Math.round(f.props.radiusMeters) + ' m'
      }`;
    } else if (f.kind === 'route' && f.props.description) {
      subInfo = f.props.description;
    }

    return (
      <div
        key={f.id}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(f.id))}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (draggedId && draggedId !== f.id) {
            setFeatures(reorderFeatures(features, draggedId, f.id));
          }
        }}
        className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing hover:border-white/20 transition"
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleLayerSelection(f.id)}
            className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
          />
          <input
            value={f.name}
            onChange={(e) =>
              updateFeature(f.id, (feat) => ({
                ...feat,
                name: e.target.value,
                props: { ...feat.props, attributes: { ...feat.props.attributes, name: e.target.value } },
              }))
            }
            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-white px-1 py-0.5 rounded border border-transparent focus:border-sky-400 focus:bg-black/40 outline-none truncate"
          />

          <button
            onClick={() => {
              setSelectedId(f.id);
              togglePanel('attributeTable', true);
            }}
            title="Attributes"
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              updateFeature(f.id, (feat) => ({
                ...feat,
                props: { ...feat.props, visible: feat.props.visible === 0 ? 1 : 0 },
              }))
            }
            title="Toggle Visibility"
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
          >
            {f.props.visible === 0 ? (
              <EyeOff className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>
          <button
            onClick={() => handleZoomTo(f)}
            title="Zoom To"
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeFeature(f.id)}
            title="Delete"
            className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
          <span className="truncate max-w-[120px]">{subInfo}</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={!!f.props.showLabel}
                onChange={(e) =>
                  updateFeature(f.id, (feat) => ({
                    ...feat,
                    props: { ...feat.props, showLabel: e.target.checked },
                  }))
                }
                className="w-3 h-3 accent-blue-600 rounded"
              />
              <span>Label</span>
            </label>
            <select
              value={f.props.labelPos || 'center'}
              onChange={(e) =>
                updateFeature(f.id, (feat) => ({
                  ...feat,
                  props: { ...feat.props, labelPos: e.target.value as any },
                }))
              }
              className="bg-black/40 border border-white/10 rounded px-1 text-[9px] text-zinc-300 outline-none"
            >
              <option value="center">center</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
              <option value="left">left</option>
              <option value="right">right</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-16 left-4 bottom-4 w-96 z-[999] bg-black/85 border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden text-xs text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <FolderTree className="w-4 h-4 text-white" />
          <span>My Layers</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white font-semibold">
            {features.length}
          </span>
        </div>
        <button
          onClick={() => togglePanel('myLayers', false)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Global Action Bar */}
      <div className="flex items-center justify-between py-2 border-b border-white/10 text-[11px]">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllLayers}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition font-medium"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Select All</span>
          </button>
          {selectedLayerIds.length > 0 && (
            <button
              onClick={handleBulkDeleteSelected}
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/20 rounded-lg flex items-center gap-1 text-[10px] transition shadow-sm font-semibold"
              title={`Delete ${selectedLayerIds.length} selected layer(s)`}
            >
              <Trash2 className="w-3 h-3 text-zinc-300" />
              <span>Delete ({selectedLayerIds.length})</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddGroup}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold flex items-center gap-1 text-[10px] transition border border-white/10"
          >
            <Plus className="w-3 h-3" />
            <span>GROUP</span>
          </button>
          <button
            onClick={handleBulkHideUnhide}
            className="px-2 py-1 bg-black/60 hover:bg-zinc-800 border border-white/10 rounded-lg text-zinc-300 text-[10px] transition"
          >
            Hide/Unhide
          </button>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto pr-1 py-2 flex flex-col gap-3">
        {/* Custom Groups */}
        {Object.entries(customGroups).map(([gName, grp]) => {
          const groupFeats = features.filter((f) => grp.ids.includes(f.id));
          const isStylingOpen = stylingGroupId === gName;

          return (
            <div
              key={gName}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (id) {
                  setCustomGroups(moveFeatureToGroup(customGroups, id, gName));
                  setToast(`Moved to "${gName}"`);
                }
              }}
              className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleGroupCollapse(gName)}
                    className="text-gray-400 hover:text-white"
                  >
                    {grp.collapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    value={gName}
                    onChange={(e) => handleRenameGroup(gName, e.target.value)}
                    className="bg-transparent font-bold text-xs text-white outline-none w-28"
                  />
                  <span className="text-[10px] text-gray-500">({groupFeats.length})</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStylingGroupId(isStylingOpen ? null : gName)}
                    title="Bulk Style Group"
                    className={`p-1 rounded hover:bg-white/10 ${
                      isStylingOpen ? 'text-sky-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleGroupEye(gName)}
                    title="Toggle Group Visibility"
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(gName)}
                    title="Delete Group"
                    className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bulk Styling Flyout */}
              {isStylingOpen && (
                <div className="p-3 bg-black/40 border-t border-white/10 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Bulk Apply To Group Markers
                  </span>
                  <div className="flex items-center justify-between">
                    <span>Color</span>
                    <input
                      type="color"
                      value={bulkColor}
                      onChange={(e) => setBulkColor(e.target.value)}
                      className="w-6 h-6 rounded bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shape</span>
                    <select
                      value={bulkShape}
                      onChange={(e) => setBulkShape(e.target.value)}
                      className="bg-black/60 border border-white/15 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">-- Keep Current --</option>
                      <option value="pin">Pin</option>
                      <option value="star">Star</option>
                      <option value="circle">Circle</option>
                      <option value="square">Square</option>
                      <option value="flag">Flag</option>
                      <option value="heart">Heart</option>
                      <option value="pinball">Pinball</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Size</span>
                    <input
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.1"
                      value={bulkSize}
                      onChange={(e) => setBulkSize(parseFloat(e.target.value))}
                      className="accent-blue-600 w-24 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => handleBulkStyleApply(gName)}
                    className="mt-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-center"
                  >
                    Apply Styling
                  </button>
                </div>
              )}

              {/* Group Items */}
              {!grp.collapsed && (
                <div className="p-2 flex flex-col gap-1.5">
                  {groupFeats.length ? (
                    groupFeats.map(renderLayerCard)
                  ) : (
                    <div className="p-2 text-center text-[10px] text-gray-500 border border-dashed border-white/10 rounded-xl">
                      Empty group — drag layer cards here
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (id) {
              setCustomGroups(moveFeatureToGroup(customGroups, id, null));
              setToast('Moved to Ungrouped');
            }
          }}
          className="flex flex-col gap-1.5 pt-2 border-t border-white/10"
        >
          <span className="font-bold text-gray-400 text-xs px-1">Ungrouped Layers</span>
          {ungroupedFeats.length ? (
            ungroupedFeats.map(renderLayerCard)
          ) : (
            <div className="p-4 text-center text-gray-500 text-xs">No ungrouped layers</div>
          )}
        </div>
      </div>
    </div>
  );
};
