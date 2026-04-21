export async function POST(request) {
  try {
    const { partName, equipmentName, vesselContext, repairContext } = await request.json();

    if (!partName) {
      return Response.json({ error: 'No part name provided' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are a marine parts purchasing assistant. Use web search to find real products currently for sale.

Equipment: "${equipmentName || 'Unknown'}"
Vessel: "${vesselContext || 'Unknown'}"
Task: "${partName}"

IMPORTANT: Search using the specific equipment brand and model as your primary search terms. For example:
- If equipment is "Spectra Ventura 150D Watermaker", search for "Spectra Ventura 150D pre-filter cartridge" not just "watermaker filter"
- If equipment is "Yanmar 4JH45", search for "Yanmar 4JH45 impeller" not just "engine impeller"
- If equipment is "Lewmar windlass", search for the specific Lewmar model parts

Find 3-5 results — a mix of the exact consumable/service part AND the complete replacement unit if relevant. For each return:
- name: exact product name as listed (be specific — include brand, model, part number if known)
- type: "replacement" (complete unit) or "part" (service part/consumable)
- reason: one sentence on why this matches this specific equipment
- vendor: retailer name
- price: current price as string like "29.99" or null
- url: direct product page URL (preferred) or targeted search URL for this specific part

Return ONLY a JSON array, no markdown:
[{"name":"...","type":"replacement|part","reason":"...","vendor":"...","price":"XX.XX or null","url":"https://..."}]

Prioritize: Fisheries Supply, West Marine, Defender, Jamestown Distributors, then other marine retailers. Only include results that clearly match the specific equipment model.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    });

    if (res.status === 429) {
      return Response.json({ error: 'rate_limited', results: [] }, { status: 429 });
    }
    if (!res.ok) {
      return Response.json(
        { error: 'Search failed — please try again', results: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    const textBlock = (data.content || [])
      .filter(function (b) {
        return b.type === 'text';
      })
      .pop();
    if (!textBlock) return Response.json({ results: [] });

    const text = textBlock.text
      .trim()
      .replace(/```json|```/g, '')
      .trim();
    const match = text.match(/\[[\s\S]*\]/);

    let results = [];
    try {
      results = JSON.parse(match ? match[0] : '[]');
    } catch (e) {
      results = [];
    }

    results = results
      .filter(function (r) {
        return r && r.name && r.url;
      })
      .slice(0, 6)
      .map(function (r) {
        return {
          name: r.name,
          type: r.type || 'part',
          reason: r.reason || '',
          vendor: r.vendor || '',
          price: r.price || null,
          url: r.url,
        };
      });

    return Response.json({ results });
  } catch (err) {
    console.error('find-part error:', err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
