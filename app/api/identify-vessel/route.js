export async function POST(request) {
  try {
    const { description } = await request.json();
    if (!description) return Response.json({ error: "No description provided" }, { status: 400 });

    const prompt = `You are an expert marine surveyor and boat maintenance specialist with deep knowledge of production boats, custom builds, and all types of vessels.

The user has this vessel: "${description}"

Generate a complete, specific equipment list that an owner of this exact vessel would track for maintenance. Be specific to this make/model/year — not generic. For example, if it's a 2018 Ranger Tug R-27, list the actual Volvo IPS engine, bow thruster, specific electronics typically fitted, generator, etc.

Return ONLY valid JSON — no prose, no markdown, no code fences. The JSON must be an array of objects with this exact schema:
[
  {
    "name": "string (specific equipment name, e.g. 'Volvo Penta IPS D4-300')",
    "category": "string (one of: Engine, Electrical, Rigging, Sails, Plumbing, Safety, Navigation, Deck, Bilge, Hull, Dinghy, Generator, HVAC, Galley, General)",
    "tasks": [
      { "task": "string", "interval_days": number }
    ]
  }
]

Include 12-22 equipment items covering the full vessel. Each item should have 2-5 maintenance tasks with realistic intervals in days (365 for annual, 180 for biannual, 90 for quarterly, 730 for every 2 years). Be specific and practical.`;

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

    const text = data.content[0].text.trim();
    // Strip any accidental markdown fences
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const equipment = JSON.parse(clean);

    return Response.json({ equipment });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
