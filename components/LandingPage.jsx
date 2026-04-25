'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase-client';
import { PLANS as PRICING_CONFIG } from '../lib/pricing.js';
import posthog from 'posthog-js';

const BRAND = '#0f4c8a';
const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

// Runs setup() when element enters viewport, calls cleanup when it leaves.
// This prevents animation loops running while off-screen.
function useWhenVisible(ref, setup) {
  useEffect(function () {
    var cleanup = null;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!cleanup) cleanup = setup() || null;
          } else {
            if (cleanup) {
              cleanup();
              cleanup = null;
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return function () {
      observer.disconnect();
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

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
function Ico({ d, d2, d3, d4, circle }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d && <path d={d} />}
      {d2 && <path d={d2} />}
      {d3 && <path d={d3} />}
      {d4 && <path d={d4} />}
      {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
    </svg>
  );
}

const FEATURE_ICONS = [
  {
    label: 'Maintenance',
    el: (
      <Ico d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
  },
  {
    label: 'Equipment',
    el: (
      <Ico
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        d2="M3.27 6.96 12 12.01l8.73-5.05"
        d3="M12 22.08V12"
      />
    ),
  },
  {
    label: 'Engine Hours',
    el: (
      <Ico
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        d2="M12 6v6l4 2"
      />
    ),
  },
  {
    label: 'Logbook',
    el: (
      <Ico
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
        d2="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      />
    ),
  },
  {
    label: 'Repairs',
    el: (
      <Ico
        d="m15 12-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9"
        d2="M17.64 15 22 10.64"
        d3="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"
      />
    ),
  },
  {
    label: 'First Mate AI',
    el: (
      <Ico
        d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
        d2="M5 3v4"
        d3="M19 17v4"
        d4="M3 5h4"
      />
    ),
  },
  {
    label: 'Admin',
    el: (
      <Ico
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        d2="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
        d3="M9 12h6"
        d4="M9 16h4"
      />
    ),
  },
  {
    label: 'Crew Access',
    el: (
      <Ico
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        circle={[9, 7, 4]}
        d2="M22 21v-2a4 4 0 0 0-3-3.87"
        d3="M16 3.13a4 4 0 0 1 0 7.75"
      />
    ),
  },
];

function MaintenanceVisual() {
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3' }}>
      <img
        src="/images/failed-impeller.jpg"
        alt="Failed impeller"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7,30,61,0.1) 0%, rgba(7,30,61,0.75) 100%)',
        }}
      />
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 22px' }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#ef4444',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Overdue
        </div>
        <div
          style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}
        >
          Impeller replacement
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Last changed 14 months ago · 1,200 hrs on unit
        </div>
      </div>
    </div>
  );
}

