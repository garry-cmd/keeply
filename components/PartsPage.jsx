'use client';
import { useState, useMemo } from 'react';

const s = {
  chip: (color, bg, border) => ({
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 10,
    color,
    background: bg,
    border: border ? `0.5px solid ${border}` : 'none',
    fontFamily: 'DM Mono, monospace',
    whiteSpace: 'nowrap',
  }),
  btn: (primary) => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: primary ? 'var(--brand)' : 'var(--bg-subtle)',
    color: primary ? '#fff' : 'var(--text-secondary)',
  }),
};

export default function PartsPage({ equipment, onBack, onConfirmPart }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Flatten all parts across all equipment that have customParts
  const allParts = useMemo(
    function () {
      const result = [];
      (equipment || []).forEach(function (eq) {
        (eq.customParts || []).forEach(function (part) {
          result.push({ ...part, _eqId: eq.id, _eqName: eq.name, _eqCategory: eq.category });
        });
      });
      return result;
    },
    [equipment]
  );

  // Category options
  const categories = useMemo(
    function () {
      const cats = [
        ...new Set(
          (equipment || []).map(function (e) {
            return e.category;
          })
        ),
      ].sort();
      return ['All', ...cats];
    },
    [equipment]
  );

  // Filtered + searched parts
  const visible = useMemo(
    function () {
      return allParts.filter(function (p) {
        if (filter !== 'All' && p._eqCategory !== filter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p._eqName?.toLowerCase().includes(q) ||
            p.notes?.toLowerCase().includes(q)
          );
        }
        return true;
      });
    },
    [allParts, filter, search]
  );

  // Group by equipment
  const grouped = useMemo(
    function () {
      const map = {};
      visible.forEach(function (p) {
        if (!map[p._eqId])
          map[p._eqId] = { eqName: p._eqName, eqCategory: p._eqCategory, parts: [] };
        map[p._eqId].parts.push(p);
      });
      return Object.values(map);
    },
    [visible]
  );

  const SECTIONS = {
    Engine: '⚙️',
    Electrical: '⚡',
    Plumbing: '🚿',
    Safety: '🛟',
    Navigation: '🧭',
    Sails: '⛵',
    Hull: '⚓',
    Deck: '🪝',
    Electronics: '📡',
    Vessel: '⚓',
    Other: '🔧',
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--text-muted)',
              padding: '0 4px 0 0',
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Parts</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {allParts.length} saved {allParts.length === 1 ? 'part' : 'parts'} across{' '}
              {
                (equipment || []).filter(function (e) {
                  return (e.customParts || []).length > 0;
                }).length
              }{' '}
              equipment items
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          🔍
        </span>
        <input
          placeholder="Search parts, part numbers, equipment…"
          value={search}
          onChange={function (e) {
            setSearch(e.target.value);
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '9px 12px 9px 34px',
            fontSize: 13,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {search && (
          <button
            onClick={function () {
              setSearch('');
            }}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Category filter ── */}
      {categories.length > 2 && (
        <div
          style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 16 }}
        >
          {categories.map(function (cat) {
            const active = filter === cat;
            return (
              <button
                key={cat}
                onClick={function () {
                  setFilter(cat);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '0.5px solid ' + (active ? 'var(--brand)' : 'var(--border)'),
                  background: active ? 'var(--brand-deep)' : 'var(--bg-subtle)',
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {active && '✓ '}
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty states ── */}
      {allParts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔩</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: 6,
            }}
          >
            No parts saved yet
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            Open any equipment card → Parts tab → AI suggestions → 💾 Save,
            <br />
            or use + Add Part to add a known part number.
          </div>
        </div>
      )}

      {allParts.length > 0 && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13 }}>No parts match "{search || filter}"</div>
        </div>
      )}

      {/* ── Parts grouped by equipment ── */}
      {grouped.map(function (group) {
        const icon = SECTIONS[group.eqCategory] || '🔧';
        return (
          <div key={group.eqName} style={{ marginBottom: 20 }}>
            {/* Equipment header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {group.eqName}
              </span>
              <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {group.parts.length}
              </span>
            </div>

            {/* Parts */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {group.parts.map(function (part, idx) {
                const hasUrl = !!part.url;
                const hasPartNum = !!part.sku;
                const searchUrl = hasPartNum
                  ? 'https://www.google.com/search?q=' +
                    encodeURIComponent(part.sku + ' ' + part.name + ' marine')
                  : 'https://www.google.com/search?q=' +
                    encodeURIComponent(part.name + ' ' + group.eqName + ' marine');

                return (
                  <div
                    key={part.id}
                    style={{
                      padding: '12px 14px',
                      borderBottom:
                        idx < group.parts.length - 1 ? '0.5px solid var(--border)' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    {/* Left: name + metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: hasPartNum || part.notes ? 4 : 0,
                        }}
                      >
                        {part.name}
                      </div>
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}
                      >
                        {part.ai_suggested && !part.confirmed && (
                          <span
                            onClick={function () {
                              if (typeof onConfirmPart === 'function') {
                                onConfirmPart(part._eqId, part.id);
                              }
                            }}
                            title="Suggested by AI during onboarding. Tap to confirm this part is correct for your boat."
                            style={Object.assign(
                              {},
                              s.chip('#f5b942', 'rgba(245,185,66,0.12)', 'rgba(245,185,66,0.4)'),
                              { cursor: 'pointer' }
                            )}
                          >
                            AI · verify
                          </span>
                        )}
                        {hasPartNum && (
                          <span style={s.chip('var(--brand)', 'var(--brand-deep)', 'var(--brand)')}>
                            #{part.sku}
                          </span>
                        )}
                        {part.price && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok-text)' }}>
                            ${part.price}
                          </span>
                        )}
                        {part.notes && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {part.notes.startsWith('AI: ') ? part.notes.substring(4) : part.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {/* Buy / Search link */}
                      <a
                        href={hasUrl ? part.url : searchUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...s.btn(false),
                          textDecoration: 'none',
                          display: 'inline-block',
                          lineHeight: '22px',
                        }}
                      >
                        {hasUrl ? '↗ Buy' : '🔍'}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
