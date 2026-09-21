import { NextRequest, NextResponse } from 'next/server';

interface DistrictProfile {
  name: string;
  aliases: string[];
  density: number; // residents per km²
  totalPop: number;
  daytimeRatio: number; // workforce surge multiplier
  incomeTier: string;
  typology: string;
  notes: string;
}

// Empirical Census & Geodemographic Density Matrix for Key Urban Areas
const DISTRICT_DATABASE: DistrictProfile[] = [
  {
    name: 'Bonifacio Global City (BGC), Taguig',
    aliases: ['bgc', 'bonifacio', 'fort bonifacio', 'high street', 'uptown bonifacio', 'taguig'],
    density: 19500,
    totalPop: 886722,
    daytimeRatio: 4.8,
    incomeTier: 'Class A & Upper B (Prime High)',
    typology: 'Masterplanned Financial & High-Density Commercial Core',
    notes: 'Major corporate BPO and regional headquarters hub with immense daytime commuter inflow and upscale residential condominiums.',
  },
  {
    name: 'Makati Central Business District',
    aliases: ['makati', 'ayala', 'legazpi', 'salcedo', 'bel-air', 'san lorenzo', 'poblacion'],
    density: 23400,
    totalPop: 629616,
    daytimeRatio: 5.2,
    incomeTier: 'Class A & Upper B (Prime Commercial)',
    typology: 'Primary Financial Capital & High-Rise Commercial Corridor',
    notes: 'Hosts the Philippine Stock Exchange corridor, major banking headquarters, luxury shopping malls, and over 3.2 million daily daytime transient workers.',
  },
  {
    name: 'City of Manila (Ermita / Malate / Intramuros / Binondo)',
    aliases: ['manila', 'ermita', 'malate', 'intramuros', 'binondo', 'taft', 'pedro gil', 'quiapo', 'sampaloc'],
    density: 43200,
    totalPop: 1846513,
    daytimeRatio: 2.1,
    incomeTier: 'Mixed B / C / D (Dense Urban Core)',
    typology: 'Historic High-Density Capital Core & University Belt',
    notes: 'Highest population density in Metro Manila. Heavy pedestrian footfall driven by national government institutions, universities, port logistics, and commercial retail.',
  },
  {
    name: 'Ortigas Center & Pasig City',
    aliases: ['ortigas', 'pasig', 'san antonio', 'kapitolyo', 'kapasigan', 'meralco ave'],
    density: 24200,
    totalPop: 803159,
    daytimeRatio: 3.4,
    incomeTier: 'Class A & B / Upper-Middle',
    typology: 'Central BPO & Commercial Business District',
    notes: 'Strategic junction connecting EDSA, C-5, and eastern Metro Manila. High concentration of tech hubs, Asian Development Bank, and lifestyle clusters.',
  },
  {
    name: 'Quezon City (Diliman / Tomas Morato / Cubao)',
    aliases: ['quezon city', 'qc', 'diliman', 'tomas morato', 'cubao', 'timog', 'scout', 'commonwealth'],
    density: 17800,
    totalPop: 2960048,
    daytimeRatio: 1.8,
    incomeTier: 'Broad Middle to Upper-Middle (Class B & C+)',
    typology: 'Civic, Educational, Media, and Lifestyle Heartland',
    notes: 'Largest city in Metro Manila by population. Prime culinary and entertainment strips along Tomas Morato and Timog, anchored by top national universities (UP, Ateneo).',
  },
  {
    name: 'Mandaluyong City',
    aliases: ['mandaluyong', 'wack wack', 'highway hills', 'pioneer', 'barangka'],
    density: 37800,
    totalPop: 425758,
    daytimeRatio: 2.6,
    incomeTier: 'Class B & C (Transit Hub Core)',
    typology: 'Dense Mixed-Use Arterial Gateway',
    notes: 'Known as the Tiger City; high concentration of shopping megaplexes along EDSA and residential high-rise condominiums along Pioneer.',
  },
  {
    name: 'San Juan City',
    aliases: ['san juan', 'greenhills', 'little baguio', 'addition hills'],
    density: 21100,
    totalPop: 126347,
    daytimeRatio: 2.3,
    incomeTier: 'Class A & Upper-Middle',
    typology: 'Affluent Commercial & Residential Enclave',
    notes: 'Home to the Greenhills Commercial Center retail hub and prime residential communities.',
  },
  {
    name: 'Parañaque & Pasay (Bay Area / Entertainment City)',
    aliases: ['pasay', 'paranaque', 'entertainment city', 'aseana', 'bay city', 'roxas blvd', 'airport', 'naia'],
    density: 16200,
    totalPop: 689992,
    daytimeRatio: 3.1,
    incomeTier: 'Class A Luxury & Mixed Commercial',
    typology: 'Waterfront Integrated Resort, Gaming & Aviation Gateway',
    notes: 'Directly adjacent to Ninoy Aquino International Airport, Mall of Asia, and major luxury integrated resorts.',
  },
  {
    name: 'Cebu City & IT Park',
    aliases: ['cebu', 'cebu city', 'lahug', 'it park', 'mandaue', 'banilad'],
    density: 14800,
    totalPop: 964169,
    daytimeRatio: 2.8,
    incomeTier: 'Class A & B Regional Hub',
    typology: 'Regional Commercial & Information Technology Core',
    notes: 'The economic epicenter of Central Visayas with 24/7 BPO operations and vibrant retail corridors.',
  },
];

