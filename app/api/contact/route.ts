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

    const toAddress =
      type === 'fleet' ? 'garry@keeply.boats' : 'garry@keeply.boats';

    const subjectLine = subject?.trim()
      ? `[Keeply Contact] ${subject}`
      : `[Keeply Contact] ${type === 'fleet' ? 'Fleet Enquiry' : type === 'feature' ? 'Feature Request' : 'General Support'}`;

    await resend.emails.send({
      from: 'Keeply Contact <noreply@keeply.boats>',
      to: toAddress,
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
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; border-bottom: 1px solid #f1f5f9;">${
                type === 'fleet' ? 'Fleet &amp; Commercial' :
                type === 'feature' ? 'Feature Request' : 'General Support'
              }</td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">Subject</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; border-bottom: 1px solid #f1f5f9;">${subject}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; background: #f8fafc; vertical-align: top;">Message</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1a1d23; line-height: 1.7; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            </tr>
          </table>

          <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Reply directly to this email to respond to ${name}.<br/>
            Sent via keeply.boats/contact
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
