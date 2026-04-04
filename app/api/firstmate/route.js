function buildSystemPrompt(ctx) {
  const { vessel, tasks, repairs, logbook, equipment } = ctx;
  const today = new Date().toISOString().split("T")[0];

  const overdue = tasks.filter(function(t){ return t.urgency === "critical" || t.urgency === "overdue"; });
  const dueSoon = tasks.filter(function(t){ return t.urgency === "due-soon"; });
  const ok      = tasks.filter(function(t){ return t.urgency === "ok"; });

  const fmt = function(t) {
    return "- " + t.task + " (" + t.section + ", every " + (t.interval || "?") + ")" +
      (t.dueDate ? ", due " + t.dueDate : "") +
      (t.lastService ? ", last done " + t.lastService : ", never serviced");
  };

  const totalNm = (logbook || [])
    .filter(function(e){ return e.entry_type === "passage"; })
    .reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm) || 0); }, 0);

  const recentLog = (logbook || []).slice(0, 8);
  const openRepairs = (repairs || []).filter(function(r){ return r.status !== "closed"; });
  const equipIssues = (equipment || []).filter(function(e){ return e.status === "needs-service" || e.status === "watch"; });

  return "You are First Mate, the AI assistant for " + vessel.prefix + " " + vessel.name + ". You speak like an experienced sailor — direct, practical, no-nonsense. You know this vessel intimately.\n\n" +
    "Today is " + today + ".\n\n" +
    "== VESSEL ==\n" +
    "Name: " + vessel.prefix + " " + vessel.name + "\n" +
    (vessel.make ? "Make/Model: " + [vessel.year, vessel.make, vessel.model].filter(Boolean).join(" ") + "\n" : "") +
    "Engine hours: " + (vessel.engineHours ? vessel.engineHours + " hrs" + (vessel.engineHoursDate ? " (as of " + vessel.engineHoursDate + ")" : "") : "not recorded") + "\n" +
    (vessel.fuelBurnRate ? "Fuel burn rate: " + vessel.fuelBurnRate + " gal/hr\n" : "") +
    (vessel.homePort ? "Home port: " + vessel.homePort + "\n" : "") +
    "\n== MAINTENANCE ==\n" +
    (overdue.length > 0 ? "OVERDUE (" + overdue.length + "):\n" + overdue.map(fmt).join("\n") + "\n\n" : "No overdue tasks.\n\n") +
    (dueSoon.length > 0 ? "DUE SOON (" + dueSoon.length + "):\n" + dueSoon.map(fmt).join("\n") + "\n\n" : "Nothing due soon.\n\n") +
    (ok.length > 0 ? "UP TO DATE (" + ok.length + " tasks):\n" + ok.map(fmt).join("\n") + "\n\n" : "") +
    "== OPEN REPAIRS (" + openRepairs.length + ") ==\n" +
    (openRepairs.length > 0 ? openRepairs.map(function(r){ return "- " + r.section + ": " + r.description + " (opened " + r.date + ")"; }).join("\n") : "No open repairs.") + "\n\n" +
    "== LOGBOOK ==\n" +
    "Total: " + Math.round(totalNm) + " nm across " + (logbook || []).filter(function(e){ return e.entry_type === "passage"; }).length + " passages\n" +
    (recentLog.length > 0 ? recentLog.map(function(e){
      var line = "- " + e.entry_date + " [" + (e.entry_type === "passage" ? "passage" : "note") + "]";
      if (e.entry_type === "passage" && (e.from_location || e.to_location)) {
        line += ": " + (e.from_location || "?") + " → " + (e.to_location || "?");
        if (e.distance_nm) line += " (" + e.distance_nm + " nm)";
      }
      if (e.title) line += " — " + e.title;
      if (e.highlights) line += " — highlights: " + e.highlights;
      if (e.notes) line += " — notes: " + e.notes;
      if (e.incident) line += " — INCIDENT: " + e.incident;
      if (e.conditions) line += " [" + e.conditions + "]";
      if (e.sea_state) line += " [sea: " + e.sea_state + "]";
      return line;
    }).join("\n") : "No entries.") + "\n\n" +
    "== EQUIPMENT ==\n" +
    (equipIssues.length > 0 ? "Issues:\n" + equipIssues.map(function(e){ return "- " + e.name + ": " + e.status; }).join("\n") : "No issues flagged.") + "\n\n" +
    "== INSTRUCTIONS ==\n" +
    "Answer questions about this vessel concisely. When asked if the boat is ready, check overdue tasks, repairs, and equipment issues. Use bullets for lists. Never invent data. Speak casually to the owner.\n\n" +
    "IMPORTANT: Actively scan logbook notes and highlights for anomalies — unusual sounds, performance issues, smells, handling changes, anything that sounds like a developing problem. If you spot one, flag it proactively and recommend a specific action. Examples: 'transmission felt odd' → check fluid level and mounts; 'engine running rough' → fuel filter or impeller; 'bilge pump cycling frequently' → potential leak. Connect logbook observations to relevant equipment and maintenance tasks when possible.";
}

export async function POST(request) {
  try {
    const { messages, vesselContext } = await request.json();

    if (!vesselContext || !vesselContext.vessel) {
      return Response.json({ error: "No vessel context" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const systemPrompt = buildSystemPrompt(vesselContext);

    // Non-streaming — same pattern as other routes in this project
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(function(m){ return { role: m.role, content: m.content }; }),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(function(){ return {}; });
      return Response.json({ error: err.error?.message || "Anthropic error " + anthropicRes.status }, { status: 500 });
    }

    const data = await anthropicRes.json();
    const text = (data.content || []).map(function(b){ return b.text || ""; }).join("");

    return Response.json({ response: text });

  } catch (e) {
    console.error("First Mate error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
