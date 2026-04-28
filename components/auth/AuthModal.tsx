'use client';

// AuthModal — signup, login, password recovery, and Google OAuth.
// Loaded via dynamic import from HomeClient — Supabase only enters the
// bundle when this modal is mounted.
//
// State machine:
//   - Default: signup or login form (mode prop)
//   - signupEmail !== '': "check your inbox" / "payment confirmed" success state
//   - isRecovery: "set new password" state (entered when PASSWORD_RECOVERY
//     event detected by HomeClient and modal is opened in recovery mode)
//
// On signup:
//   1. Stamp localStorage with effectivePlan
//   2. Call supabase.auth.signUp
//   3. If a paid plan + priceId → POST /api/stripe/checkout, redirect on URL
//   4. Otherwise → POST /api/send-verification, refresh session, show inbox state
//
// On login: supabase.auth.signInWithPassword + posthog.identify.
// On Google: supabase.auth.signInWithOAuth — HomeClient handles the SIGNED_IN
// event after redirect (firePendingStripe).
//
// Password recovery: form calls supabase.auth.updateUser. Closes modal on success.

import React, { useState, type CSSProperties, type FormEvent } from 'react';
import { supabase } from '../supabase-client';
import { PLANS as PRICING_CONFIG } from '../../lib/pricing.js';
import posthog from 'posthog-js';
import { trackSignupStarted, trackSignupCompleted } from '../../lib/analytics';

const BRAND = '#0f4c8a';
const NAVY = '#071e3d';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';

export type AuthMode = 'signup' | 'login';

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  isRecovery: boolean;
  pendingPlan: string | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
}

const authInput: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontFamily: 'inherit',
};

const authLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  display: 'block',
  marginBottom: 6,
  letterSpacing: '0.2px',
};

function primaryBtn(disabled: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '12px 0',
    background: disabled ? 'rgba(245,166,35,0.4)' : GOLD,
    color: '#1a1200',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '0.1px',
    fontFamily: 'inherit',
  };
}

