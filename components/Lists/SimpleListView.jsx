'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// SimpleListView — generic list component used by Supplies, Grocery, AND Haulout.
//
// Lists Session 3:
//   Reads {tableName} rows WHERE completed_at IS NULL — active items only.
//   Tap bubble → optimistic remove + 3.5s undo toast (sets completed_at).
//   Tap row body or ⋯ menu → action sheet (Edit / Delete).
//
//   Add: inline "+ Add item" row at the bottom of the list. Tap to activate
//   input, Enter to save and stay focused for rapid entry, Escape or × to
//   cancel. No FAB. Notes field is not part of the inline-add path — users
//   add a name quickly, then tap ⋯ → Edit to add notes if needed (matches
//   Things 3 / Apple Reminders patterns).
//
// Schema contract (all three target tables share these columns):
//   id (PK), vessel_id (FK), name (required), notes (optional),
//   completed_at (timestamptz, NULL = active), created_at (default now())
//
// supplies has additional legacy columns (in_stock, min_stock, equipment_id,
// location_id, unit, updated_at) — read-side ignored, write-side filled by
// DB defaults (in_stock/min_stock both default to 0; updated_at defaults to now()).
//
// NOTE — primitives (UndoToast, ActionSheet, EditSheet, Field) are duplicated
// from PartsView.jsx. Tech debt to extract to a shared file in Session 4 polish.
export default function SimpleListView({
  activeVesselId,
  tableName,
  surfaceLabel,
  emptyTitle,
  emptyHint,
  addPlaceholder,
}) {
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
        .from(tableName)
        .select('id, name, notes, completed_at, created_at')
        .eq('vessel_id', activeVesselId)
        .is('completed_at', null)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('SimpleListView load (' + tableName + '):', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    },
    [activeVesselId, tableName]
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

  // ── Mark complete (tap bubble) ──
  async function markComplete(item) {
    if (busyId) return;
    setBusyId(item.id);
    const completedAt = new Date().toISOString();
    setItems(function (prev) {
      return prev.filter(function (r) {
        return r.id !== item.id;
      });
    });
    const { error } = await supabase
      .from(tableName)
      .update({ completed_at: completedAt })
      .eq('id', item.id);
    setBusyId(null);
    if (error) {
      console.error('markComplete:', error);
      setItems(function (prev) {
        return [item, ...prev];
      });
      return;
    }
    showToast({
      label: 'Done',
      undo: async function () {
        const { error: undoErr } = await supabase
          .from(tableName)
          .update({ completed_at: null })
          .eq('id', item.id);
        if (!undoErr) {
          setItems(function (prev) {
            const next = [...prev, { ...item, completed_at: null }];
            next.sort(function (a, b) {
              return (b.created_at || '').localeCompare(a.created_at || '');
            });
            return next;
          });
        }
      },
    });
  }

  function showToast(t) {
    setToast(t);
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

  // ── Add (inline) ──
  // Returns true on success so the AddRow can clear and refocus, false on error.
  async function addItem(name) {
    if (!activeVesselId) return false;
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    const insertRow = {
      vessel_id: activeVesselId,
      name: trimmed,
    };
    const { data, error } = await supabase
      .from(tableName)
      .insert(insertRow)
      .select('id, name, notes, completed_at, created_at')
      .single();
    if (error) {
      console.error('addItem:', error);
      return false;
    }
    setItems(function (prev) {
      return [data, ...prev];
    });
    return true;
  }

  // ── Edit ──
  async function saveEdit(payload) {
    if (!editing) return;
    const trimmedName = (payload.name || '').trim();
    if (!trimmedName) return;
    setBusyId(editing.id);
    const patch = {
      name: trimmedName,
      notes: payload.notes && payload.notes.trim() ? payload.notes.trim() : null,
    };
    const { error } = await supabase.from(tableName).update(patch).eq('id', editing.id);
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

  // ── Delete ──
  async function deleteItem(item) {
    if (!window.confirm('Delete "' + item.name + '"? This cannot be undone.')) return;
    setBusyId(item.id);
    setItems(function (prev) {
      return prev.filter(function (r) {
        return r.id !== item.id;
      });
    });
    const { error } = await supabase.from(tableName).delete().eq('id', item.id);
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

  // ── Render ──

  if (!activeVesselId) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Select a vessel to see your {surfaceLabel} list.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  const hasItems = items.length > 0;

  return (
    <div style={{ padding: '14px 14px 80px' }}>
      {!hasItems && (
        <div
          style={{
            padding: '32px 24px 18px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
            {emptyTitle}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
            {emptyHint}
          </div>
        </div>
      )}

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
              isLast={false /* always followed by AddRow */}
              onComplete={markComplete}
              onMenu={setActionSheet}
              busy={busyId === item.id}
            />
          );
        })}
        <AddRow
          onAdd={addItem}
          placeholder={addPlaceholder}
        />
      </div>

      {/* Action sheet (Edit / Delete) */}
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

      {/* Edit sheet */}
      {editing && (
        <EditSheet
          item={editing}
          onClose={function () { setEditing(null); }}
          onSave={saveEdit}
          busy={busyId === editing.id}
        />
      )}

      {/* Undo toast */}
      {toast && (
        <UndoToast label={toast.label} onUndo={handleUndo} onDismiss={dismissToast} />
      )}
    </div>
  );
}

// ── Row ──
function Row({ item, isLast, onComplete, onMenu, busy }) {
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
        onClick={function () { onComplete(item); }}
        disabled={busy}
        aria-label="Mark complete"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1.5px solid var(--border-strong)',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          fontFamily: 'inherit',
        }}
      />

      {/* Body — name + notes preview */}
      <div
        onClick={function () { onMenu(item); }}
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        {item.notes && (
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
            {item.notes}
          </div>
        )}
      </div>

      {/* ⋯ menu */}
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

// ── Inline AddRow ──
// Inactive: dashed circle + "+" icon + "Add item" muted text. Tap to activate.
// Active: solid brand circle + "+" icon, input field, × to cancel. Enter to
// save and stay focused for rapid entry. Escape to cancel.
function AddRow({ onAdd, placeholder }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  function activate() {
    setActive(true);
    // Focus on next tick so the input has rendered
    setTimeout(function () {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  }

  function deactivate() {
    setActive(false);
    setValue('');
  }

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const ok = await onAdd(trimmed);
    setBusy(false);
    if (ok) {
      setValue('');
      // Stay focused for rapid entry
      setTimeout(function () {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      deactivate();
    }
  }

  if (!active) {
    return (
      <button
        onClick={activate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-muted)',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1.5px dashed var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          Add item
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        opacity: busy ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1.5px solid var(--brand)',
          background: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="3"
             strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={function (e) { setValue(e.target.value); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={busy}
        style={{
          flex: 1,
          minWidth: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <button
        onClick={deactivate}
        disabled={busy}
        aria-label="Cancel"
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
          fontSize: 18,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Action sheet (Edit / Delete) ──
function ActionSheet({ item, onClose, onEdit, onDelete }) {
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
  const [notes, setNotes] = useState(item.notes || '');

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name, notes: notes });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSave();
    }
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
        onKeyDown={handleKeyDown}
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
            Edit item
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>

        <Field label="Name" value={name} onChange={setName} autoFocus />
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

function Field({ label, value, onChange, placeholder, multiline, autoFocus }) {
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
          type="text"
          value={value}
          onChange={function (e) { onChange(e.target.value); }}
          placeholder={placeholder}
          autoFocus={autoFocus}
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
