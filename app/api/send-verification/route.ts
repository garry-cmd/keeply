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
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
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

If you didn't sign up for Keeply, you can ignore this email.

— The Keeply team`;

    const html = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 0; border-radius: 8px; overflow: hidden;">
  <div style="background: #0f4c8a; padding: 22px 28px;">
    <div style="color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">⚓ Verify your email</div>
  </div>
  <div style="background: #ffffff; padding: 28px;">
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 14px;">Hi,</p>
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 18px;">
      Click the button below to verify <strong>${escapeHtml(userEmail)}</strong> for your Keeply account.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${verifyUrl}" style="display: inline-block; background: #0f4c8a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: 600;">Verify email</a>
    </p>
    <div style="background: #f1f5f9; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px;">
      <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">Why verify?</div>
      <div style="font-size: 13px; color: #1a1d23; line-height: 1.5;">
        So you can reset your password and recover your account if you ever lose access. Without a verified email, we can't help you back in.
      </div>
    </div>
    <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 6px;">
      This link expires in 24 hours. If the button doesn't work, copy this URL into your browser:
    </p>
    <p style="font-size: 12px; color: #4b5563; line-height: 1.4; margin: 0 0 18px; word-break: break-all;">
      ${escapeHtml(verifyUrl)}
    </p>
    <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0;">
      If you didn't sign up for Keeply, you can ignore this email.
    </p>
  </div>
</div>`.trim();

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
