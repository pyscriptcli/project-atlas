"use client";

import React, { useState } from "react";
import { X, TableProperties, Trash2, Search, ExternalLink } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";

export function AttributeTable() {
  const {
    activePanel,
    setActivePanel,
    currentProject,
    updateFeature,
    removeFeature,
    setSelectedFeatureId,
  } = useMapStore();

  const [searchFilter, setSearchFilter] = useState("");

  if (activePanel !== "attributes") return null;

  const features = currentProject.features || [];

  const filtered = features.filter((f) => {
    const q = searchFilter.toLowerCase();
    const name = (f.properties.name || "").toLowerCase();
    const cat = (f.properties.category || "").toLowerCase();
    const type = (f.geometry?.type || "").toLowerCase();
    return name.includes(q) || cat.includes(q) || type.includes(q);
  });

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-4xl max-h-[75vh] z-[1001] bg-[#091018]/98 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <TableProperties className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Attribute Table</h3>
            <p className="text-[11px] text-slate-400">
              {features.length} total geometries loaded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Input */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter attributes..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none w-36 text-xs"
            />
          </div>

          <button
            onClick={() => setActivePanel(null)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs italic">
            No matching features found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Color</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5">Image URL</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((f) => (
                <tr
                  key={f.properties.id}
                  onClick={() => setSelectedFeatureId(f.properties.id)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                    {f.geometry?.type || "Point"}
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={f.properties.name}
                      onChange={(e) =>
                        updateFeature(f.properties.id, { name: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border border-transparent hover:border-white/20 rounded px-2 py-1 text-white font-medium text-xs focus:outline-none focus:border-sky-400"
                    />
                  </td>
                  <td className="p-2.5 text-slate-300">
                    <input
                      type="text"
                      value={f.properties.category || ""}
                      onChange={(e) =>
                        updateFeature(f.properties.id, {
                          category: e.target.value,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border border-transparent hover:border-white/20 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-sky-400"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="color"
                      value={
                        f.properties.fillColor ||
                        f.properties.color ||
                        "#3b82f6"
                      }
                      onChange={(e) =>
                        updateFeature(f.properties.id, {
                          color: e.target.value,
                          fillColor: e.target.value,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      placeholder="Add note..."
                      value={f.properties.description || ""}
                      onChange={(e) =>
                        updateFeature(f.properties.id, {
                          description: e.target.value,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border border-transparent hover:border-white/20 rounded px-2 py-1 text-slate-300 text-xs w-44 focus:outline-none focus:border-sky-400"
                    />
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="https://..."
                        value={f.properties.imageUrl || ""}
                        onChange={(e) =>
                          updateFeature(f.properties.id, {
                            imageUrl: e.target.value,
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border border-transparent hover:border-white/20 rounded px-2 py-1 text-slate-300 text-xs w-32 focus:outline-none focus:border-sky-400"
                      />
                      {f.properties.imageUrl && (
                        <a
                          href={f.properties.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFeature(f.properties.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete feature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
