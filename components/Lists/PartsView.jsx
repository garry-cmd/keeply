'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// PartsView — the "Parts" surface in the Lists tab.
//
// Lists Session 2:
//   Reads saved_parts WHERE state IN ('needed','ordered'). Received rows are
//   hidden (the bubble + archive flow walks each row through the lifecycle:
//   needed → ordered → received → hidden).
//
// Row layout: [bubble] [name + meta line] [archive — only if ordered] [⋯ menu]
//   - Bubble: empty circle when needed, filled gold check when ordered. Tap toggles.
//   - Tap name/meta area: opens URL in new tab if present, else opens action sheet.
//   - Archive icon: only shown when state='ordered'. Tap → state='received',
//     received_at=now, row removed. 3.5-second undo toast reverts to ordered.
//   - ⋯ menu: opens action sheet — Open link / Edit / Delete.
//
// No FAB in v1. Parts come from existing app flows (AI bookmark on
// tasks/repairs/equipment, supply quick-promote). Reassess if users want
// manual entry here.
export default function PartsView({ activeVesselId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // null | item
  const [actionSheet, setActionSheet] = useState(null); // null | item
  const [toast, setToast] = useState(null); // null | { label, undo }
  const toastTimerRef = useRef(null);

  // ── Load ──
  const load = useCallback(
    async function () {
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
        .in('state', ['needed', 'ordered'])
        .order('created_at', { ascending: false });
      if (error) {
        console.error('PartsView load:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    },
    [activeVesselId]
  );

  useEffect(
    function () {
      load();
    },
    [load]
  );

  // Cleanup toast timer on unmount.
  useEffect(function () {
    return function () {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── State transitions ──

  // Toggle needed ↔ ordered. Optimistic update.
  async function toggleOrdered(item) {
    if (busyId) return;
    setBusyId(item.id);
    const goingToOrdered = item.state === 'needed';
    const newState = goingToOrdered ? 'ordered' : 'needed';
    const newOrderedAt = goingToOrdered ? new Date().toISOString() : null;
    setItems(function (prev) {
      return prev.map(function (r) {
        return r.id === item.id ? { ...r, state: newState, ordered_at: newOrderedAt } : r;
      });
    });
    const { error } = await supabase
      .from('saved_parts')
      .update({ state: newState, ordered_at: newOrderedAt })
      .eq('id', item.id);
    if (error) {
      console.error('toggleOrdered:', error);
      setItems(function (prev) {
        return prev.map(function (r) {
          return r.id === item.id ? item : r;
        });
      });
    }
    setBusyId(null);
  }

  // Mark ordered → received. Row disappears. Undo restores to ordered.
  async function markReceived(item) {
    if (busyId) return;
    setBusyId(item.id);
    const receivedAt = new Date().toISOString();
    setItems(function (prev) {
      return prev.filter(function (r) {
        return r.id !== item.id;
      });
    });
    const { error } = await supabase
      .from('saved_parts')
      .update({ state: 'received', received_at: receivedAt })
      .eq('id', item.id);
    setBusyId(null);
    if (error) {
      console.error('markReceived:', error);
      setItems(function (prev) {
        return [item, ...prev];
      });
      return;
    }
    showToast({
      label: 'Marked received',
      undo: async function () {
        const { error: undoErr } = await supabase
          .from('saved_parts')
          .update({ state: 'ordered', received_at: null })
          .eq('id', item.id);
        if (!undoErr) {
          setItems(function (prev) {
            const next = [...prev, { ...item, state: 'ordered', received_at: null }];
            next.sort(function (a, b) {
              return (b.created_at || '').localeCompare(a.created_at || '');
            });
            return next;
          });
        }
      },
    });
  }

  function showToast(toastObj) {
    setToast(toastObj);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(function () {
      setToast(null);
    }, 3500);
  }

  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }

  async function handleUndo() {
    if (!toast || !toast.undo) return;
    const undoFn = toast.undo;
    dismissToast();
    await undoFn();
  }

  async function deleteItem(item) {
    if (!window.confirm('Delete "' + item.name + '"? This cannot be undone.')) return;
    setBusyId(item.id);
    setItems(function (prev) {
      return prev.filter(function (r) {
        return r.id !== item.id;
      });
    });
    const { error } = await supabase.from('saved_parts').delete().eq('id', item.id);
    setBusyId(null);
    if (error) {
      console.error('deleteItem:', error);
      setItems(function (prev) {
        const next = [...prev, item];
        next.sort(function (a, b) {
          return (b.created_at || '').localeCompare(a.created_at || '');
        });
        return next;
      });
    }
    setActionSheet(null);
  }

  async function saveEdit(patch) {
    if (!editing) return;
    setBusyId(editing.id);
    const { error } = await supabase.from('saved_parts').update(patch).eq('id', editing.id);
    setBusyId(null);
    if (error) {
      console.error('saveEdit:', error);
      return;
    }
    setItems(function (prev) {
      return prev.map(function (r) {
        return r.id === editing.id ? { ...r, ...patch } : r;
      });
    });
    setEditing(null);
  }

  // ── Render ──

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (!activeVesselId) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Select a vessel to see your parts.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
          No parts to track yet
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
          Save parts from AI suggestions on tasks, repairs, or equipment cards.
          They'll show up here so you can track what's needed and what's been
          ordered.
        </div>
      </div>
    );
  }

  // Group: ordered first, then needed. Within each group, newest first.
  const ordered = items.filter(function (r) { return r.state === 'ordered'; });
  const needed = items.filter(function (r) { return r.state === 'needed'; });

  return (
    <div style={{ padding: '14px 14px 80px' }}>
      {ordered.length > 0 && (
        <Section
          title="Ordered"
          count={ordered.length}
          items={ordered}
          onToggle={toggleOrdered}
          onArchive={markReceived}
          onMenu={setActionSheet}
          busyId={busyId}
        />
      )}
      {needed.length > 0 && (
        <Section
          title="Needed"
          count={needed.length}
          items={needed}
          onToggle={toggleOrdered}
          onArchive={null}
          onMenu={setActionSheet}
          busyId={busyId}
          spaceTop={ordered.length > 0}
        />
      )}

      {actionSheet && (
        <ActionSheet
          item={actionSheet}
          onClose={function () { setActionSheet(null); }}
          onEdit={function () {
            setEditing(actionSheet);
            setActionSheet(null);
          }}
          onDelete={function () { deleteItem(actionSheet); }}
        />
      )}

      {editing && (
        <EditSheet
          item={editing}
          onClose={function () { setEditing(null); }}
          onSave={saveEdit}
          busy={busyId === editing.id}
        />
      )}

      {toast && (
        <UndoToast label={toast.label} onUndo={handleUndo} onDismiss={dismissToast} />
      )}
    </div>
  );
}

// ── Section block ──
function Section({ title, count, items, onToggle, onArchive, onMenu, busyId, spaceTop }) {
  return (
    <div style={{ marginTop: spaceTop ? 18 : 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
          paddingLeft: 2,
        }}
      >
        {title} · {count}
      </div>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {items.map(function (item, i) {
          return (
            <Row
              key={item.id}
              item={item}
              isLast={i === items.length - 1}
              onToggle={onToggle}
              onArchive={onArchive}
              onMenu={onMenu}
              busy={busyId === item.id}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Row ──
function Row({ item, isLast, onToggle, onArchive, onMenu, busy }) {
  const isOrdered = item.state === 'ordered';
  const url = item.url || null;
  const price =
    item.price && item.price !== 'null' && !isNaN(parseFloat(item.price))
      ? '$' + parseFloat(item.price).toFixed(2)
      : null;

  const metaParts = [];
  if (item.source_label) metaParts.push(item.source_label);
  if (item.vendor) metaParts.push(item.vendor);
  if (price) metaParts.push(price);

  function handleBodyClick() {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onMenu(item);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
        opacity: busy ? 0.55 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Bubble */}
      <button
        onClick={function () { onToggle(item); }}
        disabled={busy}
        aria-label={isOrdered ? 'Mark as needed' : 'Mark as ordered'}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: isOrdered ? '1.5px solid #f5a623' : '1.5px solid var(--border)',
          background: isOrdered ? '#f5a623' : 'transparent',
          padding: 0,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          fontFamily: 'inherit',
        }}
      >
        {isOrdered && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Body — name + meta */}
      <div
        onClick={handleBodyClick}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {item.name}
          </span>
          {url && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="var(--text-muted)" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          )}
        </div>
        {metaParts.length > 0 && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {metaParts.join(' · ')}
          </div>
        )}
      </div>

      {/* Archive icon — only when ordered */}
      {isOrdered && onArchive && (
        <button
          onClick={function () { onArchive(item); }}
          disabled={busy}
          aria-label="Mark received"
          title="Mark received"
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.7"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
      )}

      {/* ⋯ menu — always present */}
      <button
        onClick={function () { onMenu(item); }}
        disabled={busy}
        aria-label="More actions"
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          flexShrink: 0,
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
    </div>
  );
}

// ── Action sheet (Open / Edit / Delete) ──
function ActionSheet({ item, onClose, onEdit, onDelete }) {
  const url = item.url || null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation(); }}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-elevated)',
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          padding: '8px 0 calc(env(safe-area-inset-bottom) + 12px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            padding: '12px 16px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            borderBottom: '0.5px solid var(--border)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>

        {url && (
          <SheetButton
            onClick={function () {
              window.open(url, '_blank', 'noopener,noreferrer');
              onClose();
            }}
          >
            Open link
          </SheetButton>
        )}
        <SheetButton onClick={onEdit}>Edit</SheetButton>
        <SheetButton onClick={onDelete} danger>
          Delete
        </SheetButton>
        <SheetButton onClick={onClose} muted>
          Cancel
        </SheetButton>
      </div>
    </div>
  );
}

function SheetButton({ children, onClick, danger, muted }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '14px 16px',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: '0.5px solid var(--border)',
        fontSize: 14,
        fontWeight: muted ? 500 : 600,
        color: danger ? '#e74c3c' : muted ? 'var(--text-muted)' : 'var(--text-primary)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

// ── Edit sheet ──
function EditSheet({ item, onClose, onSave, busy }) {
  const [name, setName] = useState(item.name || '');
  const [vendor, setVendor] = useState(item.vendor || '');
  const [price, setPrice] = useState(item.price || '');
  const [url, setUrl] = useState(item.url || '');
  const [sku, setSku] = useState(item.sku || '');
  const [notes, setNotes] = useState(item.notes || '');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      vendor: vendor.trim() || null,
      price: price.trim() || null,
      url: url.trim() || null,
      sku: sku.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation(); }}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-elevated)',
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          padding: '16px 16px calc(env(safe-area-inset-bottom) + 16px)',
          borderTop: '1px solid var(--border)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Edit part
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              fontFamily: 'inherit',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {item.source_label && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 14,
              padding: '8px 10px',
              background: 'var(--bg-card)',
              borderRadius: 6,
              border: '0.5px solid var(--border)',
            }}
          >
            <span style={{ fontWeight: 600 }}>From:</span> {item.source_label}
          </div>
        )}

        <Field label="Name" value={name} onChange={setName} />
        <Field label="Vendor" value={vendor} onChange={setVendor} />
        <Field label="Price" value={price} onChange={setPrice} placeholder="e.g. 19.50" />
        <Field label="URL" value={url} onChange={setUrl} type="url" />
        <Field label="SKU" value={sku} onChange={setSku} />
        <Field label="Notes" value={notes} onChange={setNotes} multiline />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid var(--border)',
              background: 'transparent',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !name.trim()}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: name.trim() ? 'var(--brand)' : 'var(--border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, multiline }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={function (e) { onChange(e.target.value); }}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-card)',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={function (e) { onChange(e.target.value); }}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-card)',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        />
      )}
    </div>
  );
}

// ── Undo toast ──
function UndoToast({ label, onUndo, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 9100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: '#1a2942',
          color: '#fff',
          borderRadius: 10,
          padding: '10px 6px 10px 16px',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minWidth: 220,
          maxWidth: 'calc(100% - 24px)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ flex: 1 }}>{label}</span>
        <button
          onClick={onUndo}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f5a623',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 18,
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
