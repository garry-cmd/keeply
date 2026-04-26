// HeroAppLoop.jsx — animated phone-mockup hero for the home page.
//
// Stylized representation of Keeply on a phone, cycling through 5 scenes
// every ~7 seconds. Total loop ~35s, infinite. Replaces the original plan
// to use a captured screen-recording video — same ambient role, but composed
// in code so the file is small, mobile-perfect, and doesn't depend on a
// recording session.
//
// Design intent: this is "what using Keeply feels like," not pixel-perfect
// reproduction of the live app. Stylized scenes match the brand and read
// as Keeply at a glance. When the actual SV IRENE walkthrough video is
// recorded, swap this entire component for a <video> element in LandingPage.
//
// Each scene is rendered always but with opacity controlled by the scene
// cycler — fade-only transitions are smooth on mobile Safari. Sub-animations
// inside each scene (ticking numbers, typing, taps) run via CSS keyframes
// or requestAnimationFrame, gated on whether the component is in view.

import React, { useRef, useState, useEffect } from 'react';

// ── Tokens ──────────────────────────────────────────────────────────────────
const BLACK = '#0a0a0a';
const BLACK_2 = '#141414';
const NAVY_SURFACE = '#0a1f3e';
const NAVY_SURFACE_2 = '#0d2a52';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';
const W_70 = 'rgba(255,255,255,0.7)';
const W_50 = 'rgba(255,255,255,0.5)';
const W_30 = 'rgba(255,255,255,0.3)';
const W_15 = 'rgba(255,255,255,0.15)';
const W_08 = 'rgba(255,255,255,0.08)';
const GREEN = '#4ade80';
const RED = '#ef4444';
const ORANGE = '#fb923c';

