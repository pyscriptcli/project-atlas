import { create } from 'zustand';
import { GISFeature, CustomGroups, LayerVisibilities, FeatureKind, BuildingArchetype } from '../types/gis';
import { DEFAULT_VISIBILITIES } from '../gis/map';

interface MapState {
  activeTool: FeatureKind | 'placeBuilding' | null;
  editMode: boolean;
  selectedId: number | null;
  selectedLayerIds: number[];
  features: GISFeature[];
  customGroups: CustomGroups;
  visibilities: LayerVisibilities;
  currentBasemap: string;
  is3DMode: boolean;

  // Drawing state
  draft: [number, number][];
  cursorLL: [number, number] | null;

  // Active floating panels/modals
  activePanels: {
    browser: boolean;
    myLayers: boolean;
    search: boolean;
    customMap: boolean;
    shapeEditor: boolean;
    tradeArea: boolean;
    attributeTable: boolean;
    routeSettings: boolean;
    markerSettings: boolean;
    textSettings: boolean;
    launcher: boolean;
    buildingCatalog: boolean;
  };

  // 3D Building Archetype Tool
  selectedBuildingArchetype: BuildingArchetype;
  setSelectedBuildingArchetype: (archetype: BuildingArchetype) => void;

  // Tool configs
  markerShape: 'pin' | 'star' | 'circle' | 'square' | 'flag' | 'heart' | 'pinball';
  markerColor: string;
  markerSize: number;
  customMarkerKey: string | null;

  textContent: string;
  textSize: number;
  textColor: string;
  textOpacity: number;

  routeMode: 'driving' | 'walking' | 'cycling';
  routeColor: string;

