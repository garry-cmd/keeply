import { createClient } from "@supabase/supabase-js";

// ── Admin client ──────────────────────────────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Plan limits ───────────────────────────────────────────────────────────────
const FM_LIMITS = { free: 0, standard: 10, pro: 50 };

// ── Static app knowledge — cached by Anthropic, charged once per session ─────
// Update this section whenever features change. Keep it accurate.
const APP_GUIDE = `== KEEPLY APP GUIDE ==
You are also a product expert and support agent for Keeply. When users ask how to use the app,
how something works, or what a feature does — answer clearly and helpfully. Never say "I don't know
how the app works." You know it completely.

--- WHAT KEEPLY IS ---
Keeply is a vessel intelligence platform. It tracks maintenance, equipment, repairs, passages, and
engine hours for boat owners. Think of it as a ship's log, maintenance scheduler, equipment manual,
and AI crew member rolled into one.

--- NAVIGATION ---
Four tabs at the bottom of the screen:
- MY BOAT — main dashboard. Vessel info, KPIs, status cards, open repairs, maintenance due list.
- LOGBOOK — log passages and daily notes. Shows total NM, passages, engine hours.
- EQUIPMENT — all equipment on the vessel. Filter by category. Tap any card to expand.
- PROFILE — account settings, plan, upgrade options.

The sparkle bar at the very top ("Ask First Mate…") opens this chat from anywhere in the app.

--- MY BOAT TAB ---
At the top is the vessel passport card showing name, make/model, HIN, Doc No., and home port.
It has three sub-tabs:
  - ID: vessel identification details. Tap "Edit" to update. Can scan documents with AI to auto-fill.
  - Docs: store vessel-level documents (registration, insurance, survey, USCG cert, etc.)
  - Admin: important admin tasks like registration renewal, safety inspections, survey dates.

Below the passport are two KPI cards:
  - ENGINE HRS: current engine hours. Tap to update manually. Auto-updated from logbook passages.
  - NM LOGGED: total nautical miles from logbook. Tap to open Logbook.

Below KPIs are three status cards (tap any to see the full list):
  - CRITICAL: overdue maintenance tasks and overdue admin items.
  - DUE SOON: tasks due within the next interval window.
  - OPEN REPAIRS: repairs currently in progress.

Below status cards: OPEN REPAIRS list (collapsed cards, tap to expand).
Below that: MAINTENANCE DUE list (all tasks that need attention, sorted by urgency).

The blue circle on each maintenance task = tap to mark it complete. A note sheet appears — add a
comment about what you did (optional but recommended), then confirm. The task resets to its next
due date automatically based on its service interval.

The "+" floating button (bottom right) opens quick actions:
  - Log Repair: add a new repair/issue
  - Complete Task: mark a maintenance task done
  - Log Entry: add a logbook entry
  - Add Equipment: add new equipment to the vessel

--- EQUIPMENT TAB ---
Lists all equipment sorted engine-first, then alphabetically by category.
The dropdown at the top filters by category (Engine, Electrical, Plumbing, Rigging, etc.)

Tap any equipment card to expand it. Inside are tabs:
  - MAINTENANCE: all maintenance tasks linked to this equipment. Tap a task to expand it.
    Circle button = mark complete. Tasks show interval, due date, urgency badge.
  - REPAIRS: open and closed repairs linked to this equipment.
  - PARTS: AI-suggested parts for this equipment's maintenance.
  - DOCS: documents and manuals attached to this equipment.
  - LOG: free-text log entries for observations, readings, notes about this equipment.
  - PHOTOS: photos of the equipment.
  - EDIT: edit the equipment name, category, status, and notes. Delete equipment here.

Equipment status options:
  - Good (green dot): everything fine
  - Watch (amber dot): keep an eye on it
  - Needs service (red dot): requires attention

To add equipment: tap "+" → "Add Equipment" → choose:
  - AI Identify: type a description (e.g. "Jabsco manual bilge pump") → AI identifies it,
    suggests category, and creates maintenance tasks automatically → tap "Add to My Boat"
  - Manual: fill in name, category, status yourself

--- LOGBOOK TAB ---
Shows all passages and notes in reverse chronological order, grouped by month.
Stats bar at top shows total passages, total NM, and engine hours.

Tap any entry to expand and see full details.
The "+" button adds a new entry. Entry types:
  - PASSAGE: from/to location, distance (nm), departure/arrival time, engine hours,
    conditions (Calm/Moderate/Rough/Storm), sea state, sail mode, crew, notes, incidents.
  - NOTE/DAILY: free-text note, title, date — for observations, harbour notes, weather logs, etc.

First Mate reads the last 20 logbook entries for context. If asked about a passage, refer to the
logbook data you have. If asked about something older than 20 entries, say you only have recent
entries in context and suggest they check the logbook directly.

--- REPAIRS ---
Repairs track issues and work done on the vessel.
Each repair has: description, section (Engine, Electrical, Plumbing, etc.), linked equipment,
date logged, notes, photos, and AI-suggested parts.

Repair expanded view tabs:
  - PARTS: AI finds suggested parts for this repair. Tap "Find parts" to load suggestions.
    Tap a part to find retailers. Tap "Save to list" to save it.
  - NOTES: add free-text notes about the repair progress.
  - PHOTOS: attach photos of the issue or completed work.

To mark a repair complete: tap the circle on the left of the repair card.

--- MAINTENANCE TASKS ---
Tasks are created automatically when equipment is added via AI, or can be added manually.
Each task has: interval (e.g. every 90 days or every 250 engine hours), last service date,
due date, section, linked equipment, and priority.

Urgency levels:
  - CRITICAL: significantly overdue (past due date by more than 10 days, or engine hours exceeded)
  - OVERDUE: past due date
  - DUE SOON: within half the service interval or 10 days, whichever is smaller
  - OK: not due yet

Tasks can be filtered and sorted in the Maintenance standalone view.

--- DOCUMENTS ---
Documents can be attached to equipment cards (Docs tab) or to the vessel (ID tab → Docs).
Document types: Manual, Parts List, Warranty, Build Sheet, Photo, Certificate, Other.
Add by URL or file upload. AI can scan uploaded images/PDFs to extract text and auto-fill fields.

--- FIRST MATE (THIS CHAT) ---
You are First Mate. Users can ask you:
- Anything about their vessel, maintenance, repairs, equipment, or logbook
- "Is my boat ready for a passage?" — you check overdue tasks, repairs, equipment issues
- "What's due soon?" — summarise from the maintenance context
- "How do I [do something in the app]?" — explain clearly using the guide above
- "What does [feature] do?" — explain it
- Post-passage debriefs, maintenance recommendations, trend analysis

Always be direct. Use bullets for lists. Never make up vessel data — only reference what's in context.
If you don't have enough vessel data to answer, say so and suggest where in the app to find it.

--- PLANS & PRICING ---
Free: 1 vessel, 3 equipment cards, 3 repairs, no First Mate access.
Standard ($15/mo or $144/yr): 1 vessel, 10 equipment cards, unlimited repairs, First Mate 10 queries/mo.
Pro ($25/mo or $240/yr): 2 vessels, unlimited equipment, unlimited repairs, First Mate 50 queries/mo, AI logbook.

To upgrade: tap Profile tab → "Upgrade" button. Or tap any paywall prompt in the app.
If a user hits a limit (equipment, repairs, vessels), they'll see a prompt to upgrade.

--- COMMON QUESTIONS ---
Q: How do I add a piece of equipment?
A: Tap the "+" button → "Add Equipment" → describe it for AI identification, or enter manually.

Q: How do I mark a task complete?
A: Tap the circle on the left of any maintenance task. Add a note if you want, then confirm.

Q: How do I log a passage?
A: Tap Logbook tab → "+" button → choose "Passage" → fill in details → Save.

Q: How do I update engine hours?
A: Tap the Engine Hrs card on My Boat → enter new hours. Or log a passage with hours_end filled in.

Q: How do I add a repair?
A: Tap "+" → "Log Repair" → describe the issue, choose a section, link to equipment → Save.

Q: How do I find parts for a repair?
A: Expand a repair card → Parts tab → tap "Find parts for this repair."

Q: How do I add a document or manual?
A: Go to the Equipment card → Docs tab → "Add Document" → paste URL or upload file.

Q: How do I scan my registration documents?
A: My Boat → vessel card → ID tab → "Scan Document" → take or upload a photo. AI extracts the details.

Q: How do I switch between vessels?
A: Tap the vessel name in the top bar → select a vessel from the dropdown. "Add Vessel" to add more.

Q: Why can't I add more equipment/repairs?
A: You've hit your plan limit. Free plan: 3 equipment, 3 repairs. Upgrade to Standard or Pro for more.

Q: How do I cancel or change my subscription?
A: Tap Profile → "Manage Subscription" → you'll be taken to the Stripe customer portal.

--- SHARE VESSEL ---
Share Vessel lets the owner invite crew, family, or partners to access a vessel. It is available
on ALL plans — Free, Standard, and Pro. There is no paywall on sharing.

HOW TO SHARE A VESSEL:
1. Tap the Profile tab (bottom right)
2. Tap "Share Vessel" in the menu
3. Enter the crew member's email address and tap "Invite"
4. They receive an email invitation with a link to join
5. Once they accept, they can view the vessel — maintenance, equipment, repairs, logbook

The "WHO HAS ACCESS" section shows everyone currently on the vessel:
- OW = Owner (full access, can add/edit/delete everything, can remove members)
- M = Member (view and add entries, but cannot delete or manage members)

Owners can remove any member by tapping the remove button next to their name.

If someone doesn't have a Keeply account yet, they'll be prompted to create one for free when
they click the invite link. They don't need a paid plan — members can access shared vessels on
any plan including Free.

IMPORTANT: Share Vessel is one of Keeply's most important features. When someone asks how to
share a boat, invite crew, give their partner access, or let a family member see the vessel —
always tell them about Share Vessel and how easy it is to use. Never say sharing isn't possible.

Q: How do I share my boat with my husband / wife / partner / crew?
A: Easy — tap the Profile tab → "Share Vessel" → enter their email → tap Invite. They'll get
an email to join. It's free on all plans and takes about 10 seconds.

Q: Can my crew see the logbook and maintenance?
A: Yes. Once invited as a member they can view and add to all vessel data — maintenance, repairs,
equipment, and logbook. The owner retains full control and can remove access at any time.

Q: Does my crew need a paid subscription to access a shared vessel?
A: No. Shared vessel access works on any plan including Free. Only the owner's plan determines
what features are available on the vessel.`;

