export async function POST(request) {
  try {
    const { context, type } = await request.json();

    if (!context) {
      return Response.json({ error: "No context provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const schema = '{"name":"string","part_number":"string or null","reason":"one sentence why this fits","price":number,"vendor":"Fisheries Supply","url":"https://www.fisheriessupply.com/search#q=ENCODED+PART+NAME","confidence":"high|medium|low"}';

    const systemPrompt = type === "repair"
      ? "You are a marine parts expert. Return ONLY a JSON array of up to 4 parts needed for this boat repair. Schema per item: " + schema + ". Use specific part numbers where you know them with high confidence — set confidence to 'low' if guessing. Always use fisheriessupply.com search URLs. Return ONLY the JSON array, no markdown."
      : "You are a marine parts expert. Return ONLY a JSON array of up to 4 maintenance parts for this marine equipment. Schema per item: " + schema + ". Use specific part numbers where you know them — set confidence to 'low' if guessing. Always use fisheriessupply.com search URLs. Return ONLY the JSON array, no markdown.";

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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (res.status === 429) {
      return Response.json({ error: "Rate limited — please wait a moment and try again", rateLimited: true, suggestions: [] }, { status: 429 });
    }

    if (!res.ok) {
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
        // Build Fisheries Supply search URL from part name + number
        const searchTerms = s.part_number ? s.name + " " + s.part_number : s.name;
        const fsUrl = "https://www.fisheriessupply.com/search#q=" + encodeURIComponent(searchTerms);
        return {
          id: "ai-" + Date.now() + "-" + i,
          name: s.name,
          part_number: s.part_number || null,
          reason: s.reason,
          price: s.price || null,
          vendor: "Fisheries Supply",
          url: fsUrl,
          confidence: s.confidence || "medium",
          qty: 1,
        };
      });

    return Response.json({ suggestions });
  } catch (err) {
    return Response.json({ error: "Something went wrong — please try again", suggestions: [] }, { status: 500 });
  }
}
