export async function POST(request) {
  try {
    const { email, vesselName, vesselType, inviterName } = await request.json();
    if (!email || !vesselName) return Response.json({ error: 'Missing fields' }, { status: 400 });
    if (!process.env.RESEND_API_KEY) return Response.json({ error: 'No API key' }, { status: 500 });

    const prefix = vesselType === 'motor' ? 'M/V' : 'S/V';
    const signupUrl = `https://keeply.boats`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

  <!-- Header -->
  <tr><td style="background:#0f4c8a;border-radius:12px 12px 0 0;padding:24px 28px;">
    <div style="font-size:12px;font-weight:800;color:rgba(255,255,255,0.6);letter-spacing:1.5px;text-transform:uppercase;">Keeply</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:8px;">You've been invited</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${prefix} ${vesselName}</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:32px 28px;border-radius:0 0 12px 12px;">

    <p style="font-size:15px;color:#1a1d23;margin:0 0 8px;font-weight:600;">
      ${inviterName || 'A Keeply user'} invited you to access <strong>${prefix} ${vesselName}</strong>.
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 28px;line-height:1.6;">
      You'll be able to view maintenance schedules, track repairs, monitor equipment, and stay on top of everything happening on the boat.
    </p>

    <!-- Step by step instructions -->
    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:12px;font-weight:800;color:#1e40af;letter-spacing:0.8px;margin-bottom:14px;text-transform:uppercase;">How to accept your invite</div>

      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <div style="width:24px;height:24px;background:#0f4c8a;color:#fff;border-radius:50%;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px;">1</div>
        <div style="font-size:13px;color:#374151;padding-top:4px;">Tap <strong>Open Keeply</strong> below</div>
      </div>

      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <div style="width:24px;height:24px;background:#0f4c8a;color:#fff;border-radius:50%;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px;">2</div>
        <div style="font-size:13px;color:#374151;padding-top:4px;">Tap <strong>Sign Up</strong> and create an account</div>
      </div>

      <div style="display:flex;align-items:flex-start;">
        <div style="width:24px;height:24px;background:#0f4c8a;color:#fff;border-radius:50%;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px;">3</div>
        <div style="font-size:13px;color:#374151;padding-top:4px;">
          Use exactly this email address:<br>
          <strong style="color:#0f4c8a;font-size:14px;">${email}</strong>
        </div>
      </div>
    </div>

    <!-- Important note -->
    <div style="background:#fff8e1;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:28px;">
      <div style="font-size:12px;color:#92400e;line-height:1.5;">
        <strong>Important:</strong> You must sign up using <strong>${email}</strong> — this is the address your invite was sent to. Using a different email won't give you access to the vessel.
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${signupUrl}" style="display:inline-block;background:#0f4c8a;color:#fff;text-decoration:none;border-radius:8px;padding:14px 40px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
        Open Keeply →
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
      Once you sign up, ${prefix} ${vesselName} will appear in your vessel list automatically.<br>
      No further steps needed.
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Keeply <keeply@keeply.boats>',
        to: [email],
        subject: `${inviterName || 'Someone'} invited you to ${prefix} ${vesselName} on Keeply`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.message || 'Send failed' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
