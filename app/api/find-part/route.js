export async function POST(request) {
  try {
    const { partName, equipmentName, repairContext } = await request.json();

    if (!partName) {
      return Response.json({ error: "No part name provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const context = repairContext
      ? repairContext
      : equipmentName
      ? equipmentName
      : partName;

    const systemPrompt = `You are a marine parts purchasing assistant. Use web search to find real products currently for sale.

The task/repair is: "${partName}"
Equipment and vessel context: "${context}"

Your job is to identify the 1-3 most important parts or items needed for this task, then find each one specifically at West Marine (westmarine.com), Fisheries Supply (fisheriessupply.com), and Defender (defender.com).

For each part:
1. Search each retailer site specifically for this exact part
2. Return the direct product page URL if found, or a targeted search URL as fallback
3. Use the vessel/equipment context to be as specific as possible (e.g. correct impeller for the specific engine model)

Return ONLY a JSON array with this structure, no markdown:
[
  {
    "partName": "Exact part name (be specific, e.g. 'Jabsco 836-0001 Raw Water Impeller')",
    "partNumber": "Manufacturer part number if known, otherwise null",
    "type": "part or replacement",
    "westmarine": { "url": "direct URL or search URL", "price": "price string or null", "confidence": "direct or search" },
    "fisheries": { "url": "direct URL or search URL", "price": "price string or null", "confidence": "direct or search" },
    "defender": { "url": "direct URL or search URL", "price": "price string or null", "confidence": "direct or search" },
    "other": { "name": "retailer name or null", "url": "URL or null", "price": "price string or null", "confidence": "direct or search" },
    "overallConfidence": "high, medium, or low",
    "notes": "One sentence on fit/compatibility or null"
  }
]

Rules:
- For search URLs use: westmarine.com/search?query=PART, fisheriessupply.com/search?q=PART, defender.com/search?q=PART
- Set confidence "direct" only if you found an actual product page, "search" if it's a search URL
- If a retailer clearly doesn't stock this type of part, set url to null
- Return 1-3 parts max (most important for this task)
- Be specific to the vessel/engine — wrong impeller for wrong engine is worse than no result
- If task is inspection-only with no parts needed, return an empty array []`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: systemPrompt }],
      }),
    });

    if (res.status === 429) {
      return Response.json({ error: "rate_limited", results: [] }, { status: 429 });
    }

    if (!res.ok) {
      return Response.json({ error: "Search failed — please try again", results: [] }, { status: res.status });
    }

    const data = await res.json();
    const textBlock = (data.content || []).filter(function(b){ return b.type === "text"; }).pop();
    if (!textBlock) return Response.json({ results: [] });

    const text = textBlock.text.trim().replace(/```json|```/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);

    let results = [];
    try { results = JSON.parse(match ? match[0] : "[]"); } catch(e) { results = []; }

    results = results
      .filter(function(r){ return r && r.partName; })
      .slice(0, 3)
      .map(function(r){
        return {
          partName: r.partName || "",
          partNumber: r.partNumber || null,
          type: r.type || "part",
          westmarine: r.westmarine || null,
          fisheries: r.fisheries || null,
          defender: r.defender || null,
          other: r.other || null,
          overallConfidence: r.overallConfidence || "medium",
          notes: r.notes || null,
        };
      });

    return Response.json({ results });
  } catch (err) {
    console.error("find-part error:", err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
