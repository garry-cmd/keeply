export async function POST(request) {
  try {
    const { partName, equipmentName, repairContext } = await request.json();

    if (!partName) {
      return Response.json({ error: "No part name provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const context = repairContext || equipmentName || partName;

    const systemPrompt = `You are a marine parts purchasing assistant. Use web search to find real products currently for sale online.

Task/repair: "${partName}"
Equipment and vessel context: "${context}"

Search for the specific parts needed for this task on these marine retailers: West Marine (westmarine.com), Fisheries Supply (fisheriessupply.com), Defender (defender.com), and other marine suppliers.

Use the vessel/equipment context to find the most precise match — for example, the correct impeller for the specific engine model, or the correct filter for the specific watermaker brand and model.

Find 2-4 results. For each return:
- name: exact product name
- type: "replacement" (complete unit) or "part" (service part/consumable)
- reason: one short sentence on why this matches
- vendor: retailer name
- price: current price as string like "29.99" or null
- url: direct product page URL (preferred) or targeted search URL

Return ONLY a JSON array, no markdown:
[{"name":"...","type":"replacement|part","reason":"...","vendor":"...","price":"XX.XX or null","url":"https://..."}]

Prioritize: Fisheries Supply, West Marine, Defender, then other marine specialty retailers. Only include results where the product clearly matches the specific equipment/vessel context.`;

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

    // Build per-retailer structure from flat results
    const retailerMap = { westmarine: null, fisheries: null, defender: null, other: null };
    const vendorKey = (vendor) => {
      const v = (vendor || "").toLowerCase();
      if (v.includes("west marine") || v.includes("westmarine")) return "westmarine";
      if (v.includes("fisheries") || v.includes("fishery")) return "fisheries";
      if (v.includes("defender")) return "defender";
      return "other";
    };

    results
      .filter(function(r){ return r && r.name && r.url; })
      .slice(0, 6)
      .forEach(function(r) {
        const key = vendorKey(r.vendor);
        if (!retailerMap[key]) {
          retailerMap[key] = {
            partName: r.name,
            partNumber: null,
            type: r.type || "part",
            notes: r.reason || null,
            overallConfidence: "high",
            [key]: {
              url: r.url,
              price: r.price || null,
              confidence: r.url && !r.url.includes("/search") ? "direct" : "search",
              name: key === "other" ? r.vendor : null,
            },
            westmarine: key === "westmarine" ? { url: r.url, price: r.price || null, confidence: r.url && !r.url.includes("/search") ? "direct" : "search" } : null,
            fisheries: key === "fisheries" ? { url: r.url, price: r.price || null, confidence: r.url && !r.url.includes("/search") ? "direct" : "search" } : null,
            defender: key === "defender" ? { url: r.url, price: r.price || null, confidence: r.url && !r.url.includes("/search") ? "direct" : "search" } : null,
            other: key === "other" ? { url: r.url, price: r.price || null, confidence: r.url && !r.url.includes("/search") ? "direct" : "search", name: r.vendor } : null,
          };
        }
      });

    // If we have flat results but couldn't map to retailers well, 
    // return them as individual parts (fallback to old flat rendering)
    const mappedParts = Object.values(retailerMap).filter(Boolean);
    
    // Also build a clean flat results array for the renderer
    const flatResults = results
      .filter(function(r){ return r && r.name && r.url; })
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

    return Response.json({ results: flatResults });
  } catch (err) {
    console.error("find-part error:", err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
