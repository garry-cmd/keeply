'use client';

// PlanPickerModal — modal that lets a user pick Free / Standard / Pro
// before signup. On selection it:
//   1. Stamps localStorage (keeply_pending_plan + keeply_pending_price_id)
//   2. Fires trackPlanSelected analytics event
//   3. Calls onPlanSelected(planId) — caller is responsible for opening auth
//
// No Supabase dependency. Pure presentation + localStorage + analytics.
// The annual/monthly toggle is internal state.

import React, { useState } from 'react';
import { PLANS as PRICING_CONFIG } from '../../lib/pricing.js';
import { trackPlanSelected } from '../../lib/analytics';

const ACCENT = '#4da6ff';

interface PlanPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPlanSelected: (planId: 'free' | 'standard' | 'pro') => void;
}

export default function PlanPickerModal({ open, onClose, onPlanSelected }: PlanPickerModalProps) {
  const [annual, setAnnual] = useState(false);

  if (!open) return null;

  function pickFree() {
    try {
      localStorage.setItem('keeply_pending_plan', 'free');
    } catch (e) {}
    // Free tier: clear any stale priceId from a previous Standard/Pro click
    try {
      localStorage.removeItem('keeply_pending_price_id');
    } catch (e) {}
    trackPlanSelected('free');
    onPlanSelected('free');
  }

  function pickStandard() {
    const pid = annual
      ? PRICING_CONFIG.standard.annualPriceId
      : PRICING_CONFIG.standard.priceId;
    try {
      localStorage.setItem('keeply_pending_plan', 'standard');
    } catch (e) {}
    try {
      localStorage.setItem('keeply_pending_price_id', pid);
    } catch (e) {}
    trackPlanSelected('standard', pid);
    onPlanSelected('standard');
  }

  function pickPro() {
    const pid = annual ? PRICING_CONFIG.pro.annualPriceId : PRICING_CONFIG.pro.priceId;
    try {
      localStorage.setItem('keeply_pending_plan', 'pro');
    } catch (e) {}
    try {
      localStorage.setItem('keeply_pending_price_id', pid);
    } catch (e) {}
    trackPlanSelected('pro', pid);
    onPlanSelected('pro');
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
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
              onClick={() => setAnnual((a) => !a)}
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

        {/* Plan cards */}
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
            onClick={pickFree}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
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
              <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>$0</span>
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
              ].map((f) => (
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
                  <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>{'\u2713'}</span>{' '}
                  {f}
                </div>
              ))}
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
              Start free {'\u2192'}
            </div>
          </div>

          {/* Standard */}
          <div
            onClick={pickStandard}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(77,166,255,0.8)';
            }}
            onMouseLeave={(e) => {
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
              ].map((f) => (
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
                  <span style={{ color: '#4da6ff', flexShrink: 0, marginTop: 1 }}>{'\u2713'}</span>{' '}
                  {f}
                </div>
              ))}
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
              Get started {'\u2192'}
            </div>
          </div>

          {/* Pro */}
          <div
            onClick={pickPro}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
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
              ].map((f) => (
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
                  <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>{'\u2713'}</span>{' '}
                  {f}
                </div>
              ))}
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
              Get started {'\u2192'}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Upgrade or downgrade anytime.
        </div>
        <button
          onClick={onClose}
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
  );
}
