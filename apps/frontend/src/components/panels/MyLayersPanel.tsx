"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Folder,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FolderTree,
} from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";

export function MyLayersPanel() {
  const {
    activePanel,
    setActivePanel,
    currentProject,
    createGroup,
    deleteGroup,
    toggleGroupCollapse,
    removeFeature,
    updateFeature,
    setSelectedFeatureId,
    moveFeatureToGroup,
    showToast,
  } = useMapStore();

  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  if (activePanel !== "layers") return null;

  const features = currentProject.features || [];
  const groups = currentProject.custom_groups || {};

  // Compute grouped features vs ungrouped
  const groupedIds = new Set<string>();
  Object.values(groups).forEach((g) => {
    (g.ids || []).forEach((id) => groupedIds.add(id));
  });

  const ungroupedFeatures = features.filter(
    (f) => !groupedIds.has(f.properties.id)
  );

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup(newGroupName.trim());
    setNewGroupName("");
    setIsCreatingGroup(false);
    showToast(`Created group "${newGroupName.trim()}"`);
  };

  return (
    <div className="fixed top-[68px] left-4 bottom-4 w-[360px] z-[999] bg-[#091018]/95 backdrop-blur-xl border border-white/12 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-slate-300">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-sm text-white">
          <FolderTree className="w-4 h-4 text-sky-400" />
          <span>My Layers</span>
          <span className="bg-blue-600 text-white rounded-full text-[10px] px-2 py-0.5 font-bold">
            {features.length}
          </span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar / Actions */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs">
        <button
          onClick={() => setIsCreatingGroup(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-1 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Group</span>
        </button>
        <span className="text-slate-400 text-[11px]">
          {Object.keys(groups).length} groups
        </span>
      </div>

      {/* New Group Form */}
      {isCreatingGroup && (
        <div className="p-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
          <input
            type="text"
            placeholder="Group Name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            autoFocus
            className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
          />
          <button
            onClick={handleCreateGroup}
            className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold"
          >
            Add
          </button>
          <button
            onClick={() => setIsCreatingGroup(false)}
            className="text-slate-400 hover:text-white px-1.5 py-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Layers Tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {/* Groups */}
        {Object.entries(groups).map(([groupName, groupData]) => {
          const groupFeatures = features.filter((f) =>
            (groupData.ids || []).includes(f.properties.id)
          );

          return (
            <div
              key={groupName}
              className="bg-black/30 border border-white/8 rounded-xl overflow-hidden"
            >
              <div
                onClick={() => toggleGroupCollapse(groupName)}
                className="bg-white/5 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10"
              >
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  {groupData.collapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>{groupName}</span>
                  <span className="text-slate-400 font-normal text-[10px]">
                    ({groupFeatures.length})
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete group "${groupName}"?`)) {
                      deleteGroup(groupName);
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {!groupData.collapsed && (
                <div className="p-2 space-y-1.5">
                  {groupFeatures.length === 0 ? (
                    <div className="text-slate-500 text-[11px] p-2 italic text-center">
                      No layers in this group
                    </div>
                  ) : (
                    groupFeatures.map((f) => (
                      <div
                        key={f.properties.id}
                        onClick={() => setSelectedFeatureId(f.properties.id)}
                        className="bg-white/5 border border-white/5 rounded-lg p-2 flex items-center justify-between hover:border-sky-400/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                f.properties.fillColor ||
                                f.properties.color ||
                                "#3b82f6",
                            }}
                          />
                          <input
                            type="text"
                            value={f.properties.name}
                            onChange={(e) =>
                              updateFeature(f.properties.id, {
                                name: e.target.value,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-transparent hover:border-white/20 border rounded px-1 text-xs text-slate-200 truncate flex-1 focus:outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e)=>{e.stopPropagation();updateFeature(f.properties.id,{visible:f.properties.visible===false})}} className="p-1 text-slate-500 hover:text-sky-300" title="Toggle visibility">{f.properties.visible===false?<EyeOff className="w-3 h-3"/>:<Eye className="w-3 h-3"/>}</button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFeature(f.properties.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped Features */}
        <div className="pt-2">
          <div className="font-semibold text-slate-400 text-[11px] mb-2 px-1">
            Ungrouped Layers ({ungroupedFeatures.length})
          </div>
          <div className="space-y-1.5">
            {ungroupedFeatures.length === 0 ? (
              <div className="text-slate-600 text-[11px] p-2 text-center">
                All features are organized in groups or no features added yet.
              </div>
            ) : (
              ungroupedFeatures.map((f) => (
                <div
                  key={f.properties.id}
                  onClick={() => setSelectedFeatureId(f.properties.id)}
                  className="bg-white/5 border border-white/5 rounded-lg p-2 flex items-center justify-between hover:border-sky-400/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          f.properties.fillColor ||
                          f.properties.color ||
                          "#3b82f6",
                      }}
                    />
                    <input
                      type="text"
                      value={f.properties.name}
                      onChange={(e) =>
                        updateFeature(f.properties.id, {
                          name: e.target.value,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-transparent hover:border-white/20 border rounded px-1 text-xs text-slate-200 truncate flex-1 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e)=>{e.stopPropagation();updateFeature(f.properties.id,{visible:f.properties.visible===false})}} className="p-1 text-slate-500 hover:text-sky-300" title="Toggle visibility">{f.properties.visible===false?<EyeOff className="w-3 h-3"/>:<Eye className="w-3 h-3"/>}</button>
                    {/* Move to group selector */}
                    {Object.keys(groups).length > 0 && (
                      <select
                        onChange={(e) => {
                          const target = e.target.value;
                          if (target) moveFeatureToGroup(f.properties.id, target);
                        }}
                        defaultValue=""
                        className="bg-slate-900 text-slate-300 text-[10px] border border-white/10 rounded px-1 py-0.5"
                      >
                        <option value="" disabled>
                          + Move
                        </option>
                        {Object.keys(groups).map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFeature(f.properties.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
