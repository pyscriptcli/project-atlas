import { GISFeature } from '../types/gis';
import { calcBounds, pointInPolygon } from './polygons';

// Full 7-category taxonomy ported directly from proven Open Node GIS engine
export const POI_CONFIG: Record<string, [string, string][]> = {
  "RETAIL": [
    ['Mall/Department Store', '"shop"~"mall|department_store",i'],
    ['Supermarket', '"shop"~"market|grocery",i'],
    ['Convenience Store', '"shop"="convenience"'],
    ['Pharmacy', '"amenity"="pharmacy"'],
    ['Hardware', '"shop"~"hardware|doityourself",i'],
    ['General Shops', '"shop"~"boutique|clothes|shoes",i'],
    ['Beauty', '"shop"="beauty"'],
    ['Bicycle', '"shop"="bicycle"'],
    ['Books/Stationary', '"shop"~"books|stationary",i'],
    ['Car', '"shop"="car"'],
    ['Chemist', '"shop"="chemist"'],
    ['Clothes', '"shop"="clothes"'],
    ['Copyshop', '"shop"="copyshop"'],
    ['Cosmetics', '"shop"="cosmetics"'],
    ['Department store', '"shop"="department_store"'],
    ['DIY/hardware', '"shop"~"hardware|doityourself",i'],
    ['Garden centre', '"shop"="garden_centre"'],
    ['General', '"shop"="general"'],
    ['Gift', '"shop"="gift"'],
    ['Hairdresser', '"shop"="hairdresser"'],
    ['Jewelry', '"shop"="jewelry"'],
    ['Kiosk', '"shop"="kiosk"'],
    ['Leather', '"shop"="leather"'],
    ['Marketplace', '"amenity"="marketplace"'],
    ['Musical instrument', '"shop"="musical_instrument"'],
    ['Optician', '"shop"="optician"'],
    ['Pets', '"shop"="pets"'],
    ['Phone', '"shop"="mobile_phone"'],
    ['Photo', '"shop"="photo"'],
    ['Shoes', '"shop"="shoes"'],
    ['Shopping centre', '"shop"="mall"'],
    ['Textiles', '"shop"="textiles"'],
    ['Toys', '"shop"="toys"'],
    ['Travel agency', '"shop"="travel_agency"'],
  ],
  "FOOD, BEVERAGE & HOSPITALITY": [
    ['Restaurant', '"amenity"="restaurant"'],
    ['Cafe/Coffee Shop', '"amenity"~"cafe|coffee",i'],
    ['Fast Food', '"amenity"="fast_food"'],
    ['Bar/Pub/Nightclub', '"amenity"~"bar|pub|nightclub",i'],
    ['Bakery/Pastry', '"shop"="bakery"'],
    ['BBQ', '"amenity"="bbq"'],
    ['Biergarten', '"amenity"="biergarten"'],
    ['Food court', '"amenity"="food_court"'],
    ['Ice cream', '"amenity"="ice_cream"'],
    ['Pub', '"amenity"="pub"'],
    ['Hotel', '"tourism"="hotel"'],
    ['Motel', '"tourism"="motel"'],
    ['Alpine Hut', '"tourism"="alpine_hut"'],
    ['Apartment', '"tourism"="apartment"'],
    ['Camp Site', '"tourism"="camp_site"'],
    ['Chalet', '"tourism"="chalet"'],
    ['Guest House', '"tourism"="guest_house"'],
    ['Hostel', '"tourism"="hostel"'],
    ['Casino', '"amenity"="casino"'],
  ],
  "RESIDENTIAL": [
    ['Apartments', '"building"="apartments"'],
    ['House', '"building"="house"'],
    ['Residential Area', '"landuse"="residential"'],
    ['Condominium', '"building"="residential"'],
    ['City', '"place"="city"'],
    ['Town', '"place"="town"'],
    ['Village', '"place"="village"'],
    ['Hamlet', '"place"="hamlet"'],
    ['Suburb', '"place"="suburb"'],
    ['Construction', '"landuse"="construction"'],
  ],
  "INDUSTRIAL & LOGISTICS": [
    ['Expressway Exits', '"highway"~"motorway_junction|toll_gantry",i'],
    ['Ports & Terminals', '"industrial"="port"'],
    ['Manufacturing Plants', '"industrial"~"factory|manufacturing|processing",i'],
    ['Cold Storage Facilities', '"warehouse"~"cold_store|cold_storage",i'],
    ['Industrial Parks/Estates', '"landuse"~"industrial|industrial_estate",i'],
    ['Warehouses & Depots', '"building"~"warehouse|depot",i'],
    ['Storage Facilities', '"building"="storage"'],
    ['Truck Access Routes (HGV)', '"hgv"~"designated|yes",i'],
  ],
  "HEALTH & EMERGENCY SERVICES": [
    ['Hospital', '"amenity"~"hospital|clinic",i'],
    ['Clinic', '"amenity"="clinic"'],
    ['Pharmacy', '"amenity"="pharmacy"'],
    ['Police Station', '"amenity"="police"'],
    ['Fire Station', '"amenity"="fire_station"'],
    ['Firestation', '"amenity"="fire_station"'],
    ['Police', '"amenity"="police"'],
    ['Hospital Adv', '"amenity"="hospital"'],
    ['Defibrillator - AED', '"emergency"="defibrillator"'],
    ['Fire hose/extinguisher', '"emergency"~"fire_hose|fire_extinguisher",i'],
  ],
  "GOVERNMENT, EDUCATION & INFRASTRUCTURE": [
    ['City Hall', '"amenity"="townhall"'],
    ['Airport Terminal', '"aeroway"~"terminal|aerodrome",i'],
    ['University/College', '"amenity"~"university|college",i'],
    ['K-12 School', '"amenity"="school"'],
    ['Vocational/Other', '"amenity"="learning_centre"'],
    ['Embassy', '"amenity"="embassy"'],
    ['Library', '"amenity"="library"'],
    ['Music School', '"amenity"="music_school"'],
    ['Letter Box', '"amenity"="letter_box"'],
    ['Post Office', '"amenity"="post_office"'],
    ['School/College', '"amenity"~"school|college",i'],
    ['University', '"amenity"="university"'],
    ['Kindergarten', '"amenity"="kindergarten"'],
    ['Public camera', '"man_made"="surveillance"'],
  ],
  "LEISURE, SPORTS & PUBLIC SPACES": [
    ['Church', '"religion"="christian"'],
    ['Mosque', '"religion"="muslim"'],
    ['Buddhist Temple', '"religion"="buddhist"'],
    ['Hindu Temple', '"religion"="hindu"'],
    ['Synagogue', '"religion"="jewish"'],
    ['Cemetery', '"landuse"="cemetery"'],
    ['Spa', '"leisure"="spa"'],
    ['Sauna', '"leisure"="sauna"'],
    ['Bench', '"amenity"="bench"'],
    ['Bicycle Parking', '"amenity"="bicycle_parking"'],
    ['Bicycle Rental', '"amenity"="bicycle_rental"'],
    ['Cinema', '"amenity"="cinema"'],
    ['Fuel', '"amenity"="fuel"'],
    ['Parking', '"amenity"="parking"'],
    ['Taxi', '"amenity"="taxi"'],
    ['Theatre', '"amenity"="theatre"'],
    ['Toilets', '"amenity"="toilets"'],
    ['American football', '"sport"="american_football"'],
    ['Baseball', '"sport"="baseball"'],
    ['Basketball', '"sport"="basketball"'],
    ['Cycling', '"sport"="cycling"'],
    ['Gymnastics', '"sport"="gymnastics"'],
    ['Golf', '"sport"="golf"'],
    ['Hockey', '"sport"="hockey"'],
    ['Horse racing', '"sport"="horse_racing"'],
    ['Ice hockey', '"sport"="ice_hockey"'],
    ['Soccer', '"sport"="soccer"'],
    ['Sports centre', '"leisure"="sports_centre"'],
    ['Surfing', '"sport"="surfing"'],
    ['Swimming', '"sport"="swimming"'],
    ['Tennis', '"sport"="tennis"'],
    ['Volleyball', '"sport"="volleyball"'],
    ['Busstop', '"highway"="bus_stop"'],
    ['E-bike charging', '"amenity"="charging_station"'],
    ['Recycling', '"amenity"="recycling"'],
  ],
};

