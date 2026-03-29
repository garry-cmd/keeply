export async function POST(request) {
  try {
    const text = await request.text();
    console.log("identify-vessel body:", text);
    
    let description = "";
    try {
      const body = JSON.parse(text);
      description = body.description || "";
    } catch(e) {
      description = text;
    }

    if (!description || !description.trim()) {
      return Response.json({ error: "No description provided" }, { status: 400 });
    }

    const prompt = `You are an expert marine surveyor and boat maintenance specialist with deep knowledge of production boats, custom builds, and all types of vessels.

The user has this vessel: "${description.trim()}"

Generate a complete, specific equipment list that an owner of this exact vessel would track for maintenance. Be specific to this make/model/year. Return ONLY valid JSON — no prose, no markdown, no code fences. Array of objects with schema:
[{ "name": "string", "category": "string (Engine|Electrical|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|HVAC|Galley|General)", "tasks": [{ "task": "string", "interval_days": number }] }]

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
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const raw = data.content[0].text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const equipment = JSON.parse(raw);

    return Response.json({ equipment });
  } catch (err) {
    console.error("identify-vessel error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
