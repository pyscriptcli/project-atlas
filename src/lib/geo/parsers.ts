import { kml } from "@tmcw/togeojson";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type { MapFeature } from "@/types/map";

export async function parseSpatialFile(file: File): Promise<MapFeature[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".geojson") || fileName.endsWith(".json")) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return normalizeToMapFeatures(parsed);
  }

  if (fileName.endsWith(".kml")) {
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, "text/xml");
    const converted = kml(dom);
    return normalizeToMapFeatures(converted);
  }

  if (fileName.endsWith(".zip") || fileName.endsWith(".shp")) {
    const shp = (await import("shpjs")).default;
    const buffer = await file.arrayBuffer();
    const converted = await shp(buffer);
    if (Array.isArray(converted)) {
      const all: MapFeature[] = [];
      for (const fc of converted) {
        all.push(...normalizeToMapFeatures(fc));
      }
      return all;
    }
    return normalizeToMapFeatures(converted as FeatureCollection);
  }

  throw new Error(`Unsupported spatial format: ${file.name}. Please upload GeoJSON, KML, or Shapefile zip.`);
}

export function normalizeToMapFeatures(geojson: any): MapFeature[] {
  let features: Feature<Geometry, any>[] = [];

  if (geojson.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    features = geojson.features;
  } else if (geojson.type === "Feature") {
    features = [geojson];
  } else if (geojson.type && geojson.coordinates) {
    features = [{ type: "Feature", geometry: geojson, properties: {} }];
  }

  return features.map((f, i) => {
    const props = f.properties || {};
    const id = props.id || props._id || `feat-${Date.now()}-${i}`;
    const name = props.name || props.title || props.NAME || `Feature ${i + 1}`;

    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        id: String(id),
        name: String(name),
        description: props.description || "",
        category: props.category || "Imported",
        fillColor: props.fillColor || props.fill || "#3b82f6",
        fillOpacity: props.fillOpacity !== undefined ? props.fillOpacity : 0.4,
        strokeColor: props.strokeColor || props.stroke || "#1d4ed8",
        strokeWidth: props.strokeWidth || 2,
        color: props.color || "#3b82f6",
        tags: props,
        source: "imported",
        createdAt: new Date().toISOString(),
      },
    } as MapFeature;
  });
}
