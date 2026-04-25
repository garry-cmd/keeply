import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// POST /api/change-email
// Body: { newEmail: string }
//
// Authenticated endpoint (Bearer token required) that:
//   1. Updates the user's email via service-role admin API (bypassing Supabase's
//      built-in confirm-email-change flow — we run our own).
//   2. Resets app_metadata.email_self_verified to false.
//   3. Generates a new verification token and emails it to the new address.
//
// Why bypass Supabase's email-change confirm flow:
//   - It would send confirmation emails to BOTH the old and new addresses, which
//     is confusing for users who are still trying to verify their first email.
//   - We want a single, consistent verification UX driven by our own banner +
//     /api/verify-email endpoint.
//
// Note: we update the user's email on auth.users immediately, even before the
// new email is verified. This matches Supabase's "Confirm email change = OFF"
// behavior. Account recovery is gated on email_self_verified, not on the
// auth.users email column being canonical.

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

    // ── Auth ──
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

    // ── Validate input ──
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { newEmail } = (body || {}) as { newEmail?: string };
    const trimmed = (newEmail || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    if (user.email && trimmed === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Same email as current' }, { status: 400 });
    }

    // ── Update email ──
    // email_confirm: true tells Supabase not to require its own re-confirmation.
    // We're running our own verification flow — Supabase shouldn't gate the user.
    const { error: emailUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: trimmed,
      email_confirm: true,
    });
    if (emailUpdateErr) {
      // Most common failure: email already in use by another account
      const msg = emailUpdateErr.message || 'Failed to update email';
      const isDuplicate = /already.*registered|duplicate|unique/i.test(msg);
      return NextResponse.json(
        { error: isDuplicate ? 'That email is already registered to another account.' : msg },
        { status: 400 }
      );
    }

    // ── Generate fresh token + reset verified flag ──
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const existingAppMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const newAppMeta = {
      ...existingAppMeta,
      email_self_verified: false,
      verify_token: token,
      verify_token_expires: expiresAt,
    };

    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: newAppMeta,
    });
    if (metaErr) {
      console.error('change-email: failed to update app_metadata:', metaErr);
      // Email was already changed at this point; don't fail the call. User can
      // request resend from the banner.
    }

    // ── Send verification email to new address ──
    const origin =
      req.headers.get('origin') ||
      (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'https://keeply.boats');
    const verifyUrl = `${origin}/api/verify-email?t=${encodeURIComponent(token)}&u=${encodeURIComponent(
      user.id
    )}`;

    const resend = new Resend(RESEND_KEY);

    const subject = 'Verify your email for Keeply';
    const plainText = `Hi,

Click the link below to verify your new email address (${trimmed}) for your Keeply account:

${verifyUrl}

This link expires in 24 hours.

Why verify? So you can reset your password and recover your account if you ever lose access. Without a verified email, we can't help you back into your account.

If you didn't make this change, contact support@keeply.boats immediately.

— The Keeply team`;

    const html = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 0; border-radius: 8px; overflow: hidden;">
  <div style="background: #0f4c8a; padding: 22px 28px;">
    <div style="color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">⚓ Verify your email</div>
  </div>
  <div style="background: #ffffff; padding: 28px;">
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 14px;">Hi,</p>
    <p style="font-size: 15px; color: #1a1d23; line-height: 1.6; margin: 0 0 18px;">
      Click the button below to verify <strong>${escapeHtml(trimmed)}</strong> for your Keeply account.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${verifyUrl}" style="display: inline-block; background: #0f4c8a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: 600;">Verify email</a>
    </p>
    <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 6px;">
      This link expires in 24 hours. If the button doesn't work, copy this URL into your browser:
    </p>
    <p style="font-size: 12px; color: #4b5563; line-height: 1.4; margin: 0 0 18px; word-break: break-all;">
      ${escapeHtml(verifyUrl)}
    </p>
    <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0;">
      If you didn't make this change, contact <a href="mailto:support@keeply.boats" style="color: #0f4c8a;">support@keeply.boats</a> immediately.
    </p>
  </div>
</div>`.trim();

    const sendResult = await resend.emails.send({
      from: 'Keeply <noreply@keeply.boats>',
      to: trimmed,
      replyTo: 'support@keeply.boats',
      subject: subject,
      text: plainText,
      html: html,
    });

    if ((sendResult as { error?: unknown }).error) {
      console.error('change-email: send failed:', (sendResult as { error?: unknown }).error);
      // Email update succeeded but send failed; user can hit Resend from banner
    }

    return NextResponse.json({ ok: true, newEmail: trimmed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('change-email exception:', msg);
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
