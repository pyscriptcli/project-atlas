import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

export async function POST(req: NextRequest) {
  try {
    const { query, timeout = 90 } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Attempt FastAPI backend if running
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    try {
      const fastRes = await fetch(`${fastApiUrl}/api/overpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, timeout }),
      });
      if (fastRes.ok) {
        const data = await fastRes.json();
        return NextResponse.json(data);
      }
    } catch (e) {
      // Fall through to direct Overpass failover
    }

    // Direct multi-endpoint failover
    for (const endpoint of OVERPASS_ENDPOINTS) {
      let retries = 3;
      let delay = 1000;
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), timeout * 1000);
          const url = `${endpoint}?data=${encodeURIComponent(query)}`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(tid);

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return NextResponse.json(data);
        } catch (err) {
          retries--;
          if (retries === 0) break;
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }

    return NextResponse.json(
      { error: 'All Overpass endpoints failed to respond' },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