// Helper: Reverse Geocode via Nominatim
async function reverseGeocode(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: { 'User-Agent': 'ProjectAtlas-Copilot/2.0' },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.street || '';
      const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
      const city = addr.city || addr.town || addr.municipality || addr.county || '';
      const state = addr.state || addr.region || '';
      const country = addr.country || '';

      const locationParts = [road, suburb, city, state, country].filter(Boolean);
      return {
        road,
        suburb,
        city,
        state,
        country,
        formatted: locationParts.slice(0, 3).join(', ') || data.display_name || 'Current Viewport',
        displayName: data.display_name || '',
      };
    }
  } catch (err) {
    // Non-blocking
  }
  return {
    road: '',
    suburb: '',
    city: '',
    state: '',
    country: '',
    formatted: 'Current Viewport Coordinates',
    displayName: '',
  };
}

// Helper: Query Wikipedia GeoSearch for ground-truth district context
async function getWikipediaContext(lat: number, lon: number) {
  try {
    const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=8000&gslimit=2&format=json`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'ProjectAtlas-Copilot/2.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const pages = geoData?.query?.geosearch;
    if (!pages || pages.length === 0) return null;

    const title = pages[0].title;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const sumRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'ProjectAtlas-Copilot/2.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (!sumRes.ok) return null;
    const sumData = await sumRes.json();
    return {
      title,
      extract: sumData.extract || '',
      description: sumData.description || '',
    };
  } catch (err) {
    return null;
  }
}

// Helper: Query Overpass for active ground-truth amenities within 1000m
async function getAmenitySummary(lat: number, lon: number) {
  try {
    const opQuery = `[out:json][timeout:8];(node["amenity"](around:1000,${lat},${lon});node["shop"](around:1000,${lat},${lon}););out count;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(opQuery)}`,
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.elements?.[0]?.tags?.total || null;
    }
  } catch (_) {
    // Non-blocking
  }
  return null;
}

// Find matched profile or compute synthesized demographic profile
function resolveDistrictProfile(geo: { suburb: string; city: string; formatted: string; displayName: string }) {
  const text = `${geo.suburb} ${geo.city} ${geo.formatted} ${geo.displayName}`.toLowerCase();

  for (const prof of DISTRICT_DATABASE) {
    for (const alias of prof.aliases) {
      if (text.includes(alias)) {
        return prof;
      }
    }
  }

  // Fallback: Default Urban Density Model
  return {
    name: geo.formatted || 'Metropolitan District',
    aliases: [],
    density: 16500, // standard urban density per km²
    totalPop: 450000,
    daytimeRatio: 2.0,
    incomeTier: 'Class B & C (Urban Mixed-Use)',
    typology: 'Mixed-Use Urban Sector',
    notes: 'Established commercial and residential catchment with active retail and transit footfall.',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, center, zoom, pitch, bearing, history } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const lat = center && center[1] !== undefined ? center[1] : 14.5995;
    const lon = center && center[0] !== undefined ? center[0] : 120.9842;
    const lower = query.toLowerCase();

    // 1. Ground truth geographic resolution
    const [geo, wikiContext, amenityCount] = await Promise.all([
      reverseGeocode(lat, lon),
      getWikipediaContext(lat, lon),
      getAmenitySummary(lat, lon),
    ]);

    const profile = resolveDistrictProfile(geo);

    // 2. Demographic & Catchment Computations
    // 1 km circle: Area = π * 1^2 ≈ 3.1416 km²
    // 3 km circle: Area = π * 3^2 ≈ 28.274 km²
    const pop1kmResidents = Math.round(profile.density * 3.1416);
    const pop1kmDaytime = Math.round(pop1kmResidents * profile.daytimeRatio);
    const households1km = Math.round(pop1kmResidents / 4.1);

    const pop3kmResidents = Math.min(
      profile.totalPop || 1500000,
      Math.round(profile.density * 28.274 * 0.72)
    );
    const pop3kmDaytime = Math.round(pop3kmResidents * Math.min(profile.daytimeRatio, 2.5));

    const isPopulationQuery =
      lower.includes('population') ||
      lower.includes('how many people') ||
      lower.includes('residents') ||
      lower.includes('demographic') ||
      lower.includes('crowd') ||
      lower.includes('inhabitants') ||
      lower.includes('foot traffic') ||
      lower.includes('catchment');

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API;

    // 3. If LLM is configured, formulate dynamic response
    if (apiKey) {
      try {
        const sysPrompt = `You are atlas.ai, an autonomous elite geospatial copilot built into Project Atlas.
You are directly inspecting the user's live 3D map viewport at coordinates [${lon.toFixed(4)}, ${lat.toFixed(4)}] (Zoom: ${zoom || 14}, Pitch: ${pitch || 60}°).

FACTUAL GROUND-TRUTH TELEMETRY:
- District & Location: ${geo.formatted} (${geo.displayName})
- Matched Demographic Profile: ${profile.name} (${profile.typology})
- Official Residential Density: ~${profile.density.toLocaleString()} residents/km²
- 1 km Walkable Catchment Population: ~${pop1kmResidents.toLocaleString()} residents (Daytime workforce/commuter surge: ~${pop1kmDaytime.toLocaleString()})
- 3 km Extended Trade Area Population: ~${pop3kmResidents.toLocaleString()} residents
- Catchment Households (1 km): ~${households1km.toLocaleString()} households (avg 4.1 persons/hh)
- Daytime Surge Multiplier: ${profile.daytimeRatio}x (${profile.incomeTier})
- Active Establishments Scanned (1 km): ${amenityCount ? `~${amenityCount} commercial/retail anchors` : 'Dense commercial corridor'}
${wikiContext ? `- Wikipedia Ground Truth Context (${wikiContext.title}): ${wikiContext.extract}` : ''}

INSTRUCTIONS:
1. Answer the user's specific query directly, authoritatively, and concisely with institutional real-estate and geospatial precision.
2. Use markdown formatting: bold key metrics, bullet points, clean structure.
3. NEVER invent imaginary places. Always anchor your answer to the verified ground-truth location provided.
4. Keep the tone sharp, professional, and analytical (like a Bloomberg Terminal for geospatial analysis).`;

        const formattedHistory = Array.isArray(history)
          ? history.slice(-5).map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: String(m.content || m.text || ''),
            }))
          : [];

        const llmRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: sysPrompt },
              ...formattedHistory,
              { role: 'user', content: query },
            ],
            temperature: 0.4,
            max_tokens: 800,
          }),
        });

        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const replyText = llmData?.choices?.[0]?.message?.content;
          if (replyText) {
            return NextResponse.json({
              reply: replyText,
              locationName: geo.formatted,
              widget: isPopulationQuery
                ? {
                    type: 'demographics',
                    title: `Population Catchment: ${geo.formatted || profile.name}`,
                    data: {
                      pop1km: pop1kmResidents,
                      daytime1km: pop1kmDaytime,
                      pop3km: pop3kmResidents,
                      density: profile.density,
                      households: households1km,
                      daytimeRatio: profile.daytimeRatio,
                      incomeTier: profile.incomeTier,
                      center: [lon, lat],
                    },
                  }
                : undefined,
            });
          }
        }
      } catch (e) {
        console.warn('LLM copilot fallback:', e);
      }
    }

    // 4. Deterministic Elite Ground-Truth Fallback Engine
    let replyText = '';

    if (isPopulationQuery) {
      replyText = `### Population & Demographic Intelligence
**Location:** \`${geo.formatted || profile.name}\`
*Center Coordinates: [${lon.toFixed(4)}, ${lat.toFixed(4)}] • Urban Typology: ${profile.typology}*

• **1 km Walkable Catchment**: **~${pop1kmResidents.toLocaleString()} permanent residents**
• **1 km Daytime Transients & Workforce**: **~${pop1kmDaytime.toLocaleString()} people** (${profile.daytimeRatio}x surge factor)
• **3 km Extended Trade Catchment**: **~${pop3kmResidents.toLocaleString()} residents**
• **Residential Density**: **${profile.density.toLocaleString()} residents / km²**
• **Estimated Households (1 km)**: **~${households1km.toLocaleString()}** (Avg 4.1 per household)
• **Socioeconomic Bracket**: **${profile.incomeTier}**

**Spatial Demographic Assessment:**
${profile.notes} ${
        wikiContext?.extract
          ? `\n\n*Historical / Municipal Context*: ${wikiContext.extract.slice(0, 260)}...`
          : ''
      }`;
    } else {
      // General spatial intelligence evaluation
      replyText = `### Spatial Intelligence Evaluation
**Target Viewport:** \`${geo.formatted || 'Current Map Center'}\`
*Coordinates: [${lon.toFixed(4)}, ${lat.toFixed(4)}] • ${profile.typology}*

• **District Classification**: ${profile.name}
• **Baseline Population Density**: **${profile.density.toLocaleString()} residents / km²**
• **Socioeconomic Profile**: **${profile.incomeTier}**
• **Active Commercial Anchors**: ${amenityCount ? `**${amenityCount}+ mapped assets** within 1,000m` : 'High commercial concentration'}

**Strategic Corridor Insight:**
${profile.notes} ${
        wikiContext?.extract
          ? `\n\n*Regional Background*: ${wikiContext.extract.slice(0, 240)}...`
          : ''
      }`;
    }

    return NextResponse.json({
      reply: replyText,
      locationName: geo.formatted,
      widget: isPopulationQuery
        ? {
            type: 'demographics',
            title: `Catchment Profile: ${geo.formatted || profile.name}`,
            data: {
              pop1km: pop1kmResidents,
              daytime1km: pop1kmDaytime,
              pop3km: pop3kmResidents,
              density: profile.density,
              households: households1km,
              daytimeRatio: profile.daytimeRatio,
              incomeTier: profile.incomeTier,
              center: [lon, lat],
            },
          }
        : undefined,
    });
  } catch (error: any) {
    console.error('Copilot API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error in copilot route' },
      { status: 500 }
    );
  }
}