const SCENE_MS = 7000;
const NUM_SCENES = 5;
const FONT_STACK = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// ── Tiny SVG icons ──────────────────────────────────────────────────────────
function Check({ size = 12, color = WHITE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5L6.5 12 13 5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Wrench({ size = 12, color = ACCENT }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M10.5 2a3.5 3.5 0 00-3.46 4.07L2 11.1l2.9 2.9 5.03-5.04A3.5 3.5 0 1010.5 2z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Anchor({ size = 11, color = W_50 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3.5" r="1.6" stroke={color} strokeWidth="1.2" />
      <path
        d="M8 5v9M5 9h6M3 12a5 5 0 005 3 5 5 0 005-3"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Phone frame chrome ─────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div
      style={{
        height: 30,
        padding: '0 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        fontWeight: 600,
        color: WHITE,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div>9:41</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* signal */}
        <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
          <rect x="0" y="6" width="2" height="3" rx="0.5" fill={WHITE} />
          <rect x="3.5" y="4" width="2" height="5" rx="0.5" fill={WHITE} />
          <rect x="7" y="2" width="2" height="7" rx="0.5" fill={WHITE} />
          <rect x="10.5" y="0" width="2" height="9" rx="0.5" fill={WHITE} />
        </svg>
        {/* wifi */}
        <svg width="13" height="9" viewBox="0 0 13 9" fill="none">
          <path
            d="M6.5 8a1 1 0 100-2 1 1 0 000 2zM2.5 5.2a5.6 5.6 0 018 0M0.5 3.2a8.4 8.4 0 0112 0"
            stroke={WHITE}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {/* battery */}
        <div
          style={{
            width: 22,
            height: 10,
            border: `1px solid ${W_50}`,
            borderRadius: 2,
            position: 'relative',
            padding: 1,
          }}
        >
          <div style={{ width: '78%', height: '100%', background: WHITE, borderRadius: 1 }} />
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: -3,
              width: 2,
              height: 4,
              background: W_50,
              borderRadius: '0 1px 1px 0',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div
      style={{
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ width: 110, height: 4, background: WHITE, borderRadius: 2 }} />
    </div>
  );
}

// Common scene wrapper — sets opacity transition + standard padding
function Scene({ active, children, padTop = 14 }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: active ? 1 : 0,
        transition: 'opacity 480ms ease',
        padding: `${padTop}px 16px 16px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
}

// ── Scene 1: Dashboard ─────────────────────────────────────────────────────
function SceneDashboard({ active, tick }) {
  // Engine hours tick up subtly when this scene is showing
  const [hours, setHours] = useState(2847.3);
  useEffect(() => {
    if (!active) return;
    setHours((h) => +(h + 0.1).toFixed(1));
  }, [tick, active]);

  return (
    <Scene active={active}>
      <div>
        <div style={{ fontSize: 11, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
          MY BOAT
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginTop: 2 }}>
          S/V Irene
        </div>
        <div style={{ fontSize: 11, color: W_50, marginTop: 1 }}>
          1980 Ta Shing Baba 35
        </div>
      </div>

      {/* Big READY card with pulsing ring */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${W_08}`,
          borderRadius: 14,
          padding: '18px 16px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(74,222,128,0.12)',
            border: `1px solid rgba(74,222,128,0.4)`,
            borderRadius: 999,
            padding: '6px 14px',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: GREEN,
              boxShadow: active ? `0 0 0 0 ${GREEN}` : 'none',
              animation: active ? 'heroPulse 2.4s ease-out infinite' : 'none',
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, letterSpacing: 0.4 }}>
            READY
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: W_50,
            marginTop: 10,
          }}
        >
          Always ready to go.
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Overdue', value: 0, color: GREEN },
          { label: 'Due 30d', value: 3, color: ORANGE },
          { label: 'Repairs', value: 0, color: GREEN },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: NAVY_SURFACE,
              border: `1px solid ${W_08}`,
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: W_50, marginTop: 4, fontWeight: 600 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Engine hours card */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${W_08}`,
          borderRadius: 10,
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
            ENGINE HOURS
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginTop: 1 }}>
            {hours.toFixed(1)}
          </div>
        </div>
        <div
          style={{
            fontSize: 9,
            color: W_50,
            fontWeight: 600,
          }}
        >
          Last service{'\n'}14 days ago
        </div>
      </div>
    </Scene>
  );
}

// ── Scene 2: Maintenance — task mark done ───────────────────────────────────
function SceneMaintenance({ active }) {
  // Animation phases: 0 = list shown, 1 = ripple on task, 2 = check appears,
  // 3 = task fades & slides up, 4 = "0 overdue" counter shown
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 1100);
    const t2 = setTimeout(() => setPhase(2), 1700);
    const t3 = setTimeout(() => setPhase(3), 2700);
    const t4 = setTimeout(() => setPhase(4), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [active]);

  const overdueCount = phase >= 4 ? 0 : 1;

  return (
    <Scene active={active}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
            MAINTENANCE
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginTop: 1 }}>
            S/V Irene
          </div>
        </div>
        <div
          style={{
            background: overdueCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.12)',
            border: `1px solid ${overdueCount > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'}`,
            color: overdueCount > 0 ? RED : GREEN,
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            transition: 'all 400ms ease',
          }}
        >
          {overdueCount} overdue
        </div>
      </div>

      {/* Maintenance task — overdue impeller */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${phase >= 1 && phase < 3 ? RED + '88' : W_08}`,
          borderRadius: 12,
          padding: '12px',
          position: 'relative',
          opacity: phase >= 3 ? 0 : 1,
          transform: phase >= 3 ? 'translateY(-12px)' : 'translateY(0)',
          transition: 'opacity 500ms ease, transform 500ms ease, border-color 200ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: phase >= 2 ? `none` : `1.5px solid ${W_30}`,
              background: phase >= 2 ? GREEN : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 200ms ease',
            }}
          >
            {phase >= 2 && <Check size={12} color="#0a1f3e" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: WHITE,
                textDecoration: phase >= 2 ? 'line-through' : 'none',
                opacity: phase >= 2 ? 0.5 : 1,
              }}
            >
              Replace raw water impeller
            </div>
            <div style={{ fontSize: 10, color: W_50, marginTop: 2 }}>
              Yanmar 4JH45 · every 250 hrs
            </div>
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: phase >= 2 ? GREEN : RED,
              padding: '2px 8px',
              borderRadius: 999,
              background:
                phase >= 2 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              flexShrink: 0,
            }}
          >
            {phase >= 2 ? 'DONE' : 'OVERDUE'}
          </div>
        </div>

        {/* Tap ripple */}
        {phase === 1 && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${ACCENT}`,
              animation: 'heroRipple 600ms ease-out',
            }}
          />
        )}
      </div>

      {/* Other tasks visible underneath */}
      {[
        { name: 'Oil filter change', sub: 'Yanmar 4JH45 · due in 12 days', tag: 'DUE SOON', tagColor: ORANGE },
        { name: 'Fuel filter inspection', sub: 'Racor 500MA · due in 24 days', tag: 'DUE SOON', tagColor: ORANGE },
        { name: 'Anchor windlass service', sub: 'Lewmar V700 · due in 31 days', tag: 'OK', tagColor: GREEN },
      ].map((t, i) => (
        <div
          key={t.name}
          style={{
            background: NAVY_SURFACE,
            border: `1px solid ${W_08}`,
            borderRadius: 12,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transform: phase >= 3 ? `translateY(-${(i + 1) * 4}px)` : 'translateY(0)',
            transition: 'transform 500ms ease',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: t.tagColor,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: WHITE, fontWeight: 500 }}>{t.name}</div>
            <div style={{ fontSize: 9, color: W_50, marginTop: 1 }}>{t.sub}</div>
          </div>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: t.tagColor,
              padding: '2px 6px',
              borderRadius: 999,
              background: `${t.tagColor}22`,
              flexShrink: 0,
            }}
          >
            {t.tag}
          </div>
        </div>
      ))}
    </Scene>
  );
}

