import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(ctx) {
  const { vessel, tasks, repairs, logbook, equipment } = ctx;

  const today = new Date().toISOString().split("T")[0];

  // Format tasks by urgency
  const overdue = tasks.filter(t => t.urgency === "critical" || t.urgency === "overdue");
  const dueSoon = tasks.filter(t => t.urgency === "due-soon");
  const ok = tasks.filter(t => t.urgency === "ok");

  const formatTask = t =>
    `- ${t.task} (${t.section}, every ${t.interval || "?"})` +
    (t.dueDate ? `, due ${t.dueDate}` : "") +
    (t.lastService ? `, last done ${t.lastService}` : ", never serviced");

  // Format recent logbook
  const recentLog = logbook.slice(0, 10);
  const totalNm = logbook.filter(e => e.entry_type === "passage")
    .reduce((acc, e) => acc + (parseFloat(e.distance_nm) || 0), 0);

  // Format open repairs
  const openRepairs = repairs.filter(r => r.status !== "closed");

  // Format equipment with issues
  const equipWithIssues = equipment.filter(e => e.status === "needs-service" || e.status === "watch");

  return `You are First Mate, the AI assistant built into Keeply for ${vessel.prefix} ${vessel.name}. You are knowledgeable, direct, and speak like an experienced sailor — practical and no-nonsense. You know this vessel intimately.

Today is ${today}.

== VESSEL ==
Name: ${vessel.prefix} ${vessel.name}
Type: ${vessel.type || "Sailboat"}
${vessel.make ? `Make/Model: ${[vessel.year, vessel.make, vessel.model].filter(Boolean).join(" ")}` : ""}
Engine hours: ${vessel.engineHours ? vessel.engineHours + " hrs (as of " + (vessel.engineHoursDate || "unknown") + ")" : "not recorded"}
${vessel.fuelBurnRate ? `Fuel burn rate: ${vessel.fuelBurnRate} gal/hr` : ""}
Home port: ${vessel.homePort || "not set"}

== MAINTENANCE ==
${overdue.length > 0 ? `OVERDUE (${overdue.length} tasks):\n${overdue.map(formatTask).join("\n")}` : "No overdue tasks."}

${dueSoon.length > 0 ? `DUE SOON (${dueSoon.length} tasks):\n${dueSoon.map(formatTask).join("\n")}` : "Nothing due soon."}

${ok.length > 0 ? `UP TO DATE (${ok.length} tasks — summarise only if asked):\n${ok.map(formatTask).join("\n")}` : ""}

== OPEN REPAIRS (${openRepairs.length}) ==
${openRepairs.length > 0 ? openRepairs.map(r => `- ${r.section}: ${r.description} (opened ${r.date})`).join("\n") : "No open repairs."}

== LOGBOOK ==
Total nm logged: ${Math.round(totalNm).toLocaleString()} nm across ${logbook.filter(e => e.entry_type === "passage").length} passages
${recentLog.length > 0 ? "Recent entries:\n" + recentLog.map(e =>
  e.entry_type === "passage"
    ? `- ${e.entry_date}: ${e.from_location || "?"} → ${e.to_location || "?"} ${e.distance_nm ? "(" + e.distance_nm + " nm)" : ""}`
    : `- ${e.entry_date}: Note — ${e.title || e.highlights || e.notes || "no content"}`
).join("\n") : "No logbook entries yet."}

== EQUIPMENT ==
${equipment.length} items tracked
${equipWithIssues.length > 0 ? "Issues flagged:\n" + equipWithIssues.map(e => `- ${e.name}: ${e.status}`).join("\n") : "No equipment issues flagged."}

== INSTRUCTIONS ==
- Answer questions about this specific vessel using the data above.
- When asked if the boat is "ready" or "good to go", assess maintenance urgency, open repairs, and any flagged equipment issues.
- Be concise. Use bullet points for lists. Don't pad answers.
- If you don't know something (e.g. current weather, real-time data), say so directly.
- You can make reasonable inferences — e.g. if an impeller was last changed 180 days ago on a 90-day interval, flag it.
- Never make up maintenance data. Only use what's in the context above.
- Address the boat owner casually. You're First Mate — helpful, not corporate.`;
}

export async function POST(request) {
  try {
    const { messages, vesselContext } = await request.json();

    if (!vesselContext?.vessel?.name) {
      return Response.json({ error: "No vessel context" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(vesselContext);

    // Use streaming
    const stream = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (e) {
    console.error("First Mate error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
