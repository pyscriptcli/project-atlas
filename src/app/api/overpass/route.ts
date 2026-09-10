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

    // 1. Attempt local/configured FastAPI spatial backend if available
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
      // Fall through to Overpass multi-endpoint failover
    }

    // 2. Direct Overpass HTTP POST queries with failover
    for (const endpoint of OVERPASS_ENDPOINTS) {
      let retries = 3;
      let delay = 1000;
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), timeout * 1000);

          // Use POST with form data 'data=...' and custom User-Agent to prevent 414 URI Too Long and rate limiting
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'User-Agent': 'OpenNode/3.1 (https://github.com/pyscriptcli/project-atlas)',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          clearTimeout(tid);

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          const data = await res.json();
          return NextResponse.json(data);
        } catch (err: any) {
          retries--;
          if (retries === 0) break;
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }

    return NextResponse.json(
      { error: 'All Overpass endpoints failed to respond. Please try reducing the radius or selecting fewer categories.' },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Overpass proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
