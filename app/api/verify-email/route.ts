import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/verify-email?t=<token>&u=<userId>
//
// Validates the token against app_metadata and (if valid) flips
// app_metadata.email_self_verified to true and clears the token.
//
// Always redirects to /?verified=1 (success) or /?verified=0&reason=... (failure).
// The frontend reads the param and surfaces an appropriate message.
//
// No auth required: the token IS the auth. It's single-use, expires in 24h,
// and is 128 bits of entropy.

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t') || '';
  const userId = url.searchParams.get('u') || '';
  const origin = url.origin;

  function redirectTo(path: string): NextResponse {
    return NextResponse.redirect(origin + path, { status: 302 });
  }

  try {
    if (!token || !userId) {
      return redirectTo('/?verified=0&reason=missing');
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('verify-email: Supabase env vars not configured');
      return redirectTo('/?verified=0&reason=config');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up the user by ID
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userData?.user) {
      console.error('verify-email: user lookup failed:', userErr);
      return redirectTo('/?verified=0&reason=notfound');
    }

    const user = userData.user;
    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;

    // Already verified — friendly success path
    if (appMeta.email_self_verified === true) {
      return redirectTo('/?verified=1&already=1');
    }

    const storedToken = appMeta.verify_token;
    const expiresAt = appMeta.verify_token_expires;

    if (typeof storedToken !== 'string' || storedToken.length === 0) {
      return redirectTo('/?verified=0&reason=notoken');
    }
    if (storedToken !== token) {
      return redirectTo('/?verified=0&reason=mismatch');
    }
    if (typeof expiresAt === 'string' && new Date(expiresAt).getTime() < Date.now()) {
      return redirectTo('/?verified=0&reason=expired');
    }

    // Token valid — flip the flag and clear the token
    const newAppMeta = { ...appMeta };
    newAppMeta.email_self_verified = true;
    delete newAppMeta.verify_token;
    delete newAppMeta.verify_token_expires;

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: newAppMeta,
    });
    if (updateErr) {
      console.error('verify-email: failed to update app_metadata:', updateErr);
      return redirectTo('/?verified=0&reason=update');
    }

    return redirectTo('/?verified=1');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('verify-email exception:', msg);
    return redirectTo('/?verified=0&reason=exception');
  }
}
