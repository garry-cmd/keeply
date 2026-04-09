export async function POST(request) {
  try {
    const body = await request.json();
    const description = body.description || "";

    if (!description.trim()) {
      return Response.json({ error: "No description provided" }, { status: 400 });
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

Generate a complete, specific equipment list that an owner of this exact vessel would track for maintenance. Be specific to this make/model/year — not generic. For example, if it's a 2018 Ranger Tug R-27, list the actual Volvo IPS engine, bow thruster, specific electronics typically fitted, generator, etc.

Return ONLY valid JSON — no prose, no markdown, no code fences. The JSON must be an array of objects:
[{ "name": "string", "manufacturer": "string|null", "model": "string|null", "category": "string (Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker)", "tasks": [{ "task": "string", "interval_days": number }] }]

Include 12-22 items, each with 2-5 tasks and realistic intervals (365=annual, 180=biannual, 90=quarterly, 730=2years).`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      const errType = data.error.type || "";
      const errMsg  = data.error.message || "";
      // Rate limit / capacity errors — don't expose internals
      if (errType === "rate_limit_error" || errType === "overloaded_error" ||
          errMsg.includes("rate limit") || errMsg.includes("overloaded") ||
          errMsg.includes("token") || errMsg.includes("capacity") || errMsg.includes("quota")) {
        return Response.json({ error: "ai_busy", errorType: "capacity" }, { status: 503 });
      }
      return Response.json({ error: "ai_error", errorType: errType }, { status: 500 });
    }

    const raw = data.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    const parsed = JSON.parse(raw);

    // singleItem returns object, vessel returns array
    const equipment = isSingleItem ? parsed : parsed;
    return Response.json({ equipment });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
