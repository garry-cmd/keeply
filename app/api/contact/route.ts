import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await req.json();
    const { name, email, subject, message, type } = body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const subjectLine = subject?.trim()
      ? `[Keeply Contact] ${subject}`
      : `[Keeply Contact] ${type === 'fleet' ? 'Fleet Enquiry' : type === 'feature' ? 'Feature Request' : 'General Support'}`;

    const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const typeLabel = type === 'fleet' ? 'Fleet &amp; Commercial' : type === 'feature' ? 'Feature Request' : 'General Support';

    // 1. Internal notification to Garry
    await resend.emails.send({
      from: 'Keeply Contact <noreply@keeply.boats>',
      to: 'garry@keeply.boats',
      replyTo: email,
      subject: subjectLine,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px 24px; border-radius: 8px;">
          <div style="background: #0f4c8a; padding: 20px 24px; border-radius: 8px 8px 0 0; margin: -32px -24px 24px;">
            <h2 style="color: #fff; margin: 0; font-size: 18px; font-weight: 700;">New message via Keeply Contact Form</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; width: 30%; border-bottom: 1px solid #f1f5f9;">From</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; border-bottom: 1px solid #f1f5f9;">${name} &lt;${email}&gt;</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">Type</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; border-bottom: 1px solid #f1f5f9;">${typeLabel}</td>
            </tr>
            ${subject?.trim() ? `
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">Subject</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; border-bottom: 1px solid #f1f5f9;">${subject}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; vertical-align: top;">Message</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; line-height: 1.7; white-space: pre-wrap;">${safeMessage}</td>
            </tr>
          </table>
          <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Reply directly to this email to respond to ${name}.<br/>
            Sent via keeply.boats/contact
          </p>
        </div>
      `,
    });

    // 2. Auto-reply to the sender
    await resend.emails.send({
      from: 'Keeply Support <support@keeply.boats>',
      to: email,
      subject: "We got your message — Keeply",
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1d23;">
          <div style="background: #07162d; padding: 28px 32px; border-radius: 10px 10px 0 0;">
            <span style="color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">⚓ Keeply</span>
          </div>
          <div style="background: #fff; padding: 36px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin: 0 0 16px; font-size: 16px; color: #1a1d23;">Hi ${name},</p>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #374151;">
              Thanks for reaching out — we got your message and will get back to you within <strong>one business day</strong>.
            </p>
            <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.7; color: #374151;">
              If it's urgent, just reply to this email and it'll land straight in my inbox.
            </p>
            <div style="background: #f8fafc; border-left: 3px solid #0f4c8a; border-radius: 0 6px 6px 0; padding: 16px 18px; margin-bottom: 32px;">
              <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Your message</div>
              <div style="font-size: 14px; color: #374151; line-height: 1.65; white-space: pre-wrap;">${safeMessage}</div>
            </div>
            <p style="margin: 0 0 2px; font-size: 15px; color: #1a1d23; font-weight: 600;">Garry</p>
            <p style="margin: 0; font-size: 13px; color: #9ca3af;">Founder, Keeply &nbsp;·&nbsp; <a href="https://www.keeply.boats" style="color: #0f4c8a; text-decoration: none;">keeply.boats</a></p>
          </div>
          <p style="margin: 16px 0 0; font-size: 11px; color: #d1d5db; text-align: center;">
            You're receiving this because you submitted the contact form at keeply.boats/contact
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact route]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
