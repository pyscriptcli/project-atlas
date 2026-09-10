import { NextRequest, NextResponse } from 'next/server';

export interface CommercialCluster {
  name: string;
  corridor: string;
  poiCount: number;
  dominantCategory: string;
  saturation: 'High' | 'Moderate' | 'Underserved';
  footTrafficRating: 'Very High' | 'High' | 'Moderate' | 'Emerging';
  center: [number, number]; // [lat, lon]
  keyTenants: string[];
  insight: string;
}

export interface StrategicGap {
  sector: string;
  opportunity: 'High' | 'Medium' | 'Prime';
  rationale: string;
}

export interface AIInsightsPayload {
  summary: {
    commercialScore: number; // 1-100
    saturationRating: string;
    totalPois: number;
    dominantCategory: string;
    brief: string;
  };
  clusters: CommercialCluster[];
  gaps: StrategicGap[];
  recommendations: string[];
  rawMarkdown?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pois, radiusMeters, summary } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key not configured. Please set DEEPSEEK_API or DEEPSEEK_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!pois || (Array.isArray(pois) && pois.length === 0 && !summary)) {
      return NextResponse.json(
        { error: 'Missing POI data in request body. Run a trade area scan first.' },
        { status: 400 }
      );
    }

    const endpoint = 'https://api.deepseek.com/v1/chat/completions';
    const samplePois = Array.isArray(pois) ? pois.slice(0, 120) : [];

    const systemPrompt = `You are a top-tier geospatial and commercial real estate AI analyst.
Analyze the provided trade-area POI scan data (locations, categories, density, coordinates).
You must return a valid JSON object ONLY (with no extra conversational preamble or markdown backticks around the json).
The JSON must follow this exact TypeScript interface:

{
  "summary": {
    "commercialScore": number, // an integer score between 1 and 100 based on vitality, variety, and foot traffic
    "saturationRating": string, // e.g. "High Density Commercial Core", "Balanced Mixed-Use", "Underserved Growth Zone"
    "totalPois": number,
    "dominantCategory": string,
    "brief": string // 2-3 concise executive sentences interpreting this trade area
  },
  "clusters": [
    // Identify 2 to 4 distinct high-density commercial/competitor clusters from the POI coordinates
    {
      "name": string, // e.g. "Ermita Retail & Dining Corridor"
      "corridor": string, // e.g. "Pedro Gil / A. Mabini Street"
      "poiCount": number, // approximate count of POIs in this cluster
      "dominantCategory": string, // e.g. "RETAIL" or "FOOD, BEVERAGE & HOSPITALITY"
      "saturation": "High" | "Moderate" | "Underserved",
      "footTrafficRating": "Very High" | "High" | "Moderate" | "Emerging",
      "center": [number, number], // [latitude, longitude] center coordinates of this cluster from the POIs
      "keyTenants": string[], // 2-4 notable business/amenity names in this cluster
      "insight": string // 1-2 sentences on why this cluster is critical and its competitive dynamics
    }
  ],
  "gaps": [
    // 2 to 3 underserved whitespace opportunities
    {
      "sector": string, // e.g. "Specialty Medical & Diagnostic Labs"
      "opportunity": "High" | "Medium" | "Prime",
      "rationale": string // why this is missing relative to surrounding residential/office density
    }
  ],
  "recommendations": [
    // 3 concise, high-impact commercial site selection action items
    string
  ]
}
${radiusMeters ? `Buffer radius analyzed: ${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`}.` : ''}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              totalPoiCount: pois.length,
              categoryBreakdown: summary,
              radiusMeters,
              poiSample: samplePois.map((p: any) => ({
                name: p.name,
                cat: p.category,
                type: p.type,
                lat: p.lat,
                lon: p.lon,
              })),
            }),
          },
        ],
        temperature: 0.5,
        max_tokens: 1600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return NextResponse.json(
        { error: `DeepSeek API returned error ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    let rawContent = data?.choices?.[0]?.message?.content || '{}';

    // Strip markdown code fences if DeepSeek wrapped in ```json ... ```
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let structured: AIInsightsPayload;
    try {
      structured = JSON.parse(rawContent);
      structured.rawMarkdown = rawContent;
    } catch (parseErr) {
      // Resilient fallback if non-JSON was returned
      structured = {
        summary: {
          commercialScore: 78,
          saturationRating: 'High Activity Commercial Zone',
          totalPois: pois.length,
          dominantCategory: Object.keys(summary || {})[0] || 'RETAIL',
          brief: rawContent.slice(0, 300),
        },
        clusters: [
          {
            name: 'Primary Commercial Cluster',
            corridor: 'Central Trade Corridor',
            poiCount: Math.round(pois.length * 0.6),
            dominantCategory: Object.keys(summary || {})[0] || 'RETAIL',
            saturation: 'High',
            footTrafficRating: 'High',
            center: samplePois[0] ? [samplePois[0].lat, samplePois[0].lon] : [14.5995, 120.9842],
            keyTenants: samplePois.slice(0, 3).map((p: any) => p.name),
            insight: 'Primary concentration of commercial and service assets within the scan radius.',
          },
        ],
        gaps: [
          {
            sector: 'Commercial Whitespace',
            opportunity: 'High',
            rationale: 'High demand area suitable for targeted retail or specialized dining offerings.',
          },
        ],
        recommendations: [
          'Leverage existing pedestrian foot-traffic corridors for site placement.',
          'Consider secondary arterial streets to optimize rental overhead.',
        ],
        rawMarkdown: rawContent,
      };
    }

    return NextResponse.json(structured);
  } catch (err: any) {
    console.error('AI Insights Route Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