  // Context menu state
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    lngLat: [number, number] | null;
    featureId: number | null;
  };

  // History & dirty flag
  isDirty: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  undoStack: string[];
  redoStack: string[];
  toastMessage: string | null;

  // Actions
  setActiveTool: (tool: FeatureKind | 'placeBuilding' | null) => void;
  setEditMode: (mode: boolean, selectedId?: number | null) => void;
  setSelectedId: (id: number | null) => void;
  toggleLayerSelection: (id: number) => void;
  selectAllLayers: () => void;
  clearLayerSelection: () => void;
  setFeatures: (features: GISFeature[], recordHistory?: boolean) => void;
  addFeature: (f: GISFeature) => void;
  updateFeature: (id: number, updater: (f: GISFeature) => GISFeature) => void;
  removeFeature: (id: number) => void;
  setCustomGroups: (groups: CustomGroups, recordHistory?: boolean) => void;
  setVisibility: (key: string, visible: boolean) => void;
  setBasemap: (name: string) => void;
  set3DMode: (is3D: boolean) => void;

  setDraft: (draft: [number, number][]) => void;
  setCursorLL: (ll: [number, number] | null) => void;

  togglePanel: (panel: keyof MapState['activePanels'], forceState?: boolean) => void;
  closeAllPanels: () => void;

  setContextMenu: (menu: MapState['contextMenu']) => void;
  closeContextMenu: () => void;

  setToolConfig: (config: Partial<{
    markerShape: MapState['markerShape'];
    markerColor: string;
    markerSize: number;
    customMarkerKey: string | null;
    textContent: string;
    textSize: number;
    textColor: string;
    textOpacity: number;
    routeMode: MapState['routeMode'];
    routeColor: string;
  }>) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
  setToast: (msg: string | null) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  activeTool: null,
  editMode: false,
  selectedId: null,
  selectedLayerIds: [],
  features: [],
  customGroups: { "Trade Area Scan": { collapsed: false, ids: [] } },
  visibilities: DEFAULT_VISIBILITIES,
  currentBasemap: "Midnight Blue",
  is3DMode: true,

  draft: [],
  cursorLL: null,

  activePanels: {
    browser: false,
    myLayers: false,
    search: false,
    customMap: false,
    shapeEditor: false,
    tradeArea: false,
    attributeTable: false,
    routeSettings: false,
    markerSettings: false,
    textSettings: false,
    launcher: false,
    buildingCatalog: false,
  },

  selectedBuildingArchetype: 'skyscraper',
  setSelectedBuildingArchetype: (archetype) => set({ selectedBuildingArchetype: archetype }),

  markerShape: 'pin',
  markerColor: '#1e40af',
  markerSize: 0.9,
  customMarkerKey: null,

  textContent: 'Custom Label',
  textSize: 16,
  textColor: '#d9b451',
  textOpacity: 1,

  routeMode: 'driving',
  routeColor: '#38bdf8',

  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    lngLat: null,
    featureId: null,
  },

  isDirty: false,
  saveStatus: 'saved',
  undoStack: [],
  redoStack: [],
  toastMessage: null,

  setActiveTool: (tool) => {
    set((state) => {
      const isSame = state.activeTool === tool;
      const nextTool = isSame ? null : tool;
      return {
        activeTool: nextTool,
        editMode: false,
        draft: [],
        activePanels: {
          ...state.activePanels,
          markerSettings: nextTool === 'marker',
          textSettings: nextTool === 'textbox',
          routeSettings: nextTool === 'route',
          shapeEditor: false,
        },
      };
    });
  },

  setEditMode: (editMode, selectedId = null) => {
    set((state) => ({
      editMode,
      selectedId: selectedId !== undefined ? selectedId : state.selectedId,
      activeTool: editMode ? null : state.activeTool,
    }));
  },

  setSelectedId: (selectedId) => set({ selectedId }),

  toggleLayerSelection: (id) =>
    set((state) => {
      const exists = state.selectedLayerIds.includes(id);
      return {
        selectedLayerIds: exists
          ? state.selectedLayerIds.filter((x) => x !== id)
          : [...state.selectedLayerIds, id],
      };
    }),

  selectAllLayers: () =>
    set((state) => {
      const allSelected = state.selectedLayerIds.length === state.features.length;
      return {
        selectedLayerIds: allSelected ? [] : state.features.map((f) => f.id),
      };
    }),

  clearLayerSelection: () => set({ selectedLayerIds: [] }),

  setFeatures: (features, recordHistory = true) => {
    if (recordHistory) get().pushHistory();
    set({ features, isDirty: true, saveStatus: 'unsaved' });
  },

  addFeature: (f) => {
    get().pushHistory();
    set((state) => ({
      features: [...state.features, f],
      isDirty: true,
      saveStatus: 'unsaved',
    }));
  },

  updateFeature: (id, updater) => {
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? updater(f) : f)),
      isDirty: true,
      saveStatus: 'unsaved',
    }));
  },

  removeFeature: (id) => {
    get().pushHistory();
    set((state) => {
      const nextGroups: CustomGroups = {};
      for (const g in state.customGroups) {
        nextGroups[g] = {
          ...state.customGroups[g],
          ids: state.customGroups[g].ids.filter((xId) => xId !== id),
        };
      }
      return {
        features: state.features.filter((f) => f.id !== id),
        customGroups: nextGroups,
        selectedLayerIds: state.selectedLayerIds.filter((xId) => xId !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        isDirty: true,
        saveStatus: 'unsaved',
      };
    });
  },

  setCustomGroups: (customGroups, recordHistory = true) => {
    if (recordHistory) get().pushHistory();
    set({ customGroups, isDirty: true, saveStatus: 'unsaved' });
  },

  setVisibility: (key, visible) =>
    set((state) => ({
      visibilities: { ...state.visibilities, [key]: visible },
      isDirty: true,
      saveStatus: 'unsaved',
    })),

  setBasemap: (currentBasemap) =>
    set({ currentBasemap, isDirty: true, saveStatus: 'unsaved' }),

  set3DMode: (is3DMode) =>
    set((state) => ({
      is3DMode,
      visibilities: {
        ...state.visibilities,
        building2d: !is3DMode,
        building3d: is3DMode,
      },
      isDirty: true,
      saveStatus: 'unsaved',
    })),

  setDraft: (draft) => set({ draft }),
  setCursorLL: (cursorLL) => set({ cursorLL }),

  togglePanel: (panel, forceState) =>
    set((state) => {
      const currentState = state.activePanels[panel];
      const nextState = forceState !== undefined ? forceState : !currentState;
      return {
        activePanels: {
          ...state.activePanels,
          [panel]: nextState,
        },
      };
    }),

  closeAllPanels: () =>
    set((state) => ({
      activePanels: {
        browser: false,
        myLayers: false,
        search: false,
        customMap: false,
        shapeEditor: false,
        tradeArea: false,
        attributeTable: false,
        routeSettings: false,
        markerSettings: false,
        textSettings: false,
        launcher: false,
        buildingCatalog: false,
      },
    })),

  setContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () =>
    set((state) => ({
      contextMenu: { ...state.contextMenu, visible: false },
    })),

  setToolConfig: (config) => set((state) => ({ ...state, ...config })),

  pushHistory: () => {
    const { features, customGroups, undoStack } = get();
    const snapshot = JSON.stringify({ features, customGroups });
    const nextStack = [...undoStack, snapshot];
    if (nextStack.length > 50) nextStack.shift();
    set({ undoStack: nextStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, features, customGroups } = get();
    if (!undoStack.length) {
      get().setToast('Nothing to undo');
      return;
    }
    const current = JSON.stringify({ features, customGroups });
    const prevStr = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const parsed = JSON.parse(prevStr);

    set({
      features: parsed.features,
      customGroups: parsed.customGroups,
      undoStack: newUndo,
      redoStack: [...redoStack, current],
      isDirty: true,
      saveStatus: 'unsaved',
    });
    get().setToast('Undo');
  },

  redo: () => {
    const { undoStack, redoStack, features, customGroups } = get();
    if (!redoStack.length) {
      get().setToast('Nothing to redo');
      return;
    }
    const current = JSON.stringify({ features, customGroups });
    const nextStr = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const parsed = JSON.parse(nextStr);

    set({
      features: parsed.features,
      customGroups: parsed.customGroups,
      undoStack: [...undoStack, current],
      redoStack: newRedo,
      isDirty: true,
      saveStatus: 'unsaved',
    });
    get().setToast('Redo');
  },

  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setToast: (toastMessage) => set({ toastMessage }),
}));
