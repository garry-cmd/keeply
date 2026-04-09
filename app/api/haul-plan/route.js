export const maxDuration = 60;

export async function POST(request) {
  try {
    const { vesselContext, userEmail, userName } = await request.json();

    if (!vesselContext || !vesselContext.vessel) {
      return Response.json({ error: "No vessel context" }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }
    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: "Email not configured" }, { status: 500 });
    }

    const { vessel, tasks, repairs, equipment, adminTasks } = vesselContext;
    const prefix = vessel.type === "motor" ? "M/V" : "S/V";
    const vesselName = prefix + " " + vessel.name;

    const overdueTasks = (tasks || []).filter(function(t){ return t.urgency === "critical" || t.urgency === "overdue"; });
    const dueSoonTasks = (tasks || []).filter(function(t){ return t.urgency === "due-soon"; });
    const openRepairs  = (repairs || []).filter(function(r){ return r.status !== "closed"; });
    const haulTask     = (adminTasks || []).find(function(t){ return t.name && t.name.toLowerCase().includes("haul"); });

    const systemPrompt = `You are a marine yard manager. Generate a concise vessel-specific haul-out plan in HTML.
Use <h2> for 4 sections: Pre-Haul (parts to order), On The Hard, Launch Prep, Post-Launch.
Use <ul><li> for tasks. Each item: task name + one-line note specific to this vessel. No preamble. Output HTML only.`;

    const userPrompt = `Generate a haul-out project plan for ${vesselName}.

VESSEL: ${vessel.year || ""} ${vessel.make || ""} ${vessel.model || ""}, ${vessel.type === "motor" ? "motor vessel" : "sailboat"}
Engine hours: ${vessel.engineHours ? vessel.engineHours + " hrs" : "not recorded"}
Home port: ${vessel.homePort || "not set"}
Last haul: ${haulTask && haulTask.last_completed ? haulTask.last_completed : "not recorded"}
Next scheduled: ${haulTask && haulTask.due_date ? haulTask.due_date : "not scheduled"}

OVERDUE MAINTENANCE (${overdueTasks.length} items):
${overdueTasks.map(function(t){ return "- " + t.task + " (" + t.section + ", last done " + (t.lastService || "never") + ")"; }).join("\n") || "None"}

DUE SOON (${dueSoonTasks.length} items):
${dueSoonTasks.map(function(t){ return "- " + t.task + " (due " + t.dueDate + ")"; }).join("\n") || "None"}

OPEN REPAIRS (${openRepairs.length}):
${openRepairs.map(function(r){ return "- " + r.section + ": " + r.description; }).join("\n") || "None"}

EQUIPMENT:
${(equipment || []).map(function(e){ return "- " + e.name + " (" + e.category + ")" + (e.status !== "good" ? " [" + e.status + "]" : ""); }).join("\n") || "None listed"}

Generate a practical haul-out plan. Include standard items (bottom paint, zincs, cutlass bearing, through-hulls, prop, shaft seal) plus anything specific to this vessel's situation above.`;

    // Generate plan with Claude
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1800,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(function(){ return {}; });
      return Response.json({ error: err.error?.message || "AI error " + aiRes.status }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const planHtml = (aiData.content || []).map(function(b){ return b.text || ""; }).join("");

    // Build email
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f4f6f9; font-family:Arial,sans-serif; }
  h2 { color:#0f4c8a; font-size:16px; margin:24px 0 8px; border-bottom:2px solid #e2e8f0; padding-bottom:6px; }
  ul { margin:0 0 12px; padding-left:20px; }
  li { margin-bottom:6px; font-size:14px; color:#374151; line-height:1.5; }
  p { font-size:14px; color:#374151; line-height:1.6; margin:0 0 12px; }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

  <tr><td style="background:#0f4c8a;border-radius:12px 12px 0 0;padding:24px 28px;">
    <div style="font-size:12px;font-weight:800;color:rgba(255,255,255,0.6);letter-spacing:1.5px;text-transform:uppercase;">Keeply · First Mate</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:8px;">Haul-Out Project Plan</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${vesselName} · Generated ${today}</div>
  </td></tr>

  <tr><td style="background:#fff;padding:32px 28px;border-radius:0 0 12px 12px;">

    <p style="font-size:13px;color:#6b7280;margin-bottom:20px;">
      This plan was generated by First Mate based on your vessel's maintenance history, open repairs, and equipment. Review and adjust for your yard's specific schedule.
    </p>

    ${planHtml}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;" />

    <div style="background:#eff6ff;border-radius:8px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;color:#0f4c8a;margin-bottom:4px;">Track it in Keeply</div>
      <div style="font-size:12px;color:#374151;">Log your haul date in the Admin tab when you splash — First Mate will use it to plan your next haul.</div>
    </div>

    <p style="font-size:11px;color:#9ca3af;margin-top:24px;margin-bottom:0;">Generated by Keeply · <a href="https://keeply.boats" style="color:#0f4c8a;">keeply.boats</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "First Mate <firstmate@keeply.boats>",
        to: [userEmail],
        subject: "Haul-Out Plan · " + vesselName,
        html: html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(function(){ return {}; });
      return Response.json({ error: "Email failed: " + (err.message || emailRes.status) }, { status: 500 });
    }

    return Response.json({ ok: true });

  } catch(e) {
    console.error("haul-plan error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
