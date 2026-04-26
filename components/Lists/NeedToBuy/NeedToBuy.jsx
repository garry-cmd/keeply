'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// NeedToBuy — the "shopping list" surface for Lists tab.
//
// Lists Session 2: bookmarks parts saved from anywhere in the app
// (AI parts results on tasks/repairs, equipment custom_parts, etc.)
// Three states track lifecycle: needed → ordered → received.
//
// Source linkage (source_type + source_id + source_label) preserves
// "this part is for: Replace impeller — Engine" context across the
// save → buy → receive arc so the user remembers WHY they bought it.
export default function NeedToBuy({ activeVesselId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('needed');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!activeVesselId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_parts')
      .select('*')
      .eq('vessel_id', activeVesselId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('NeedToBuy load:', error);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [activeVesselId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateState(id, newState) {
    setBusyId(id);
    const patch = { state: newState };
    if (newState === 'ordered') patch.ordered_at = new Date().toISOString();
    if (newState === 'received') patch.received_at = new Date().toISOString();
    const { error } = await supabase.from('saved_parts').update(patch).eq('id', id);
    if (!error) {
      setItems(function (prev) {
        return prev.map(function (it) {
          return it.id === id ? Object.assign({}, it, patch) : it;
        });
      });
    } else {
      console.error('updateState:', error);
    }
    setBusyId(null);
  }

  async function removeItem(id) {
    setBusyId(id);
    const { error } = await supabase.from('saved_parts').delete().eq('id', id);
    if (!error) {
      setItems(function (prev) {
        return prev.filter(function (it) {
          return it.id !== id;
        });
      });
    } else {
      console.error('removeItem:', error);
    }
    setBusyId(null);
  }

  const counts = {
    needed: items.filter(function (i) { return i.state === 'needed'; }).length,
    ordered: items.filter(function (i) { return i.state === 'ordered'; }).length,
    received: items.filter(function (i) { return i.state === 'received'; }).length,
  };

  const filtered = items.filter(function (i) { return i.state === filter; });

  return (
    <div style={{ padding: '14px 14px 80px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Need to buy
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Bookmark parts from your work to build a shopping list
          </div>
        </div>
      </div>

      {/* Pill filter */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          padding: 4,
          background: 'var(--bg-subtle)',
          borderRadius: 10,
        }}
      >
        {[
          { key: 'needed', label: 'Needed' },
          { key: 'ordered', label: 'Ordered' },
          { key: 'received', label: 'Received' },
        ].map(function (p) {
          const active = filter === p.key;
          return (
            <button
              key={p.key}
              onClick={function () { setFilter(p.key); }}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 7,
                border: 'none',
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {p.label}
              {counts[p.key] > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    opacity: active ? 0.7 : 0.5,
                  }}
                >
                  {counts[p.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState filter={filter} />
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(function (item) {
            return (
              <PartRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onAdvance={function () {
                  if (item.state === 'needed') updateState(item.id, 'ordered');
                  else if (item.state === 'ordered') updateState(item.id, 'received');
                }}
                onRevert={function () {
                  if (item.state === 'ordered') updateState(item.id, 'needed');
                  else if (item.state === 'received') updateState(item.id, 'ordered');
                }}
                onRemove={function () { removeItem(item.id); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }) {
  const messages = {
    needed: {
      title: 'Nothing on your shopping list yet',
      body: 'Tap the bookmark icon next to any AI part suggestion on a repair, task, or equipment card to save it here.',
    },
    ordered: {
      title: 'Nothing on order',
      body: "Items you've bought will move here when you tap Mark ordered.",
    },
    received: {
      title: 'Nothing received yet',
      body: "When orders arrive, mark them received and they'll move here as a record.",
    },
  };
  const m = messages[filter];
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: 'var(--bg-subtle)',
        borderRadius: 12,
        border: '1px dashed var(--border)',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}
      >
        {m.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {m.body}
      </div>
    </div>
  );
}

function PartRow({ item, busy, onAdvance, onRevert, onRemove }) {
  const advanceLabels = {
    needed: 'Mark ordered',
    ordered: 'Mark received',
  };
  const revertLabels = {
    ordered: '↶ Needed',
    received: '↶ Ordered',
  };

  const sourceTypeLabels = {
    repair: 'For repair',
    task: 'For task',
    equipment: 'On equipment',
    manual: 'Manual entry',
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              marginBottom: 3,
            }}
          >
            {item.name}
          </div>

          {/* Source context line */}
          {item.source_label && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              <span style={{ opacity: 0.7 }}>{sourceTypeLabels[item.source_type] || ''}: </span>
              {item.source_label}
            </div>
          )}

          {/* Vendor + price line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            {item.vendor && <span>{item.vendor}</span>}
            {item.price && (
              <span style={{ color: 'var(--ok-text)', fontWeight: 700 }}>
                {item.price.toString().startsWith('$') ? item.price : '$' + item.price}
              </span>
            )}
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'var(--brand)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Open vendor →
              </a>
            )}
            {advanceLabels[item.state] && (
              <button
                onClick={onAdvance}
                disabled={busy}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  background: 'none',
                  border: '1px solid var(--brand)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {advanceLabels[item.state]}
              </button>
            )}
            {revertLabels[item.state] && (
              <button
                onClick={onRevert}
                disabled={busy}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: '1px solid var(--border)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {revertLabels[item.state]}
              </button>
            )}
            <button
              onClick={onRemove}
              disabled={busy}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fca5a5',
                background: 'none',
                border: '1px solid rgba(220,38,38,0.4)',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: busy ? 'default' : 'pointer',
                marginLeft: 'auto',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
