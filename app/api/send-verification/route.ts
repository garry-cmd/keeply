import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// POST /api/send-verification
//
// Generates a verification token, stores it in app_metadata (server-only writable),
// and emails a verify link to the user's current email address.
//
// Auth: requires a Supabase session (Bearer token in Authorization header).
//
// Idempotent: each call generates a new token and overwrites the previous one.
// The previous email's link becomes invalid as soon as a new one is sent — this is
// intentional. Users who click an old link after requesting a new one will see
// the verify endpoint reject the stale token; they can simply use the latest email.

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    if (!RESEND_KEY) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    // ── Authenticate caller via Bearer token ──
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    const user = userData.user;
    const userId = user.id;
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User has no email' }, { status: 400 });
    }

    // If already self-verified, no-op (still return ok so client doesn't surface an error)
    const existingAppMeta = (user.app_metadata || {}) as Record<string, unknown>;
    if (existingAppMeta.email_self_verified === true) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // ── Generate token ──
    const token = crypto.randomBytes(16).toString('hex'); // 32 hex chars = 128 bits
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // ── Persist token to app_metadata (merge with existing) ──
    const newAppMeta = {
      ...existingAppMeta,
      email_self_verified: false,
      verify_token: token,
      verify_token_expires: expiresAt,
    };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: newAppMeta,
    });
    if (updateErr) {
      console.error('send-verification: failed to update app_metadata:', updateErr);
      return NextResponse.json({ error: 'Failed to persist token' }, { status: 500 });
    }

    // ── Build verify URL ──
    const origin =
      req.headers.get('origin') ||
      (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://keeply.boats');
    const verifyUrl = `${origin}/api/verify-email?t=${encodeURIComponent(token)}&u=${encodeURIComponent(
      userId
    )}`;

    // ── Send email ──
    const resend = new Resend(RESEND_KEY);
    const subject = 'Verify your email for Keeply';
    const plainText = `Hi,

Click the link below to verify your email address (${userEmail}) for your Keeply account:

${verifyUrl}

This link expires in 24 hours.

Why verify? So you can reset your password and recover your account if you ever lose access. Without a verified email, we can't help you back into your account.

If you didn't sign up for Keeply, you can safely ignore this email.

— Keeply
Always ready to go.`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your email for Keeply</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f7fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8eb;">

          <tr>
            <td style="background-color:#071e3d;padding:24px 32px;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;line-height:1;">Keeply</div>
              <div style="font-size:11px;color:#f5a623;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-top:6px;">Always ready to go.</div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 24px;">
              <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#071e3d;letter-spacing:-0.2px;">Verify your email</h1>
              <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#3a3a3a;">
                Click the button below to verify <strong style="color:#071e3d;">${escapeHtml(userEmail)}</strong> for your Keeply account.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
                <tr>
                  <td bgcolor="#f5a623" style="border-radius:8px;">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#1a1200;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">Verify email</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;background-color:#f5f7fa;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:11px;font-weight:700;color:#0f4c8a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Why verify?</div>
                    <div style="font-size:13px;color:#3a3a3a;line-height:1.55;">
                      So you can reset your password and recover your account if you ever lose access. Without a verified email, we can't help you back in.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;line-height:1.6;margin:0 0 8px;color:#666;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size:12px;line-height:1.5;margin:0 0 24px;color:#0f4c8a;word-break:break-all;">${escapeHtml(verifyUrl)}</p>

              <p style="font-size:13px;line-height:1.6;margin:0;color:#666;border-top:1px solid #eee;padding-top:20px;">
                This link expires in 24 hours. If you didn't sign up for Keeply, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#fafbfc;padding:18px 32px;border-top:1px solid #eee;">
              <p style="font-size:12px;line-height:1.5;margin:0;color:#888;">
                Sent by Keeply LLC. Questions? Reply to this email or write to <a href="mailto:hello@keeply.boats" style="color:#0f4c8a;text-decoration:none;">hello@keeply.boats</a>.
              </p>
              <p style="font-size:11px;line-height:1.5;margin:8px 0 0;color:#aaa;">
                You're receiving this because someone signed up at keeply.boats with this email address.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const result = await resend.emails.send({
      from: 'Keeply <noreply@keeply.boats>',
      to: userEmail,
      replyTo: 'support@keeply.boats',
      subject: subject,
      text: plainText,
      html: html,
    });

    if ((result as { error?: unknown }).error) {
      console.error('Verification email send failed:', (result as { error?: unknown }).error);
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('send-verification exception:', msg);
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