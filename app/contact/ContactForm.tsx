'use client';

import { useState } from 'react';

type FormType = 'support' | 'fleet' | 'feature';

const TYPES: { value: FormType; label: string; color: string; borderColor: string }[] = [
  { value: 'support',  label: 'General Support',   color: '#22c55e', borderColor: 'rgba(34,197,94,0.35)'  },
  { value: 'fleet',    label: 'Fleet & Commercial', color: '#4da6ff', borderColor: 'rgba(77,166,255,0.35)' },
  { value: 'feature',  label: 'Feature Request',    color: '#f5a623', borderColor: 'rgba(245,166,35,0.35)' },
];

export default function ContactForm() {
  const [type, setType]       = useState<FormType>('support');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const activeType = TYPES.find(t => t.value === type)!;

  const handleSubmit = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, type }),
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

  const inputStyle: React.CSSProperties = {
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
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    marginBottom: 7,
  };

  if (status === 'sent') {
    return (
      <div style={{
        marginTop: 48,
        background: 'rgba(7,30,61,0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: 16,
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Message sent!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
          We got it. We'll reply to <strong style={{ color: '#fff' }}>{email}</strong> within one business day.
        </div>
        <button
          onClick={() => { setStatus('idle'); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            padding: '9px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 48,
      background: 'rgba(7,30,61,0.6)',
      backdropFilter: 'blur(16px)',
      border: `1px solid ${activeType.borderColor}`,
      borderRadius: 16,
      padding: '32px 28px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Send us a message</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          We read every one and reply within one business day.
        </div>
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1px solid ${type === t.value ? t.color : 'rgba(255,255,255,0.12)'}`,
              background: type === t.value ? `${t.color}18` : 'transparent',
              color: type === t.value ? t.color : 'rgba(255,255,255,0.45)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Name + Email row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Your name</label>
          <input
            type="text"
            placeholder="Captain Garry"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Subject <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
        <input
          type="text"
          placeholder={type === 'fleet' ? 'Marina / fleet size / enquiry details' : type === 'feature' ? 'Feature idea in one line' : 'Brief description'}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Message</label>
        <textarea
          placeholder={
            type === 'fleet'
              ? "Tell us about your fleet — vessel count, marina/charter context, and what you're looking for..."
              : type === 'feature'
              ? "Describe the feature — what problem it solves and how you'd use it..."
              : "What's going on? Include your vessel name or account email if it's account-related..."
          }
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
        />
      </div>

      {errorMsg && (
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          background: 'rgba(220,38,38,0.12)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 8,
          fontSize: 13,
          color: '#fca5a5',
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Or email us directly:{' '}
          <a href="mailto:support@keeply.boats" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            support@keeply.boats
          </a>
        </div>
        <button
          onClick={handleSubmit}
          disabled={status === 'sending' || !name.trim() || !email.trim() || !message.trim()}
          style={{
            background: status === 'sending' ? 'rgba(255,255,255,0.1)' : activeType.color,
            color: status === 'sending' ? 'rgba(255,255,255,0.4)' : '#000',
            border: 'none',
            borderRadius: 8,
            padding: '11px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: status === 'sending' || !name.trim() || !email.trim() || !message.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
            opacity: !name.trim() || !email.trim() || !message.trim() ? 0.5 : 1,
          }}
        >
          {status === 'sending' ? 'Sending…' : 'Send message →'}
        </button>
      </div>
    </div>
  );
}
