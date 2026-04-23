import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Sent once, only after a user finishes first-time onboarding and creates
// their first vessel as owner. VesselSetup gates the call (skips for
// Add-Vessel flow + shared/crew joins, which don't route through setup).
// Fire-and-forget from the client — delivery failures should never block
// the user from reaching the app.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toEmail, firstName, vesselName } = body as {
      toEmail?: string;
      firstName?: string;
      vesselName?: string;
    };

    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json({ error: 'Invalid or missing email' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const salutation = firstName && firstName.trim() ? firstName.trim() : 'there';
    const boat = vesselName && vesselName.trim() ? vesselName.trim() : 'your vessel';

    const subject = `Welcome aboard — a few things to get ${boat} dialed in`;

    const plainText = `Hey ${salutation},

Garry here — founder of Keeply. Thanks for adding ${boat} to the app.

I built Keeply because I was tired of losing track of when I last changed my impeller, which filter fits my engine, and where I put last year's survey. If you've been there, you're in the right place.

FOUR THINGS TO DO THIS WEEK

1. Review your equipment
   The AI generated a starter list. Anything missing or wrong, edit it from the Equipment tab.

2. Verify the AI parts
   On each equipment's Parts tab, tap the amber "AI · verify" chips to confirm part numbers or correct them.

3. Upload your docs
   Registration, insurance, engine manuals. Tap your Vessel card → Docs tab → scan.

4. Try First Mate
   Ask things like "When was my last oil change?" or "What's overdue on ${boat}?"

STUCK OR CONFUSED?
• Common questions:  https://keeply.boats/faq
• Get in touch:      support@keeply.boats
• Send feedback:     tap Profile → Send Feedback in the app

Fair winds,
Garry
Founder, Keeply`;

    const html = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #f8fafc; padding: 0; border-radius: 8px; overflow: hidden;">
  <div style="background: #0f4c8a; padding: 22px 28px;">
    <div style="color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">⚓ Welcome aboard</div>
    <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 2px;">A quick start guide from the founder</div>
  </div>
  <div style="background: #ffffff; padding: 28px;">
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 14px;">Hey ${escapeHtml(salutation)},</p>
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 14px;">
      Garry here — founder of Keeply. Thanks for adding <strong>${escapeHtml(boat)}</strong> to the app.
    </p>
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 22px;">
      I built Keeply because I was tired of losing track of when I last changed my impeller, which filter fits my engine, and where I put last year's survey. If you've been there, you're in the right place.
    </p>

    <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 14px;">
      Four things to do this week
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="width: 28px; vertical-align: top; padding: 0 0 14px;">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0f4c8a; color: #fff; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700;">1</div>
        </td>
        <td style="vertical-align: top; padding: 0 0 14px;">
          <div style="font-size: 14px; font-weight: 600; color: #1a1d23;">Review your equipment</div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.5; margin-top: 2px;">The AI generated a starter list. Anything missing or wrong, edit it from the Equipment tab.</div>
        </td>
      </tr>
      <tr>
        <td style="width: 28px; vertical-align: top; padding: 0 0 14px;">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0f4c8a; color: #fff; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700;">2</div>
        </td>
        <td style="vertical-align: top; padding: 0 0 14px;">
          <div style="font-size: 14px; font-weight: 600; color: #1a1d23;">Verify the AI parts</div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.5; margin-top: 2px;">On each equipment's Parts tab, tap the amber <span style="background: rgba(245,185,66,0.12); color: #b7791f; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">AI · verify</span> chips to confirm part numbers or correct them.</div>
        </td>
      </tr>
      <tr>
        <td style="width: 28px; vertical-align: top; padding: 0 0 14px;">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0f4c8a; color: #fff; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700;">3</div>
        </td>
        <td style="vertical-align: top; padding: 0 0 14px;">
          <div style="font-size: 14px; font-weight: 600; color: #1a1d23;">Upload your docs</div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.5; margin-top: 2px;">Registration, insurance, engine manuals. Tap your Vessel card → Docs tab → scan.</div>
        </td>
      </tr>
      <tr>
        <td style="width: 28px; vertical-align: top; padding: 0;">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0f4c8a; color: #fff; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700;">4</div>
        </td>
        <td style="vertical-align: top; padding: 0;">
          <div style="font-size: 14px; font-weight: 600; color: #1a1d23;">Try First Mate</div>
          <div style="font-size: 13px; color: #4b5563; line-height: 1.5; margin-top: 2px;">Ask things like <em>"When was my last oil change?"</em> or <em>"What's overdue on ${escapeHtml(boat)}?"</em></div>
        </td>
      </tr>
    </table>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">Stuck or confused?</div>
      <div style="font-size: 13px; color: #1a1d23; line-height: 1.7;">
        Common questions: <a href="https://keeply.boats/faq" style="color: #0f4c8a; font-weight: 600; text-decoration: none;">keeply.boats/faq</a><br/>
        Get in touch: <a href="mailto:support@keeply.boats" style="color: #0f4c8a; font-weight: 600; text-decoration: none;">support@keeply.boats</a><br/>
        Send feedback: tap <strong>Profile → Send Feedback</strong> in the app
      </div>
    </div>

    <p style="font-size: 14px; color: #1a1d23; line-height: 1.6; margin: 0 0 6px;">Fair winds,</p>
    <p style="font-size: 14px; color: #1a1d23; line-height: 1.4; margin: 0;">
      Garry<br/>
      <span style="color: #6b7280; font-size: 12px;">Founder, Keeply</span>
    </p>
  </div>
</div>`.trim();

    const result = await resend.emails.send({
      from: 'Keeply <noreply@keeply.boats>',
      to: toEmail,
      replyTo: 'support@keeply.boats',
      subject: subject,
      text: plainText,
      html: html,
    });

    if ((result as { error?: unknown }).error) {
      console.error('Welcome email send failed:', (result as { error?: unknown }).error);
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('Welcome email exception:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
