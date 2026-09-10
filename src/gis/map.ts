import { LayerVisibilities } from '../types/gis';

export interface ThemeColors {
  overlay: string;
  text: string;
  land: string;
  landcover: string;
  water: string;
  waterway: string;
  parks: string;
  buildings: string;
  aeroway: string;
  rail: string;
  rd_express: string;
  rd_major: string;
  rd_secondary: string;
  rd_tertiary: string;
  rd_min_md: string;
  rd_min_lo: string;
  rd_path: string;
  rd_case: string;
  sec_opacity: number;
  ter_opacity: number;
  building_opacity: number;
  boundary: string;
  muted: string;
}

export const THEMES: Record<string, ThemeColors> = {
  "Midnight Blue": {
    overlay: "#0a1628", text: "#d9b451", land: "#0d1830",
    landcover: "#0f1d33", water: "#0a1424", waterway: "#081120",
    parks: "#142440", buildings: "#8e7258", aeroway: "#152640",
    rail: "#d9b451", rd_express: "#ffaa00", rd_major: "#e8b84a",
    rd_secondary: "#c99c37", rd_tertiary: "#7d5f14", rd_min_md: "#46463e",
    rd_min_lo: "#2f2f2a", rd_path: "#4a4333", rd_case: "#685c37",
    sec_opacity: 0.8, ter_opacity: 0.65, building_opacity: 0.35,
    boundary: "#ff1e1e", muted: "#8b949e",
  },
  "Monochrome": {
    overlay: "#ece9e2", text: "#2d2a26", land: "#ece9e2",
    landcover: "#e5e2da", water: "#cdd7db", waterway: "#bac6cb",
    parks: "#e2dfd7", buildings: "#dedad2", aeroway: "#dbd7cf",
    rail: "#1a1816", rd_express: "#1a1816", rd_major: "#2e2a25",
    rd_secondary: "#47423b", rd_tertiary: "#716b61", rd_min_md: "#8a8377",
    rd_min_lo: "#9e978d", rd_path: "#b0a99f", rd_case: "#1a1816",
    sec_opacity: 0.85, ter_opacity: 0.7, building_opacity: 0.6,
    boundary: "#ff1e1e", muted: "#716b61",
  },
  "White Gold": {
    overlay: "#ffffff", text: "#a07d1c", land: "#fafafa",
    landcover: "#f1f1ec", water: "#d4dadc", waterway: "#c2c9cc",
    parks: "#e6ebe4", buildings: "#d8d8d4", aeroway: "#e4e4e4",
    rail: "#c99c37", rd_express: "#f59e0b", rd_major: "#e5a91d",
    rd_secondary: "#b08a24", rd_tertiary: "#9c7a1a", rd_min_md: "#e0be74",
    rd_min_lo: "#ead9b0", rd_path: "#e6dabd", rd_case: "#b08a24",
    sec_opacity: 0.7, ter_opacity: 0.6, building_opacity: 0.5,
    boundary: "#ff1e1e", muted: "#6b7280",
  },
};

function w(...stops: [number, number][]): any[] {
  const out: any[] = ["interpolate", ["exponential", 1.2], ["zoom"]];
  for (const stop of stops) {
    out.push(stop[0], stop[1]);
  }
  return out;
}

function road_layer(p: ThemeColors, lid: string, classes: string[], color: string | null, widths: [number, number][], casing = false, opacity = 1.0, minzoom = 0) {
  const lyr: any = {
    id: lid,
    type: "line",
    source: "omt",
    "source-layer": "transportation",
    filter: ["match", ["get", "class"], classes, true, false],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": w(...widths), "line-opacity": opacity },
  };
  if (minzoom) lyr.minzoom = minzoom;
  if (casing) {
    lyr.paint["line-color"] = p.rd_case;
    lyr.paint["line-width"] = w(...widths.map(([z, val]) => [z, val + 1.8] as [number, number]));
    lyr.id = lid + "_casing";
  }
  return lyr;
}

