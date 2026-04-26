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
  const [receivingItem, setReceivingItem] = useState(null);

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

  // Receive flow — create a supply from the saved_part and link them.
  async function receiveAndCreateSupply(savedPart, supplyData) {
    setBusyId(savedPart.id);
    const { data: created, error: insertErr } = await supabase
      .from('supplies')
      .insert({
        vessel_id: activeVesselId,
        equipment_id: supplyData.equipment_id || null,
        location_id: supplyData.location_id || null,
        name: savedPart.name,
        notes: savedPart.notes || (savedPart.vendor ? 'Bought from ' + savedPart.vendor : null),
        in_stock: supplyData.quantity || 1,
        min_stock: 0,
        unit: supplyData.unit || null,
      })
      .select()
      .single();
    if (insertErr) {
      console.error('receive — supply insert:', insertErr);
      setBusyId(null);
      return false;
    }
    const patch = {
      state: 'received',
      received_at: new Date().toISOString(),
      supply_id: created.id,
    };
    const { error: updateErr } = await supabase
      .from('saved_parts')
      .update(patch)
      .eq('id', savedPart.id);
    if (updateErr) {
      console.error('receive — saved_part update:', updateErr);
      // The supply was already created — leave it. Don't try to roll back.
      setBusyId(null);
      return false;
    }
    setItems(function (prev) {
      return prev.map(function (it) {
        return it.id === savedPart.id ? Object.assign({}, it, patch) : it;
      });
    });
    setBusyId(null);
    return true;
  }

  // Receive without creating a supply — just advance state to 'received'.
  async function receiveSkipSupply(savedPart) {
    await updateState(savedPart.id, 'received');
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
                  else if (item.state === 'ordered') setReceivingItem(item);
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

      {receivingItem && (
        <ReceiveModal
          savedPart={receivingItem}
          activeVesselId={activeVesselId}
          onClose={function () { setReceivingItem(null); }}
          onAddToInventory={async function (supplyData) {
            const ok = await receiveAndCreateSupply(receivingItem, supplyData);
            if (ok) setReceivingItem(null);
          }}
          onSkip={async function () {
            await receiveSkipSupply(receivingItem);
            setReceivingItem(null);
          }}
        />
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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <ChecklistIcon />
      </div>
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

function ChecklistIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="9" y="6" width="22" height="28" rx="2" stroke="var(--text-muted)" strokeWidth="1.6" />
      <path
        d="M14 14h12M14 20h12M14 26h8"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 6v3M26 6v3"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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

// ReceiveModal — opens when user taps "Mark received" on an ordered saved_part.
// Two paths out:
//   1. Add to inventory → creates a supply row (with qty/equipment/location), advances state to 'received', links via supply_id
//   2. Skip — just mark received → advances state only, no supply row
// Loads its own equipment + locations on mount (lazy — no eager fetch in NeedToBuy).
function ReceiveModal({ savedPart, activeVesselId, onClose, onAddToInventory, onSkip }) {
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [equipmentId, setEquipmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [unit, setUnit] = useState('');
  const [showNewLoc, setShowNewLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(function () {
    if (!activeVesselId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase.from('equipment').select('id, name').eq('vessel_id', activeVesselId).order('name'),
      supabase.from('vessel_locations').select('id, name').eq('vessel_id', activeVesselId).order('name'),
    ]).then(function (results) {
      if (cancelled) return;
      const eqRes = results[0];
      const locRes = results[1];
      if (eqRes.error) console.error('ReceiveModal equipment:', eqRes.error);
      if (locRes.error) console.error('ReceiveModal locations:', locRes.error);
      setEquipment(eqRes.data || []);
      setLocations(locRes.data || []);
      setLoading(false);
    });
    return function () { cancelled = true; };
  }, [activeVesselId]);

  async function handleAddNewLocation() {
    const trimmed = (newLocName || '').trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from('vessel_locations')
      .insert({ vessel_id: activeVesselId, name: trimmed })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') alert('That location already exists.');
      else console.error('ReceiveModal addLocation:', error);
      return;
    }
    setLocations(function (prev) {
      return [...prev, data].sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    });
    setLocationId(data.id);
    setNewLocName('');
    setShowNewLoc(false);
  }

  async function handleAdd() {
    if (busy) return;
    setBusy(true);
    await onAddToInventory({
      quantity: parseInt(quantity, 10) || 1,
      equipment_id: equipmentId || null,
      location_id: locationId || null,
      unit: unit.trim() || null,
    });
    setBusy(false);
  }

  async function handleSkip() {
    if (busy) return;
    setBusy(true);
    await onSkip();
    setBusy(false);
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
          Receive
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          {savedPart.name}
        </div>
        {savedPart.source_label && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            For: {savedPart.source_label}
          </div>
        )}
        {!savedPart.source_label && <div style={{ marginBottom: 16 }} />}

        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            Loading…
          </div>
        )}

        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <Label>Quantity received</Label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={function (e) { setQuantity(e.target.value); }}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Unit</Label>
                <input
                  value={unit}
                  onChange={function (e) { setUnit(e.target.value); }}
                  placeholder="ea, gal, ft"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Label>Linked equipment (optional)</Label>
              <select
                value={equipmentId}
                onChange={function (e) { setEquipmentId(e.target.value); }}
                style={inputStyle}
              >
                <option value="">— None —</option>
                {equipment.map(function (e) {
                  return (<option key={e.id} value={e.id}>{e.name}</option>);
                })}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Label>Storage location (optional)</Label>
              {!showNewLoc && (
                <>
                  <select
                    value={locationId}
                    onChange={function (e) { setLocationId(e.target.value); }}
                    style={inputStyle}
                  >
                    <option value="">— None —</option>
                    {locations.map(function (l) {
                      return (<option key={l.id} value={l.id}>{l.name}</option>);
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={function () { setShowNewLoc(true); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginTop: 6,
                      color: 'var(--brand)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + New location
                  </button>
                </>
              )}
              {showNewLoc && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={newLocName}
                    onChange={function (e) { setNewLocName(e.target.value); }}
                    onKeyDown={function (e) {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddNewLocation(); }
                      if (e.key === 'Escape') { setShowNewLoc(false); setNewLocName(''); }
                    }}
                    placeholder="e.g. Engine room shelf"
                    style={Object.assign({}, inputStyle, { flex: 1 })}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewLocation}
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
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSkip}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Skip — just mark received
              </button>
              <button
                onClick={handleAdd}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--brand)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Add to inventory
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
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
