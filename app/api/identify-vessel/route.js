export async function POST(request) {
  try {
    const body = await request.json();
    const description = body.description || '';

    if (!description.trim()) {
      return Response.json({ error: 'No description provided' }, { status: 400 });
    }

    const isSingleItem = body.singleItem === true;

    const prompt = isSingleItem
      ? `You are an expert marine equipment specialist with deep knowledge of marine hardware, anchoring systems, electronics, engines, and all boat equipment.

The user wants to add this piece of equipment: "${description.trim()}"

Identify the specific equipment and return a single JSON object with:
- name: Full descriptive name (e.g. "Vulcan 20kg Galvanised Steel Anchor")
- manufacturer: Brand/manufacturer name (e.g. "Vulcan") or null if unknown
- model: Specific model name or spec (e.g. "20kg Bruce-Style") or null if unknown
- category: One of: Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker
- tasks: Array of 2-5 specific maintenance tasks for THIS exact equipment

Return ONLY valid JSON — no prose, no markdown, no code fences:
{ "name": "string", "manufacturer": "string|null", "model": "string|null", "category": "string", "tasks": [{ "task": "string", "interval_days": number }] }

Maintenance intervals: 365=annual, 180=biannual, 90=quarterly, 730=2years. Be specific to the equipment — a Vulcan anchor needs different tasks than a windlass.`
      : `You are an expert marine surveyor and boat maintenance specialist with deep knowledge of production boats, custom builds, and all types of vessels.

The user has this vessel: "${description.trim()}"

First, extract the vessel identity. Then generate a complete, specific equipment list an owner of this exact vessel would track for maintenance. Be specific to this make/model/year — not generic.

Return ONLY valid JSON — no prose, no markdown, no code fences. The JSON must be an object with two keys:
{
  "vesselInfo": {
    "year": "4-digit year string, or empty string if not found",
    "make": "manufacturer name only — max 30 characters, no dimensions, specs, or extra attributes (e.g. 'Fountaine Pajot', 'Catalina', 'Ranger Tug')",
    "model": "model name only — max 40 characters, no dimensions, specs, or extra attributes (e.g. 'Elba 45', '30', 'R-27')",
    "vesselType": "EXACTLY one of: 'sail' for any sailboat (monohull or catamaran); 'motor' for any powerboat (center console, trawler, cruiser, sportfisher, cat power, etc.); 'other' only if genuinely unclear. Base this on the make/model, not on equipment. A Scout 255 Dorado is 'motor'. A Catalina 36 is 'sail'. A Leopard 45 is 'sail' (sailing catamaran). A Fountaine Pajot MY is 'motor'."
  },
  "equipment": [{ "name": "string", "manufacturer": "string|null", "model": "string|null", "category": "string (Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker)", "tasks": [{ "task": "string", "interval_days": number }] }]
}

Include 12-22 equipment items, each with 2-5 tasks and realistic intervals (365=annual, 180=biannual, 90=quarterly, 730=2years).`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      const errType = data.error.type || '';
      const errMsg = data.error.message || '';
      if (
        errType === 'rate_limit_error' ||
        errType === 'overloaded_error' ||
        errMsg.includes('rate limit') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('token') ||
        errMsg.includes('capacity') ||
        errMsg.includes('quota')
      ) {
        return Response.json({ error: 'ai_busy', errorType: 'capacity' }, { status: 503 });
      }
      return Response.json({ error: 'ai_error', errorType: errType }, { status: 500 });
    }

    const raw = data.content[0].text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const parsed = JSON.parse(raw);

    // singleItem returns a single equipment object
    if (isSingleItem) {
      return Response.json({ equipment: parsed });
    }

    // Vessel identification: AI now returns { vesselInfo, equipment }
    // Gracefully handle legacy array response just in case
    const equipment = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.equipment)
        ? parsed.equipment
        : [];
    const vesselInfo = parsed.vesselInfo || null;
    return Response.json({ equipment, vesselInfo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
