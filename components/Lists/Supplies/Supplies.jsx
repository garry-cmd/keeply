'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// Supplies — inventory tracker for spares the user has on board.
//
// Lists Session 3 v1: pure CRUD inventory list. No state machine
// (saved_parts owns the procurement queue). When in_stock < min_stock
// we show a "Low" badge but DON'T auto-promote to saved_parts yet —
// that wiring comes in v2 along with decrement-on-task-completion.
//
// Equipment grouping deferred to v2; v1 sorts flat alphabetically with
// linked equipment shown as a subtitle when present.
export default function Supplies({ activeVesselId }) {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // null | item object | 'new'
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!activeVesselId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [supRes, eqRes] = await Promise.all([
      supabase
        .from('supplies')
        .select('*')
        .eq('vessel_id', activeVesselId)
        .order('name', { ascending: true }),
      supabase
        .from('equipment')
        .select('id, name, category')
        .eq('vessel_id', activeVesselId)
        .order('name', { ascending: true }),
    ]);
    if (supRes.error) console.error('Supplies load:', supRes.error);
    if (eqRes.error) console.error('Equipment load:', eqRes.error);
    setItems(supRes.data || []);
    setEquipment(eqRes.data || []);
    setLoading(false);
  }, [activeVesselId]);

  useEffect(() => {
    load();
  }, [load]);

  async function adjustQuantity(id, delta) {
    const item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    const newQty = Math.max(0, (item.in_stock || 0) + delta);
    if (newQty === item.in_stock) return;
    setBusyId(id);
    // Optimistic
    setItems(function (prev) {
      return prev.map(function (i) {
        return i.id === id ? Object.assign({}, i, { in_stock: newQty }) : i;
      });
    });
    const { error } = await supabase
      .from('supplies')
      .update({ in_stock: newQty, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('adjustQuantity:', error);
      // Roll back
      setItems(function (prev) {
        return prev.map(function (i) {
          return i.id === id ? Object.assign({}, i, { in_stock: item.in_stock }) : i;
        });
      });
    }
    setBusyId(null);
  }

  async function saveItem(payload) {
    if (!activeVesselId) return;
    const isNew = !payload.id;
    if (isNew) {
      const { data, error } = await supabase
        .from('supplies')
        .insert({
          vessel_id: activeVesselId,
          equipment_id: payload.equipment_id || null,
          name: payload.name,
          notes: payload.notes || null,
          in_stock: payload.in_stock || 0,
          min_stock: payload.min_stock || 0,
          unit: payload.unit || null,
          location: payload.location || null,
        })
        .select()
        .single();
      if (error) {
        console.error('saveItem (new):', error);
        return;
      }
      setItems(function (prev) {
        return [...prev, data].sort(function (a, b) {
          return (a.name || '').localeCompare(b.name || '');
        });
      });
    } else {
      const { error } = await supabase
        .from('supplies')
        .update({
          equipment_id: payload.equipment_id || null,
          name: payload.name,
          notes: payload.notes || null,
          in_stock: payload.in_stock || 0,
          min_stock: payload.min_stock || 0,
          unit: payload.unit || null,
          location: payload.location || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id);
      if (error) {
        console.error('saveItem (update):', error);
        return;
      }
      setItems(function (prev) {
        return prev
          .map(function (i) {
            return i.id === payload.id ? Object.assign({}, i, payload) : i;
          })
          .sort(function (a, b) {
            return (a.name || '').localeCompare(b.name || '');
          });
      });
    }
    setEditingItem(null);
  }

  async function removeItem(id) {
    if (!confirm('Remove this supply?')) return;
    setBusyId(id);
    const { error } = await supabase.from('supplies').delete().eq('id', id);
    if (!error) {
      setItems(function (prev) { return prev.filter(function (i) { return i.id !== id; }); });
    } else {
      console.error('removeItem:', error);
    }
    setBusyId(null);
    setEditingItem(null);
  }

  const equipmentById = {};
  equipment.forEach(function (e) { equipmentById[e.id] = e; });

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
            Supplies
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Spares and consumables on the boat
          </div>
        </div>
        <button
          onClick={function () { setEditingItem('new'); }}
          style={{
            padding: '8px 14px',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Add supply
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            background: 'var(--bg-subtle)',
            borderRadius: 12,
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            No supplies tracked yet
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Add the spares and consumables you keep on board so you stop buying things you already have.
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(function (item) {
            const eq = item.equipment_id ? equipmentById[item.equipment_id] : null;
            const isLow = item.min_stock > 0 && item.in_stock < item.min_stock;
            const isOut = item.in_stock === 0 && item.min_stock > 0;
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: busyId === item.id ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </div>
                    {isOut && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(220,38,38,0.2)',
                          color: '#fca5a5',
                          padding: '2px 6px',
                          borderRadius: 4,
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Out
                      </span>
                    )}
                    {isLow && !isOut && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(217,119,6,0.2)',
                          color: '#d97706',
                          padding: '2px 6px',
                          borderRadius: 4,
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Low
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {eq && <span>{eq.name}</span>}
                    {eq && (item.location || item.notes) && <span> · </span>}
                    {item.location && <span>{item.location}</span>}
                    {item.location && item.notes && <span> · </span>}
                    {item.notes && <span>{item.notes}</span>}
                    {!eq && !item.location && !item.notes && (
                      <span style={{ opacity: 0.6 }}>No equipment linked</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={function () { adjustQuantity(item.id, -1); }}
                    disabled={busyId === item.id || item.in_stock === 0}
                    aria-label="Decrease quantity"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: item.in_stock === 0 ? 'default' : 'pointer',
                      opacity: item.in_stock === 0 ? 0.4 : 1,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    −
                  </button>
                  <div
                    style={{
                      minWidth: 36,
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {item.in_stock}
                    {item.unit && (
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 2 }}>
                        {item.unit}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={function () { adjustQuantity(item.id, 1); }}
                    disabled={busyId === item.id}
                    aria-label="Increase quantity"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    +
                  </button>
                  <button
                    onClick={function () { setEditingItem(item); }}
                    aria-label="Edit"
                    style={{
                      marginLeft: 4,
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ⋯
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <SupplyEditor
          item={editingItem === 'new' ? null : editingItem}
          equipment={equipment}
          onClose={function () { setEditingItem(null); }}
          onSave={saveItem}
          onDelete={editingItem !== 'new' ? function () { removeItem(editingItem.id); } : null}
        />
      )}
    </div>
  );
}

function SupplyEditor({ item, equipment, onClose, onSave, onDelete }) {
  const isNew = !item;
  const [name, setName] = useState(item ? item.name : '');
  const [equipmentId, setEquipmentId] = useState(item && item.equipment_id ? item.equipment_id : '');
  const [inStock, setInStock] = useState(item ? item.in_stock : 0);
  const [minStock, setMinStock] = useState(item ? item.min_stock : 0);
  const [unit, setUnit] = useState(item && item.unit ? item.unit : '');
  const [location, setLocation] = useState(item && item.location ? item.location : '');
  const [notes, setNotes] = useState(item && item.notes ? item.notes : '');

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: item ? item.id : undefined,
      name: name.trim(),
      equipment_id: equipmentId || null,
      in_stock: parseInt(inStock, 10) || 0,
      min_stock: parseInt(minStock, 10) || 0,
      unit: unit.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        zIndex: 450,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 20px 32px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
            margin: '0 auto 16px',
          }}
        />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {isNew ? 'Add supply' : 'Edit supply'}
        </div>

        <Field label="Name" required>
          <input
            autoFocus
            value={name}
            onChange={function (e) { setName(e.target.value); }}
            placeholder="e.g. Yanmar 4JH45 impeller"
            style={inputStyle}
          />
        </Field>

        <Field label="Linked equipment (optional)">
          <select
            value={equipmentId}
            onChange={function (e) { setEquipmentId(e.target.value); }}
            style={inputStyle}
          >
            <option value="">— None —</option>
            {equipment.map(function (e) {
              return (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              );
            })}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="In stock">
              <input
                type="number"
                min="0"
                value={inStock}
                onChange={function (e) { setInStock(e.target.value); }}
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Min on hand">
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={function (e) { setMinStock(e.target.value); }}
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Unit">
              <input
                value={unit}
                onChange={function (e) { setUnit(e.target.value); }}
                placeholder="ea, gal, ft"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        <Field label="Location (optional)">
          <input
            value={location}
            onChange={function (e) { setLocation(e.target.value); }}
            placeholder="e.g. Engine room locker"
            style={inputStyle}
          />
        </Field>

        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={function (e) { setNotes(e.target.value); }}
            placeholder="Part number, source, anything"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {!isNew && onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: '11px 16px',
                borderRadius: 10,
                border: '1px solid rgba(220,38,38,0.4)',
                background: 'transparent',
                color: '#fca5a5',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              flex: 2,
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: name.trim() ? 'pointer' : 'default',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}
      >
        {label}
        {required && <span style={{ color: 'var(--brand)', marginLeft: 2 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
};
