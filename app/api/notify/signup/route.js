import { createClient } from "@supabase/supabase-js";

// Supabase admin client to look up email from auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Verify webhook secret to prevent unauthorized calls
    const secret = request.headers.get("x-webhook-secret");
    if (secret !== process.env.SIGNUP_WEBHOOK_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();

    // Only care about INSERTs on user_profiles
    if (payload.type !== "INSERT" || !payload.record) {
      return Response.json({ ok: true });
    }

    const { id, plan } = payload.record;

    // Look up email from auth.users
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
    const email = userData?.user?.email || "unknown";
    const signedUpAt = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    });

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return Response.json({ error: "Email not configured" }, { status: 500 });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 24px;">
        <div style="background: #0f4c8a; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
          <span style="color: white; font-size: 20px;">⚓</span>
          <span style="color: white; font-size: 18px; font-weight: 700;">New Keeply Signup</span>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; background: #f8fafc;">
          <div style="font-size: 32px; font-weight: 800; color: #0f4c8a; margin-bottom: 4px;">🎉</div>
          <div style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 20px;">
            Someone just signed up for Keeply!
          </div>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">EMAIL</div>
            <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${email}</div>
          </div>
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
              <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">PLAN</div>
              <div style="font-size: 15px; font-weight: 600; color: ${plan === "free" ? "#64748b" : "#16a34a"};">
                ${plan === "pro" ? "⭐ Pro" : plan === "standard" ? "✅ Standard" : "Free"}
              </div>
            </div>
            <div style="flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
              <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">TIME</div>
              <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${signedUpAt} PT</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Keeply <notifications@keeply.boats>",
        to: ["garry@keeply.boats"],
        subject: `⚓ New signup: ${email} (${plan || "free"})`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Resend error:", err);
      return Response.json({ error: "Failed to send email" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("Signup notify error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
