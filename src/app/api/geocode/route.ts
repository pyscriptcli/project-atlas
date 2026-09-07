import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&polygon_geojson=1&addressdetails=1&limit=6`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "ProjectAtlas/1.0 (contact: support@projectatlas.local)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding service error" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ results: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
