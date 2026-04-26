// FeatureVisuals.jsx — animated product visuals for the /features page.
//
// Originally lived inside LandingPage.jsx as the moving illustrations behind
// each home-page feature card. Home page was simplified (chips-only, no value
// cards) so these are no longer rendered there. Extracted here for use on
// /features where they replace static SVG icons with real product motion.
//
// All seven components are self-contained: they manage their own state via
// useState/useRef and animate via the shared useWhenVisible helper (kicks
// off the animation loop only when the component scrolls into view).
//
// Colors are defined inline per component, NOT pulled from a brand token,
// because the originals were authored that way and changing them is risky
// without visual regression testing. If/when a token system is introduced,
// migrate these in a focused pass.
//
// React hooks come from 'react'; useWhenVisible is the only shared helper.

import React, { useRef, useState, useEffect } from 'react';

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


export {
  useWhenVisible,
  MaintenanceVisual,
  FirstMateVisual,
  LogbookVisual,
  MyBoatVisual,
  FirstMateLearnVisual,
  PartsVisual,
  OnboardingVisual,
};
