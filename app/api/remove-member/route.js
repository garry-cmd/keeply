export async function POST(request) {
  try {
    const { email, vesselName, vesselType, removerName } = await request.json();
    if (!email || !vesselName) return Response.json({ error: "Missing fields" }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return Response.json({ error: "No API key" }, { status: 500 });

    const prefix = vesselType === "motor" ? "M/V" : "S/V";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

  <!-- Header -->
  <tr><td style="background:#374151;border-radius:12px 12px 0 0;padding:24px 28px;">
    <div style="font-size:12px;font-weight:800;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;">Keeply</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:8px;">Your access has been removed</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:4px;">${prefix} ${vesselName}</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:32px 28px;border-radius:0 0 12px 12px;">

    <p style="font-size:15px;color:#1a1d23;margin:0 0 16px;line-height:1.6;">
      ${removerName || "The vessel owner"} has removed your access to <strong>${prefix} ${vesselName}</strong> on Keeply.
    </p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 28px;line-height:1.6;">
      You will no longer be able to view this vessel's maintenance schedules, repairs, or equipment. Your own vessels and data are unaffected.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
      <div style="font-size:13px;color:#374151;line-height:1.6;">
        If you think this was a mistake, reach out to ${removerName || "the vessel owner"} directly to request access again.
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://keeply.boats" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;border-radius:8px;padding:13px 32px;font-size:14px;font-weight:700;">
        Open Keeply
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
      Your Keeply account remains active. This email only affects your access to ${prefix} ${vesselName}.
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 0;text-align:center;">
    <div style="font-size:11px;color:#9ca3af;">Keeply · keeply.boats</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Keeply <keeply@keeply.boats>",
        to: [email],
        subject: `Your access to ${prefix} ${vesselName} has been removed`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || "Send failed" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
