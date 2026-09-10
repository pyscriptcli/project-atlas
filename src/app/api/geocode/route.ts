import { NextRequest, NextResponse } from 'next/server';

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
        'User-Agent': 'ProjectAtlas/1.0',
      },
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
