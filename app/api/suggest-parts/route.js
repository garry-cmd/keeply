export async function POST(request) {
  try {
    const { context, type } = await request.json();

    if (!context) {
      return Response.json({ error: "No context provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const systemPrompt = type === "repair"
      ? "You are a marine parts assistant. A boat owner needs parts for a repair. Search the web for specific marine products needed. Return ONLY a JSON array of up to 4 products. Each product must have: name (specific product name), reason (one short sentence why it's needed), price (number, approximate USD retail price), vendor (store name like 'West Marine' or 'Defender'), url (direct product or search URL). Example: [{\"name\":\"3M Teak Sealer\",\"reason\":\"Needed to reseal teak after cleaning\",\"price\":28,\"vendor\":\"West Marine\",\"url\":\"https://www.westmarine.com/search?query=3m+teak+sealer\"}]. Return ONLY the JSON array, no other text."
      : "You are a marine parts assistant. Search the web for maintenance parts for specific marine equipment. Return ONLY a JSON array of up to 4 parts. Each part must have: name (specific product name), reason (one short sentence why it's a key maintenance item), price (number, approximate USD retail price), vendor (store name like 'West Marine' or 'Defender'), url (direct product or search URL). Return ONLY the JSON array, no other text.";

    const userPrompt = type === "repair"
      ? "Find marine parts/products needed for this boat repair: " + context
      : "Find key maintenance parts for this marine equipment: " + context;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Extract text from response (may come after tool use blocks)
    const textBlock = data.content && data.content.find(function(b) { return b.type === "text"; });
    const text = textBlock ? textBlock.text : "[]";
    const clean = text.replace(/```json|```/g, "").trim();

    // Extract JSON array robustly
    const match = clean.match(/\[[\s\S]*\]/);
    let suggestions = [];
    try {
      suggestions = JSON.parse(match ? match[0] : "[]");
    } catch(e) {
      suggestions = [];
    }

    // Normalize and validate each suggestion
    suggestions = suggestions.filter(function(s) {
      return s && s.name && s.reason;
    }).map(function(s, i) {
      return {
        id: "ai-" + Date.now() + "-" + i,
        name: s.name,
        reason: s.reason,
        price: s.price || null,
        vendor: s.vendor || null,
        url: s.url || null,
        qty: 1,
      };
    });

    return Response.json({ suggestions });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