export function vectorStyle(p: ThemeColors) {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet"
      }
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": p.overlay } },
      { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover", paint: { "fill-color": p.landcover, "fill-opacity": 0.6 } },
      { id: "landuse", type: "fill", source: "omt", "source-layer": "landuse", paint: { "fill-color": p.land, "fill-opacity": 0.8 } },
      { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": p.parks } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": p.water } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", paint: { "line-color": p.waterway, "line-width": w([9, 1], [20, 6]) } },
      { id: "aeroway", type: "line", source: "omt", "source-layer": "aeroway", paint: { "line-color": p.aeroway, "line-width": w([11, 1], [20, 12]) } },
      {
        id: "building-2d", type: "fill", source: "omt", "source-layer": "building", minzoom: 13,
        layout: { visibility: "none" },
        paint: { "fill-color": p.buildings, "fill-opacity": p.building_opacity, "fill-outline-color": p.buildings }
      },
      {
        id: "building-3d", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
        layout: { visibility: "visible" },
        paint: {
          "fill-extrusion-color": p.buildings,
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 12],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85
        }
      },
      {
        id: "bound_prov", type: "line", source: "omt", "source-layer": "boundary",
        filter: ["match", ["get", "admin_level"], [2, 4], true, false],
        layout: { visibility: "none" },
        paint: { "line-color": "#ff1e1e", "line-width": 2.2, "line-dasharray": [4, 2] }
      },
      {
        id: "bound_city", type: "line", source: "omt", "source-layer": "boundary",
        filter: ["match", ["get", "admin_level"], [6, 7, 8], true, false], minzoom: 7,
        layout: { visibility: "none" },
        paint: { "line-color": "#ff1e1e", "line-width": 1.8, "line-dasharray": [2, 2], "line-opacity": 0.9 }
      },
      {
        id: "bound_brgy", type: "line", source: "omt", "source-layer": "boundary",
        filter: ["match", ["get", "admin_level"], [9, 10], true, false], minzoom: 11,
        layout: { visibility: "none" },
        paint: { "line-color": "#ff1e1e", "line-width": 1.2, "line-dasharray": [1, 2], "line-opacity": 0.8 }
      },
      road_layer(p, "case_express", ["motorway"], null, [[5, 1.5], [14, 5.5], [20, 24]], true),
      road_layer(p, "case_major", ["trunk", "primary"], null, [[6, 1.0], [14, 3.8], [20, 18]], true),
      road_layer(p, "case_secondary", ["secondary"], null, [[8, 0.8], [14, 2.8], [20, 15]], true, p.sec_opacity),
      road_layer(p, "case_tertiary", ["tertiary"], null, [[9, 0.6], [14, 2.0], [20, 12]], true, p.ter_opacity),
      road_layer(p, "rd_path", ["path", "pedestrian", "footway"], p.rd_path, [[14, 0.6], [20, 5]], false, 1.0, 14),
      road_layer(p, "rd_min_lo", ["service", "track"], p.rd_min_lo, [[14, 0.6], [20, 6]], false, 1.0, 14),
      road_layer(p, "rd_min_md", ["minor"], p.rd_min_md, [[13, 0.8], [16, 3.5], [20, 10]], false, 1.0, 13),
      road_layer(p, "rd_tertiary", ["tertiary"], p.rd_tertiary, [[9, 0.6], [14, 2.0], [20, 12]], false, p.ter_opacity),
      road_layer(p, "rd_secondary", ["secondary"], p.rd_secondary, [[8, 0.8], [14, 2.8], [20, 15]], false, p.sec_opacity),
      road_layer(p, "rd_major", ["trunk", "primary"], p.rd_major, [[6, 1.0], [14, 3.8], [20, 18]]),
      road_layer(p, "rd_express", ["motorway"], p.rd_express, [[5, 1.5], [14, 5.5], [20, 24]]),
      {
        id: "rd_rail", type: "line", source: "omt", "source-layer": "transportation",
        filter: ["match", ["get", "class"], ["rail", "transit"], true, false], minzoom: 10,
        paint: { "line-color": p.rail, "line-width": w([10, 1.2], [15, 2.5], [20, 4]), "line-dasharray": [3, 2] }
      },
      {
        id: "label_city", type: "symbol", source: "omt", "source-layer": "place",
        filter: ["match", ["get", "class"], ["city", "town"], true, false], minzoom: 6,
        layout: {
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": w([6, 12], [14, 18]),
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1
        },
        paint: { "text-color": p.text, "text-halo-color": p.overlay, "text-halo-width": 2 }
      },
      {
        id: "label_brgy", type: "symbol", source: "omt", "source-layer": "place",
        filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "village", "quarter", "hamlet"], true, false], minzoom: 11,
        layout: {
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": w([11, 10], [16, 14]),
          "text-letter-spacing": 0.05
        },
        paint: { "text-color": p.text, "text-halo-color": p.overlay, "text-halo-width": 1.5 }
      },
      {
        id: "label_street", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": w([13, 9], [18, 13])
        },
        paint: { "text-color": p.text, "text-halo-color": p.overlay, "text-halo-width": 1.5 }
      },
    ]
  };
}

