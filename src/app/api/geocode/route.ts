import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // never cache this route

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length < 2) {
      return NextResponse.json([]);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
      q.trim()
    )}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ProjectAtlas/1.0 (https://github.com/pyscriptcli/project-atlas)',
        Accept: 'application/json',
      },
      // Prevent Node/Next from caching the upstream response
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim returned HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Geocoding request failed' },
      { status: 500 }
    );
  }
}
