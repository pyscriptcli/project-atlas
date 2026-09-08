"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, FolderGit2, Loader2, Calendar } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import type { MapProject } from "@/types/map";
import { apiRequest } from "@/services/api-client";

export function ProjectLauncherModal() {
  const {
    activePanel,
    setActivePanel,
    currentProject,
    setProject,
    showToast,
  } = useMapStore();

  const [projects, setProjects] = useState<MapProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activePanel === "launcher") {
      fetchProjects();
    }
  }, [activePanel]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      setProjects(await apiRequest<MapProject[]>("/projects"));
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (activePanel !== "launcher") return null;

  const handleCreateNew = async () => {
    const name = newProjectName.trim() || `Workspace ${projects.length + 1}`;
    setIsCreating(true);

    const newProj: Partial<MapProject> = {
      name,
      basemap: "Midnight Blue",
      center: [120.9842, 14.5995],
      zoom: 14,
      pitch: 60,
      bearing: -15,
      features: [],
      custom_groups: {
        "Trade Area Scan": { collapsed: false, ids: [] },
      },
      layer_visibilities: {},
    };

    try {
      const project = await apiRequest<MapProject>("/projects", {
        method: "POST",
        body: JSON.stringify(newProj),
      });
      if (project) {
        setProject(project);
        setProjects([project, ...projects]);
        setActivePanel(null);
        showToast(`Workspace "${name}" created.`);
      }
    } catch (err: any) {
      showToast(`Creation error: ${err.message}`);
    } finally {
      setIsCreating(false);
      setNewProjectName("");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete project "${name}" permanently?`)) return;

    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p.id !== id));
      showToast(`Deleted "${name}".`);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#091018]/95 border border-white/15 rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Project Workspaces</h2>
              <p className="text-xs text-slate-400">Manage and switch your map projects</p>
            </div>
          </div>
          <button
            onClick={() => setActivePanel(null)}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Input */}
        <div className="p-5 border-b border-white/5 bg-white/5 flex gap-2">
          <input
            type="text"
            placeholder="New workspace name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateNew()}
            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
          />
          <button
            onClick={handleCreateNew}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Create</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span>Loading workspaces...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No saved workspaces yet. Create your first one above!
            </div>
          ) : (
            projects.map((p) => {
              const isActive = currentProject.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setProject(p);
                    setActivePanel(null);
                    showToast(`Opened workspace "${p.name}".`);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-lg"
                      : "bg-black/30 border-white/8 text-slate-300 hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      {isActive && (
                        <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{(p.features || []).length} features</span>
                      <span>•</span>
                      <span>{p.basemap}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, p.id, p.name)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