export function rasterStyle(tileUrls: string[], bg: string, maxzoom = 20) {
  return {
    version: 8,
    sources: {
      r: { type: "raster", tiles: tileUrls, tileSize: 256, maxzoom }
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": bg } },
      { id: "r", type: "raster", source: "r" }
    ]
  };
}

export const ALL_STYLES: Record<string, any> = {
  "Midnight Blue": vectorStyle(THEMES["Midnight Blue"]),
  "Monochrome": vectorStyle(THEMES["Monochrome"]),
  "White Gold": vectorStyle(THEMES["White Gold"]),
  "CartoDB Light": rasterStyle(["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], "#f8f9fa"),
  "CartoDB Dark": rasterStyle(["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"], "#000000"),
  "OSM": rasterStyle(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], "#f2efe9", 19),
  "Satellite": rasterStyle(["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], "#000000", 19),
};

export const VIS_MAP: Record<string, string[]> = {
  label_city: ['label_city'],
  label_brgy: ['label_brgy'],
  label_street: ['label_street'],
  poi_icons: ['draw-marker'],
  poi_labels: ['draw-poly-labels', 'draw-text'],
  road_exp: ['case_express_casing', 'rd_express'],
  road_main: ['case_major_casing', 'rd_major'],
  road_sec: ['case_secondary_casing', 'rd_secondary'],
  road_ter: ['case_tertiary_casing', 'rd_tertiary', 'rd_min_md', 'rd_min_lo', 'rd_path'],
  rd_rail: ['rd_rail'],
  bound_prov: ['bound_prov'],
  bound_city: ['bound_city'],
  bound_brgy: ['bound_brgy'],
  building2d: ['building-2d'],
  building3d: ['building-3d'],
  water: ['water'],
  waterway: ['waterway']
};

export const DEFAULT_VISIBILITIES: LayerVisibilities = {
  label_city: true, label_brgy: true, label_street: true,
  poi_icons: true, poi_labels: true,
  road_exp: true, road_main: true, road_sec: true, road_ter: true, rd_rail: true,
  bound_prov: false, bound_city: false, bound_brgy: false,
  building2d: false, building3d: true, water: true, waterway: true
};

export const COLOR_PALETTES = [
  { name: "Primary", colors: ["#1e40af", "#dc2626", "#16a34a", "#ca8a04", "#0a1628", "#ffffff"] },
  { name: "Secondary", colors: ["#38bdf8", "#3fb950", "#f85149", "#a371f7", "#fb923c", "#f43f5e"] },
  { name: "Tertiary", colors: ["#0d9488", "#e8b84a", "#8b5cf6", "#64748b", "#8e7258", "#334155"] }
];
