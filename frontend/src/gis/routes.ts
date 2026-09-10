import { haversineDist } from './circles';

export interface RouteResult {
  geometry: any;
  distance: number;
  duration: number;
  description: string;
  routingFailed: boolean;
}

/**
 * Robust multi-point route calculation using OSRM with straight-line fallback
 */
export async function fetchMultiPointRoute(
  waypoints: [number, number][],
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult> {
  const coordStr = waypoints.map((p) => `${p[0]},${p[1]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${mode}/${coordStr}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();

    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      const dist = route.distance;
      const dur = route.duration;
      const distStr = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;
      const durStr = dur > 3600 ? `${(dur / 3600).toFixed(1)} hr` : `${Math.round(dur / 60)} min`;
      const desc = `${distStr} · ${durStr}`;

      return {
        geometry: route.geometry,
        distance: dist,
        duration: dur,
        description: desc,
        routingFailed: false,
      };
    } else {
      throw new Error('No route returned by OSRM');
    }
  } catch (err) {
    console.warn('OSRM routing failed, falling back to straight-line:', err);
    return {
      geometry: { type: 'LineString', coordinates: waypoints },
      distance: 0,
      duration: 0,
      description: 'Routing unavailable – straight line shown',
      routingFailed: true,
    };
  }
}

/**
 * Finds the nearest line segment and inserts a new waypoint
 */
export function insertWaypoint(
  waypoints: [number, number][],
  point: [number, number]
): [number, number][] {
  if (waypoints.length < 2) return [...waypoints, point];

  let bestIdx = -1;
  let bestDist = 1e12;
  const newWaypoints = [...waypoints];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversineDist(waypoints[i], point) + haversineDist(point, waypoints[i + 1]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i + 1;
    }
  }

  if (bestIdx !== -1) {
    newWaypoints.splice(bestIdx, 0, point);
  } else {
    newWaypoints.push(point);
  }
  return newWaypoints;
}
