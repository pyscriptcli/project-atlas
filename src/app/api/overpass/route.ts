import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export async function POST(req: NextRequest) {
  try {
    const { query, timeout = 30 } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Direct fast Overpass HTTP POST queries with rapid multi-mirror failover
    for (const endpoint of OVERPASS_ENDPOINTS) {
      if (req.signal?.aborted) {
        return NextResponse.json({ error: 'Request aborted by client' }, { status: 499 });
      }

      try {
        const controller = new AbortController();
        const perAttemptTimeout = Math.min(timeout, 14); // Quick 14s failover between mirrors
        const tid = setTimeout(() => controller.abort(), perAttemptTimeout * 1000);

        // Chain client abort signal if client cancels
        if (req.signal) {
          req.signal.addEventListener('abort', () => controller.abort());
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'AtlasGIS/3.0 (https://github.com/pyscriptcli/project-atlas)',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch (err: any) {
        // Continue to next mirror immediately on timeout or error
      }
    }

    return NextResponse.json(
      { error: 'All Overpass endpoints failed to respond in time. Please try a slightly smaller radius or fewer tags.' },
      { status: 504 }
    );
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Cancelled' }, { status: 499 });
    }
    console.error('Overpass proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
