export async function POST(request) {
  try {
    const { email, vesselName, vesselType, inviterName } = await request.json();
    if (!email || !vesselName) return Response.json({ error: "Missing fields" }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });
    const prefix = vesselType === "motor" ? "M/V" : "S/V";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="background:#0f4c8a;border-radius:12px 12px 0 0;padding:24px 28px;"><div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:1px;">KEEPLY</div><div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px;">You have been invited</div><div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">${prefix} ${vesselName}</div></td></tr><tr><td style="background:#fff;padding:28px;border-radius:0 0 12px 12px;"><p style="font-size:14px;color:#374151;margin:0 0 20px;">${inviterName || "A Keeply user"} has invited you to access <strong>${prefix} ${vesselName}</strong> on Keeply.</p><p style="font-size:13px;color:#6b7280;margin:0 0 24px;">You will be able to view maintenance schedules, track repairs, and stay on top of everything on the boat.</p><div style="text-align:center;margin-bottom:24px;"><a href="https://keeply.boats" style="display:inline-block;background:#0f4c8a;color:#fff;text-decoration:none;border-radius:8px;padding:13px 32px;font-size:14px;font-weight:700;">Open Keeply</a></div><p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">Sign in or create an account with this email address to access the vessel.</p></td></tr><tr><td style="padding:16px 0;text-align:center;"><div style="font-size:11px;color:#9ca3af;">Keeply - keeply.boats</div></td></tr></table></td></tr></table></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: "Keeply <keeply@keeply.boats>", to: [email], subject: `${inviterName || "Someone"} invited you to ${prefix} ${vesselName} on Keeply`, html }),
    });
    if (!res.ok) { const err = await res.json(); return Response.json({ error: err.message || "Send failed" }, { status: 500 }); }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
