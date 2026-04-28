'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase-client';
import { PLANS as PRICING_CONFIG } from '../lib/pricing.js';
import posthog from 'posthog-js';
import {
  trackSignupStarted,
  trackPlanSelected,
  trackSignupCompleted,
} from '../lib/analytics';
import PhoneScreenshot from './marketing/PhoneScreenshot';
import AvailabilityStrip from './marketing/AvailabilityStrip';

const BRAND = '#0f4c8a';
const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

// Runs setup() when element enters viewport, calls cleanup when it leaves.
// This prevents animation loops running while off-screen.

function Logo({ size }) {
  size = size || 28;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill={BRAND} />
      <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
      <line
        x1="18"
        y1="10.8"
        x2="18"
        y2="8.6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="25.2"
        x2="18"
        y2="27.4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="10.8"
        y1="18"
        x2="8.6"
        y2="18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="25.2"
        y1="18"
        x2="27.4"
        y2="18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="13"
        x2="11.4"
        y2="11.4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="23"
        x2="24.6"
        y2="24.6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="13"
        x2="24.6"
        y2="11.4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="23"
        x2="11.4"
        y2="24.6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13.5 18l3.2 3.2L23 13.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Phosphor-style SVG icons for feature strip ───────────────────────────

export default function LandingPage() {
  var [mode, setMode] = useState('signup');
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [showPwd, setShowPwd] = useState(false);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [message, setMessage] = useState(null);
  var [showAuth, setShowAuth] = useState(false);
  var [signupEmail, setSignupEmail] = useState(null);
  var [scrolled, setScrolled] = useState(false);
  var [isMobile, setIsMobile] = useState(false);
  var [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  var [annual, setAnnual] = useState(false);
  var [isRecovery, setIsRecovery] = useState(false);
  var [showPlanPicker, setShowPlanPicker] = useState(false);
  var [pendingPlan, setPendingPlan] = useState(null);

  // Body is already dark-mode from the root layout. Ensure it stays that way
  // in case some other mount (old AuthScreen, etc.) ever stripped it.
  useEffect(function () {
    document.body.classList.add('dark-mode');
  }, []);

  useEffect(function () {
    var onScroll = function () {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll);
    return function () {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(function () {
    var check = function () {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return function () {
      window.removeEventListener('resize', check);
    };
  }, []);

  var [stripeSuccess, setStripeSuccess] = useState(false);
  var [verifiedBanner, setVerifiedBanner] = useState(null); // { type: 'success'|'error', text: string }
  useEffect(function () {
    var p = new URLSearchParams(window.location.search);
    if (p.get('signup') === '1') {
      setMode('signup');
      setShowAuth(true);
    }
    if (p.get('login') === '1') {
      setMode('login');
      setShowAuth(true);
    }
    // Deep-link to the plan picker — used by external pages (/features CTA,
    // future /about and /pricing CTAs) so cross-route Get Started buttons
    // route through plan selection rather than skipping straight to auth
    // (which would default the user to free since pendingPlan is null).
    if (p.get('plans') === '1') {
      setShowPlanPicker(true);
    }
    if (p.get('upgraded') === '1') {
      setStripeSuccess(true);
      setShowAuth(true);
      setSignupEmail('your account');
    }
    if (p.get('verified') === '1') {
      // User clicked verify link — may or may not be logged in on this device.
      // Show a brief success banner. Auto-dismisses after 6s.
      var alreadyVerified = p.get('already') === '1';
      setVerifiedBanner({
        type: 'success',
        text: alreadyVerified
          ? 'Already verified ✓'
          : 'Email verified ✓ You can now sign in if needed.',
      });
      setTimeout(function () {
        setVerifiedBanner(null);
      }, 6000);
    }
    if (p.get('verified') === '0') {
      var reason = p.get('reason') || '';
      var reasonText =
        reason === 'expired'
          ? 'That link expired. Sign in and request a new one.'
          : reason === 'mismatch'
            ? 'That link is no longer valid. Sign in and request a new one.'
            : reason === 'notoken'
              ? 'No verification was pending. Sign in to continue.'
              : 'Verification failed. Sign in and request a new link.';
      setVerifiedBanner({ type: 'error', text: reasonText });
      setTimeout(function () {
        setVerifiedBanner(null);
      }, 8000);
    }
    // Clean consumed params so refresh/bookmark/browser-restored tab doesn't re-fire modals
    if (
      p.get('signup') === '1' ||
      p.get('login') === '1' ||
      p.get('upgraded') === '1' ||
      p.get('verified') === '1' ||
      p.get('verified') === '0'
    ) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {}
    }
  }, []);

  useEffect(function () {
    var {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setShowAuth(true);
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setMessage(null);
      }
      // Google OAuth: user authenticated — check for a pending paid plan and fire Stripe
      if (event === 'SIGNED_IN' && session && session.user) {
        (async function () {
          var pendingPlan = null;
          var pendingPriceId = null;
          try {
            pendingPlan = localStorage.getItem('keeply_pending_plan');
          } catch (e) {}
          try {
            pendingPriceId = localStorage.getItem('keeply_pending_price_id');
          } catch (e) {}

          // Only act if a paid plan was chosen before OAuth — free plans go straight to the app
          if (pendingPlan && pendingPlan !== 'free' && pendingPriceId) {
            // Clear immediately so a repeat SIGNED_IN event (e.g. on ?upgraded=1 return) doesn't re-fire
            try {
              localStorage.removeItem('keeply_pending_plan');
            } catch (e) {}
            try {
              localStorage.removeItem('keeply_pending_price_id');
            } catch (e) {}
            try {
              var res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  priceId: pendingPriceId,
                  userId: session.user.id,
                  userEmail: session.user.email,
                  returnUrl: window.location.origin + '/?upgraded=1',
                }),
              });
              var data = await res.json();
              if (data.url) {
                window.location.href = data.url;
              }
            } catch (e) {
              console.error('Stripe checkout error after OAuth:', e);
            }
          }
        })();
      }
    });
    return function () {
      subscription.unsubscribe();
    };
  }, []);

  var signInWithGoogle = async function () {
    setLoading(true);
    setError(null);
    try {
      var result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (result.error) throw result.error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  var submit = async function (e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signup') {
        // Fall back to localStorage in case React state was lost (mobile page reload / remount)
        var effectivePlan =
          pendingPlan ||
          (function () {
            try {
              return localStorage.getItem('keeply_pending_plan');
            } catch (e) {
              return null;
            }
          })() ||
          null;
        var result = await supabase.auth.signUp({
          email: email,
          password: password,
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
          var pendingPriceId = (function () {
            try {
              return localStorage.getItem('keeply_pending_price_id');
            } catch (e) {
              return null;
            }
          })();
          var planConfig = effectivePlan && PRICING_CONFIG[effectivePlan];
          var priceId = pendingPriceId || (planConfig && planConfig.priceId) || null;
          var userId = result.data.user && result.data.user.id;
          if (priceId && userId) {
            try {
              try {
                localStorage.removeItem('keeply_pending_plan');
              } catch (e) {}
              try {
                localStorage.removeItem('keeply_pending_price_id');
              } catch (e) {}
              var checkoutRes = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  priceId: priceId,
                  userId: userId,
                  userEmail: email,
                  returnUrl: window.location.origin + '/?upgraded=1',
                }),
              });
              var checkoutData = await checkoutRes.json();
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
            var verifyAccessToken = result.data?.session?.access_token;
            if (verifyAccessToken) {
              var verifyRes = await fetch('/api/send-verification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + verifyAccessToken,
                },
              });
              // Refresh local session so app_metadata.email_self_verified=false
              // is reflected in session.user, which makes the banner trigger.
              if (verifyRes.ok) {
                await supabase.auth.refreshSession();
              }
            }
          } catch (verifyErr) {
            // Silent — user can hit Resend in the banner once they're in the app
            console.error('Verification email setup failed:', verifyErr);
          }

          setSignupEmail(email);
        }
      } else {
        var loginResult = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (loginResult.error) throw loginResult.error;
        posthog.identify(loginResult.data.user.id, { email: email });
        posthog.capture('login_completed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  var resetPassword = async function (e) {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address above first.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      var result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/?login=1',
      });
      if (result.error) throw result.error;
      setMessage('Check your inbox — we sent a password reset link to ' + email + '.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  var updatePassword = async function (e) {
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
      var result = await supabase.auth.updateUser({ password: password });
      if (result.error) throw result.error;
      setMessage("Password updated! You're now logged in.");
      setIsRecovery(false);
      setPassword('');
      setConfirmPassword('');
      setTimeout(function () {
        setShowAuth(false);
      }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function openAuth(m) {
    var resolvedMode = m || 'signup';
    setMode(resolvedMode);
    setShowAuth(true);
    if (resolvedMode === 'signup') trackSignupStarted();
  }
  function scrollToPricing() {
    var el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div
      style={{
        fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
        color: WHITE,
        background: NAVY,
        overflowX: 'hidden',
      }}
    >
      {verifiedBanner && (
        <div
          style={{
            background: verifiedBanner.type === 'success' ? '#052e16' : '#2c1006',
            borderBottom:
              '1px solid ' + (verifiedBanner.type === 'success' ? '#22c55e' : '#fb923c'),
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: 14,
            color: verifiedBanner.type === 'success' ? '#86efac' : '#fed7aa',
            fontWeight: 600,
            position: 'relative',
            zIndex: 400,
          }}
        >
          {verifiedBanner.text}
          <button
            onClick={function () {
              setVerifiedBanner(null);
            }}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontSize: 20,
              lineHeight: 1,
              padding: '0 6px',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            ×
          </button>
        </div>
      )}
      {/* Single merged banner */}
      <div
        style={{
          background: 'rgba(77,166,255,0.1)',
          borderBottom: '1px solid rgba(77,166,255,0.18)',
          padding: '7px 16px',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          position: 'relative',
          zIndex: 300,
          lineHeight: 1.5,
        }}
      >
        No credit card needed
        <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
        <button
          onClick={scrollToPricing}
          style={{
            background: 'none',
            border: 'none',
            color: GOLD,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Start free →
        </button>
      </div>

      {/* Nav */}
      <nav
        style={{
          position: 'fixed',
          top: 33,
          left: 0,
          right: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 32px',
          height: 60,
          background: scrolled ? 'rgba(7,30,61,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transition: 'all 0.3s',
        }}
      >
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <Logo size={28} />
          <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, letterSpacing: '-0.3px' }}>
            Keeply
          </span>
        </a>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!isMobile && (
            <a
              href="/about"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              About
            </a>
          )}
          {!isMobile && (
            <a
              href="/features"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              Features
            </a>
          )}
          {!isMobile && (
            <a
              href="/pricing"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              Pricing
            </a>
          )}
          {!isMobile && (
            <a
              href="/faq"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              FAQ
            </a>
          )}
          {!isMobile && (
            <a
              href="/support"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              Support
            </a>
          )}
          {!isMobile && (
            <a
              href="/contact"
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 14px',
              }}
            >
              Contact
            </a>
          )}
          {!isMobile && (
            <button
              onClick={function () {
                openAuth('login');
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.8)',
                padding: '7px 18px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
          )}
          {!isMobile && (
            <button
              onClick={function () {
                setShowPlanPicker(true);
              }}
              style={{
                background: GOLD,
                border: 'none',
                color: '#1a1200',
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Get started {'\u2192'}
            </button>
          )}
          {isMobile && (
            <button
              onClick={function () {
                setMobileMenuOpen(function (v) {
                  return !v;
                });
              }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 36,
              }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
                {mobileMenuOpen ? (
                  <path d="M2 2 L16 12 M2 12 L16 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <>
                    <line x1="0" y1="2" x2="18" y2="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="0" y1="7" x2="18" y2="7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="0" y1="12" x2="18" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu drawer — matches SiteHeader pattern */}
      {isMobile && mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 93,
            left: 0,
            right: 0,
            zIndex: 199,
            background: 'rgba(7,30,61,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px 20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { href: '/about', label: 'About' },
              { href: '/features', label: 'Features' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/faq', label: 'FAQ' },
              { href: '/support', label: 'Support' },
              { href: '/contact', label: 'Contact' },
            ].map(function (link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={function () {
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    padding: '14px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={function () {
                setMobileMenuOpen(false);
                openAuth('login');
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                padding: '12px 0',
                borderRadius: 8,
                fontSize: 14,
                textAlign: 'center',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
            <button
              onClick={function () {
                setMobileMenuOpen(false);
                setShowPlanPicker(true);
              }}
              style={{
                flex: 1,
                background: GOLD,
                border: 'none',
                color: '#1a1200',
                padding: '12px 0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              Get started {'\u2192'}
            </button>
          </div>
        </div>
      )}

      {/* ── Marquee + reduced-motion keyframes ───────────────────────────
          Single keyframe loop: -50% because we duplicate the track twice. */}
      <style>{`
        @keyframes kp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .kp-marquee-track { animation: kp-marquee 38s linear infinite; }
        .kp-marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .kp-marquee-track { animation: none; }
        }
      `}</style>

      {/* ── Hero — text-only, gradient only, no photo.
          Photo was suppressed by the heavy gradient overlay anyway and cost
          ~187 KB of LCP weight. Removing it makes the hero faster AND
          stronger: text + gradient is the Linear/Vercel/Stripe pattern. */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '130px 24px 80px',
          overflow: 'hidden',
          background: `radial-gradient(ellipse at 50% 30%, ${NAVY_MID} 0%, ${NAVY} 70%)`,
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 780 }}>
          <h1
            style={{
              fontSize: 'clamp(48px,8vw,96px)',
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.0,
              letterSpacing: '-2.5px',
              margin: '0 0 24px',
              fontFamily: "'Clash Display','Inter',sans-serif",
            }}
          >
            Always ready <span style={{ color: GOLD }}>to go.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px,2vw,20px)',
              color: 'rgba(255,255,255,0.65)',
              margin: '0 auto 40px',
              lineHeight: 1.6,
              maxWidth: 620,
            }}
          >
            From the bilge pump to the next haul-out — every system tracked,
            every part remembered, every passage logged.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={function () {
                  setShowPlanPicker(true);
                }}
                style={{
                  background: GOLD,
                  border: 'none',
                  color: '#1a1200',
                  padding: '14px 32px',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Get started {'→'}
              </button>
              <button
                onClick={function () {
                  openAuth('login');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: WHITE,
                  padding: '14px 28px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Log in
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2px' }}>
              Free to start · No credit card · Cancel any time
            </div>
          </div>
        </div>
      </section>

      {/* ── Banner separator: signals "next is also a hero" ───────────────── */}
      <div
        style={{
          padding: isMobile ? '24px 16px' : '32px 24px',
          textAlign: 'center',
          background: '#040f1f',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          See Keeply in action
          <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span>
        </div>
      </div>

      {/* ── Hero #2: looped walkthrough video in a phone frame ─────────────
          Real screen recording from S/V Irene, edited down to a ~15s loop:
          My Boat hero → Due Soon expanded → Equipment / Beta Marine →
          First Mate haul-out advice → Lists Need to buy → My Boat (loop seam).
          366×720 H.264, ~165 KB, no audio. Loads with preload="metadata"
          so the poster paints immediately while video data fetches.
          PhoneScreenshot renders <video> when given videoSrc; src is the
          poster (same My Boat hero frame as the loop's first frame). */}
      <section
        style={{
          padding: isMobile ? '40px 16px 56px' : '72px 24px 96px',
          background: `radial-gradient(ellipse at 50% 30%, ${NAVY_MID} 0%, ${NAVY} 65%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PhoneScreenshot
          size={isMobile ? 'mobile' : 'desktop'}
          src="/images/walkthrough-poster.jpg"
          videoSrc="/videos/walkthrough.mp4"
          alt="Keeply walkthrough — S/V Irene: My Boat dashboard, Due Soon maintenance, Equipment, First Mate haul-out advice, and Lists"
        />
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 6 }}>
            Your boat. In your pocket.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            Real Keeply, real boat. Walk through the app the way you'd actually use it.
          </div>
        </div>
      </section>

      {/* ── Social proof — looping ticker mixing boats and platform stats.
          Edge-faded marquee, pauses on hover, respects prefers-reduced-motion.
          Numbers are hardcoded at deploy time. Update manually when we hit
          nicer round milestones (2,000 nm, 1,000 maintenance items, etc.). */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          padding: '24px 0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Edge fades — mask in/out so items don't pop at the boundaries */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 80,
            background: `linear-gradient(90deg, ${NAVY} 0%, rgba(7,30,61,0) 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 80,
            background: `linear-gradient(270deg, ${NAVY} 0%, rgba(7,30,61,0) 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        <div className="kp-marquee-track" style={{ display: 'flex', gap: 32, width: 'max-content' }}>
          {(function () {
            const items = [
              { kind: 'boat', name: 'Irene', type: '1980 Ta Shing Baba 35', boatType: 'sail' },
              { kind: 'stat', value: '1,287', label: 'nautical miles tracked' },
              { kind: 'boat', name: 'Rounder', type: '1984 Passport 40', boatType: 'sail' },
              { kind: 'stat', value: '691', label: 'maintenance items' },
              { kind: 'boat', name: 'Amanzi', type: '2023 Lagoon 42 Catamaran', boatType: 'sail' },
              { kind: 'stat', value: '190', label: 'pieces of equipment' },
              { kind: 'boat', name: 'Sue Anne', type: '1997 Ranger Tug R-27', boatType: 'motor' },
              { kind: 'boat', name: 'Jaws', type: '2017 Grady-White Freedom 307', boatType: 'motor' },
            ];
            // Duplicate the track so when the first copy scrolls -50%, the
            // second copy is already in view at the right. Seamless loop.
            return [...items, ...items].map(function (item, i) {
              if (item.kind === 'boat') {
                return (
                  <div
                    key={'b' + i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(77,166,255,0.55)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.boatType === 'sail' ? (
                        <>
                          <path d="M12 2L2 20h20z" />
                          <line x1="12" y1="2" x2="12" y2="20" />
                        </>
                      ) : (
                        <>
                          <path d="M3 17l4-8 4 4 3-6 4 4" />
                          <path d="M2 20h20" />
                        </>
                      )}
                    </svg>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{item.type}</span>
                  </div>
                );
              }
              return (
                <div
                  key={'s' + i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: GOLD,
                      fontWeight: 700,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {item.value}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    {item.label}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── How it works — 3-step. Restored as middle-of-page substance.
          This is the "oh wow" the ICP describes: vessel set up via AI in
          15 minutes, real maintenance schedule appears. Tells the
          conversion story without requiring a /features detour. */}
      <section style={{ padding: isMobile ? '64px 20px' : '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 56 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: GOLD,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontSize: 'clamp(26px,3.4vw,42px)',
                fontWeight: 700,
                color: WHITE,
                letterSpacing: '-0.5px',
                lineHeight: 1.15,
                margin: '0 0 16px',
                fontFamily: "'Satoshi','DM Sans',sans-serif",
              }}
            >
              Onboard in 3 minutes.
            </h2>
            <p
              style={{
                fontSize: isMobile ? 14 : 16,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                margin: '0 auto',
                maxWidth: 560,
              }}
            >
              Tell Keeply about your boat. We do the rest.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? 20 : 28,
            }}
          >
            {[
              {
                n: '01',
                title: 'Add your boat',
                body: '30 seconds. Make, model, year. We handle the rest of the setup so you can keep going.',
              },
              {
                n: '02',
                title: 'AI builds your equipment list',
                body: 'Keeply auto-generates a real maintenance schedule with intervals and parts for every system on your boat. You confirm.',
              },
              {
                n: '03',
                title: 'Always ready to go',
                body: 'Your dashboard tells you what is overdue, what is due soon, and what to fix at next haul-out. Nothing falls through.',
              },
            ].map(function (step) {
              return (
                <div
                  key={step.n}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14,
                    padding: isMobile ? '22px 22px' : '28px 26px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: GOLD,
                      letterSpacing: '0.5px',
                      marginBottom: 10,
                    }}
                  >
                    {step.n}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? 17 : 19,
                      fontWeight: 700,
                      color: WHITE,
                      marginBottom: 8,
                      lineHeight: 1.25,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.55,
                    }}
                  >
                    {step.body}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonial — single quote from a real beta tester. Trust signal
          the chip strip can't carry. Update as more attributed quotes come
          in; rotate at deploy time or stay with the strongest. */}
      <section
        style={{
          padding: isMobile ? '56px 20px' : '88px 24px',
          background: 'rgba(255,255,255,0.025)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontSize: isMobile ? 22 : 30,
              lineHeight: 1.35,
              fontWeight: 600,
              color: WHITE,
              letterSpacing: '-0.3px',
              fontFamily: "'Satoshi','DM Sans',sans-serif",
              margin: '0 0 28px',
            }}
          >
            <span style={{ color: GOLD, fontSize: '1.2em', fontWeight: 700, marginRight: 4 }}>
              &ldquo;
            </span>
            Finally, an easy way to get my maintenance tasks into an app. I love the photo
            history.
            <span style={{ color: GOLD, fontSize: '1.2em', fontWeight: 700, marginLeft: 4 }}>
              &rdquo;
            </span>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(77,166,255,0.6)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2L2 20h20z" />
              <line x1="12" y1="2" x2="12" y2="20" />
            </svg>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Marty</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span>S/V Rounder</span>
          </div>
        </div>
      </section>

      {/* ── Coverage chips — preserved. Depth lives at /features. */}
      <section id="features" style={{ padding: isMobile ? '56px 16px' : '88px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontSize: 'clamp(24px,3.2vw,40px)',
                fontWeight: 700,
                color: WHITE,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                margin: '0 0 14px',
                fontFamily: "'Satoshi','DM Sans',sans-serif",
              }}
            >
              Everything your boat needs, in one place.
            </h2>
            <p
              style={{
                fontSize: isMobile ? 14 : 16,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                margin: '0 auto 24px',
                maxWidth: 560,
              }}
            >
              Coverage first. AI assistance second. Built for boaters who want to know nothing
              falls through the cracks.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                maxWidth: 640,
                margin: '0 auto',
              }}
            >
              {[
                { label: 'Maintenance', href: '/features#maintenance' },
                { label: 'Repairs', href: '/features#repairs' },
                { label: 'Parts', href: '/features#parts' },
                { label: 'Logbook', href: '/features#logbook' },
                { label: 'Documents', href: '/features#documents' },
                { label: 'Equipment', href: '/features#equipment' },
              ].map(function (chip) {
                return (
                  <a
                    key={chip.label}
                    href={chip.href}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.78)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 20,
                      padding: '7px 16px',
                      textDecoration: 'none',
                    }}
                  >
                    {chip.label}
                  </a>
                );
              })}
            </div>
            <div style={{ marginTop: isMobile ? 28 : 36 }}>
              <a
                href="/features"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                  paddingBottom: 2,
                }}
              >
                See all features {'→'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser — 3 cards, depth at /pricing. Keeps shoppers on
          the home page through the funnel without burying the CTA. */}
      <section
        style={{
          padding: isMobile ? '56px 16px' : '88px 24px',
          background: 'rgba(255,255,255,0.025)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
            <h2
              style={{
                fontSize: 'clamp(24px,3.2vw,40px)',
                fontWeight: 700,
                color: WHITE,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                margin: '0 0 14px',
                fontFamily: "'Satoshi','DM Sans',sans-serif",
              }}
            >
              Simple pricing.
            </h2>
            <p
              style={{
                fontSize: isMobile ? 14 : 16,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                margin: '0 auto',
                maxWidth: 540,
              }}
            >
              Free to start. Upgrade only when your boat needs more.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? 14 : 18,
              maxWidth: 920,
              margin: '0 auto',
            }}
          >
            {[
              {
                name: 'Free',
                price: '$0',
                priceSuffix: '',
                tag: '',
                bullets: [
                  '1 vessel',
                  '2 equipment cards',
                  '5 First Mate AI queries / month',
                ],
                highlight: false,
              },
              {
                name: 'Standard',
                price: '$15',
                priceSuffix: '/mo',
                tag: '',
                bullets: [
                  'Unlimited equipment',
                  'Unlimited repairs',
                  '30 First Mate AI queries / month',
                ],
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$25',
                priceSuffix: '/mo',
                tag: 'Most popular',
                bullets: [
                  'Everything in Standard',
                  '50 First Mate queries · voice · weather',
                  'Departure checks',
                ],
                highlight: true,
              },
            ].map(function (plan) {
              return (
                <div
                  key={plan.name}
                  style={{
                    background: plan.highlight ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
                    border: plan.highlight
                      ? '1px solid rgba(245,166,35,0.35)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: isMobile ? '22px 22px' : '28px 24px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {plan.tag ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: 22,
                        background: GOLD,
                        color: '#1a1200',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      {plan.tag}
                    </div>
                  ) : null}

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.6)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    {plan.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 18 }}>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: WHITE,
                        letterSpacing: '-1px',
                        fontFamily: "'Satoshi','DM Sans',sans-serif",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                      {plan.priceSuffix}
                    </span>
                  </div>

                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {plan.bullets.map(function (b, i) {
                      return (
                        <li
                          key={i}
                          style={{
                            fontSize: 13.5,
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: 1.45,
                            display: 'flex',
                            gap: 8,
                          }}
                        >
                          <span style={{ color: ACCENT, marginTop: 1 }}>·</span>
                          <span>{b}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: isMobile ? 28 : 36 }}>
            <a
              href="/pricing"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                paddingBottom: 2,
              }}
            >
              See full pricing {'→'}
            </a>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA — closes the page with action language, not a brand
          repeat. Hero already says "Always ready to go." */}
      <section
        id="get-started"
        style={{
          padding: isMobile ? '64px 20px' : '96px 24px',
          textAlign: 'center',
          background: `radial-gradient(ellipse at 50% 100%, ${NAVY_MID} 0%, ${NAVY} 70%)`,
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? 28 : 38,
            lineHeight: 1.15,
            letterSpacing: '-0.5px',
            fontWeight: 700,
            color: WHITE,
            margin: '0 0 14px',
            fontFamily: "'Satoshi','DM Sans',sans-serif",
          }}
        >
          Get started in 3 minutes.
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            margin: '0 0 32px',
          }}
        >
          Free to start · No credit card · Cancel any time
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={function () {
              setShowPlanPicker(true);
            }}
            style={{
              background: GOLD,
              color: '#1a1200',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Satoshi','DM Sans',sans-serif",
            }}
          >
            Get started {'→'}
          </button>
          <a
            href="/pricing"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              color: WHITE,
              padding: '14px 24px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            See plans
          </a>
        </div>
      </section>

            {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '40px 24px',
          background: '#040f1f',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto 32px' }}>
          <AvailabilityStrip />
        </div>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={22} />
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Keeply</span>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                Made by boaters, for boaters.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <a
              href="/about"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              About
            </a>
            <a
              href="/features"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              Features
            </a>
            <a
              href="/faq"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              FAQ
            </a>
            <a
              href="/support"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              Support
            </a>
            <a
              href="/contact"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              Contact
            </a>
            <a
              href="/privacy"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              Terms
            </a>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            {'\u00A9'} {new Date().getFullYear()} Keeply
          </div>
        </div>
      </footer>

      {/* ── Plan Picker Modal ── */}
      {showPlanPicker && (
        <div
          onClick={function (e) {
            if (e.target === e.currentTarget) setShowPlanPicker(false);
          }}
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
          }}
        >
          <div
            style={{
              background: '#071e3d',
              borderRadius: 20,
              padding: '32px 28px',
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#f5a623',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Choose a plan
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                Choose your plan
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                No credit card required
              </div>
              {/* Monthly / Annual toggle */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: annual ? 'rgba(255,255,255,0.4)' : '#fff',
                    fontWeight: annual ? 400 : 600,
                  }}
                >
                  Monthly
                </span>
                <div
                  onClick={function () {
                    setAnnual(function (a) {
                      return !a;
                    });
                  }}
                  style={{
                    width: 40,
                    height: 22,
                    background: annual ? ACCENT : 'rgba(255,255,255,0.2)',
                    borderRadius: 11,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      width: 16,
                      height: 16,
                      background: '#fff',
                      borderRadius: '50%',
                      top: 3,
                      left: annual ? 21 : 3,
                      transition: 'left 0.2s',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: annual ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontWeight: annual ? 600 : 400,
                  }}
                >
                  Annual
                </span>
                {annual && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#4ade80',
                      background: 'rgba(74,222,128,0.12)',
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}
                  >
                    Save 20%
                  </span>
                )}
              </div>
            </div>

            {/* Plan cards — 3 col matching pricing section */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {/* Free */}
              <div
                onClick={function () {
                  try {
                    localStorage.setItem('keeply_pending_plan', 'free');
                  } catch (e) {}
                  // Free tier: clear any stale priceId from a previous Standard/Pro click
                  try {
                    localStorage.removeItem('keeply_pending_price_id');
                  } catch (e) {}
                  setPendingPlan('free');
                  trackPlanSelected('free');
                  setShowPlanPicker(false);
                  openAuth('signup');
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '18px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: 10,
                  }}
                >
                  Free
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    $0
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
                  &nbsp;
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }} />
                <div style={{ flex: 1, marginBottom: 16 }}>
                  {[
                    '1 vessel',
                    PRICING_CONFIG.free.equipment + ' equipment cards',
                    PRICING_CONFIG.free.repairs + ' repairs',
                  ].map(
                    function (f) {
                      return (
                        <div
                          key={f}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            marginBottom: 8,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.55)',
                          }}
                        >
                          <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>✓</span>{' '}
                          {f}
                        </div>
                      );
                    }
                  )}
                </div>
                <div
                  style={{
                    padding: '8px 0',
                    background: '#f5a623',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a1200',
                  }}
                >
                  Start free →
                </div>
              </div>

              {/* Standard */}
              <div
                onClick={function () {
                  var pid = annual
                    ? PRICING_CONFIG.standard.annualPriceId
                    : PRICING_CONFIG.standard.priceId;
                  try {
                    localStorage.setItem('keeply_pending_plan', 'standard');
                  } catch (e) {}
                  try {
                    localStorage.setItem('keeply_pending_price_id', pid);
                  } catch (e) {}
                  setPendingPlan('standard');
                  trackPlanSelected('standard', pid);
                  setShowPlanPicker(false);
                  openAuth('signup');
                }}
                style={{
                  background: 'rgba(77,166,255,0.08)',
                  border: '2px solid rgba(77,166,255,0.5)',
                  borderRadius: 14,
                  padding: '18px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(77,166,255,0.8)';
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(77,166,255,0.5)';
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#f5a623',
                    color: '#1a1200',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}
                >
                  MOST POPULAR
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#4da6ff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: 10,
                  }}
                >
                  Standard
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                      alignSelf: 'flex-start',
                      marginTop: 6,
                    }}
                  >
                    $
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {annual
                      ? PRICING_CONFIG.standard.effectiveMonthly
                      : PRICING_CONFIG.standard.price}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 500, marginBottom: 14 }}>
                  {annual
                    ? '$' + PRICING_CONFIG.standard.annualPrice + '/yr billed annually'
                    : '\u00a0'}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }} />
                <div style={{ flex: 1, marginBottom: 16 }}>
                  {[
                    'Unlimited equipment',
                    'First Mate AI — ' + PRICING_CONFIG.standard.firstMate + '/mo',
                    'Repair log & logbook',
                  ].map(function (f) {
                    return (
                      <div
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 7,
                          marginBottom: 8,
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.75)',
                        }}
                      >
                        <span style={{ color: '#4da6ff', flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: '8px 0',
                    background: '#f5a623',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a1200',
                  }}
                >
                  Get started →
                </div>
              </div>

              {/* Pro */}
              <div
                onClick={function () {
                  var pid = annual ? PRICING_CONFIG.pro.annualPriceId : PRICING_CONFIG.pro.priceId;
                  try {
                    localStorage.setItem('keeply_pending_plan', 'pro');
                  } catch (e) {}
                  try {
                    localStorage.setItem('keeply_pending_price_id', pid);
                  } catch (e) {}
                  setPendingPlan('pro');
                  trackPlanSelected('pro', pid);
                  setShowPlanPicker(false);
                  openAuth('signup');
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '18px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={function (e) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: 10,
                  }}
                >
                  Pro
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                      alignSelf: 'flex-start',
                      marginTop: 6,
                    }}
                  >
                    $
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {annual ? PRICING_CONFIG.pro.effectiveMonthly : PRICING_CONFIG.pro.price}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 500, marginBottom: 14 }}>
                  {annual ? '$' + PRICING_CONFIG.pro.annualPrice + '/yr billed annually' : '\u00a0'}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }} />
                <div style={{ flex: 1, marginBottom: 16 }}>
                  {[
                    '2 vessels',
                    'Watch entries logbook',
                    'First Mate AI — ' + PRICING_CONFIG.pro.firstMate + '/mo',
                    'Unlimited storage',
                  ].map(function (f) {
                    return (
                      <div
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 7,
                          marginBottom: 8,
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: '8px 0',
                    background: '#f5a623',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a1200',
                  }}
                >
                  Get started →
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Upgrade or downgrade anytime.
            </div>
            <button
              onClick={function () {
                setShowPlanPicker(false);
              }}
              style={{
                display: 'block',
                margin: '16px auto 0',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth &&
        (function () {
          var authInput = {
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
          var authLabel = {
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            display: 'block',
            marginBottom: 6,
            letterSpacing: '0.2px',
          };
          var primaryBtn = function (disabled) {
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
          };
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
              onClick={function (e) {
                if (e.target === e.currentTarget) {
                  setShowAuth(false);
                  setStripeSuccess(false);
                  setSignupEmail('');
                }
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
                  onClick={function () {
                    setShowAuth(false);
                    setStripeSuccess(false);
                    setSignupEmail('');
                  }}
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
                  &times;
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
                        background: stripeSuccess
                          ? 'rgba(74,222,128,0.15)'
                          : 'rgba(245,166,35,0.15)',
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
                          <strong style={{ color: '#fff', fontWeight: 600 }}>{signupEmail}</strong>.
                          Click it to activate your account and come aboard.
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
                          onChange={function (e) {
                            setPassword(e.target.value);
                          }}
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
                          onChange={function (e) {
                            setConfirmPassword(e.target.value);
                          }}
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
                        disabled={
                          loading || (confirmPassword !== '' && confirmPassword !== password)
                        }
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
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 36 36"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z"
                          fill={BRAND}
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="7.2"
                          stroke="white"
                          strokeWidth="2"
                          fill="none"
                        />
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
                      PRICING_CONFIG[pendingPlan] && (
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
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                              $
                              {annual
                                ? PRICING_CONFIG[pendingPlan].effectiveMonthly
                                : PRICING_CONFIG[pendingPlan].price}
                              /mo
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
                      onMouseEnter={function (e) {
                        if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={function (e) {
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
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}
                    >
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
                          onChange={function (e) {
                            setEmail(e.target.value);
                          }}
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
                            onChange={function (e) {
                              setPassword(e.target.value);
                            }}
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            style={{ ...authInput, paddingRight: 42 }}
                          />
                          <button
                            type="button"
                            onClick={function () {
                              setShowPwd(function (v) {
                                return !v;
                              });
                            }}
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
                        onClick={function () {
                          setMode(mode === 'signup' ? 'login' : 'signup');
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
        })()}
    </div>
  );
}