export default function AuthModal({
  open,
  mode,
  isRecovery,
  pendingPlan,
  onClose,
  onModeChange,
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [stripeSuccess, setStripeSuccess] = useState(false);

  // Fire trackSignupStarted when the modal opens in signup mode
  // (matches the original openAuth() behavior).
  React.useEffect(() => {
    if (open && mode === 'signup') {
      trackSignupStarted();
    }
  }, [open, mode]);

  if (!open) return null;

  function handleClose() {
    setStripeSuccess(false);
    setSignupEmail('');
    onClose();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signup') {
        // Fall back to localStorage in case React state was lost (mobile page reload / remount)
        const effectivePlan =
          pendingPlan ||
          (() => {
            try {
              return localStorage.getItem('keeply_pending_plan');
            } catch (e) {
              return null;
            }
          })() ||
          null;
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/?login=1',
            data: { pending_plan: effectivePlan },
          },
        });
        if (result.error) throw result.error;
        if (
          result.data &&
          result.data.user &&
          result.data.user.identities &&
          result.data.user.identities.length === 0
        ) {
          setError('An account with this email already exists. Try logging in instead.');
        } else {
          // Fire Stripe immediately for paid plans — don't wait for email confirmation
          // Use stored price ID (supports annual) or fall back to monthly priceId from PRICING_CONFIG
          const pendingPriceId = (() => {
            try {
              return localStorage.getItem('keeply_pending_price_id');
            } catch (e) {
              return null;
            }
          })();
          const planConfig = effectivePlan && (PRICING_CONFIG as any)[effectivePlan];
          const priceId = pendingPriceId || (planConfig && planConfig.priceId) || null;
          const userId = result.data.user && result.data.user.id;
          if (priceId && userId) {
            try {
              try {
                localStorage.removeItem('keeply_pending_plan');
              } catch (e) {}
              try {
                localStorage.removeItem('keeply_pending_price_id');
              } catch (e) {}
              const checkoutRes = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  priceId,
                  userId,
                  userEmail: email,
                  returnUrl: window.location.origin + '/?upgraded=1',
                }),
              });
              const checkoutData = await checkoutRes.json();
              if (checkoutData.url) {
                window.location.href = checkoutData.url;
                return;
              }
            } catch (stripeErr) {
              console.error('Stripe checkout error:', stripeErr);
            }
          }
          trackSignupCompleted(effectivePlan || 'free', false);

          // Trigger custom email verification: server endpoint sets
          // app_metadata.email_self_verified=false and emails the verify link.
          // We MUST await + refresh so the local JWT picks up the new app_metadata
          // before KeeplyApp mounts — otherwise the banner won't show.
          try {
            const verifyAccessToken = result.data?.session?.access_token;
            if (verifyAccessToken) {
              const verifyRes = await fetch('/api/send-verification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + verifyAccessToken,
                },
              });
              if (verifyRes.ok) {
                await supabase.auth.refreshSession();
              }
            }
          } catch (verifyErr) {
            console.error('Verification email setup failed:', verifyErr);
          }

          setSignupEmail(email);
        }
      } else {
        const loginResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginResult.error) throw loginResult.error;
        posthog.identify(loginResult.data.user.id, { email });
        posthog.capture('login_completed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address above first.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/?login=1',
      });
      if (result.error) throw result.error;
      setMessage('Check your inbox — we sent a password reset link to ' + email + '.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setMessage("Password updated! You're now logged in.");
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: NAVY,
          borderRadius: 16,
          padding: '28px 28px',
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          colorScheme: 'dark',
        }}
      >
        {/* Close X */}
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 22,
            cursor: 'pointer',
            width: 30,
            height: 30,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {'\u00d7'}
        </button>

        {signupEmail ? (
          /* Check-your-inbox state */
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 16px',
                borderRadius: 14,
                background: stripeSuccess ? 'rgba(74,222,128,0.15)' : 'rgba(245,166,35,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke={stripeSuccess ? '#4ade80' : GOLD}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {stripeSuccess ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <g>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </g>
                )}
              </svg>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 10,
                letterSpacing: '-0.3px',
              }}
            >
              {stripeSuccess ? 'Payment confirmed' : 'Check your inbox'}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
                maxWidth: 340,
                margin: '0 auto',
              }}
            >
              {stripeSuccess ? (
                "Your subscription is active. We've sent a confirmation link to your email — click it to come aboard."
              ) : (
                <span>
                  We sent a confirmation link to{' '}
                  <strong style={{ color: '#fff', fontWeight: 600 }}>{signupEmail}</strong>. Click
                  it to activate your account and come aboard.
                </span>
              )}
            </div>
          </div>
        ) : isRecovery ? (
          /* Password reset state */
          <>
            <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 4 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  margin: '0 auto 14px',
                  borderRadius: 12,
                  background: 'rgba(77,166,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 6,
                  letterSpacing: '-0.3px',
                }}
              >
                Set a new password
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                Choose a strong password for your account.
              </div>
            </div>
            <form onSubmit={updatePassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={authLabel}>New password</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  style={authInput}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={authLabel}>Confirm new password</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  style={{
                    ...authInput,
                    borderColor:
                      confirmPassword && confirmPassword !== password
                        ? '#f87171'
                        : 'rgba(255,255,255,0.15)',
                  }}
                />
                {confirmPassword && confirmPassword !== password && (
                  <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>
                    Passwords don{"'"}t match
                  </div>
                )}
              </div>
              {error && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#f87171',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#4ade80',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || (confirmPassword !== '' && confirmPassword !== password)}
                style={primaryBtn(
                  loading || (confirmPassword !== '' && confirmPassword !== password)
                )}
              >
                {loading ? 'Updating\u2026' : 'Set new password'}
              </button>
            </form>
          </>
        ) : (
          /* Signup / Login state */
          <>
            {/* Brand header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 14,
                paddingTop: 2,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path
                  d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z"
                  fill={BRAND}
                />
                <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
                <path
                  d="M13.5 18l3.2 3.2L23 13.5"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.2px',
                }}
              >
                Keeply
              </span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#fff',
                textAlign: 'center',
                marginBottom: 4,
                letterSpacing: '-0.3px',
              }}
            >
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                marginBottom: 18,
              }}
            >
              {mode === 'signup' ? 'No credit card required' : 'Log in to your account'}
            </div>

            {/* Plan context strip (signup only, excludes free) */}
            {mode === 'signup' &&
              pendingPlan &&
              pendingPlan !== 'free' &&
              (PRICING_CONFIG as any)[pendingPlan] && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'rgba(77,166,255,0.08)',
                    border: '1px solid rgba(77,166,255,0.25)',
                    borderRadius: 10,
                    padding: '9px 12px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: ACCENT,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: 1,
                      }}
                    >
                      Signing up for
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {pendingPlan === 'standard'
                        ? 'Standard'
                        : pendingPlan === 'pro'
                          ? 'Pro'
                          : pendingPlan}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1.2,
                      }}
                    >
                      ${(PRICING_CONFIG as any)[pendingPlan].price}/mo
                    </div>
                  </div>
                </div>
              )}

            {/* Google */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '11px 0',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'inherit',
                marginBottom: 14,
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                or
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <form onSubmit={submit}>
              <div style={{ marginBottom: 12 }}>
                <label style={authLabel}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={authInput}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 6,
                  }}
                >
                  <label style={{ ...authLabel, marginBottom: 0 }}>Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={resetPassword}
                      disabled={loading}
                      style={{
                        fontSize: 12,
                        color: ACCENT,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 500,
                        fontFamily: 'inherit',
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    style={{ ...authInput, paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.5)',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {showPwd ? (
                        <g>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </g>
                      ) : (
                        <g>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </g>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              {error && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#f87171',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#4ade80',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </div>
              )}
              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading
                  ? 'Please wait\u2026'
                  : mode === 'signup'
                    ? 'Create account \u2192'
                    : 'Log in \u2192'}
              </button>
            </form>

            {/* Mode switcher */}
            <div
              style={{
                textAlign: 'center',
                marginTop: 16,
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
              <button
                type="button"
                onClick={() => {
                  onModeChange(mode === 'signup' ? 'login' : 'signup');
                  setError(null);
                  setMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {mode === 'signup' ? 'Log in' : 'Create an account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
