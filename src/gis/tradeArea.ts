import { GISFeature } from '../types/gis';
import { calcBounds, pointInPolygon } from './polygons';

export const POI_CONFIG: Record<string, [string, string][]> = {
  "COMMERCIAL & OFFICES": [
    ['Corporate Office', '"building"~"office|commercial",i'],
    ['IT/Tech Center', '"office"~"it|telecommunication",i'],
    ['Business Center', '"building"="commercial"'],
    ['Bank', '"amenity"="bank"'],
    ['ATM', '"amenity"="atm"'],
    ['Office', '"office"="yes"'],
  ],
  "RETAIL": [
    ['Mall/Department Store', '"shop"~"mall|department_store",i'],
    ['Supermarket', '"shop"~"market|grocery",i'],
    ['Convenience Store', '"shop"="convenience"'],
    ['Pharmacy', '"amenity"="pharmacy"'],
    ['Hardware', '"shop"~"hardware|doityourself",i'],
    ['General Shops', '"shop"~"boutique|clothes|shoes",i'],
    ['Marketplace', '"amenity"="marketplace"'],
  ],
  "FOOD, BEVERAGE & HOSPITALITY": [
    ['Restaurant', '"amenity"="restaurant"'],
    ['Cafe/Coffee Shop', '"amenity"~"cafe|coffee",i'],
    ['Fast Food', '"amenity"="fast_food"'],
    ['Bar/Pub/Nightclub', '"amenity"~"bar|pub|nightclub",i'],
    ['Bakery/Pastry', '"shop"="bakery"'],
    ['Food court', '"amenity"="food_court"'],
    ['Hotel', '"tourism"="hotel"'],
    ['Hostel', '"tourism"="hostel"'],
  ],
  "RESIDENTIAL": [
    ['Apartments', '"building"="apartments"'],
    ['House', '"building"="house"'],
    ['Residential Area', '"landuse"="residential"'],
    ['Condominium', '"building"="residential"'],
  ],
  "INDUSTRIAL & LOGISTICS": [
    ['Expressway Exits', '"highway"~"motorway_junction|toll_gantry",i'],
    ['Ports & Terminals', '"industrial"="port"'],
    ['Manufacturing Plants', '"industrial"~"factory|manufacturing|processing",i'],
    ['Warehouses & Depots', '"building"~"warehouse|depot",i'],
    ['Industrial Parks', '"landuse"~"industrial|industrial_estate",i'],
  ],
  "HEALTH & EMERGENCY SERVICES": [
    ['Hospital', '"amenity"~"hospital|clinic",i'],
    ['Clinic', '"amenity"="clinic"'],
    ['Pharmacy', '"amenity"="pharmacy"'],
    ['Police Station', '"amenity"="police"'],
    ['Fire Station', '"amenity"="fire_station"'],
  ],
  "GOVERNMENT, EDUCATION & INFRASTRUCTURE": [
    ['City Hall', '"amenity"="townhall"'],
    ['Airport Terminal', '"aeroway"~"terminal|aerodrome",i'],
    ['University/College', '"amenity"~"university|college",i'],
    ['K-12 School', '"amenity"="school"'],
    ['Post Office', '"amenity"="post_office"'],
  ],
  "LEISURE, SPORTS & PUBLIC SPACES": [
    ['Church', '"religion"="christian"'],
    ['Mosque', '"religion"="muslim"'],
    ['Cinema', '"amenity"="cinema"'],
    ['Fuel', '"amenity"="fuel"'],
    ['Parking', '"amenity"="parking"'],
    ['Sports centre', '"leisure"="sports_centre"'],
    ['Busstop', '"highway"="bus_stop"'],
  ],
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export async function robustOverpassFetch(query: string, timeout = 90): Promise<any | null> {
  // First check if FastAPI backend or Next.js route is responding
  try {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, timeout }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fall back to direct browser overpass endpoints
  }

  for (const endpoint of OVERPASS_ENDPOINTS) {
    let retries = 5;
    let delay = 1000;
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeout * 1000);
        const url = `${endpoint}?data=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);

        if (res.status === 429 || res.status === 503 || res.status === 504) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.elements) throw new Error("Malformed JSON response");
        return data;
      } catch (err) {
        retries--;
        if (retries === 0) break;
        await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
        delay *= 2;
      }
    }
  }
  return null;
}

export interface ScanResult {
  features: {
    name: string;
    lat: number;
    lon: number;
    tags: Record<string, string>;
  }[];
  counts: Record<string, number>;
}

export async function scanTradeAreaPOIs(
  targetPoly: GISFeature,
  selectedTags: string[],
  customSearch?: string
): Promise<ScanResult | null> {
  const bnd = calcBounds(targetPoly);
  if (!bnd) return null;

  const bbox = `${bnd[0][1]},${bnd[0][0]},${bnd[1][1]},${bnd[1][0]}`;
  const allTags = [...selectedTags];

  if (customSearch && customSearch.trim()) {
    const cs = customSearch.trim();
    if (cs.includes('=')) {
      const [k, v] = cs.split('=');
      allTags.push(`"${k}"="${v}"`);
    } else {
      allTags.push(`"amenity"~"${cs}",i`);
    }
  }

  if (!allTags.length) return null;

  let queryParts = '';
  allTags.forEach((rawTag) => {
    if (rawTag.includes('~')) {
      const parts = rawTag.split('~');
      const k = parts[0].replace(/"/g, '');
      const v = parts[1].replace(/"/g, '').replace(',i', '');
      queryParts += `node["${k}"~"${v}",i](${bbox});way["${k}"~"${v}",i](${bbox});`;
    } else if (rawTag.includes('=')) {
      const parts = rawTag.split('=');
      const k = parts[0].replace(/"/g, '');
      const v = parts[1].replace(/"/g, '');
      queryParts += `node["${k}"="${v}"](${bbox});way["${k}"="${v}"](${bbox});`;
    }
  });

  const overpassQuery = `[out:json][timeout:25];(${queryParts});out center 100;`;
  const data = await robustOverpassFetch(overpassQuery);
  if (!data || !data.elements) return null;

  const polyCoords: [number, number][] = targetPoly.geometry.coordinates[0];
  const filtered = data.elements.filter((el: any) => {
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    return lat && lon && pointInPolygon([lon, lat], polyCoords);
  });

  const counts: Record<string, number> = {};
  const features = filtered.map((el: any) => {
    const poiName =
      (el.tags && (el.tags.name || el.tags.amenity || el.tags.shop || el.tags.building)) || 'POI';
    counts[poiName] = (counts[poiName] || 0) + 1;
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    return {
      name: poiName,
      lat,
      lon,
      tags: el.tags || { name: poiName, type: 'custom' },
    };
  });

  return { features, counts };
}
