import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { format = "geojson", features = [], projectName = "map_export" } = await req.json();

    const featureCollection = {
      type: "FeatureCollection",
      features,
    };

    if (format === "geojson" || format === "json") {
      return new NextResponse(JSON.stringify(featureCollection, null, 2), {
        headers: {
          "Content-Type": "application/geo+json",
          "Content-Disposition": `attachment; filename="${projectName}.geojson"`,
        },
      });
    }

    // Default fallback
    return NextResponse.json({ success: true, data: featureCollection });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Export failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
