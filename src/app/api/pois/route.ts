import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lon, radius = 1000, tags = [], timeout = 45 } = body;

    if (!lat || !lon || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters: lat, lon, tags (array)" },
        { status: 400 }
      );
    }

    // Build Overpass QL
    const statements = tags
      .map((tag: string) => `  nwr[${tag}](around:${radius},${lat},${lon});`)
      .join("\n");
    const ql = `[out:json][timeout:${timeout}];(\n${statements}\n);\nout center;`;

    let lastError: any = null;

    // Try endpoints with failover and retries
    for (const endpoint of ENDPOINTS) {
      let retries = 2;
      let delay = 1000;

      while (retries > 0) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), (timeout + 5) * 1000);

          const response = await fetch(
            `${endpoint}?data=${encodeURIComponent(ql)}`,
            {
              method: "GET",
              headers: {
                "User-Agent": "ProjectAtlas/1.0 (NextJS Geospatial Builder)",
                Accept: "application/json",
              },
              signal: controller.signal,
            }
          );
          clearTimeout(timer);

          if (response.status === 429 || response.status >= 500) {
            throw new Error(`HTTP status ${response.status}`);
          }

          if (!response.ok) {
            throw new Error(`Failed with status: ${response.statusText}`);
          }

          const data = await response.json();
          if (!data || !data.elements) {
            throw new Error("Malformed Overpass JSON response");
          }

          const results = [];
          for (const el of data.elements) {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (elLat === undefined || elLon === undefined) continue;

            const tagsDict = el.tags || {};
            const name = tagsDict.name || "Unknown";
            const poiType =
              tagsDict.amenity ||
              tagsDict.shop ||
              tagsDict.building ||
              tagsDict.office ||
              tagsDict.tourism ||
              tagsDict.highway ||
              "Node";

            results.push({
              lat: Number(elLat),
              lon: Number(elLon),
              name: String(name),
              type: String(poiType),
              tags: tagsDict,
            });
          }

          return NextResponse.json({
            success: true,
            endpoint,
            count: results.length,
            pois: results,
          });
        } catch (err: any) {
          lastError = err;
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 1.5;
          }
        }
      }
    }

    return NextResponse.json(
      {
        error: "All Overpass API endpoints failed or timed out",
        detail: lastError?.message || String(lastError),
      },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
