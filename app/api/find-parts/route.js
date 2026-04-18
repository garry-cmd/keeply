import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req) {
  try {
    const {
      vesselMake,
      vesselModel,
      vesselYear,
      vesselName,
      equipmentName,
      taskDescription,
      section,
    } = await req.json();

    // Build a rich context string for the AI
    const vesselContext = [vesselYear, vesselMake, vesselModel]
      .filter(Boolean)
      .join(" ");
    const equipContext = equipmentName
      ? `Equipment: ${equipmentName}.`
      : `Section: ${section}.`;

    const prompt = `You are a marine parts specialist. Find the exact parts needed for this task.

Vessel: ${vesselContext || "Unknown vessel"}${vesselName ? ` (named "${vesselName}")` : ""}
${equipContext}
Task: ${taskDescription}

Search the web for the exact part(s) needed for this specific vessel and task. Use the vessel make/model/year and equipment name to find the most precise parts — for example, a Yanmar 4JH45 impeller is different from a Beta 35 impeller.

Return ONLY a valid JSON object with this exact structure, no other text:
{
  "parts": [
    {
      "partName": "exact part name",
      "partNumber": "manufacturer part number if found, otherwise null",
      "retailers": {
        "westmarine": { "url": "direct product URL or search URL", "price": "price as string or null", "confidence": "direct|search" },
        "fisheries": { "url": "direct product URL or search URL", "price": "price as string or null", "confidence": "direct|search" },
        "defender": { "url": "direct product URL or search URL", "price": "price as string or null", "confidence": "direct|search" },
        "other": { "name": "retailer name or null", "url": "URL or null", "price": "price as string or null", "confidence": "direct|search" }
      },
      "confidence": "high|medium|low",
      "notes": "brief note about fit/compatibility if relevant, otherwise null"
    }
  ]
}

Rules:
- For westmarine use westmarine.com, fisheries use fisheriessupply.com, defender use defender.com
- If you find a direct product page, use that URL and set confidence "direct"
- If you can only find a search, construct a good search URL and set confidence "search"  
- If a retailer clearly doesn't carry this part, set url to null
- Return 1-3 parts maximum (the most important ones for this task)
- If the task needs multiple different parts (e.g. impeller + housing gasket), include each as a separate entry
- Be specific: "Jabsco 836-0001 Impeller" not just "impeller"`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    // Extract the text content from the response
    let resultText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        resultText += block.text;
      }
    }

    // Parse JSON, stripping any markdown fences
    const clean = resultText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json({ success: true, data: parsed });
  } catch (err) {
    console.error("find-parts error:", err);
    return Response.json(
      { success: false, error: "Failed to find parts" },
      { status: 500 }
    );
  }
}