// ── Scene 3: First Mate — typing question + AI response ────────────────────
function SceneFirstMate({ active }) {
  const QUESTION = 'What is overdue on Irene?';
  const ANSWER =
    "Nothing's overdue. Your impeller change is due in 12 days. Want me to find the part?";
  const [qChars, setQChars] = useState(0);
  const [showDots, setShowDots] = useState(false);
  const [aChars, setAChars] = useState(0);

  useEffect(() => {
    if (!active) {
      setQChars(0);
      setShowDots(false);
      setAChars(0);
      return;
    }
    // Type question
    let qi = 0;
    const qInt = setInterval(() => {
      qi += 1;
      setQChars(qi);
      if (qi >= QUESTION.length) clearInterval(qInt);
    }, 45);
    // Show typing indicator
    const t1 = setTimeout(() => setShowDots(true), QUESTION.length * 45 + 350);
    // Type answer
    const t2 = setTimeout(() => {
      setShowDots(false);
      let ai = 0;
      const aInt = setInterval(() => {
        ai += 1;
        setAChars(ai);
        if (ai >= ANSWER.length) clearInterval(aInt);
      }, 22);
    }, QUESTION.length * 45 + 1300);

    return () => {
      clearInterval(qInt);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return (
    <Scene active={active}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: GOLD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          ⚓
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>First Mate</div>
          <div style={{ fontSize: 9, color: GREEN, fontWeight: 600 }}>● online</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          justifyContent: 'flex-end',
          paddingBottom: 6,
        }}
      >
        {/* User question — gold bubble, right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              background: GOLD,
              color: '#1a1200',
              borderRadius: '14px 14px 4px 14px',
              padding: '8px 12px',
              maxWidth: '78%',
              fontSize: 12,
              fontWeight: 500,
              minHeight: 16,
            }}
          >
            {QUESTION.slice(0, qChars)}
            {qChars > 0 && qChars < QUESTION.length && (
              <span style={{ opacity: 0.6 }}>|</span>
            )}
          </div>
        </div>

        {/* Typing dots */}
        {showDots && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                background: NAVY_SURFACE,
                border: `1px solid ${W_08}`,
                borderRadius: '14px 14px 14px 4px',
                padding: '10px 14px',
                display: 'flex',
                gap: 4,
              }}
            >
              {[0, 160, 320].map((delay) => (
                <div
                  key={delay}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: W_50,
                    animation: `heroDots 1100ms ease-in-out ${delay}ms infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI response — left-aligned */}
        {aChars > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                background: NAVY_SURFACE,
                border: `1px solid ${W_08}`,
                color: WHITE,
                borderRadius: '14px 14px 14px 4px',
                padding: '10px 12px',
                maxWidth: '82%',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {ANSWER.slice(0, aChars)}
              {aChars < ANSWER.length && <span style={{ opacity: 0.6 }}>|</span>}
            </div>
          </div>
        )}
      </div>

      {/* Input bar at bottom */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${W_08}`,
          borderRadius: 999,
          padding: '8px 14px',
          fontSize: 11,
          color: W_30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        Ask First Mate…
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: WHITE,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ↑
        </div>
      </div>
    </Scene>
  );
}

// ── Scene 4: Logbook — passage with watch entries ───────────────────────────
function SceneLogbook({ active, tick }) {
  const [hours, setHours] = useState(2847.6);
  useEffect(() => {
    if (!active) return;
    setHours((h) => +(h + 0.1).toFixed(1));
  }, [tick, active]);

  // Entries appear over time
  const [entryCount, setEntryCount] = useState(2);
  useEffect(() => {
    if (!active) {
      setEntryCount(2);
      return;
    }
    const t1 = setTimeout(() => setEntryCount(3), 1500);
    const t2 = setTimeout(() => setEntryCount(4), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  const allEntries = [
    { time: '14:42', type: 'Watch change', body: '37°47′N 122°33′W · COG 290° · SOG 6.4kt' },
    { time: '14:28', type: 'Wind shift', body: 'WSW 14kt · seas 1.2m · partly cloudy' },
    { time: '14:01', type: 'Reefed main', body: 'Single reef in main · steady on course' },
    { time: '13:30', type: 'Departure', body: 'Cleared SF Bay · destination Bodega Bay' },
  ];

  return (
    <Scene active={active}>
      <div>
        <div style={{ fontSize: 11, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
          PASSAGE LOG
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginTop: 2,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>SF Bay → Bodega</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            fontSize: 10,
            color: GREEN,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: GREEN,
              animation: active ? 'heroPulse 1.6s ease-out infinite' : 'none',
            }}
          />
          UNDER WAY · 1h 12m
        </div>
      </div>

      {/* Compact ticker bar */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${W_08}`,
          borderRadius: 10,
          padding: '8px 10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 4,
        }}
      >
        {[
          { l: 'SOG', v: '6.4kt' },
          { l: 'COG', v: '290°' },
          { l: 'ENG HRS', v: hours.toFixed(1) },
        ].map((m) => (
          <div key={m.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
              {m.l}
            </div>
            <div style={{ fontSize: 13, color: WHITE, fontWeight: 700, marginTop: 2 }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {/* Entry list — newest entries fade in */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {allEntries.slice(0, entryCount).map((e, i) => {
          const isNewest = i === 0 && entryCount > 2;
          return (
            <div
              key={e.time + i}
              style={{
                background: NAVY_SURFACE,
                border: `1px solid ${isNewest ? ACCENT + '55' : W_08}`,
                borderRadius: 10,
                padding: '8px 10px',
                opacity: 1,
                animation: isNewest ? 'heroFadeUp 500ms ease' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>{e.time}</div>
                <div style={{ fontSize: 10, color: W_70, fontWeight: 600 }}>{e.type}</div>
              </div>
              <div style={{ fontSize: 10, color: W_50 }}>{e.body}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

// ── Scene 5: Equipment — engine card with parts ────────────────────────────
function SceneEquipment({ active }) {
  const [showPrice, setShowPrice] = useState(false);
  useEffect(() => {
    if (!active) {
      setShowPrice(false);
      return;
    }
    const t = setTimeout(() => setShowPrice(true), 2200);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <Scene active={active}>
      <div>
        <div style={{ fontSize: 11, color: W_50, fontWeight: 600, letterSpacing: 0.3 }}>
          EQUIPMENT
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginTop: 2 }}>
          Yanmar 4JH45
        </div>
        <div style={{ fontSize: 10, color: W_50, marginTop: 1 }}>
          1980 · 38hp diesel · 2,847 hrs
        </div>
      </div>

      {/* Service history mini-card */}
      <div
        style={{
          background: NAVY_SURFACE,
          border: `1px solid ${W_08}`,
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: W_50,
            fontWeight: 600,
            letterSpacing: 0.3,
            marginBottom: 6,
          }}
        >
          SERVICE HISTORY
        </div>
        {[
          { what: 'Oil change', when: '14d ago', icon: <Wrench size={11} color={GREEN} /> },
          { what: 'Impeller replaced', when: '78d ago', icon: <Wrench size={11} color={ACCENT} /> },
          { what: 'Fuel filters', when: '102d ago', icon: <Wrench size={11} color={ACCENT} /> },
        ].map((s) => (
          <div
            key={s.what}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
            }}
          >
            {s.icon}
            <div style={{ flex: 1, fontSize: 11, color: WHITE }}>{s.what}</div>
            <div style={{ fontSize: 9, color: W_50 }}>{s.when}</div>
          </div>
        ))}
      </div>

      {/* Parts Needed callout — price fades in */}
      <div>
        <div
          style={{
            fontSize: 9,
            color: W_50,
            fontWeight: 600,
            letterSpacing: 0.3,
            marginBottom: 6,
          }}
        >
          PARTS NEEDED
        </div>
        <div
          style={{
            background: NAVY_SURFACE_2,
            border: `1px solid ${ACCENT}33`,
            borderRadius: 12,
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: NAVY_SURFACE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench size={14} color={ACCENT} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>
                Racor 500MA filter
              </div>
              <div style={{ fontSize: 9, color: W_50, marginTop: 1 }}>
                Cartridge 2010PM-OR · 30 micron
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${W_08}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: showPrice ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>$45.20</div>
              <div style={{ fontSize: 9, color: W_50 }}>West Marine · in stock</div>
            </div>
            <div
              style={{
                background: ACCENT,
                color: '#001a33',
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              View
            </div>
          </div>
          {!showPrice && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${W_08}`,
                fontSize: 10,
                color: W_30,
                fontStyle: 'italic',
              }}
            >
              Searching marine retailers…
            </div>
          )}
        </div>
      </div>
    </Scene>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function HeroAppLoop({ size = 'desktop' }) {
  const containerRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [tick, setTick] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Visibility gating — only animate when in viewport, saves CPU + battery
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Scene cycler — advance every SCENE_MS while visible
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setScene((s) => (s + 1) % NUM_SCENES), SCENE_MS);
    return () => clearInterval(id);
  }, [isVisible]);

  // Ambient ticker — drives sub-animations (engine hours, etc.)
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isVisible]);

  // Phone dimensions
  const phoneW = size === 'mobile' ? 260 : 320;
  const phoneH = size === 'mobile' ? 540 : 660;

  return (
    <>
      {/* Inline keyframes — scoped to avoid clashing with other components */}
      <style>{`
        @keyframes heroPulse {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
          100% { box-shadow: 0 0 0 12px rgba(74,222,128,0); }
        }
        @keyframes heroRipple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes heroDots {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes heroFadeUp {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          width: phoneW,
          height: phoneH,
          background: BLACK,
          borderRadius: 38,
          padding: 8,
          position: 'relative',
          boxShadow:
            '0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset',
          fontFamily: FONT_STACK,
        }}
      >
        {/* Subtle bezel highlight on top edge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
            borderRadius: 999,
          }}
        />

        {/* Inner screen */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#020c1f',
            borderRadius: 32,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dynamic island */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 90,
              height: 22,
              background: BLACK_2,
              borderRadius: 999,
              zIndex: 10,
            }}
          />

          <StatusBar />

          {/* Scene container — all scenes overlaid, opacity-controlled */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <SceneDashboard active={scene === 0} tick={tick} />
            <SceneMaintenance active={scene === 1} />
            <SceneFirstMate active={scene === 2} />
            <SceneLogbook active={scene === 3} tick={tick} />
            <SceneEquipment active={scene === 4} />
          </div>

          <HomeIndicator />

          {/* Scene progress dots (subtle, near bottom) */}
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 5,
              zIndex: 5,
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: NUM_SCENES }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === scene ? 16 : 5,
                  height: 5,
                  borderRadius: 999,
                  background: i === scene ? WHITE : W_30,
                  transition: 'all 300ms ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
