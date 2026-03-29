export async function POST(request) {
  try {
    const { partName, equipmentName, repairContext } = await request.json();

    if (!partName) {
      return Response.json({ error: "No part name provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Build a rich search context — repair context gives the most specific query
    const searchContext = repairContext
      ? partName + " for " + repairContext
      : equipmentName
        ? partName + " for " + equipmentName
        : partName;

    const systemPrompt = `You are a marine parts purchasing assistant. Use web search to find real products currently for sale online.

Search for: "${searchContext}"

Find 3-4 real products that match. For each return:
- The exact product name as listed on the retailer site
- The retailer/vendor name
- The current price if visible (as a number string like "29.99")
- The direct URL to the product page

Return ONLY a JSON array, no markdown:
[{"name":"exact product name","vendor":"retailer name","price":"XX.XX or null","url":"https://direct-product-url"}]

Prioritize: marine specialty retailers (Fisheries Supply, Defender, West Marine, Jamestown Distributors, iBoats), manufacturer direct sites, and Amazon. Only include results where the product clearly matches what was searched.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
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
      .filter(function(r){ return r && r.name && r.url; })
      .slice(0, 4)
      .map(function(r){
        return { name: r.name, vendor: r.vendor || "", price: r.price || null, url: r.url };
      });

    return Response.json({ results });
  } catch (err) {
    console.error("find-part error:", err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
