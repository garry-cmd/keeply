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
      ? "You are a marine parts assistant. Return ONLY a JSON array of up to 4 products needed for this boat repair. Each item: {\"name\":\"product name\",\"reason\":\"one sentence why\",\"price\":29,\"vendor\":\"West Marine\",\"url\":\"https://www.westmarine.com/search?query=...\"}. Use real product names and realistic prices. Return ONLY the JSON array."
      : "You are a marine parts assistant. Return ONLY a JSON array of up to 4 maintenance parts for this marine equipment. Each item: {\"name\":\"product name\",\"reason\":\"one sentence why\",\"price\":29,\"vendor\":\"West Marine\",\"url\":\"https://www.westmarine.com/search?query=...\"}. Use real product names and realistic prices. Return ONLY the JSON array.";

    const userPrompt = type === "repair"
      ? "Parts needed for this boat repair: " + context
      : "Key maintenance parts for: " + context;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    const rawBody = await res.text();

    if (res.status === 429) {
      return Response.json({ error: "Rate limited — please wait a moment", suggestions: [] }, { status: 429 });
    }

    if (!res.ok) {
      // Return the full error body so we can see what's wrong
      return Response.json({ error: "API error: " + rawBody, suggestions: [], status: res.status }, { status: 500 });
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch(e) {
      return Response.json({ error: "Invalid JSON from API: " + rawBody.slice(0, 200), suggestions: [] }, { status: 500 });
    }

    const textBlock = data.content && data.content.find(function(b) { return b.type === "text"; });
    const text = textBlock ? textBlock.text : "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);

    let suggestions = [];
    try {
      suggestions = JSON.parse(match ? match[0] : "[]");
    } catch(e) {
      return Response.json({ error: "JSON parse failed: " + text.slice(0, 200), suggestions: [] }, { status: 500 });
    }

    suggestions = suggestions
      .filter(function(s){ return s && s.name && s.reason; })
      .map(function(s, i){
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

    return Response.json({ suggestions, debug: { model: "claude-haiku-4-5-20251001", rawLength: rawBody.length } });
  } catch (err) {
    return Response.json({ error: "Exception: " + err.message, suggestions: [] }, { status: 500 });
  }
}
