import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/insights
 *
 * Accepts scanned POI records and requests an AI market analysis from DeepSeek.
 * Supports DEEPSEEK_API_KEY and DEEPSEEK_API environment variables.
 */
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
    const systemPrompt = `You are an expert geospatial and commercial real estate AI analyst.
Analyze the following trade-area scan data (POIs, categories, density, and spatial distribution).
Provide a structured, executive-ready markdown report with:
1. **Executive Summary** (Total POIs, category distribution, top commercial drivers)
2. **Competitive Density & Clusters** (Key clusters, anchor tenants, foot traffic generators)
3. **Market Gaps & Business Opportunities** (Underserved retail/dining/service sectors, whitespace opportunities)
4. **Strategic Recommendations** (Actionable site selection and commercial strategy advice)
${radiusMeters ? `Note: Buffer area radius is ${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`}.` : ''}`;

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
          { role: 'user', content: JSON.stringify({ pois: Array.isArray(pois) ? pois.slice(0, 150) : pois, summary, radiusMeters }) },
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    const insight = data?.choices?.[0]?.message?.content || 'No insight returned.';
    return NextResponse.json({ insight });
  } catch (err: any) {
    console.error('AI Insights Route Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