export const CATEGORY_COLORS: Record<string, string> = {
  "RETAIL": "#002244", // Dark Navy Blue
  "FOOD, BEVERAGE & HOSPITALITY": "#d4af37", // Gold
  "RESIDENTIAL": "#0a192f", // Deep Midnight Navy
  "INDUSTRIAL & LOGISTICS": "#112240", // Dark Steel Navy
  "HEALTH & EMERGENCY SERVICES": "#fbbf24", // Warm Gold
  "GOVERNMENT, EDUCATION & INFRASTRUCTURE": "#001f3f", // Rich Navy
  "LEISURE, SPORTS & PUBLIC SPACES": "#b45309", // Deep Amber Gold
};

export interface ScannedPOI {
  name: string;
  type: string;
  category: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface ScanResult {
  features: ScannedPOI[];
  counts: Record<string, number>;
  categoryCounts: Record<string, number>;
}

/**
 * Robust fetch helper via our Next.js API proxy (which handles multi-endpoint failover and POST data encoding)
 */
export async function robustOverpassFetch(query: string, timeout = 90): Promise<any | null> {
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
    console.error('Overpass fetch failed:', e);
  }
  return null;
}

/**
 * Scan POIs around a center coordinate and radius in meters (exact working logic from Open Node Streamlit).
 */
