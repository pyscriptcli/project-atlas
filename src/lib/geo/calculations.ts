import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon, Point, Geometry } from "geojson";

export function createCircleFeature(
  center: [number, number],
  radiusMeters: number,
  properties: Record<string, any> = {}
): Feature<Polygon> {
  // turf.circle takes radius in kilometers by default
  const radiusKm = radiusMeters / 1000;
  const circle = turf.circle(center, radiusKm, {
    steps: 64,
    units: "kilometers",
    properties: {
      ...properties,
      radiusMeters,
    },
  });
  return circle;
}

export function calculateDistanceKm(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;
  const line = turf.lineString(coordinates);
  return turf.length(line, { units: "kilometers" });
}

export function calculateAreaSqMeters(geometry: Polygon | MultiPolygon): number {
  try {
    return turf.area(geometry);
  } catch (err) {
    return 0;
  }
}

export function isPointInsidePolygon(
  point: [number, number],
  polygon: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon
): boolean {
  try {
    const pt = turf.point(point);
    return turf.booleanPointInPolygon(pt, polygon as any);
  } catch (err) {
    return false;
  }
}

export function getFeatureBBox(feature: Feature<Geometry>): [number, number, number, number] {
  return turf.bbox(feature) as [number, number, number, number];
}
