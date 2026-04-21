'use client';

import { useState, useRef } from 'react';

type FormType = 'support' | 'fleet' | 'feature';

const TYPES = [
  {
    value: 'support' as FormType,
    label: 'General Support',
    description: 'Questions about the app, bugs, or account issues.',
    color: '#22c55e',
    border: 'rgba(34,197,94,0.25)',
    borderActive: 'rgba(34,197,94,0.6)',
    placeholder:
      "What's going on? Include your vessel name or account email if it's account-related...",
    subjectPlaceholder: 'Brief description',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="5" />
        <path d="M10.5 10.5l3.5 3.5M18 18l3.5 3.5M21.5 10.5L18 14M10.5 21.5L14 18" />
      </svg>
    ),
  },
  {
    value: 'fleet' as FormType,
    label: 'Fleet & Commercial',
    description: 'Custom pricing for marinas, charter fleets, and commercial operators.',
    color: '#4da6ff',
    border: 'rgba(77,166,255,0.25)',
    borderActive: 'rgba(77,166,255,0.6)',
    placeholder:
      "Tell us about your fleet — vessel count, marina/charter context, and what you're looking for...",
    subjectPlaceholder: 'Marina / fleet size / enquiry',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4C16 4 8 10 8 18a8 8 0 0 0 16 0C24 10 16 4 16 4z" />
        <circle cx="16" cy="18" r="2.5" />
        <line x1="16" y1="27" x2="16" y2="29" />
        <line x1="10" y1="29" x2="22" y2="29" />
      </svg>
    ),
  },
  {
    value: 'feature' as FormType,
    label: 'Feature Request',
    description: "Tell us what you'd like Keeply to do. We read every message.",
    color: '#f5a623',
    border: 'rgba(245,166,35,0.25)',
    borderActive: 'rgba(245,166,35,0.6)',
    placeholder: 'Describe the feature — what problem it solves and how you would use it...',
    subjectPlaceholder: 'Feature idea in one line',
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4a8 8 0 0 1 4 15v3H12v-3A8 8 0 0 1 16 4z" />
        <line x1="12" y1="25" x2="20" y2="25" />
        <line x1="13" y1="28" x2="19" y2="28" />
      </svg>
    ),
  },
];

export default function ContactSection() {
  const [selected, setSelected] = useState<FormType>('support');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const active = TYPES.find((t) => t.value === selected)!;

  const selectType = (t: FormType) => {
    setSelected(t);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSubmit = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, type: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
      } else {
        setStatus('sent');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: '#fff',
    outline: 'none',
    fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
    boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    marginBottom: 7,
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 80px' }}>
      {/* ── Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {TYPES.map((t) => {
          const isActive = selected === t.value;
          return (
            <button
              key={t.value}
              onClick={() => selectType(t.value)}
              style={{
                background: isActive
                  ? `rgba(${t.value === 'support' ? '34,197,94' : t.value === 'fleet' ? '77,166,255' : '245,166,35'},0.08)`
                  : 'rgba(7,30,61,0.6)',
                backdropFilter: 'blur(16px)',
                border: `1.5px solid ${isActive ? t.borderActive : t.border}`,
                borderRadius: 16,
                padding: '24px 22px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.18s',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
              }}
            >
              <div style={{ color: t.color }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 5 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>
                  {t.description}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive ? t.color : 'rgba(255,255,255,0.25)',
                  marginTop: 4,
                  transition: 'color 0.15s',
                }}
              >
                {isActive ? '✓ Selected' : 'Select →'}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Form ── */}
      <div
        ref={formRef}
        style={{
          marginTop: 32,
          background: 'rgba(7,30,61,0.65)',
          backdropFilter: 'blur(16px)',
          border: `1.5px solid ${active.borderActive}`,
          borderRadius: 16,
          padding: '32px 28px',
          transition: 'border-color 0.2s',
          scrollMarginTop: 80,
        }}
      >
        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Message sent!
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 340,
                margin: '0 auto 24px',
              }}
            >
              We got it. We'll reply to <strong style={{ color: '#fff' }}>{email}</strong> within
              one business day.
            </div>
            <button
              onClick={() => {
                setStatus('idle');
                setName('');
                setEmail('');
                setSubject('');
                setMessage('');
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.6)',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                <span style={{ color: active.color }}>{active.label}</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Fill in your details below — we reply within one business day.
              </div>
            </div>

            {/* Name + Email */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}
            >
              <div>
                <label style={lbl}>Your name</label>
                <input
                  type="text"
                  placeholder="Captain Garry"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inp}
                />
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>
                Subject <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder={active.subjectPlaceholder}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={inp}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Message</label>
              <textarea
                placeholder={active.placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                style={{ ...inp, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'rgba(220,38,38,0.12)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#fca5a5',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
                Or email:{' '}
                <a
                  href="mailto:support@keeply.boats"
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                  }}
                >
                  support@keeply.boats
                </a>
              </div>
              <button
                onClick={handleSubmit}
                disabled={status === 'sending' || !name.trim() || !email.trim() || !message.trim()}
                style={{
                  background:
                    !name.trim() || !email.trim() || !message.trim() || status === 'sending'
                      ? 'rgba(255,255,255,0.08)'
                      : active.color,
                  color:
                    !name.trim() || !email.trim() || !message.trim() || status === 'sending'
                      ? 'rgba(255,255,255,0.3)'
                      : '#07162d',
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    !name.trim() || !email.trim() || !message.trim() || status === 'sending'
                      ? 'not-allowed'
                      : 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
                }}
              >
                {status === 'sending' ? 'Sending…' : 'Send message →'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Response times */}
      <div
        style={{
          marginTop: 20,
          background: 'rgba(7,30,61,0.5)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '18px 22px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 3" />
          <path d="M9 3h6" />
          <path d="M12 3v2" />
        </svg>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          Support emails answered within 1 business day. Fleet inquiries within 24 hours. Feature
          requests reviewed weekly — we read them all and they directly influence the roadmap.
        </div>
      </div>
    </div>
  );
}