// ── Vessel-specific prompt (dynamic, not cached) ──────────────────────────────
function buildVesselPrompt(ctx) {
  const { vessel, tasks, repairs, logbook, equipment } = ctx;
  const today = new Date().toISOString().split("T")[0];

  const overdue   = tasks.filter(function(t){ return t.urgency === "critical" || t.urgency === "overdue"; });
  const dueSoon   = tasks.filter(function(t){ return t.urgency === "due-soon"; });
  const ok        = tasks.filter(function(t){ return t.urgency === "ok"; });
  const withNotes = tasks.filter(function(t){ return t.recentNotes && t.recentNotes.length > 0; });

  const fmt = function(t) {
    let line = "- " + t.task + " (" + t.section + ", every " + (t.interval || "?") + ")"
      + (t.dueDate     ? ", due "       + t.dueDate     : "")
      + (t.lastService ? ", last done " + t.lastService : ", never serviced");
    if (t.recentNotes && t.recentNotes.length > 0) {
      line += "\n  Completion notes: " + t.recentNotes.join(" | ");
    }
    return line;
  };

  const passages    = (logbook || []).filter(function(e){ return e.entry_type === "passage"; });
  const totalNm     = passages.reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm) || 0); }, 0);
  const totalEngHrs = passages.reduce(function(acc, e){ return acc + (parseFloat(e.hours_end)   || 0); }, 0);
  const lastPassage = passages[0];
  const recentLog   = (logbook || []).slice(0, 20);
  const openRepairs = (repairs   || []).filter(function(r){ return r.status !== "closed"; });
  const equipIssues = (equipment || []).filter(function(e){ return e.status === "needs-service" || e.status === "watch"; });

  let p = "== THIS SESSION ==\n"
    + "You are speaking with the owner of " + vessel.prefix + " " + vessel.name + ". Today is " + today + ".\n\n";

  p += "== VESSEL ==\n"
    + "Name: " + vessel.prefix + " " + vessel.name + "\n"
    + (vessel.make ? "Make/Model: " + [vessel.year, vessel.make, vessel.model].filter(Boolean).join(" ") + "\n" : "")
    + "Engine hours: " + (vessel.engineHours
        ? vessel.engineHours + " hrs" + (vessel.engineHoursDate ? " (as of " + vessel.engineHoursDate + ")" : "")
        : "not recorded") + "\n"
    + (vessel.fuelBurnRate ? "Fuel burn rate: " + vessel.fuelBurnRate + " gal/hr\n" : "")
    + (vessel.homePort ? "Home port: " + vessel.homePort + "\n" : "")
    + "\n";

  p += "== MAINTENANCE ==\n"
    + (overdue.length > 0
        ? "OVERDUE (" + overdue.length + "):\n" + overdue.map(fmt).join("\n") + "\n\n"
        : "No overdue tasks.\n\n")
    + (dueSoon.length > 0
        ? "DUE SOON (" + dueSoon.length + "):\n" + dueSoon.map(fmt).join("\n") + "\n\n"
        : "Nothing due soon.\n\n")
    + (ok.length > 0
        ? "UP TO DATE (" + ok.length + " tasks):\n" + ok.map(fmt).join("\n") + "\n\n"
        : "");

  if (withNotes.length > 0) {
    p += "== COMPLETION NOTES & TRENDS ==\n"
      + "Notes recorded when tasks were marked done. Look for patterns and deterioration:\n"
      + withNotes.map(function(t){
          return "- " + t.task + " (" + t.section + "):\n  " + t.recentNotes.join("\n  ");
        }).join("\n") + "\n\n";
  }

  p += "== OPEN REPAIRS (" + openRepairs.length + ") ==\n"
    + (openRepairs.length > 0
        ? openRepairs.map(function(r){
            let line = "- " + r.section + ": " + r.description + " (opened " + r.date + ")";
            if (r.notes) line += "\n  Notes: " + r.notes;
            return line;
          }).join("\n")
        : "No open repairs.")
    + "\n\n";

  p += "== LOGBOOK ==\n"
    + "Total: " + Math.round(totalNm) + " nm across " + passages.length + " passages\n"
    + (totalEngHrs > 0 ? "Engine hours logged across passages: " + Math.round(totalEngHrs) + " hrs\n" : "")
    + (lastPassage
        ? "Last passage: " + lastPassage.entry_date
          + (lastPassage.from_location || lastPassage.to_location
              ? " (" + (lastPassage.from_location || "?") + " → " + (lastPassage.to_location || "?") + ")"
              : "")
          + (lastPassage.distance_nm ? ", " + lastPassage.distance_nm + " nm" : "") + "\n"
        : "")
    + "\n"
    + (recentLog.length > 0
        ? "Recent entries (newest first):\n" + recentLog.map(function(e) {
            var line = "- " + e.entry_date + " [" + (e.entry_type === "passage" ? "passage" : "note") + "]";
            if (e.entry_type === "passage" && (e.from_location || e.to_location)) {
              line += ": " + (e.from_location || "?") + " → " + (e.to_location || "?");
              if (e.distance_nm) line += " (" + e.distance_nm + " nm)";
            }
            if (e.hours_end)  line += " [eng: " + e.hours_end + " hrs]";
            if (e.crew)       line += " [crew: " + e.crew + "]";
            if (e.conditions) line += " [" + e.conditions + "]";
            if (e.sea_state)  line += " [sea: " + e.sea_state + "]";
            if (e.title)      line += " — " + e.title;
            if (e.notes)      line += " — notes: " + e.notes;
            if (e.incident)   line += " — INCIDENT: " + e.incident;
            return line;
          }).join("\n")
        : "No entries.")
    + "\n\n";

  p += "== EQUIPMENT ==\n"
    + (equipIssues.length > 0
        ? "Issues:\n" + equipIssues.map(function(e){ return "- " + e.name + ": " + e.status; }).join("\n")
        : "No issues flagged.")
    + "\n\n";

  p += "== EQUIPMENT LOGS ==\n"
    + (function(){
        var withLogs = (equipment || []).filter(function(e){ return e.recentLogs && e.recentLogs.length > 0; });
        if (withLogs.length === 0) return "No equipment log entries.\n\n";
        return withLogs.map(function(e){
          var info = e.notes ? " [" + e.notes.replace(/\n/g, " ").slice(0, 80) + "]" : "";
          return "- " + e.name + " (" + e.category + ")" + info + ":\n  " + e.recentLogs.join("\n  ");
        }).join("\n") + "\n\n";
      })();

  p += "== BEHAVIOUR ==\n"
    + "Blend vessel intelligence with app support naturally. If asked about the vessel, use the data above. "
    + "If asked how to do something in the app, use the APP GUIDE. "
    + "If asked about both in one message, answer both. "
    + "CRITICAL: Never tell a user they cannot share a vessel or invite crew — Share Vessel is ungated and available to everyone. "
    + "Actively scan logbook notes and completion notes for anomalies — flag any concerning patterns. "
    + "When asked if the boat is ready: check overdue tasks, open repairs, and equipment issues. "
    + "Never invent vessel data. Speak directly and casually to the owner.";

  return p;
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
    const token      = authHeader.replace("Bearer ", "").trim();
    if (token) {
      const admin = getAdmin();
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (!authErr && user) {
        const { data: profile } = await admin.from("user_profiles").select("plan").eq("id", user.id).single();
        const plan  = profile?.plan || "free";
        const limit = FM_LIMITS[plan] !== undefined ? FM_LIMITS[plan] : 0;
        if (limit === 0) {
          return Response.json({ error: "First Mate is not available on the Free plan. Upgrade to Standard or Pro to chat with First Mate." }, { status: 403 });
        }
        if (limit > 0) {
          const monthKey = new Date().toISOString().slice(0, 7);
          const { data: usage } = await admin.from("firstmate_usage").select("count")
            .eq("user_id", user.id).eq("month_key", monthKey).single();
          const currentCount = usage?.count || 0;
          if (currentCount >= limit) {
            return Response.json({ error: "You've used all " + limit + " First Mate queries this month. Upgrade to get more." }, { status: 429 });
          }
          await admin.from("firstmate_usage").upsert({
            user_id: user.id, month_key: monthKey,
            count: currentCount + 1, updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,month_key" });
          request._fmUsage = { count: currentCount + 1, limit, plan };
        }
      }
    }

    // ── Build system prompt — two blocks for cache_control ────────────────────
    // Block 1 (APP_GUIDE): static, cached by Anthropic — saves ~90% on repeated input tokens
    // Block 2 (vessel prompt): dynamic per session, not cached
    const systemBlocks = [
      {
        type: "text",
        text: APP_GUIDE,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: buildVesselPrompt(vesselContext),
      },
    ];

    // ── Call Anthropic ────────────────────────────────────────────────────────
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system:     systemBlocks,
        messages:   messages.map(function(m){ return { role: m.role, content: m.content }; }),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(function(){ return {}; });
      return Response.json({ error: err.error?.message || "Anthropic error " + anthropicRes.status }, { status: 500 });
    }

    const data      = await anthropicRes.json();
    const text      = (data.content || []).map(function(b){ return b.text || ""; }).join("");
    const usageMeta = request._fmUsage || null;
    return Response.json({ response: text, usage: usageMeta });

  } catch (e) {
    console.error("First Mate error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
