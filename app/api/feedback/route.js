export async function POST(request) {
  try {
    const { category, message, userEmail, userName, vesselName } = await request.json();

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: 'Email not configured' }, { status: 500 });
    }

    const categoryEmoji =
      {
        'Bug Report': '🐛',
        'Feature Request': '✨',
        Question: '❓',
        'General Feedback': '💬',
      }[category] || '💬';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 24px;">
        <div style="background: #0f4c8a; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <span style="color: white; font-size: 18px; font-weight: 700;">⚓ Keeply Feedback</span>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="margin-bottom: 16px;">
            <span style="background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">
              ${categoryEmoji} ${category || 'General Feedback'}
            </span>
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: #1e293b; margin-bottom: 20px; white-space: pre-wrap;">${message.trim()}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <div style="font-size: 12px; color: #64748b;">
            ${userName ? `<div><strong>From:</strong> ${userName}</div>` : ''}
            ${userEmail ? `<div><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></div>` : ''}
            ${vesselName ? `<div><strong>Vessel:</strong> ${vesselName}</div>` : ''}
            <div><strong>Sent:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT</div>
          </div>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Keeply Feedback <feedback@keeply.boats>',
        to: ['support@keeply.boats'],
        reply_to: userEmail || undefined,
        subject: `${categoryEmoji} [${category || 'Feedback'}] from ${userName || userEmail || 'a Keeply user'}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Resend error:', err);
      return Response.json({ error: 'Failed to send feedback' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('Feedback error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
