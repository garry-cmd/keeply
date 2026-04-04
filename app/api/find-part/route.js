export async function POST(request) {
  try {
    const { partName, equipmentName, repairContext } = await request.json();

    if (!partName) {
      return Response.json({ error: "No part name provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Build context
    const context = repairContext
      ? repairContext
      : equipmentName
      ? equipmentName
      : partName;

    const systemPrompt = `You are a marine parts purchasing assistant. Use web search to find real products currently for sale online.

The task/repair is: "${partName}"
Equipment context: "${context}"

Search for TWO categories of products:

1. COMPLETE REPLACEMENT UNIT — the full equipment itself if it needs replacing (e.g. if the task is about a raw water pump, find the complete replacement pump as a unit). Label these as type "replacement".

2. SERVICE PARTS — individual components, kits, or consumables needed for repair or maintenance (impeller, seal kit, filter element, zincs, etc.). Label these as type "part".

Find 2-3 results per category (4-6 total). For each return:
- name: exact product name as listed on retailer site
- type: "replacement" or "part"
- reason: one short sentence on why this matches (e.g. "Complete drop-in replacement pump" or "OEM impeller kit for this pump")
- vendor: retailer name
- price: current price as string like "29.99" or null
- url: direct product page URL

Return ONLY a JSON array, no markdown:
[{"name":"...","type":"replacement|part","reason":"...","vendor":"...","price":"XX.XX or null","url":"https://..."}]

Prioritize: marine specialty retailers (Fisheries Supply, Defender, West Marine, Jamestown Distributors, iBoats), manufacturer direct, then Amazon. Only include results where the product clearly matches.

If the task is routine maintenance (e.g. oil change, inspect zincs) with no clear replacement unit, skip the replacement category and return only service parts.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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

    // Sort: replacements first, then parts
    results = results
      .filter(function(r){ return r && r.name && r.url; })
      .sort(function(a, b){
        if (a.type === "replacement" && b.type !== "replacement") return -1;
        if (a.type !== "replacement" && b.type === "replacement") return 1;
        return 0;
      })
      .slice(0, 6)
      .map(function(r){
        return {
          name: r.name,
          type: r.type || "part",
          reason: r.reason || "",
          vendor: r.vendor || "",
          price: r.price || null,
          url: r.url
        };
      });

    return Response.json({ results });
  } catch (err) {
    console.error("find-part error:", err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
