export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';

export type FeatureKind = 'marker' | 'textbox' | 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'route';

export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: any;
}

export interface FeatureProps {
  color?: string;
  borderColor?: string;
  borderOpacity?: number;
  width?: number;
  fillColor?: string;
  fillOpacity?: number;
  showLabel?: boolean;
  labelPos?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  iconSize?: number;
  visible?: number; // 1 or 0 for MapLibre expression multiplication
  rotation?: number;
  
  // Marker specific
  shape?: 'pin' | 'star' | 'circle' | 'square' | 'flag' | 'heart' | 'pinball';
  iconKey?: string;
  customImageDataUrl?: string;

  // Text specific
  text?: string;
  fontSize?: number;
  opacity?: number;
  fontFamily?: string;

  // Circle specific
  centerCoord?: [number, number];
  radiusMeters?: number;

  // Route specific
  waypoints?: [number, number][];
  routeMode?: 'driving' | 'walking' | 'cycling';
  routingFailed?: boolean;
  description?: string;
  metadata?: {
    distance: number;
    duration: number;
  };

  // Attributes table
  attributes?: Record<string, string>;
  attrTypes?: Record<string, 'text' | 'image'>;
  attrRows?: Record<string, string>[];
  
  // OSM / Trade area scan metadata
  osmTags?: Record<string, string>;
}

export interface GISFeature {
  id: number;
  name: string;
  kind: FeatureKind;
  geometry: GeoJSONGeometry;
  props: FeatureProps;
}

export interface CustomGroup {
  collapsed: boolean;
  ids: number[];
}

export type CustomGroups = Record<string, CustomGroup>;

export interface LayerVisibilities {
  label_city: boolean;
  label_brgy: boolean;
  label_street: boolean;
  poi_icons: boolean;
  poi_labels: boolean;
  road_exp: boolean;
  road_main: boolean;
  road_sec: boolean;
  road_ter: boolean;
  rd_rail: boolean;
  bound_prov: boolean;
  bound_city: boolean;
  bound_brgy: boolean;
  building2d: boolean;
  building3d: boolean;
  water: boolean;
  waterway: boolean;
  [key: string]: boolean;
}

export interface MapProject {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  basemap: string;
  zoom: number;
  center: [number, number];
  pitch?: number;
  bearing?: number;
  features: GISFeature[];
  custom_groups: CustomGroups;
  layer_visibilities: LayerVisibilities;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}
