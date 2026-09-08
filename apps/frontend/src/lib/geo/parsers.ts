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

  if (fileName.endsWith(".kmz")) {
    const JSZip = (await import("jszip")).default;
    const archive = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = Object.values(archive.files).find(item => !item.dir && item.name.toLowerCase().endsWith(".kml"));
    if (!entry) throw new Error("The KMZ archive does not contain a KML document.");
    const dom = new DOMParser().parseFromString(await entry.async("text"), "text/xml");
    if (dom.querySelector("parsererror")) throw new Error("The KML document is malformed.");
    return normalizeToMapFeatures(kml(dom));
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

  throw new Error(`Unsupported spatial format: ${file.name}. Please upload GeoJSON, KML, KMZ, or a Shapefile zip.`);
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

  return features.flatMap((f, i) => {
    const props = f.properties || {};
    const id = props.id || props._id || `feat-${Date.now()}-${i}`;
    const name = props.name || props.title || props.NAME || `Feature ${i + 1}`;

    const makeFeature=(geometry:Geometry,suffix="")=>({
      type: "Feature",
      geometry,
      properties: {
        id: `${String(id)}${suffix}`,
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
    } as MapFeature);
    if(f.geometry.type==="MultiPoint") return f.geometry.coordinates.map((coordinate,index)=>makeFeature({type:"Point",coordinates:coordinate},`-${index}`));
    return [makeFeature(f.geometry)];
  });
}
