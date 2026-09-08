import { create } from "zustand";
import type {
  MapProject,
  MapFeature,
  MapFeatureProperties,
  DrawTool,
  ThemeName,
  CustomGroup,
} from "@/types/map";
import { apiRequest } from "@/services/api-client";

interface EditorSnapshot { features: MapFeature[]; customGroups: Record<string, CustomGroup>; groupOrder?: string[]; styleOverrides?: Record<string,string|number>; }
const snapshot=(project:MapProject):EditorSnapshot=>({features:structuredClone(project.features),customGroups:structuredClone(project.custom_groups),groupOrder:structuredClone(project.group_order??[]),styleOverrides:structuredClone(project.style_overrides??{})});
interface MapStoreState {
  // Project
  currentProject: MapProject;
  isDirty: boolean;
  isSaving: boolean;
  saveStatus: "saved" | "saving" | "unsaved";
  toastMessage: string | null;

  // Tools & View
  activeTool: DrawTool;
  selectedFeatureId: string | null;
  activePanel:
    | "browser"
    | "layers"
    | "trade-area"
    | "attributes"
    | "style"
    | "launcher"
    | "search"
    | null;
  is3D: boolean;

  // Undo / Redo
  past: EditorSnapshot[];
  future: EditorSnapshot[];

  // Actions
  setProject: (project: MapProject) => void;
  setProjectName: (name: string) => void;
  setBasemap: (basemap: ThemeName) => void;
  setCamera: (
    center: [number, number],
    zoom: number,
    pitch: number,
    bearing: number
  ) => void;
  setActiveTool: (tool: DrawTool) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setActivePanel: (
    panel:
      | "browser"
      | "layers"
      | "trade-area"
      | "attributes"
      | "style"
      | "launcher"
      | "search"
      | null
  ) => void;
  setIs3D: (is3D: boolean) => void;
  setLayerVisibility: (layerKey: string, visible: boolean) => void;

  // Features
  addFeature: (feature: MapFeature) => void;
  addFeatures: (features: MapFeature[], targetGroupName?: string) => void;
  updateFeature: (
    id: string,
    properties: Partial<MapFeatureProperties>
  ) => void;
  removeFeature: (id: string) => void;
  reorderFeature: (id: string, edge: "front" | "back") => void;
  clearFeatures: () => void;

  // Groups
  createGroup: (name: string) => void;
  deleteGroup: (name: string) => void;
  toggleGroupCollapse: (name: string) => void;
  moveFeatureToGroup: (featureId: string, groupName: string | null) => void;

  // History & Toast
  undo: () => void;
  redo: () => void;
  showToast: (msg: string) => void;

  // Persistence
  saveProject: () => Promise<void>;
}

const DEFAULT_PROJECT: MapProject = {
  id: "local-temp",
  name: "Untitled Project 1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  basemap: "Midnight Blue",
  center: [120.9842, 14.5995],
  zoom: 14,
  pitch: 60,
  bearing: -15,
  features: [],
  custom_groups: {
    "Trade Area Scan": { collapsed: false, ids: [] },
  },
  layer_visibilities: {
    label_city: true,
    label_brgy: true,
    label_street: true,
    poi_icons: true,
    poi_labels: true,
    road_exp: true,
    road_main: true,
    road_sec: true,
    road_ter: true,
    rd_rail: true,
    building2d: false,
    building3d: true,
    water: true,
    waterway: true,
    bound_prov: false,
    bound_city: false,
    bound_brgy: false,
  },
};

