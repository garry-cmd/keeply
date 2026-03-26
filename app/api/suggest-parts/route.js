export async function POST(request) {
  try {
    const { context, type } = await request.json();

    if (!context) {
      return Response.json({ error: "No context provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
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

    // Handle rate limiting gracefully
    if (res.status === 429) {
      return Response.json({ 
        error: "Rate limited — please wait a moment and try again",
        rateLimited: true,
        suggestions: [] 
      }, { status: 429 });
    }

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: "AI service error — please try again", suggestions: [] }, { status: res.status });
    }

    const data = await res.json();
    const textBlock = data.content && data.content.find(function(b) { return b.type === "text"; });
    const text = textBlock ? textBlock.text : "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);

    let suggestions = [];
    try {
      suggestions = JSON.parse(match ? match[0] : "[]");
    } catch(e) {
      suggestions = [];
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

    return Response.json({ suggestions });
  } catch (err) {
    return Response.json({ error: "Something went wrong — please try again", suggestions: [] }, { status: 500 });
  }
}
