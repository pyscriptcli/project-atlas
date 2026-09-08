import type { Feature, Geometry } from "geojson";

export type ThemeName =
  | "Midnight Blue"
  | "Monochrome"
  | "White Gold"
  | "Liberty"
  | "Bright"
  | "Positron"
  | "CartoDB Light"
  | "CartoDB Dark"
  | "OSM"
  | "Satellite";

export type DrawTool =
  | "select"
  | "polygon"
  | "rectangle"
  | "circle"
  | "polyline"
  | "marker"
  | "textbox"
  | "route";

export interface FeatureStyle {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  radius?: number; // in meters for circle
  icon?: string;
  markerColor?: string;
  textSize?: number;
  textColor?: string;
  textHaloColor?: string;
  visible?: boolean;
  labelVisible?: boolean;
  labelPosition?: "center" | "top" | "bottom" | "left" | "right";
  fontFamily?: string;
  markerShape?: "pin" | "star" | "circle" | "square" | "flag" | "heart" | "pinball" | "custom";
  markerSize?: number;
  markerAssetPath?: string;
}

export interface AttributeColumn { id: string; name: string; type: "text" | "image"; }
export interface AttributeImage { storagePath: string; fileName: string; contentType: string; }
export type AttributeValue = string | AttributeImage;
export interface FeatureAttributeTable { columns: AttributeColumn[]; rows: Record<string, AttributeValue>[]; }
export interface RouteMetadata { mode: "driving" | "walking" | "cycling"; waypoints: [number, number][]; distanceMeters?: number; durationSeconds?: number; }
export interface CircleMetadata { center: [number, number]; radiusMeters: number; }

export interface MapFeatureProperties extends FeatureStyle {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  type?: string;
  description?: string;
  imageUrl?: string;
  tags?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  distanceKm?: number;
  areaSqMeters?: number;
  groupId?: string;
  source?: "user-draw" | "overpass" | "imported" | "route";
  featureKind?: DrawTool;
  attributes?: FeatureAttributeTable;
  route?: RouteMetadata;
  circle?: CircleMetadata;
}

export type MapFeature = Feature<Geometry, MapFeatureProperties>;

export interface CustomGroup {
  collapsed: boolean;
  ids: string[];
  color?: string;
  name?: string;
}

export interface MapProject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  basemap: ThemeName;
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  features: MapFeature[];
  custom_groups: Record<string, CustomGroup>;
  layer_visibilities: Record<string, boolean>;
  owner_id?: string;
  schema_version?: number;
  style_overrides?: Record<string, string | number>;
  group_order?: string[];
}

export interface ApiError { code: string; message: string; details?: unknown; }
export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: ApiError };

export interface POIItem {
  lat: number;
  lon: number;
  name: string;
  type: string;
  category: string;
  tags: Record<string, any>;
}

export interface TradeAreaScanParams {
  lat: number;
  lon: number;
  radiusMeters: number;
  categories: string[];
}