export const useMapStore = create<MapStoreState>((set, get) => ({
  currentProject: DEFAULT_PROJECT,
  isDirty: false,
  isSaving: false,
  saveStatus: "saved",
  toastMessage: null,

  activeTool: "select",
  selectedFeatureId: null,
  activePanel: null,
  is3D: true,

  past: [],
  future: [],

  setProject: (project) => {
    set({
      currentProject: project,
      isDirty: false,
      saveStatus: "saved",
      past: [],
      future: [],
      selectedFeatureId: null,
    });
  },

  setProjectName: (name) => {
    set((state) => ({
      currentProject: { ...state.currentProject, name },
      isDirty: true,
      saveStatus: "unsaved",
    }));
  },

  setBasemap: (basemap) => {
    set((state) => ({
      past:[snapshot(state.currentProject),...state.past].slice(0,50),future:[],
      currentProject: { ...state.currentProject, basemap },
      isDirty: true,
      saveStatus: "unsaved",
    }));
  },

  setCamera: (center, zoom, pitch, bearing) => {
    set((state) => ({
      currentProject: {
        ...state.currentProject,
        center,
        zoom,
        pitch,
        bearing,
      },
      isDirty: true,
    }));
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  setSelectedFeatureId: (id) => {
    set({ selectedFeatureId: id });
  },

  setActivePanel: (panel) => {
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    }));
  },

  setIs3D: (is3D) => {
    set((state) => {
      const vis = { ...state.currentProject.layer_visibilities };
      vis.building2d = !is3D;
      vis.building3d = is3D;
      return {
        is3D,
        currentProject: {
          ...state.currentProject,
          layer_visibilities: vis,
        },
        isDirty: true,
      };
    });
  },

  setLayerVisibility: (layerKey, visible) => {
    set((state) => ({
      past:[snapshot(state.currentProject),...state.past].slice(0,50),future:[],
      currentProject: {
        ...state.currentProject,
        layer_visibilities: {
          ...state.currentProject.layer_visibilities,
          [layerKey]: visible,
        },
      },
      isDirty: true,
    }));
  },

  addFeature: (feature) => {
    const { currentProject, past } = get();
    const newFeatures = [feature, ...currentProject.features];
    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: [],
      currentProject: {
        ...currentProject,
        features: newFeatures,
      },
      selectedFeatureId: feature.properties.id,
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  addFeatures: (newFeats, targetGroupName) => {
    const { currentProject, past } = get();
    const updatedFeatures = [...newFeats, ...currentProject.features];
    const updatedGroups = { ...currentProject.custom_groups };

    if (targetGroupName) {
      if (!updatedGroups[targetGroupName]) {
        updatedGroups[targetGroupName] = { collapsed: false, ids: [] };
      }
      const newIds = newFeats.map((f) => f.properties.id);
      updatedGroups[targetGroupName].ids = [
        ...new Set([...newIds, ...updatedGroups[targetGroupName].ids]),
      ];
    }

    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: [],
      currentProject: {
        ...currentProject,
        features: updatedFeatures,
        custom_groups: updatedGroups,
      },
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  updateFeature: (id, updates) => {
    const { currentProject, past } = get();
    const updatedFeatures = currentProject.features.map((f) => {
      if (f.properties.id === id) {
        return {
          ...f,
          properties: {
            ...f.properties,
            ...updates,
          },
        };
      }
      return f;
    });

    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: [],
      currentProject: {
        ...currentProject,
        features: updatedFeatures,
      },
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  removeFeature: (id) => {
    const { currentProject, past } = get();
    const updatedFeatures = currentProject.features.filter(
      (f) => f.properties.id !== id
    );

    // Remove from groups as well
    const updatedGroups = { ...currentProject.custom_groups };
    Object.keys(updatedGroups).forEach((k) => {
      updatedGroups[k].ids = updatedGroups[k].ids.filter((fid) => fid !== id);
    });

    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: [],
      currentProject: {
        ...currentProject,
        features: updatedFeatures,
        custom_groups: updatedGroups,
      },
      selectedFeatureId: null,
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  reorderFeature: (id, edge) => {
    const {currentProject,past}=get(); const target=currentProject.features.find(feature=>feature.properties.id===id); if(!target)return;
    const rest=currentProject.features.filter(feature=>feature.properties.id!==id); const features=edge==="front"?[target,...rest]:[...rest,target];
    set({past:[snapshot(currentProject),...past].slice(0,50),future:[],currentProject:{...currentProject,features},isDirty:true,saveStatus:"unsaved"});
  },

  clearFeatures: () => {
    const { currentProject, past } = get();
    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: [],
      currentProject: {
        ...currentProject,
        features: [],
      },
      selectedFeatureId: null,
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  createGroup: (name) => {
    const { currentProject,past } = get();
    if (!name || currentProject.custom_groups[name]) return;
    set({
      currentProject: {
        ...currentProject,
        custom_groups: {
          ...currentProject.custom_groups,
          [name]: { collapsed: false, ids: [] },
        },
      },
      isDirty: true,
      saveStatus:"unsaved", past:[snapshot(currentProject),...past].slice(0,50), future:[],
    });
  },

  deleteGroup: (name) => {
    const { currentProject,past } = get();
    const groups = { ...currentProject.custom_groups };
    delete groups[name];
    set({
      currentProject: {
        ...currentProject,
        custom_groups: groups,
      },
      isDirty: true,
      saveStatus:"unsaved", past:[snapshot(currentProject),...past].slice(0,50), future:[],
    });
  },

  toggleGroupCollapse: (name) => {
    const { currentProject,past } = get();
    const group = currentProject.custom_groups[name];
    if (!group) return;
    set({
      currentProject: {
        ...currentProject,
        custom_groups: {
          ...currentProject.custom_groups,
          [name]: { ...group, collapsed: !group.collapsed },
        },
      },
      isDirty:true,saveStatus:"unsaved",past:[snapshot(currentProject),...past].slice(0,50),future:[],
    });
  },

  moveFeatureToGroup: (featureId, groupName) => {
    const { currentProject,past } = get();
    const groups = { ...currentProject.custom_groups };

    // Remove featureId from all existing groups
    Object.keys(groups).forEach((key) => {
      groups[key].ids = groups[key].ids.filter((id) => id !== featureId);
    });

    // If target group provided, add it
    if (groupName && groups[groupName]) {
      groups[groupName].ids.push(featureId);
    }

    set({
      currentProject: {
        ...currentProject,
        custom_groups: groups,
      },
      isDirty: true,
      saveStatus: "unsaved",
      past:[snapshot(currentProject),...past].slice(0,50),future:[],
    });
  },

  undo: () => {
    const { past, currentProject, future } = get();
    if (past.length === 0) return;
    const previous = past[0];
    const newPast = past.slice(1);
    set({
      past: newPast,
      future: [snapshot(currentProject), ...future].slice(0,50),
      currentProject: {
        ...currentProject,
        features: previous.features, custom_groups: previous.customGroups, group_order: previous.groupOrder, style_overrides: previous.styleOverrides,
      },
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  redo: () => {
    const { future, currentProject, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      past: [snapshot(currentProject), ...past].slice(0,50),
      future: newFuture,
      currentProject: {
        ...currentProject,
        features: next.features, custom_groups: next.customGroups, group_order: next.groupOrder, style_overrides: next.styleOverrides,
      },
      isDirty: true,
      saveStatus: "unsaved",
    });
  },

  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3000);
  },

  saveProject: async () => {
    const { currentProject, isSaving, showToast } = get();
    if (isSaving) return;

    set({ isSaving: true, saveStatus: "saving" });

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        name: currentProject.name,
        updated_at: nowIso,
        basemap: currentProject.basemap,
        center: currentProject.center,
        zoom: currentProject.zoom,
        pitch: currentProject.pitch,
        bearing: currentProject.bearing,
        features: currentProject.features,
        custom_groups: currentProject.custom_groups,
        layer_visibilities: currentProject.layer_visibilities,
      };

      if (currentProject.id && currentProject.id !== "local-temp") {
        // Update existing
        const saved = await apiRequest<MapProject>(`/projects/${currentProject.id}`, {method:"PATCH",body:JSON.stringify(payload)});
        set({currentProject:saved});
      } else {
        // Insert new
        const data = await apiRequest<MapProject>("/projects", {method:"POST",body:JSON.stringify(payload)});
        if (data) {
          set({
            currentProject: {
              ...currentProject,
              id: data.id,
              created_at: data.created_at,
              updated_at: data.updated_at,
            },
          });
        }
      }

      set({ isDirty: false, isSaving: false, saveStatus: "saved" });
      showToast("Workspace saved successfully");
    } catch (err: any) {
      console.error("Failed to save project:", err);
      set({ isSaving: false, saveStatus: "unsaved" });
      showToast(`Error saving: ${err.message || "Network error"}`);
    }
  },
}));
