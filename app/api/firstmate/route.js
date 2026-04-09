import { createClient } from "@supabase/supabase-js";

// ── Admin client (service role — never exposed to browser) ────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Plan limits (-1 = unlimited) ──────────────────────────────────────────────
const FM_LIMITS = {
  free:       5,
  entry:      5,
  pro:        30,
  captain:    -1,
  fleet:      -1,
  enterprise: -1,
};

function buildSystemPrompt(ctx) {
  const { vessel, tasks, repairs, logbook, equipment } = ctx;
  const today = new Date().toISOString().split("T")[0];

  const overdue  = tasks.filter(function(t){ return t.urgency === "critical" || t.urgency === "overdue"; });
  const dueSoon  = tasks.filter(function(t){ return t.urgency === "due-soon"; });
  const ok       = tasks.filter(function(t){ return t.urgency === "ok"; });

  const withNotes = tasks.filter(function(t){ return t.recentNotes && t.recentNotes.length > 0; });

  const fmt = function(t) {
    let line = "- " + t.task + " (" + t.section + ", every " + (t.interval || "?") + ")" +
      (t.dueDate ? ", due " + t.dueDate : "") +
      (t.lastService ? ", last done " + t.lastService : ", never serviced");
    if (t.recentNotes && t.recentNotes.length > 0) {
      line += "\n  Completion notes: " + t.recentNotes.join(" | ");
    }
    return line;
  };

  const totalNm = (logbook || [])
    .filter(function(e){ return e.entry_type === "passage"; })
    .reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm) || 0); }, 0);

  const recentLog   = (logbook || []).slice(0, 8);
  const openRepairs = (repairs || []).filter(function(r){ return r.status !== "closed"; });
  const equipIssues = (equipment || []).filter(function(e){ return e.status === "needs-service" || e.status === "watch"; });

  let prompt = "You are First Mate, the AI assistant for " + vessel.prefix + " " + vessel.name + ". You speak like an experienced sailor — direct, practical, no-nonsense. You know this vessel intimately.\n\n" +
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
    (ok.length > 0 ? "UP TO DATE (" + ok.length + " tasks):\n" + ok.map(fmt).join("\n") + "\n\n" : "");

  if (withNotes.length > 0) {
    prompt += "== COMPLETION NOTES & TRENDS ==\n" +
      "These tasks have notes recorded when marked done. Look for patterns, deterioration, or anomalies:\n" +
      withNotes.map(function(t){
        return "- " + t.task + " (" + t.section + "):\n  " + t.recentNotes.join("\n  ");
      }).join("\n") + "\n\n";
  }

  prompt +=
    "== OPEN REPAIRS (" + openRepairs.length + ") ==\n" +
    (openRepairs.length > 0 ? openRepairs.map(function(r){
      let line = "- " + r.section + ": " + r.description + " (opened " + r.date + ")";
      if (r.notes) line += "\n  Notes: " + r.notes;
      return line;
    }).join("\n") : "No open repairs.") + "\n\n" +
    "== LOGBOOK ==\n" +
    "Total: " + Math.round(totalNm) + " nm across " + (logbook || []).filter(function(e){ return e.entry_type === "passage"; }).length + " passages\n" +
    (recentLog.length > 0 ? recentLog.map(function(e){
      var line = "- " + e.entry_date + " [" + (e.entry_type === "passage" ? "passage" : "note") + "]";
      if (e.entry_type === "passage" && (e.from_location || e.to_location)) {
        line += ": " + (e.from_location || "?") + " → " + (e.to_location || "?");
        if (e.distance_nm) line += " (" + e.distance_nm + " nm)";
      }
      if (e.title) line += " — " + e.title;
      if (e.notes) line += " — notes: " + e.notes;
      if (e.incident) line += " — INCIDENT: " + e.incident;
      if (e.conditions) line += " [" + e.conditions + "]";
      if (e.sea_state) line += " [sea: " + e.sea_state + "]";
      return line;
    }).join("\n") : "No entries.") + "\n\n" +
    "== EQUIPMENT ==\n" +
    (equipIssues.length > 0 ? "Issues:\n" + equipIssues.map(function(e){ return "- " + e.name + ": " + e.status; }).join("\n") : "No issues flagged.") + "\n\n" +
    "== INSTRUCTIONS ==\n" +
    "Answer questions about this vessel concisely. Use bullets for lists. Never invent data. Speak casually to the owner.\n\n" +
    "When asked if the boat is ready: check overdue tasks, repairs, and equipment issues.\n\n" +
    "TREND ANALYSIS: The 'COMPLETION NOTES & TRENDS' section contains notes the owner recorded each time they completed a task. " +
    "Actively look for: deteriorating readings (e.g. oil level trending low, coolant changing color), " +
    "recurring issues (same problem appearing across multiple entries), " +
    "anomalies that suggest a developing problem. " +
    "When you spot a trend, say so explicitly and recommend action. Examples: " +
    "'oil consistently below full → check for consumption or leak'; " +
    "'impeller missing blades → inspect raw water system for damage, shorten service interval'; " +
    "'milky oil → possible water intrusion, check immediately'.\n\n" +
    "LOGBOOK SCANNING: Scan logbook notes for anomalies — unusual sounds, performance issues, smells, handling changes. " +
    "Cross-reference with maintenance tasks and completion notes. Flag anything that sounds like a developing problem and recommend a specific action.";

  return prompt;
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

    // ── Auth + usage gating ───────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (token) {
      const admin = getAdmin();

      // Verify token and get user
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);

      if (!authErr && user) {
        // Get plan
        const { data: profile } = await admin
          .from("user_profiles")
          .select("plan")
          .eq("id", user.id)
          .single();
        const plan = profile?.plan || "free";
        const limit = FM_LIMITS[plan] !== undefined ? FM_LIMITS[plan] : 10;

        if (limit > 0) {
          const monthKey = new Date().toISOString().slice(0, 7); // "2026-04"

          const { data: usage } = await admin
            .from("firstmate_usage")
            .select("count")
            .eq("user_id", user.id)
            .eq("month_key", monthKey)
            .single();

          const currentCount = usage?.count || 0;

          // Always send — soft nudge model
          // Increment usage
          await admin.from("firstmate_usage").upsert({
            user_id:    user.id,
            month_key:  monthKey,
            count:      currentCount + 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,month_key" });

          // Attach usage info to request so response can include nudge
          request._fmUsage = { count: currentCount + 1, limit, plan };
        }
      }
    }

    // ── Call Anthropic ────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(vesselContext);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system:     systemPrompt,
        messages:   messages.map(function(m){ return { role: m.role, content: m.content }; }),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(function(){ return {}; });
      return Response.json({ error: err.error?.message || "Anthropic error " + anthropicRes.status }, { status: 500 });
    }

    const data = await anthropicRes.json();
    const text = (data.content || []).map(function(b){ return b.text || ""; }).join("");

    // Build usage metadata for soft nudge
    const usageMeta = request._fmUsage || null;
    return Response.json({ response: text, usage: usageMeta });

  } catch (e) {
    console.error("First Mate error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
