'use client';

// ListsLocked — rendered inside ListsTab when a Free/Standard user activates
// a Pro-gated pill (Supplies / Grocery / Haulout). Sits in place of the list
// itself with an inline Upgrade CTA wired to the existing UpgradeModal in
// KeeplyApp via the onUpgrade prop.
//
// Surface-specific copy via the `surface` prop. Unknown surfaces fall back
// to a generic message; defensively handled so a future fourth gated surface
// without copy doesn't crash the panel.

const COPY = {
  supplies: {
    title: 'Track what your boat needs to keep stocked',
    body: 'Spare parts, fluids, consumables — all in one place, ready when you reorder.',
  },
  grocery: {
    title: 'Plan provisioning runs',
    body: 'Build your shopping list once, reuse it for every voyage.',
  },
  haulout: {
    title: 'Capture jobs for the next haulout',
    body: 'Bottom paint, zincs, prop polish — never lose the list.',
  },
};

export default function ListsLocked({ surface, onUpgrade }) {
  const copy = COPY[surface] || {
    title: 'A Pro feature',
    body: 'Upgrade to unlock this list.',
  };

  return (
    <div style={{ padding: '14px 14px 80px' }}>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          padding: '32px 24px 26px',
          textAlign: 'center',
        }}
      >
        {/* Lock badge */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: 'rgba(15, 76, 138, 0.10)',
            color: 'var(--brand)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
          </svg>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--brand)',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Pro feature
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          {copy.title}
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            maxWidth: 320,
            margin: '0 auto 22px',
          }}
        >
          {copy.body}
        </div>

        <button
          onClick={onUpgrade}
          style={{
            background: 'var(--brand)',
            color: 'var(--text-on-brand)',
            border: 'none',
            borderRadius: 10,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          }}
        >
          Upgrade to Pro →
        </button>
      </div>
    </div>
  );
}
