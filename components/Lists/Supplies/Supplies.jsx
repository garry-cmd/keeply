'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// Supplies — inventory tracker for spares the user has on board.
//
// Lists Session 3 v1: pure CRUD inventory list. No state machine
// (saved_parts owns the procurement queue).
//
// v1.1 (this update):
//  - Locations promoted from free-text to managed vessel_locations table.
//    Standardizes naming so "engine locker" and "Engine Locker" don't
//    fragment search/grouping. ON DELETE RESTRICT on the FK; the manage
//    sheet blocks deletion of a location with supplies attached.
//  - Empty-state emoji replaced with inline SVG (consistent rendering).
export default function Supplies({ activeVesselId }) {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // null | item object | 'new'
  const [managingLocations, setManagingLocations] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!activeVesselId) {
      setItems([]);
      setEquipment([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [supRes, eqRes, locRes] = await Promise.all([
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
      supabase
        .from('vessel_locations')
        .select('id, name, sort_order')
        .eq('vessel_id', activeVesselId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);
    if (supRes.error) console.error('Supplies load:', supRes.error);
    if (eqRes.error) console.error('Equipment load:', eqRes.error);
    if (locRes.error) console.error('Locations load:', locRes.error);
    setItems(supRes.data || []);
    setEquipment(eqRes.data || []);
    setLocations(locRes.data || []);
    setLoading(false);
  }, [activeVesselId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Auto-pull to Need to buy ────────────────────────────────────────────────
  // When a supply's quantity drops to or below its min_stock threshold, create
  // a saved_parts row in 'needed' state — but only if no open saved_part already
  // exists for this supply (dedup via supply_id + state lookup). Receiving a
  // saved_part naturally restocks via the existing Mark-received handoff, which
  // pushes inStock back above threshold and silences future triggers.
  async function maybeQueueRestock(supply) {
    if (!supply || !supply.id) return;
    const minStock = supply.min_stock || 0;
    const inStock = supply.in_stock || 0;
    if (minStock <= 0) return; // no threshold set, nothing to trigger
    if (inStock > minStock) return; // above threshold, nothing to do
    // Check if an open saved_part already exists for this supply
    const { data: existing, error: selErr } = await supabase
      .from('saved_parts')
      .select('id, state')
      .eq('supply_id', supply.id)
      .in('state', ['needed', 'ordered'])
      .limit(1);
    if (selErr) {
      console.error('maybeQueueRestock select:', selErr);
      return;
    }
    if (existing && existing.length > 0) return; // already queued
    const { error: insErr } = await supabase.from('saved_parts').insert({
      vessel_id: supply.vessel_id,
      source_type: 'supply',
      source_id: supply.id,
      source_label: supply.name,
      supply_id: supply.id,
      name: supply.name,
      state: 'needed',
    });
    if (insErr) console.error('maybeQueueRestock insert:', insErr);
  }

  async function adjustQuantity(id, delta) {
    const item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    const newQty = Math.max(0, (item.in_stock || 0) + delta);
    if (newQty === item.in_stock) return;
    setBusyId(id);
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
      setItems(function (prev) {
        return prev.map(function (i) {
          return i.id === id ? Object.assign({}, i, { in_stock: item.in_stock }) : i;
        });
      });
    } else {
      // Fire-and-forget; do not block UI on the dedup query
      maybeQueueRestock(Object.assign({}, item, { in_stock: newQty }));
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
          location_id: payload.location_id || null,
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
      maybeQueueRestock(data);
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
          location_id: payload.location_id || null,
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
      // Synthesize the full row for the threshold check (payload only has
      // edit-form fields, not vessel_id which the helper needs)
      const existing = items.find(function (i) { return i.id === payload.id; });
      if (existing) {
        maybeQueueRestock(Object.assign({}, existing, payload));
      }
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

  // Location CRUD passed to ManageLocationsSheet
  async function addLocation(name) {
    const trimmed = (name || '').trim();
    if (!trimmed || !activeVesselId) return null;
    const { data, error } = await supabase
      .from('vessel_locations')
      .insert({ vessel_id: activeVesselId, name: trimmed })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        alert('That location already exists.');
      } else {
        console.error('addLocation:', error);
      }
      return null;
    }
    setLocations(function (prev) {
      return [...prev, data].sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    });
    return data;
  }

  async function renameLocation(id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from('vessel_locations')
      .update({ name: trimmed })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') {
        alert('A location with that name already exists.');
      } else {
        console.error('renameLocation:', error);
      }
      return;
    }
    setLocations(function (prev) {
      return prev
        .map(function (l) { return l.id === id ? Object.assign({}, l, { name: trimmed }) : l; })
        .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    });
  }

  async function deleteLocation(id) {
    const supplyCount = items.filter(function (s) { return s.location_id === id; }).length;
    if (supplyCount > 0) {
      alert(
        supplyCount +
          ' ' +
          (supplyCount === 1 ? 'supply uses' : 'supplies use') +
          ' this location. Reassign or delete ' +
          (supplyCount === 1 ? 'it' : 'them') +
          ' first.'
      );
      return;
    }
    const { error } = await supabase.from('vessel_locations').delete().eq('id', id);
    if (error) {
      console.error('deleteLocation:', error);
      return;
    }
    setLocations(function (prev) { return prev.filter(function (l) { return l.id !== id; }); });
  }

  const equipmentById = {};
  equipment.forEach(function (e) { equipmentById[e.id] = e; });
  const locationsById = {};
  locations.forEach(function (l) { locationsById[l.id] = l; });

  const supplyCountByLocation = {};
  items.forEach(function (s) {
    if (s.location_id) {
      supplyCountByLocation[s.location_id] = (supplyCountByLocation[s.location_id] || 0) + 1;
    }
  });

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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <BoxIcon />
          </div>
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
            const loc = item.location_id ? locationsById[item.location_id] : null;
            const isLow = item.min_stock > 0 && item.in_stock < item.min_stock;
            const isOut = item.in_stock === 0 && item.min_stock > 0;
            return (
              <div
                key={item.id}
                onClick={function () { setEditingItem(item); }}
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: busyId === item.id ? 0.5 : 1,
                  cursor: 'pointer',
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
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    {eq && <span>{eq.name}</span>}
                    {eq && (loc || item.notes) && <span>·</span>}
                    {loc && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <PinIcon />
                        {loc.name}
                      </span>
                    )}
                    {loc && item.notes && <span>·</span>}
                    {item.notes && <span>{item.notes}</span>}
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  onClick={function (e) { e.stopPropagation(); }}
                >
                  <button
                    onClick={function (e) { e.stopPropagation(); adjustQuantity(item.id, -1); }}
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
                    onClick={function (e) { e.stopPropagation(); adjustQuantity(item.id, 1); }}
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
          locations={locations}
          onClose={function () { setEditingItem(null); }}
          onSave={saveItem}
          onDelete={editingItem !== 'new' ? function () { removeItem(editingItem.id); } : null}
          onAddLocation={addLocation}
          onManageLocations={function () { setManagingLocations(true); }}
        />
      )}

      {managingLocations && (
        <ManageLocationsSheet
          locations={locations}
          supplyCountByLocation={supplyCountByLocation}
          onClose={function () { setManagingLocations(false); }}
          onAdd={addLocation}
          onRename={renameLocation}
          onDelete={deleteLocation}
        />
      )}
    </div>
  );
}

function BoxIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path
        d="M6 14L20 7L34 14M6 14L20 21M6 14V28L20 35M34 14L20 21M34 14V28L20 35M20 21V35"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M6 1C3.79 1 2 2.79 2 5c0 3 4 8 4 8s4-5 4-8c0-2.21-1.79-4-4-4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="5" r="1.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SupplyEditor({ item, equipment, locations, onClose, onSave, onDelete, onAddLocation, onManageLocations }) {
  const isNew = !item;
  const [name, setName] = useState(item ? item.name : '');
  const [equipmentId, setEquipmentId] = useState(item && item.equipment_id ? item.equipment_id : '');
  const [locationId, setLocationId] = useState(item && item.location_id ? item.location_id : '');
  const [inStock, setInStock] = useState(item ? item.in_stock : 0);
  const [minStock, setMinStock] = useState(item ? item.min_stock : 0);
  const [unit, setUnit] = useState(item && item.unit ? item.unit : '');
  const [notes, setNotes] = useState(item && item.notes ? item.notes : '');
  const [showNewLoc, setShowNewLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: item ? item.id : undefined,
      name: name.trim(),
      equipment_id: equipmentId || null,
      location_id: locationId || null,
      in_stock: parseInt(inStock, 10) || 0,
      min_stock: parseInt(minStock, 10) || 0,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    });
  }

  async function handleAddLocation() {
    const created = await onAddLocation(newLocName);
    if (created) {
      setLocationId(created.id);
      setNewLocName('');
      setShowNewLoc(false);
    }
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

        <Field label="Location (optional)">
          {!showNewLoc && (
            <>
              <select
                value={locationId}
                onChange={function (e) { setLocationId(e.target.value); }}
                style={inputStyle}
              >
                <option value="">— None —</option>
                {locations.map(function (l) {
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  );
                })}
              </select>
              <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={function () { setShowNewLoc(true); }}
                  style={linkButtonStyle}
                >
                  + New location
                </button>
                <button
                  type="button"
                  onClick={onManageLocations}
                  style={linkButtonStyle}
                >
                  Manage
                </button>
              </div>
            </>
          )}
          {showNewLoc && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={newLocName}
                onChange={function (e) { setNewLocName(e.target.value); }}
                onKeyDown={function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLocation();
                  }
                  if (e.key === 'Escape') {
                    setShowNewLoc(false);
                    setNewLocName('');
                  }
                }}
                placeholder="e.g. Engine room shelf"
                style={Object.assign({}, inputStyle, { flex: 1 })}
              />
              <button
                type="button"
                onClick={handleAddLocation}
                disabled={!newLocName.trim()}
                style={{
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--brand)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: newLocName.trim() ? 'pointer' : 'default',
                  opacity: newLocName.trim() ? 1 : 0.5,
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={function () { setShowNewLoc(false); setNewLocName(''); }}
                style={{
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}
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

function ManageLocationsSheet({ locations, supplyCountByLocation, onClose, onAdd, onRename, onDelete }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [newName, setNewName] = useState('');

  function startRename(loc) {
    setRenamingId(loc.id);
    setRenameVal(loc.name);
  }

  async function commitRename() {
    if (renameVal.trim()) {
      await onRename(renamingId, renameVal);
    }
    setRenamingId(null);
    setRenameVal('');
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const created = await onAdd(newName);
    if (created) setNewName('');
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        zIndex: 460,
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
            marginBottom: 4,
          }}
        >
          Manage locations
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Standardize where your spares live so you can find them.
        </div>

        {locations.length === 0 && (
          <div
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              background: 'var(--bg-subtle)',
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            No locations yet. Add one below.
          </div>
        )}

        {locations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {locations.map(function (loc) {
              const count = supplyCountByLocation[loc.id] || 0;
              const canDelete = count === 0;
              return (
                <div
                  key={loc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                  }}
                >
                  {renamingId === loc.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={function (e) { setRenameVal(e.target.value); }}
                      onBlur={commitRename}
                      onKeyDown={function (e) {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') { setRenamingId(null); setRenameVal(''); }
                      }}
                      style={Object.assign({}, inputStyle, { flex: 1, padding: '6px 10px' })}
                    />
                  ) : (
                    <>
                      <button
                        onClick={function () { startRename(loc); }}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {loc.name}
                      </button>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {count} {count === 1 ? 'supply' : 'supplies'}
                      </span>
                      <button
                        onClick={function () { onDelete(loc.id); }}
                        disabled={!canDelete}
                        title={canDelete ? 'Delete location' : count + ' ' + (count === 1 ? 'supply uses' : 'supplies use') + ' this location'}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid ' + (canDelete ? 'rgba(220,38,38,0.4)' : 'var(--border)'),
                          background: 'transparent',
                          color: canDelete ? '#fca5a5' : 'var(--text-muted)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: canDelete ? 'pointer' : 'not-allowed',
                          opacity: canDelete ? 1 : 0.4,
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={function (e) { setNewName(e.target.value); }}
            onKeyDown={function (e) {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
            }}
            placeholder="Add new location…"
            style={Object.assign({}, inputStyle, { flex: 1 })}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            style={{
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: newName.trim() ? 'pointer' : 'default',
              opacity: newName.trim() ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 10,
            border: 'none',
            background: 'var(--brand)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
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

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--brand)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};