export async function scanTradeAreaCoordinates(
  lat: number,
  lon: number,
  radius: number,
  selectedTags: string[],
  customTag?: string
): Promise<ScanResult | null> {
  const tagsToQuery = [...selectedTags];
  if (customTag && customTag.trim()) {
    const cs = customTag.trim();
    if (cs.includes('=')) {
      const [k, v] = cs.split('=');
      tagsToQuery.push(`"${k.trim()}"="${v.trim()}"`);
    } else {
      tagsToQuery.push(`"amenity"~"${cs}",i`);
    }
  }

  if (tagsToQuery.length === 0) return null;

  // Build QL statements around coordinates
  const statements = tagsToQuery
    .map((tag) => `  nwr[${tag}](around:${radius},${lat},${lon});`)
    .join('\n');

  const ql = `[out:json][timeout:90];(\n${statements}\n);\nout center;`;

  const data = await robustOverpassFetch(ql);
  if (!data || !data.elements) return null;

  return processOverpassElements(data.elements, selectedTags);
}

/**
 * Scan POIs inside an existing GIS polygon feature.
 */
export async function scanTradeAreaPolygon(
  targetPoly: GISFeature,
  selectedTags: string[],
  customTag?: string
): Promise<ScanResult | null> {
  const bnd = calcBounds(targetPoly);
  if (!bnd) return null;

  const bbox = `${bnd[0][1]},${bnd[0][0]},${bnd[1][1]},${bnd[1][0]}`;
  const tagsToQuery = [...selectedTags];

  if (customTag && customTag.trim()) {
    const cs = customTag.trim();
    if (cs.includes('=')) {
      const [k, v] = cs.split('=');
      tagsToQuery.push(`"${k.trim()}"="${v.trim()}"`);
    } else {
      tagsToQuery.push(`"amenity"~"${cs}",i`);
    }
  }

  if (tagsToQuery.length === 0) return null;

  const statements = tagsToQuery
    .map((tag) => `  nwr[${tag}](${bbox});`)
    .join('\n');

  const ql = `[out:json][timeout:90];(\n${statements}\n);\nout center;`;
  const data = await robustOverpassFetch(ql);
  if (!data || !data.elements) return null;

  // Filter with point-in-polygon if polygon coordinates are present
  let elements = data.elements;
  if (targetPoly.geometry && targetPoly.geometry.coordinates) {
    const polyCoords: [number, number][] = targetPoly.geometry.coordinates[0];
    elements = elements.filter((el: any) => {
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);
      return lat && lon && pointInPolygon([lon, lat], polyCoords);
    });
  }

  return processOverpassElements(elements, selectedTags);
}

function processOverpassElements(elements: any[], selectedTags: string[]): ScanResult {
  const counts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const features: ScannedPOI[] = [];

  elements.forEach((el: any) => {
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    if (!lat || !lon) return;

    const tags = el.tags || {};
    const name = tags.name || tags['brand'] || tags.amenity || tags.shop || tags.building || 'Unnamed Location';
    const poiType = tags.amenity || tags.shop || tags.building || tags.office || tags.tourism || tags.leisure || 'POI';

    // Identify which high-level category this belongs to
    let category = 'OTHER';
    for (const [catName, items] of Object.entries(POI_CONFIG)) {
      if (items.some(([_, tagQuery]) => {
        const cleanTag = tagQuery.replace(/"/g, '').toLowerCase();
        return Object.entries(tags).some(([k, v]) => `${k}=${v}`.toLowerCase().includes(cleanTag.split('=')[0]));
      })) {
        category = catName;
        break;
      }
    }

    counts[poiType] = (counts[poiType] || 0) + 1;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    features.push({
      name: String(name),
      type: String(poiType),
      category,
      lat,
      lon,
      tags,
    });
  });

  return { features, counts, categoryCounts };
}