function FirstMateVisual() {
  var BLUE = '#4da6ff';
  var containerRef = useRef(null);
  var exchanges = [
    {
      q: 'When did I last change the raw water impeller?',
      a: "Replaced March 14, 2024 — 847 engine hours ago. Based on your 300-hour interval, it's due in 53 hours.",
    },
    {
      q: 'What parts should I order?',
      a: 'Yanmar 129670-42531 impeller kit + spare O-ring set. Want me to find the best price?',
    },
    {
      q: 'Any other tasks due before Friday?',
      a: 'Yes — raw water strainer clean is 4 days overdue, and fuel filter is due in 6 days. Both worth doing before you go.',
    },
  ];
  var [step, setStep] = useState(0);
  var [showQ, setShowQ] = useState(false);
  var [showThinking, setShowThinking] = useState(false);
  var [showA, setShowA] = useState(false);
  var [visibleExchanges, setVisibleExchanges] = useState([]);
  var [dots, setDots] = useState('');

  useWhenVisible(containerRef, function () {
    var timers = [];
    setVisibleExchanges([]);
    setStep(0);
    setShowQ(false);
    setShowThinking(false);
    setShowA(false);
    function runCycle() {
      setVisibleExchanges([]);
      setStep(0);
      setShowQ(false);
      setShowThinking(false);
      setShowA(false);
      var delay = 600;
      exchanges.forEach(function (ex, i) {
        timers.push(
          setTimeout(function () {
            setStep(i);
            setShowQ(true);
            setShowThinking(false);
            setShowA(false);
          }, delay)
        );
        delay += 1800;
        timers.push(
          setTimeout(function () {
            setShowThinking(true);
          }, delay)
        );
        delay += 1600;
        timers.push(
          setTimeout(function () {
            setShowThinking(false);
            setShowA(true);
          }, delay)
        );
        delay += 2200;
        timers.push(
          setTimeout(function () {
            setVisibleExchanges(function (prev) {
              return prev.concat([ex]);
            });
            setShowQ(false);
            setShowA(false);
          }, delay)
        );
        delay += 400;
      });
      timers.push(setTimeout(runCycle, delay + 1500));
    }
    runCycle();
    return function () {
      timers.forEach(clearTimeout);
    };
  });

  useEffect(
    function () {
      if (!showThinking) {
        setDots('');
        return;
      }
      var i = 0;
      var t = setInterval(function () {
        i = (i + 1) % 4;
        setDots('.'.repeat(i));
      }, 380);
      return function () {
        clearInterval(t);
      };
    },
    [showThinking]
  );

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 390,
          maxWidth: 'calc(100vw - 48px)',
          background: '#071e3d',
          borderRadius: 44,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: "'Satoshi','DM Sans',sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#071e3d',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#0f4c8a,#4da6ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>First Mate</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              Knows your whole boat
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
            }}
          />
        </div>
        {/* Messages */}
        <div
          style={{
            padding: '14px 14px 14px',
            minHeight: 340,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Previous completed exchanges */}
          {visibleExchanges.map(function (ex, i) {
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '11px 16px',
                      borderRadius: '14px 14px 2px 14px',
                      background: 'rgba(77,166,255,0.18)',
                      border: '1px solid rgba(77,166,255,0.3)',
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.5,
                    }}
                  >
                    {ex.q}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '11px 16px',
                      borderRadius: '14px 14px 14px 2px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.55,
                    }}
                  >
                    {ex.a}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Current question */}
          {showQ && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                opacity: showQ ? 1 : 0,
                transition: 'opacity 0.4s',
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '11px 16px',
                  borderRadius: '14px 14px 2px 14px',
                  background: 'rgba(77,166,255,0.18)',
                  border: '1px solid rgba(77,166,255,0.3)',
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.5,
                }}
              >
                {exchanges[step] ? exchanges[step].q : ''}
              </div>
            </div>
          )}
          {/* Thinking dots */}
          {showThinking && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px 14px 14px 2px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 20,
                  color: BLUE,
                  letterSpacing: 3,
                }}
              >
                {'\u2022\u2022\u2022'}
              </div>
            </div>
          )}
          {/* AI answer */}
          {showA && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                opacity: showA ? 1 : 0,
                transition: 'opacity 0.35s',
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '11px 16px',
                  borderRadius: '14px 14px 14px 2px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.55,
                }}
              >
                {exchanges[step] ? exchanges[step].a : ''}
              </div>
            </div>
          )}
        </div>
        {/* Input bar */}
        <div style={{ padding: '0 12px 14px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ flex: 1, fontSize: 15, color: 'rgba(255,255,255,0.25)' }}>
              Ask anything about your boat…
            </span>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: 'rgba(77,166,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BLUE}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogbookVisual() {
  var BLUE = '#4da6ff';
  var GREEN = '#22c55e';
  var containerRef = useRef(null);
  var ENTRIES = [
    {
      time: '07:15',
      pos: 'Port Ludlow',
      cog: '340°',
      sog: '0 kt',
      wind: 'SW 6kt',
      note: 'Departed. Clear skies.',
    },
    {
      time: '08:00',
      pos: '47°52′N 122°41′W',
      cog: '340°',
      sog: '8.5 kt',
      wind: 'SW 8kt',
      note: 'Passed Indian Island.',
    },
    {
      time: '09:00',
      pos: '48°06′N 122°45′W',
      cog: '345°',
      sog: '9.2 kt',
      wind: 'W 12kt',
      note: 'Admiralty Inlet. Ferry traffic.',
    },
    {
      time: '10:15',
      pos: '48°22′N 122°51′W',
      cog: '355°',
      sog: '10.1 kt',
      wind: 'W 15kt',
      note: 'San Juan Channel. Seas 2-3ft.',
    },
  ];
  var [visibleCount, setVisibleCount] = useState(0);
  var [showComplete, setShowComplete] = useState(false);
  var [completed, setCompleted] = useState(false);

  useWhenVisible(containerRef, function () {
    setVisibleCount(0);
    setShowComplete(false);
    setCompleted(false);
    var timers = [];
    function runCycle() {
      setVisibleCount(0);
      setShowComplete(false);
      setCompleted(false);
      ENTRIES.forEach(function (_, i) {
        timers.push(
          setTimeout(
            function () {
              setVisibleCount(i + 1);
            },
            800 + i * 1400
          )
        );
      });
      timers.push(
        setTimeout(
          function () {
            setShowComplete(true);
          },
          800 + ENTRIES.length * 1400 + 600
        )
      );
      timers.push(
        setTimeout(
          function () {
            setCompleted(true);
          },
          800 + ENTRIES.length * 1400 + 1800
        )
      );
      timers.push(setTimeout(runCycle, 800 + ENTRIES.length * 1400 + 4000));
    }
    runCycle();
    return function () {
      timers.forEach(function (t) {
        try {
          clearTimeout(t);
          clearInterval(t);
        } catch (e) {}
      });
    };
  });

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 390,
          maxWidth: 'calc(100vw - 48px)',
          background: '#071e3d',
          borderRadius: 44,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: "'Satoshi','DM Sans',sans-serif",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: '#071e3d',
            padding: '12px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={BLUE}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Logbook</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: completed ? GREEN : '#ef4444',
                transition: 'background 0.5s',
                animation: completed ? 'none' : 'keeplyWave 1.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: completed ? GREEN : '#ef4444',
                transition: 'color 0.5s',
              }}
            >
              {completed ? 'COMPLETED' : 'ACTIVE'}
            </span>
          </div>
        </div>

        <div style={{ padding: '16px 16px 12px' }}>
          {/* Passage header */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
              Port Ludlow →{' '}
              {completed ? (
                <span style={{ color: GREEN }}>Friday Harbor</span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>en route</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Departed 07:15 · Crew: Garry, Melissa
            </div>
          </div>

          {/* Watch entries table */}
          <div
            style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '42px 1fr 36px 48px 54px',
                gap: 0,
                padding: '6px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {['Time', 'Position', 'COG', 'SOG', 'Wind'].map(function (h) {
                return (
                  <div
                    key={h}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {h}
                  </div>
                );
              })}
            </div>
            {ENTRIES.map(function (e, i) {
              var vis = i < visibleCount;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '42px 1fr 36px 48px 54px',
                    gap: 0,
                    padding: '7px 10px',
                    borderBottom:
                      i < ENTRIES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    opacity: vis ? 1 : 0,
                    transform: vis ? 'translateY(0)' : 'translateY(4px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: BLUE,
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {e.time}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.6)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: 4,
                    }}
                  >
                    {e.pos}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {e.cog}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {e.sog}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{e.wind}</div>
                </div>
              );
            })}
          </div>

          {/* CTA buttons */}
          {!completed && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: '9px',
                  border: '1px solid rgba(77,166,255,0.35)',
                  borderRadius: 10,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: BLUE,
                }}
              >
                + Watch entry
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: 10,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  background: showComplete ? GREEN : 'rgba(34,197,94,0.25)',
                  transition: 'background 0.5s',
                }}
              >
                Arrived →
              </div>
            </div>
          )}
          {completed && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                ['42 nm', 'Distance'],
                ['6h 20m', 'Duration'],
                ['10.1 kt', 'Max speed'],
              ].map(function (s, i) {
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: 'rgba(77,166,255,0.07)',
                      border: '1px solid rgba(77,166,255,0.15)',
                      borderRadius: 8,
                      padding: '8px 6px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>{s[0]}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {s[1]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyBoatVisual() {
  var NAVY = '#071e3d';
  var BLUE = '#4da6ff';
  var containerRef = useRef(null);
  var [phase, setPhase] = useState(0);
  var [criticalCount, setCriticalCount] = useState(13);
  var [sheetVisible, setSheetVisible] = useState(false);
  var [completingIdx, setCompletingIdx] = useState(-1);
  var [completedIdx, setCompletedIdx] = useState(-1);
  var [cardPulse, setCardPulse] = useState(false);

  var criticalItems = [
    { name: 'Engine oil & filter change', age: '12d over' },
    { name: 'Impeller replacement', age: 'Due today' },
    { name: 'Fuel filter (primary)', age: '2d over' },
    { name: 'Raw water strainer clean', age: '8d over' },
    { name: 'Zinc anodes — hull', age: '15d over' },
    { name: 'Shaft zinc', age: '15d over' },
  ];

  useWhenVisible(containerRef, function () {
    var timers = [];
    setCriticalCount(13);
    setPhase(0);
    setSheetVisible(false);
    setCompletingIdx(-1);
    setCompletedIdx(-1);
    setCardPulse(false);
    function runCycle() {
      setCriticalCount(13);
      setPhase(0);
      setSheetVisible(false);
      setCompletingIdx(-1);
      setCompletedIdx(-1);
      setCardPulse(false);
      // Pause on normal view
      timers.push(
        setTimeout(function () {
          setCardPulse(true);
        }, 2200)
      );
      timers.push(
        setTimeout(function () {
          setCardPulse(false);
        }, 2700)
      );
      // Sheet slides up
      timers.push(
        setTimeout(function () {
          setSheetVisible(true);
          setPhase(1);
        }, 3000)
      );
      // Tap first item — completing state
      timers.push(
        setTimeout(function () {
          setCompletingIdx(0);
        }, 5200)
      );
      // Item completes — slides out, count drops
      timers.push(
        setTimeout(function () {
          setCompletedIdx(0);
          setCriticalCount(12);
        }, 6200)
      );
      // Sheet slides back down
      timers.push(
        setTimeout(function () {
          setSheetVisible(false);
        }, 8200)
      );
      timers.push(
        setTimeout(function () {
          setPhase(0);
        }, 9000)
      );
      // Loop
      timers.push(setTimeout(runCycle, 11500));
    }
    runCycle();
    return function () {
      timers.forEach(clearTimeout);
    };
  });

  var wrenchIcon = (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 390,
          maxWidth: 'calc(100vw - 48px)',
          background: NAVY,
          borderRadius: 44,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: "'Satoshi','DM Sans',sans-serif",
          position: 'relative',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            background: NAVY,
            padding: '12px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
              <path
                d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z"
                fill="#0f4c8a"
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
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Keeply</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '4px 10px 4px 8px',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              S/V Irene
            </span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: '10px 12px 6px' }}>
          {/* Vessel card */}
          <div
            style={{
              background: 'linear-gradient(150deg,#0d2d5e,#071e3d)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 9,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 1 }}>
              Irene
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
              1980 Ta Shing Baba 35
            </div>
          </div>

          {/* KPIs */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 9 }}
          >
            {[
              ['1,557', 'ENGINE HRS'],
              ['136 nm', 'NM LOGGED'],
            ].map(function (k) {
              return (
                <div
                  key={k[1]}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 11,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: 25, fontWeight: 800, color: BLUE }}>{k[0]}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      marginTop: 4,
                    }}
                  >
                    {k[1]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 11,
              marginBottom: 9,
            }}
          >
            {/* Critical card — pulses on tap */}
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.22)',
                borderRadius: 11,
                padding: '8px 6px',
                textAlign: 'center',
                transform: cardPulse ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.25s',
                boxShadow: cardPulse ? '0 0 16px rgba(239,68,68,0.5)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#f87171',
                  lineHeight: 1,
                  transition: 'all 0.4s',
                }}
              >
                {criticalCount}
              </div>
              <div
                style={{
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: 'rgba(248,113,113,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginTop: 3,
                }}
              >
                Critical
              </div>
            </div>
            {[
              [
                '6',
                'Due Soon',
                'rgba(245,158,11,0.1)',
                'rgba(245,158,11,0.22)',
                '#fbbf24',
                'rgba(251,191,36,0.6)',
              ],
              [
                '5',
                'Repairs',
                'rgba(77,166,255,0.1)',
                'rgba(77,166,255,0.22)',
                '#4da6ff',
                'rgba(77,166,255,0.6)',
              ],
            ].map(function (c) {
              return (
                <div
                  key={c[1]}
                  style={{
                    background: c[2],
                    border: '1px solid ' + c[3],
                    borderRadius: 11,
                    padding: '8px 6px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800, color: c[4], lineHeight: 1 }}>
                    {c[0]}
                  </div>
                  <div
                    style={{
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: c[5],
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      marginTop: 3,
                    }}
                  >
                    {c[1]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Open repairs preview */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Open repairs
          </div>
          {[
            { title: 'Replace oil extraction pump', sub: 'Engine · 3 days ago', c: '#f59e0b' },
            { title: 'Replace main bilge pump', sub: 'Plumbing · 3 days ago', c: '#f59e0b' },
          ].map(function (r, i) {
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '7px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 7,
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {wrenchIcon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {r.sub}
                  </div>
                </div>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: r.c,
                    boxShadow: '0 0 5px ' + r.c,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            padding: '7px 0 9px',
          }}
        >
          {[
            ['Logbook', 'rgba(7,30,61,0.3)'],
            ['Equipment', 'rgba(7,30,61,0.3)'],
            ['My Boat', '#0f4c8a'],
            ['First Mate', 'rgba(7,30,61,0.3)'],
            ['Profile', 'rgba(7,30,61,0.3)'],
          ].map(function (item) {
            return (
              <div
                key={item[0]}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  color: item[1],
                }}
              >
                {item[0]}
              </div>
            );
          })}
        </div>

        {/* ── Critical bottom sheet ── slides up over content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#0d1e3a',
            borderTop: '1.5px solid rgba(239,68,68,0.35)',
            borderRadius: '20px 20px 0 0',
            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.45s cubic-bezier(0.34,1.12,0.64,1)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          {/* Sheet handle + header */}
          <div
            style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              style={{
                width: 32,
                height: 3,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
                margin: '0 auto 10px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                <span style={{ color: '#f87171', marginRight: 6 }}>{criticalCount}</span>Critical
                items
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Tap to complete</div>
            </div>
          </div>
          {/* Critical items list */}
          <div style={{ padding: '6px 0 12px' }}>
            {criticalItems.map(function (item, i) {
              var isCompleting = completingIdx === i;
              var isCompleted = completedIdx === i;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '11px 18px',
                    maxHeight: isCompleted ? 0 : 48,
                    opacity: isCompleted ? 0 : 1,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s ease, opacity 0.4s ease',
                    background: isCompleting ? 'rgba(34,197,94,0.08)' : 'transparent',
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      flexShrink: 0,
                      border: isCompleting ? 'none' : '1.5px solid rgba(239,68,68,0.4)',
                      background: isCompleting ? '#22c55e' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                    }}
                  >
                    {isCompleting && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isCompleting ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)',
                        textDecoration: isCompleting ? 'line-through' : 'none',
                        transition: 'all 0.3s',
                      }}
                    >
                      {item.name}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: i < 2 ? '#f87171' : '#fbbf24',
                      flexShrink: 0,
                    }}
                  >
                    {item.age}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FirstMateLearnVisual() {
  var containerRef = useRef(null);
  var BLUE = '#4da6ff';
  var NAVY = '#071e3d';
  var [phase, setPhase] = useState(0);
  var [typed, setTyped] = useState('');
  var [chips, setChips] = useState([]);
  var [lines, setLines] = useState([]);

  var Q = 'Is my boat ready for the weekend?';
  var CHIPS = ['Logbook', 'Repairs', 'Maintenance', 'Engine hrs'];
  var LINES = [
    {
      t: 'normal',
      v: "Looking at S/V Irene's current status, a couple of items need attention before heading out:",
    },
    { t: 'gap' },
    { t: 'bold', v: 'OVERDUE:' },
    { t: 'dash', v: 'Clean bottom (Dinghy) — due Apr 18, last done Apr 11' },
    { t: 'gap' },
    { t: 'bold', v: 'DUE TODAY:' },
    { t: 'dash', v: 'Check oil (Engine) — last done Apr 12' },
    { t: 'gap' },
    {
      t: 'normal',
      v: 'Both are quick items. Your oil notes say "looked fine" on 4/12 so that\'s likely routine. The dinghy bottom is overdue by a day but not critical for vessel safety.',
    },
    { t: 'gap' },
    { t: 'bold', v: 'From your recent logs:' },
    {
      t: 'dash',
      v: 'Impeller replaced Apr 9 — noted missing 2 blades, may want to shorten interval',
    },
    { t: 'dash', v: 'Transmission noise on Apr 4 — Owen checked, said everything was fine' },
    { t: 'gap' },
    { t: 'status', v: 'Overall status: Ready with minor maintenance ✅' },
  ];

  useWhenVisible(containerRef, function () {
    var timers = [];
    var cancelled = false;

    function delay(ms) {
      return new Promise(function (resolve) {
        var t = setTimeout(resolve, ms);
        timers.push(t);
      });
    }

    async function runCycle() {
      if (cancelled) return;
      setPhase(0);
      setTyped('');
      setChips([]);
      setLines([]);

      await delay(800);
      if (cancelled) return;
      setPhase(1);

      for (var i = 0; i <= Q.length; i++) {
        if (cancelled) return;
        setTyped(Q.slice(0, i));
        await delay(42);
      }

      await delay(400);
      if (cancelled) return;
      setPhase(2);

      for (var j = 0; j < CHIPS.length; j++) {
        if (cancelled) return;
        await delay(360);
        var chip = CHIPS[j];
        setChips(function (prev) {
          return prev.concat([chip]);
        });
      }

      await delay(900);
      if (cancelled) return;
      setPhase(3);
      setLines([]);

      for (var k = 0; k < LINES.length; k++) {
        if (cancelled) return;
        var line = LINES[k];
        setLines(function (prev) {
          return prev.concat([line]);
        });
        await delay(line.t === 'gap' ? 60 : line.t === 'normal' ? 550 : 280);
      }

      await delay(5000);
      if (!cancelled) runCycle();
    }

    runCycle();
    return function () {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  });

  var CHIP_STYLES = {
    Logbook: { bg: 'rgba(29,158,117,0.18)', color: '#4ade80' },
    Repairs: { bg: 'rgba(77,166,255,0.18)', color: '#4da6ff' },
    Maintenance: { bg: 'rgba(245,166,35,0.18)', color: '#f5a623' },
    'Engine hrs': { bg: 'rgba(156,163,175,0.18)', color: '#9ca3af' },
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 320,
          maxWidth: 'calc(100vw - 48px)',
          background: NAVY,
          borderRadius: 38,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          fontFamily: "'Satoshi','DM Sans',sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: NAVY,
            padding: '12px 14px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#0f4c8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
              <path
                d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z"
                fill="#0f4c8a"
              />
              <path
                d="M13.5 18l3.2 3.2L23 13.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              First Mate
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              S/V Irene · all systems checked
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '2px 9px',
            }}
          >
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>1/50 this month</span>
          </div>
        </div>

        {/* Chat area */}
        <div
          style={{
            padding: '12px 12px 8px',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {/* Departure briefing card */}
          <div
            style={{
              background: '#f5a623',
              borderRadius: 12,
              padding: '10px 12px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1200' }}>
                Is S/V Irene ready to go?
              </div>
              <div style={{ fontSize: 10, color: 'rgba(26,18,0,0.6)', marginTop: 1 }}>
                AI departure readiness briefing
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="#1a1200"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* User message */}
          {phase >= 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 10,
                animation: 'onboard-fadein 0.3s ease',
              }}
            >
              <div
                style={{
                  background: 'rgba(77,166,255,0.22)',
                  borderRadius: '14px 14px 2px 14px',
                  padding: '8px 11px',
                  maxWidth: '82%',
                }}
              >
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
                  {typed}
                  {phase === 1 && typed.length < Q.length && (
                    <span style={{ opacity: 1, animation: 'keeply-blink 0.8s step-end infinite' }}>
                      |
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Thinking + chips */}
          {phase === 2 && (
            <div style={{ animation: 'onboard-fadein 0.3s ease', marginBottom: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  paddingLeft: 2,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0f4c8a',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  Checking your vessel
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map(function (i) {
                    return (
                      <div
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: BLUE,
                          animation: 'keeply-wave 1.2s ease-in-out infinite',
                          animationDelay: i * 0.15 + 's',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 30 }}>
                {chips.map(function (c) {
                  var s = CHIP_STYLES[c] || {};
                  return (
                    <span
                      key={c}
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 700,
                        background: s.bg,
                        color: s.color,
                        borderRadius: 20,
                        padding: '2px 8px',
                        animation: 'onboard-fadein 0.25s ease',
                      }}
                    >
                      {c}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Response */}
          {phase === 3 && (
            <div
              style={{
                display: 'flex',
                gap: 7,
                alignItems: 'flex-start',
                animation: 'onboard-fadein 0.4s ease',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#0f4c8a',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '10px 12px',
                  flex: 1,
                }}
              >
                {lines.map(function (line, i) {
                  if (line.t === 'gap') return <div key={i} style={{ height: 6 }} />;
                  if (line.t === 'bold')
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.95)',
                          marginBottom: 2,
                        }}
                      >
                        {line.v}
                      </div>
                    );
                  if (line.t === 'dash')
                    return (
                      <div
                        key={i}
                        style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', paddingLeft: 6 }}
                      >
                        {'- ' + line.v}
                      </div>
                    );
                  if (line.t === 'status')
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.95)',
                          marginTop: 4,
                        }}
                      >
                        {line.v}
                      </div>
                    );
                  return (
                    <div
                      key={i}
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}
                    >
                      {line.v}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '7px 12px',
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Ask anything about your vessel…
            </span>
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
              <path
                d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#0f4c8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    tag: 'First Mate AI',
    title: 'Ask your AI crew member anything.',
    body: 'First Mate knows your boat — every piece of equipment, every repair, every passage. Ask in plain English and get an answer in seconds, not hours of digging through logs.',
    Visual: FirstMateVisual,
  },
  {
    tag: 'AI Setup',
    title: 'Your whole boat, set up in minutes.',
    body: "Tell Keeply your vessel's make, model, and year. First Mate AI instantly builds your complete maintenance schedule, loads your equipment baseline, and sets every service interval — automatically. No spreadsheets. No manuals. No guessing. And everything is fully editable — adjust any interval, add your own maintenance items, or remove what doesn't apply. Keeply sets the baseline. You make it yours.",
    Visual: OnboardingVisual,
  },
  {
    tag: 'My Boat',
    title: "Your vessel's intelligence hub.",
    body: 'Everything about your boat at a glance — vessel ID, engine hours, open repairs, and every overdue or upcoming maintenance item. One screen that tells you exactly what needs attention before you cast off.',
    Visual: MyBoatVisual,
  },
  {
    tag: 'AI Parts Search',
    title: 'The right part for your exact boat. Instantly.',
    body: 'Open any maintenance item or repair — Keeply already knows your equipment make and model. One tap searches Fisheries Supply, West Marine, Defender, and more for the exact part. No part numbers. No browsing. AI suggests the part. You verify and order.',
    Visual: PartsVisual,
  },
  {
    tag: 'Logbook',
    title: 'Log every watch. Own every passage.',
    body: "Start a live passage and tap your way through the crossing. Every watch change — time, position, course, speed, wind — logged in seconds. Hit arrived, and it's in your history.",
    Visual: LogbookVisual,
  },
];

const DISPLAY_PLANS = [
  {
    name: 'Free',
    planId: 'free',
    price: '$0',
    period: '/mo',
    priceId: null,
    annualPriceId: null,
    effectiveMonthly: null,
    sub: '',
    subheader: "What's included",
    cta: 'Get started free',
    features: [
      'Automated boat setup',
      '1 vessel',
      PRICING_CONFIG.free.equipment + ' equipment cards',
      'Unlimited repairs & maintenance',
      PRICING_CONFIG.free.firstMate + ' First Mate AI queries/mo',
      'Parts catalog',
      'Engine hours tracking',
      'Basic checklists',
      'Passage logbook',
    ],
  },
  {
    name: 'Standard',
    planId: 'standard',
    price: '$' + PRICING_CONFIG.standard.price,
    period: '/mo',
    priceId: PRICING_CONFIG.standard.priceId,
    annualPriceId: PRICING_CONFIG.standard.annualPriceId,
    effectiveMonthly: PRICING_CONFIG.standard.effectiveMonthly,
    sub:
      'or $' +
      PRICING_CONFIG.standard.annualPrice +
      '/yr · save $' +
      (PRICING_CONFIG.standard.price * 12 - PRICING_CONFIG.standard.annualPrice),
    subheader: 'Everything in Free, plus',
    cta: 'Get started →',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Unlimited equipment cards',
      'Customizable checklists',
      '1GB document storage',
      'First Mate AI — ' + PRICING_CONFIG.standard.firstMate + ' queries/mo',
      'Repair log & full logbook',
    ],
  },
  {
    name: 'Pro',
    planId: 'pro',
    price: '$' + PRICING_CONFIG.pro.price,
    period: '/mo',
    priceId: PRICING_CONFIG.pro.priceId,
    annualPriceId: PRICING_CONFIG.pro.annualPriceId,
    effectiveMonthly: PRICING_CONFIG.pro.effectiveMonthly,
    sub:
      'or $' +
      PRICING_CONFIG.pro.annualPrice +
      '/yr · save $' +
      (PRICING_CONFIG.pro.price * 12 - PRICING_CONFIG.pro.annualPrice),
    subheader: 'Everything in Standard, plus',
    cta: 'Get started →',
    features: [
      '2 vessels',
      'Unlimited document storage',
      'First Mate AI — ' + PRICING_CONFIG.pro.firstMate + ' queries/mo',
      'Watch entries logbook',
      'Passage export (CSV)',
      'Haul-out planner',
    ],
  },
];

function PartsVisual() {
  var containerRef = useRef(null);
  var BLUE = '#4da6ff';
  var NAVY2 = '#0a1f3e';
  var [phase, setPhase] = useState(0);
  var [partsIdx, setPartsIdx] = useState(0);
  var [showTap, setShowTap] = useState(false);
  var [tapTarget, setTapTarget] = useState('card');

  var parts = [
    {
      name: 'Spectra 5 Micron Filter Element FT-FTC-5',
      vendor: 'Fisheries Supply',
      price: '$22.95',
    },
    { name: 'Spectra FT-FTC-5 5 Micron Filter', vendor: 'Defender Marine', price: null },
    { name: 'Spectra 5 Micron Filter Element', vendor: 'Nautical Supplies', price: '$13.00' },
  ];

  useWhenVisible(containerRef, function () {
    var timers = [];
    function runCycle() {
      setPhase(0);
      setPartsIdx(0);
      setShowTap(false);

      // Phase 0: show collapsed card, then tap it
      timers.push(
        setTimeout(function () {
          setTapTarget('card');
          setShowTap(true);
        }, 1800)
      );
      timers.push(
        setTimeout(function () {
          setShowTap(false);
          setPhase(1);
        }, 2400)
      ); // card expands

      // Phase 1: card expanded — show "Find parts" button, tap it
      timers.push(
        setTimeout(function () {
          setTapTarget('btn');
          setShowTap(true);
        }, 3800)
      );
      timers.push(
        setTimeout(function () {
          setShowTap(false);
          setPhase(2);
        }, 4400)
      ); // loading starts

      // Phase 2: loader — transition to results
      timers.push(
        setTimeout(function () {
          setPhase(3);
          setPartsIdx(0);
        }, 7000)
      );

      // Phase 3: results appear one by one
      parts.forEach(function (_, i) {
        timers.push(
          setTimeout(
            function () {
              setPartsIdx(function (n) {
                return Math.max(n, i + 1);
              });
            },
            7200 + i * 500
          )
        );
      });

      timers.push(setTimeout(runCycle, 7200 + parts.length * 500 + 4000));
    }
    runCycle();
    return function () {
      timers.forEach(clearTimeout);
    };
  });

  var arrowSvg = (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 13L13 3M13 3H7M13 3V9"
        stroke={BLUE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: NAVY2,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        overflow: 'visible',
        fontFamily: "'Satoshi','DM Sans',sans-serif",
      }}
    >
      {/* Task header — always visible */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Replace pre-filter cartridges and check system pressure
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 10,
              background: 'rgba(77,166,255,0.12)',
              color: BLUE,
              borderRadius: 4,
              padding: '1px 7px',
              fontWeight: 600,
            }}
          >
            Watermaker
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            Spectra Ventura 150D
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontWeight: 700,
              color: '#ef4444',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 4,
              padding: '2px 7px',
            }}
          >
            OVERDUE
          </span>
        </div>
      </div>

      {/* Phase 0: collapsed — just chevron hint */}
      {phase === 0 && (
        <div
          style={{
            padding: '10px 14px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Tap to expand</span>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)' }}>▸</span>
        </div>
      )}

      {/* Phase 1: expanded detail + Find Parts button */}
      {phase === 1 && (
        <div style={{ padding: '12px 14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 18px',
              marginBottom: 14,
            }}
          >
            {[
              ['INTERVAL', '90 days'],
              ['LAST SERVICED', '04/18/26'],
              ['DUE DATE', '01/18/26'],
              ['PRIORITY', 'Medium'],
            ].map(function (f) {
              return (
                <div key={f[0]}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.5px',
                      marginBottom: 3,
                    }}
                  >
                    {f[0]}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: f[0] === 'DUE DATE' ? '#ef4444' : '#fff',
                    }}
                  >
                    {f[1]}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            style={{
              width: '100%',
              background: BLUE,
              border: 'none',
              borderRadius: 8,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Find parts
          </button>
        </div>
      )}

      {/* Phase 2: loading */}
      {phase === 2 && (
        <div
          style={{
            padding: '18px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4].map(function (i) {
              return (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: BLUE,
                    animation: 'keeply-wave 1.3s ease-in-out infinite',
                    animationDelay: i * 0.12 + 's',
                  }}
                />
              );
            })}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            Searching marine retailers…
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Fisheries Supply · West Marine · Defender
          </div>
        </div>
      )}

      {/* Phase 3: results */}
      {phase === 3 && (
        <div style={{ padding: '10px 14px 4px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>SUGGESTED PARTS · {partsIdx}</span>
            <span style={{ color: BLUE }}>↺ refresh</span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            {parts.slice(0, partsIdx).map(function (p, i) {
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 13px',
                    borderBottom: i < partsIdx - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    animation: 'onboard-fadein 0.35s ease forwards',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingRight: 6,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {p.vendor}
                    </div>
                  </div>
                  {p.price ? (
                    <span
                      style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', flexShrink: 0 }}
                    >
                      {p.price}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      See site
                    </span>
                  )}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(77,166,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {arrowSvg}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '7px 0 10px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              First Mate suggests · You verify and order
            </span>
          </div>
        </div>
      )}

      {/* Tap ripple */}
      {showTap && (
        <div
          style={{
            position: 'absolute',
            ...(tapTarget === 'card'
              ? { right: 18, top: 40 }
              : { left: '50%', bottom: 54, transform: 'translateX(-50%)' }),
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(77,166,255,0.5)',
            animation: 'tap-ripple 0.6s ease forwards',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html:
            '@keyframes keeply-wave{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-5px);opacity:1}}' +
            '@keyframes onboard-fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}' +
            '@keyframes tap-ripple{0%{transform:scale(0.5) translateX(0);opacity:0.8}100%{transform:scale(2.5) translateX(0);opacity:0}}',
        }}
      />
    </div>
  );
}

function OnboardingVisual() {
  var containerRef = useRef(null);
  var [phase, setPhase] = useState(0);
  var [typedDesc, setTypedDesc] = useState('');
  var [typedName, setTypedName] = useState('');
  var [msgIdx, setMsgIdx] = useState(0);
  var [msgVisible, setMsgVisible] = useState(true);
  var [equipIdx, setEquipIdx] = useState(0);
  var BLUE = '#4da6ff';
  var BRAND = '#0f4c8a';
  var NAVY = '#071e3d';

  var fullName = 'Rounder';
  var fullDesc = '1984 Passport 40 sailboat';
  var msgs = [
    { msg: 'Looking up your vessel specs…', sub: '1984 Passport 40 Sailboat' },
    { msg: 'Building your maintenance schedule…', sub: 'Engine hours · manufacturer intervals' },
  ];
  var equipment = [
    {
      name: 'Yanmar 4JH4E Marine Diesel',
      cat: 'Engine',
      label: 'Good',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.2)',
    },
    {
      name: 'Lighthouse 1501 Electric Windlass',
      cat: 'Anchor',
      label: 'Good',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.2)',
    },
    {
      name: 'Victron MultiPlus 3000VA',
      cat: 'Electrical',
      label: 'Good',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.2)',
    },
    {
      name: 'Autohelm 1000 Autopilot',
      cat: 'Electronics',
      label: 'Good',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.2)',
    },
  ];

  useWhenVisible(containerRef, function () {
    var timers = [];
    function runCycle() {
      setPhase(0);
      setTypedName('');
      setTypedDesc('');
      setMsgIdx(0);
      setMsgVisible(true);
      setEquipIdx(0);

      var nameDelay = 600;
      fullName.split('').forEach(function (ch, i) {
        timers.push(
          setTimeout(
            function () {
              setTypedName(fullName.slice(0, i + 1));
            },
            nameDelay + i * 130
          )
        );
      });

      var descDelay = nameDelay + fullName.length * 130 + 800;
      fullDesc.split('').forEach(function (ch, i) {
        timers.push(
          setTimeout(
            function () {
              setTypedDesc(fullDesc.slice(0, i + 1));
            },
            descDelay + i * 100
          )
        );
      });

      var loadStart = descDelay + fullDesc.length * 100 + 1200;
      timers.push(
        setTimeout(function () {
          setPhase(1);
          setMsgIdx(0);
          setMsgVisible(true);
        }, loadStart)
      );

      [0, 1].forEach(function (i) {
        if (i > 0) {
          timers.push(
            setTimeout(
              function () {
                setMsgVisible(false);
                setTimeout(function () {
                  setMsgIdx(i);
                  setMsgVisible(true);
                }, 320);
              },
              loadStart + i * 2400
            )
          );
        }
      });

      var resultStart = loadStart + msgs.length * 2400;
      timers.push(
        setTimeout(function () {
          setPhase(2);
          setEquipIdx(0);
        }, resultStart)
      );

      equipment.forEach(function (_, i) {
        timers.push(
          setTimeout(
            function () {
              setEquipIdx(function (n) {
                return Math.max(n, i + 1);
              });
            },
            resultStart + 500 + i * 600
          )
        );
      });

      timers.push(setTimeout(runCycle, resultStart + equipment.length * 600 + 2500));
    }
    runCycle();
    return function () {
      timers.forEach(clearTimeout);
    };
  });

  function inpField(label, val, placeholder, showCursor, active, hint, optional) {
    var border = active ? '1px solid rgba(77,166,255,0.5)' : '1px solid rgba(255,255,255,0.1)';
    return (
      <div style={{ marginBottom: 9 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.5px',
            marginBottom: 4,
          }}
        >
          {label}
          {optional && (
            <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>
              optional
            </span>
          )}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: border,
            borderRadius: 8,
            padding: '10px 13px',
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 38,
            transition: 'border 0.2s',
          }}
        >
          {val || (
            <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, fontSize: 13 }}>
              {placeholder}
            </span>
          )}
          {showCursor && (
            <div
              style={{
                width: 2,
                height: 13,
                background: BLUE,
                animation: 'keeply-blink 1s step-end infinite',
                flexShrink: 0,
                marginLeft: 2,
              }}
            />
          )}
        </div>
        {hint && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>{hint}</div>
        )}
      </div>
    );
  }

  var nameDone = typedName.length === fullName.length;
  var descActive = nameDone && typedDesc.length < fullDesc.length;
  var descDone = typedDesc.length === fullDesc.length;

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 390,
          maxWidth: 'calc(100vw - 48px)',
          background: NAVY,
          borderRadius: 44,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: "\'Satoshi\',\'DM Sans\',sans-serif",
          minHeight: 440,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            background: NAVY,
            padding: '11px 14px 9px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <path
              d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z"
              fill="#0f4c8a"
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
          <span style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>Keeply</span>
          {phase === 2 && (
            <div
              style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '3px 10px',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                Rounder
              </span>
            </div>
          )}
        </div>

        {/* ── Phase 0: Form ── */}
        {phase === 0 && (
          <div style={{ padding: '16px 15px 18px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: 13,
              }}
            >
              Add your vessel
            </div>

            {inpField(
              'VESSEL NAME',
              typedName,
              'e.g. Rounder',
              typedName.length > 0 && !nameDone,
              !nameDone && typedName.length > 0
            )}

            <div style={{ marginBottom: 9 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                }}
              >
                VESSEL TYPE
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid rgba(77,166,255,0.4)',
                    borderRadius: 7,
                    padding: '7px 0',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: BLUE,
                    background: 'rgba(77,166,255,0.08)',
                  }}
                >
                  Sail
                </div>
                <div
                  style={{
                    flex: 1,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 7,
                    padding: '7px 0',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.25)',
                  }}
                >
                  Motor
                </div>
              </div>
            </div>

            {inpField(
              'DESCRIBE YOUR BOAT',
              typedDesc,
              'e.g. 1984 Passport 40 sailboat',
              descActive,
              descActive,
              'First Mate auto-builds your equipment list and maintenance schedule'
            )}

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.5px',
                    marginBottom: 4,
                  }}
                >
                  ENGINE HOURS
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 13px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: descDone ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {descDone ? '1,534' : '—'}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.5px',
                    marginBottom: 4,
                  }}
                >
                  FUEL BURN{' '}
                  <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.2)' }}>gph</span>
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 13px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: descDone ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {descDone ? '1.20' : '—'}
                </div>
              </div>
            </div>

            <div
              style={{
                background: BLUE,
                borderRadius: 9,
                padding: '12px 0',
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                opacity: descDone ? 1 : 0.35,
                transition: 'opacity 0.4s',
              }}
            >
              Build my boat →
            </div>
          </div>
        )}

        {/* ── Phase 1: Loading ── */}
        {phase === 1 && (
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 360,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: 'rgba(77,166,255,0.1)',
                border: '2px solid rgba(77,166,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BLUE}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
              {[0, 1, 2, 3, 4].map(function (i) {
                return (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: BLUE,
                      animation: 'keeply-wave 1.3s ease-in-out infinite',
                      animationDelay: i * 0.12 + 's',
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                height: 2,
                width: 160,
                background: 'rgba(77,166,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 14,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '50%',
                  background: 'rgba(77,166,255,0.4)',
                  borderRadius: 2,
                  animation: 'keeply-shimmer 1.8s ease-in-out infinite',
                }}
              />
            </div>
            <div
              style={{
                textAlign: 'center',
                opacity: msgVisible ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {msgs[msgIdx].msg}
              </div>
              {msgs[msgIdx].sub && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {msgs[msgIdx].sub}
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              Building Rounder · 1984 Passport 40
            </div>
          </div>
        )}

        {/* ── Phase 2: Result ── */}
        {phase === 2 && (
          <div style={{ padding: '10px 12px 14px' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                Rounder
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                1984 Passport 40 · Sail · Seattle
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                {[
                  ['28', 'Tasks', BLUE],
                  ['21', 'Equipment', '#22c55e'],
                  ['92%', 'Health', '#4ade80'],
                ].map(function (k) {
                  return (
                    <div key={k[1]}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: k[2] }}>{k[0]}</div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {k[1]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: 7,
              }}
            >
              Equipment — AI generated
            </div>
            {equipment.slice(0, equipIdx).map(function (eq, i) {
              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + eq.border,
                    borderRadius: 10,
                    padding: '9px 12px',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animation: 'onboard-fadein 0.4s ease forwards',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{eq.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                      {eq.cat}
                    </div>
                  </div>
                  <div
                    style={{
                      background: eq.bg,
                      borderRadius: 20,
                      padding: '2px 9px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: eq.color,
                    }}
                  >
                    {eq.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {phase === 2 && (
          <div
            style={{
              background: '#fff',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              padding: '6px 0 8px',
            }}
          >
            {['Logbook', 'Equipment', 'My Boat', 'First Mate', 'Profile'].map(function (t) {
              return (
                <div
                  key={t}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 7,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    color: t === 'My Boat' ? '#0f4c8a' : 'rgba(7,30,61,0.3)',
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: [
            '@keyframes keeply-blink{0%,100%{opacity:1}50%{opacity:0}}',
            '@keyframes keeply-wave{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-6px);opacity:1}}',
            '@keyframes keeply-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}',
            '@keyframes onboard-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
          ].join(''),
        }}
      />
    </div>
  );
}

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
    if (p.get('upgraded') === '1') {
      setStripeSuccess(true);
      setShowAuth(true);
      setSignupEmail('your account');
    }
    // Clean consumed params so refresh/bookmark/browser-restored tab doesn't re-fire modals
    if (p.get('signup') === '1' || p.get('login') === '1' || p.get('upgraded') === '1') {
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
          posthog.capture('signup_completed', {
            plan: effectivePlan || 'free',
            email_confirmed_immediately: false,
          });
          window.gtag?.('event', 'signup_completed', { plan: effectivePlan || 'free' });
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
    if (resolvedMode === 'signup') posthog.capture('signup_started');
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
        Try Keeply free
        <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
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
              href="#pricing"
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
        </div>
      </nav>

      {/* Hero */}
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
        }}
      >
        {/* ── Hero background: sailing video with dark overlay ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            zIndex: 1,
            background: '#071e3d',
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 38%',
            }}
          >
            <source src="/videos/sailing-hero-web.mp4" type="video/mp4" />
          </video>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(7,30,61,0.55) 0%, rgba(7,30,61,0.2) 40%, rgba(7,30,61,0.7) 80%, rgba(7,30,61,0.97) 100%)',
            }}
          />
        </div>

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
            Your vessel{"'"}s <span style={{ color: GOLD }}>First Mate</span>,<br />
            always ready.
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px,2vw,20px)',
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 40px',
              lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            AI-powered vessel management — maintenance, logbook, and an AI crew member that knows
            your boat inside out.
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

      {/* ── Social proof strip ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          padding: isMobile ? '20px 16px' : '20px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? 12 : 0,
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 600,
              letterSpacing: '0.4px',
              flexShrink: 0,
            }}
          >
            BOATS ON KEEPLY
          </div>
          <div
            style={{
              display: 'flex',
              gap: isMobile ? 16 : 32,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              { name: 'Irene', type: '1980 Ta Shing Baba 35', kind: 'sail' },
              { name: 'Rounder', type: '1984 Passport 40', kind: 'sail' },
              { name: 'Amanzi', type: '2023 Lagoon 42 Catamaran', kind: 'sail' },
              { name: 'Sue Anne', type: '1997 Ranger Tug R-27', kind: 'motor' },
              { name: 'Jaws', type: '2017 Grady-White Freedom 307', kind: 'motor' },
            ].map(function (b) {
              return (
                <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(77,166,255,0.5)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {b.kind === 'sail' ? (
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
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{b.type}</span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 600,
              letterSpacing: '0.4px',
              flexShrink: 0,
            }}
          >
            500+ TASKS TRACKED
          </div>
        </div>
      </div>

      <section id="features" style={{ padding: isMobile ? '48px 16px' : '80px 24px' }}>
        {FEATURES.map(function (f, i) {
          var isEven = i % 2 === 0;
          var V = f.Visual;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  maxWidth: 1300,
                  margin: '0 auto',
                  paddingBottom: 48,
                  marginBottom: 48,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 40 : 64,
                  alignItems: 'start',
                }}
              >
                <div style={{ order: isMobile ? 0 : isEven ? 0 : 1 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 700,
                      color: ACCENT,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      marginBottom: 16,
                      background: 'rgba(77,166,255,0.1)',
                      border: '1px solid rgba(77,166,255,0.2)',
                      borderRadius: 20,
                      padding: '4px 14px',
                    }}
                  >
                    {f.tag}
                  </div>
                  <h2
                    style={{
                      fontSize: 'clamp(22px,2.8vw,34px)',
                      fontWeight: 600,
                      color: WHITE,
                      lineHeight: 1.2,
                      letterSpacing: '-0.3px',
                      margin: '0 0 20px',
                      fontFamily: "'Satoshi','DM Sans',sans-serif",
                    }}
                  >
                    {f.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 16,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.8,
                      margin: '0 0 32px',
                    }}
                  >
                    {f.body}
                  </p>
                  <button
                    onClick={function () {
                      setShowPlanPicker(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: WHITE,
                      padding: '10px 24px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Get started {'\u2192'}
                  </button>
                </div>
                <div
                  style={{
                    order: isMobile ? 1 : isEven ? 1 : 0,
                    minHeight: 760,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <V />
                </div>
              </div>
              {i === 1 && (
                <div
                  style={{
                    maxWidth: 1100,
                    margin: '0 auto',
                    paddingBottom: 48,
                    marginBottom: 48,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 48 : 80,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: ACCENT,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        marginBottom: 16,
                        background: 'rgba(77,166,255,0.1)',
                        border: '1px solid rgba(77,166,255,0.2)',
                        borderRadius: 20,
                        padding: '4px 14px',
                      }}
                    >
                      Intelligence
                    </div>
                    <h2
                      style={{
                        fontSize: 'clamp(26px,3.2vw,42px)',
                        fontWeight: 700,
                        color: WHITE,
                        lineHeight: 1.15,
                        letterSpacing: '-0.5px',
                        margin: '0 0 20px',
                        fontFamily: "'Satoshi','DM Sans',sans-serif",
                      }}
                    >
                      First Mate knows your boat.
                      <br />
                      And keeps learning.
                    </h2>
                    <p
                      style={{
                        fontSize: 16,
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.8,
                        margin: '0 0 28px',
                        maxWidth: 460,
                      }}
                    >
                      Every service you log, every repair you close, every passage you record gives
                      First Mate more context. Ask anything about your vessel — the more history you
                      build, the sharper the answers get.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        {
                          color: '#4ade80',
                          label: 'Logbook entries',
                          desc: 'Passages, watch notes, conditions',
                        },
                        {
                          color: '#4da6ff',
                          label: 'Repair history',
                          desc: 'Every fix, when and what was done',
                        },
                        {
                          color: '#f5a623',
                          label: 'Maintenance records',
                          desc: 'Service dates, notes, intervals',
                        },
                        {
                          color: '#9ca3af',
                          label: 'Engine hours',
                          desc: 'Hour-based service triggers',
                        },
                      ].map(function (item) {
                        return (
                          <div
                            key={item.label}
                            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: item.color,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.8)',
                              }}
                            >
                              {item.label}
                            </span>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                              {item.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      order: isMobile ? -1 : 0,
                      minHeight: 760,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FirstMateLearnVisual />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: isMobile ? '56px 16px' : '100px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2
              style={{
                fontSize: 'clamp(22px,2.8vw,34px)',
                fontWeight: 600,
                color: WHITE,
                letterSpacing: '-0.5px',
                margin: '0 0 12px',
                fontFamily: "'Satoshi','DM Sans',sans-serif",
              }}
            >
              Pricing
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px' }}>
              Start free — no credit card needed. Cancel any time.
            </p>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: annual ? 'rgba(255,255,255,0.4)' : WHITE,
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
                  width: 44,
                  height: 24,
                  background: annual ? ACCENT : 'rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 18,
                    height: 18,
                    background: WHITE,
                    borderRadius: '50%',
                    top: 3,
                    left: annual ? 23 : 3,
                    transition: 'left 0.2s',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: annual ? WHITE : 'rgba(255,255,255,0.4)',
                  fontWeight: annual ? 600 : 400,
                }}
              >
                Annual
              </span>
              <span
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#4ade80',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}
              >
                Save 20%
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
              gap: 16,
            }}
          >
            {DISPLAY_PLANS.map(function (plan, pi) {
              var hl = plan.highlight;
              var price =
                annual && plan.effectiveMonthly ? '$' + plan.effectiveMonthly : plan.price;
              return (
                <div
                  key={pi}
                  style={{
                    background: hl ? 'rgba(77,166,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: hl
                      ? '2px solid rgba(77,166,255,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 18,
                    padding: '28px 22px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: GOLD,
                        color: '#1a1200',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 16px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      color: hl ? ACCENT : 'rgba(255,255,255,0.4)',
                      marginBottom: 12,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                    {plan.price !== 'Free' && (
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: WHITE,
                          alignSelf: 'flex-start',
                          marginTop: 8,
                        }}
                      >
                        $
                      </span>
                    )}
                    <span style={{ fontSize: 44, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
                      {price === 'Free' ? 'Free' : price.replace('$', '')}
                    </span>
                    {plan.period && price !== 'Free' && (
                      <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#4ade80',
                      fontWeight: 500,
                      minHeight: 18,
                      marginBottom: 20,
                    }}
                  >
                    {annual ? plan.sub : '\u00a0'}
                  </div>
                  <div
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}
                  />
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    {plan.subheader && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.35)',
                          marginBottom: 14,
                        }}
                      >
                        {plan.subheader}
                      </div>
                    )}
                    {plan.features.map(function (feat, fi) {
                      return (
                        <div
                          key={fi}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              color: hl ? ACCENT : '#4ade80',
                              marginTop: 1,
                              flexShrink: 0,
                            }}
                          >
                            {'\u2713'}
                          </span>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                            {feat}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={function () {
                      var pid = annual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
                      try {
                        localStorage.setItem('keeply_pending_plan', plan.planId);
                      } catch (e) {}
                      if (pid) {
                        try {
                          localStorage.setItem('keeply_pending_price_id', pid);
                        } catch (e) {}
                      }
                      setPendingPlan(plan.planId);
                      openAuth('signup');
                    }}
                    style={{
                      width: '100%',
                      padding: '13px 0',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: GOLD,
                      color: '#1a1200',
                    }}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Feature comparison table */}
          <div style={{ marginTop: 64, display: isMobile ? 'none' : 'block' }}>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: WHITE,
                letterSpacing: '-0.2px',
                textAlign: 'center',
                margin: '0 0 32px',
                fontFamily: "'Satoshi','DM Sans',sans-serif",
              }}
            >
              Full feature comparison
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      Feature
                    </th>
                    {['Free', 'Standard', 'Pro'].map(function (p, i) {
                      return (
                        <th
                          key={i}
                          style={{
                            textAlign: 'center',
                            padding: '12px 16px',
                            color: i === 1 ? ACCENT : 'rgba(255,255,255,0.8)',
                            fontWeight: 700,
                            fontSize: 13,
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            minWidth: 100,
                          }}
                        >
                          {p}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Vessels', '1', '1', '2'],
                    ['Maintenance', 'Unlimited', 'Unlimited', 'Unlimited'],
                    [
                      'Equipment cards',
                      PRICING_CONFIG.free.equipment + ' cards',
                      'Unlimited',
                      'Unlimited',
                    ],
                    ['Repairs', 'Unlimited', 'Unlimited', 'Unlimited'],
                    ['Parts catalog', '\u2713', '\u2713', '\u2713'],
                    ['Engine hours tracking', '\u2713', '\u2713', '\u2713'],
                    ['Document storage', '250 MB', '1 GB', 'Unlimited'],
                    ['Push notifications', '\u2713', '\u2713', '\u2713'],
                    ['Admin tracking', '\u2713', '\u2713', '\u2713'],
                    ['Crew / shared access', '\u2713', '\u2713', '\u2713'],
                    ['Departure & arrival checklists', '\u2713', '\u2713', '\u2713'],
                    ['Customizable checklists', '\u2014', '\u2713', '\u2713'],
                    ['Repair log & full logbook', '\u2014', '\u2713', '\u2713'],
                    ['Haul-out planner', '\u2014', '\u2014', '\u2713'],
                    [
                      'First Mate AI',
                      PRICING_CONFIG.free.firstMate + ' / mo',
                      PRICING_CONFIG.standard.firstMate + ' / mo',
                      PRICING_CONFIG.pro.firstMate + ' / mo',
                    ],
                    ['AI vessel setup', '\u2713', '\u2713', '\u2713'],
                    ['Passage export (CSV)', '\u2014', '\u2014', '\u2713'],
                    ['Watch entries logbook', '\u2014', '\u2014', '\u2713'],
                    [
                      'Price',
                      'Free',
                      '$' + PRICING_CONFIG.standard.price + ' / mo',
                      '$' + PRICING_CONFIG.pro.price + ' / mo',
                    ],
                  ].map(function (row, ri) {
                    var isLast = ri === 17;
                    return (
                      <tr
                        key={ri}
                        style={{
                          background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: isLast ? 700 : 400,
                          }}
                        >
                          {row[0]}
                        </td>
                        {row.slice(1).map(function (val, ci) {
                          var isCheck = val === '\u2713';
                          var isDash = val === '\u2014';
                          var isHighlight = ci === 1;
                          return (
                            <td
                              key={ci}
                              style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: isCheck
                                  ? '#4ade80'
                                  : isDash
                                    ? 'rgba(255,255,255,0.2)'
                                    : isHighlight
                                      ? ACCENT
                                      : 'rgba(255,255,255,0.75)',
                                fontWeight: isCheck || isLast ? 700 : 400,
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            14-day Standard trial — no credit card needed. Cancel any time.
          </p>

          {/* Trust signals */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? 16 : 32,
              flexWrap: 'wrap',
              margin: '28px 0',
              padding: '20px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {[
              ['Cancel any time', 'No long-term contract. Ever.'],
              ['Your data is yours', 'Export or delete any time.'],
              ['Built by boaters', "Not a tech company that googled 'boats'."],
              ['No surprises', 'Pricing is simple and transparent.'],
            ].map(function (t) {
              return (
                <div key={t[0]} style={{ textAlign: 'center', minWidth: isMobile ? '45%' : 160 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.75)',
                      marginBottom: 3,
                    }}
                  >
                    {t[0]}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t[1]}</div>
                </div>
              );
            })}
          </div>
          <p
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 13,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Commercial or fleet manager?{' '}
            <a
              href="mailto:sales@keeply.boats?subject=Keeply Fleet inquiry"
              style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
            >
              Talk to us about Fleet {'\u2192'}
            </a>
          </p>
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
                  setPendingPlan('free');
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
                  {['1 vessel', '10 equipment cards', 'Unlimited repairs', 'Parts catalog'].map(
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
                    'Customizable checklists',
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
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1.2,
                              }}
                            >
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
