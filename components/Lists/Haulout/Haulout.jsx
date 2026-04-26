'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// Haulout — queue of work waiting for the next time the boat is on the hard.
//
// Lists Session 4: items are sourced from existing maintenance_tasks and
// repairs flagged with requires_haul_out=true. No duplicate data — this view
// is purely a curated lens over existing work.
//
// Curation lives in this view (not on every task/repair card): users tap
// "Add items" to see all unflagged tasks/repairs and multi-select what to
// queue. Reverse-direction picker keeps KeeplyApp.jsx untouched and matches
// how users actually think — "what should I do at the next haulout?" is a
// planning moment, not a per-card flag.
export default function Haulout({ activeVesselId }) {
  const [tasks, setTasks] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!activeVesselId) {
      setTasks([]);
      setRepairs([]);
      setEquipment([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [tRes, rRes, eRes] = await Promise.all([
      supabase
        .from('maintenance_tasks')
        .select('id, task, section, due_date, equipment_id, requires_haul_out')
        .eq('vessel_id', activeVesselId)
        .eq('requires_haul_out', true)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('repairs')
        .select('id, description, section, status, due_date, equipment_id, requires_haul_out')
        .eq('vessel_id', activeVesselId)
        .eq('requires_haul_out', true)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('equipment')
        .select('id, name')
        .eq('vessel_id', activeVesselId)
        .order('name', { ascending: true }),
    ]);
    if (tRes.error) console.error('Haulout tasks:', tRes.error);
    if (rRes.error) console.error('Haulout repairs:', rRes.error);
    if (eRes.error) console.error('Haulout equipment:', eRes.error);
    setTasks(tRes.data || []);
    setRepairs(rRes.data || []);
    setEquipment(eRes.data || []);
    setLoading(false);
  }, [activeVesselId]);

  useEffect(() => {
    load();
  }, [load]);

  async function unflag(table, id) {
    setBusyId(id);
    const { error } = await supabase
      .from(table)
      .update({ requires_haul_out: false })
      .eq('id', id);
    if (!error) {
      if (table === 'maintenance_tasks') {
        setTasks(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
      } else {
        setRepairs(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
      }
    } else {
      console.error('unflag:', error);
    }
    setBusyId(null);
  }

  async function flagBatch(taskIds, repairIds) {
    if (taskIds.length > 0) {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ requires_haul_out: true })
        .in('id', taskIds);
      if (error) {
        console.error('flagBatch tasks:', error);
        return false;
      }
    }
    if (repairIds.length > 0) {
      const { error } = await supabase
        .from('repairs')
        .update({ requires_haul_out: true })
        .in('id', repairIds);
      if (error) {
        console.error('flagBatch repairs:', error);
        return false;
      }
    }
    await load();
    return true;
  }

  const equipmentById = {};
  equipment.forEach(function (e) { equipmentById[e.id] = e; });

  const total = tasks.length + repairs.length;

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
            Haulout queue
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Work waiting for the next time the boat is on the hard
          </div>
        </div>
        <button
          onClick={function () { setShowPicker(true); }}
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
          + Add items
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && total === 0 && (
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
            <AnchorIcon />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Nothing queued for haulout
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Tap <strong>Add items</strong> to flag tasks and repairs that need the boat out of the water.
          </div>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <Section title="Maintenance tasks" count={tasks.length}>
          {tasks.map(function (t) {
            const eq = t.equipment_id ? equipmentById[t.equipment_id] : null;
            return (
              <ItemRow
                key={t.id}
                title={t.task}
                meta={[t.section, eq && eq.name, t.due_date && 'Due ' + t.due_date].filter(Boolean).join(' · ')}
                busy={busyId === t.id}
                onRemove={function () { unflag('maintenance_tasks', t.id); }}
              />
            );
          })}
        </Section>
      )}

      {!loading && repairs.length > 0 && (
        <Section title="Repairs" count={repairs.length}>
          {repairs.map(function (r) {
            const eq = r.equipment_id ? equipmentById[r.equipment_id] : null;
            return (
              <ItemRow
                key={r.id}
                title={r.description}
                meta={[r.section, eq && eq.name, r.status, r.due_date && 'Due ' + r.due_date].filter(Boolean).join(' · ')}
                busy={busyId === r.id}
                onRemove={function () { unflag('repairs', r.id); }}
              />
            );
          })}
        </Section>
      )}

      {showPicker && (
        <PickerSheet
          activeVesselId={activeVesselId}
          equipment={equipment}
          onClose={function () { setShowPicker(false); }}
          onAdd={async function (taskIds, repairIds) {
            const ok = await flagBatch(taskIds, repairIds);
            if (ok) setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: 6,
          padding: '0 4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{title}</span>
        <span>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function ItemRow({ title, meta, busy, onRemove }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        {meta && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta}</div>
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={busy}
        aria-label="Remove from haulout queue"
        title="Remove from haulout queue"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 14,
          cursor: busy ? 'default' : 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function PickerSheet({ activeVesselId, equipment, onClose, onAdd }) {
  const [tasks, setTasks] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectedRepairs, setSelectedRepairs] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(function () {
    if (!activeVesselId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase
        .from('maintenance_tasks')
        .select('id, task, section, equipment_id, requires_haul_out')
        .eq('vessel_id', activeVesselId)
        .eq('requires_haul_out', false)
        .order('section')
        .order('task'),
      supabase
        .from('repairs')
        .select('id, description, section, status, equipment_id, requires_haul_out')
        .eq('vessel_id', activeVesselId)
        .eq('requires_haul_out', false)
        .order('section')
        .order('description'),
    ]).then(function (results) {
      if (cancelled) return;
      setTasks(results[0].data || []);
      setRepairs(results[1].data || []);
      setLoading(false);
    });
    return function () { cancelled = true; };
  }, [activeVesselId]);

  function toggleTask(id) {
    setSelectedTasks(function (prev) {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleRepair(id) {
    setSelectedRepairs(function (prev) {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleAdd() {
    if (busy) return;
    if (selectedTasks.size === 0 && selectedRepairs.size === 0) return;
    setBusy(true);
    await onAdd(Array.from(selectedTasks), Array.from(selectedRepairs));
    setBusy(false);
  }

  const equipmentById = {};
  equipment.forEach(function (e) { equipmentById[e.id] = e; });

  const totalSelected = selectedTasks.size + selectedRepairs.size;

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
          display: 'flex',
          flexDirection: 'column',
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
            flexShrink: 0,
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
            flexShrink: 0,
          }}
        >
          Add to haulout queue
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, flexShrink: 0 }}>
          Pick tasks and repairs that need the boat out of the water.
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Loading…
            </div>
          )}

          {!loading && tasks.length === 0 && repairs.length === 0 && (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                borderRadius: 10,
              }}
            >
              No more items to add. Everything's already either queued or doesn't apply.
            </div>
          )}

          {!loading && tasks.length > 0 && (
            <PickerSection title={'Maintenance tasks (' + tasks.length + ')'}>
              {tasks.map(function (t) {
                const eq = t.equipment_id ? equipmentById[t.equipment_id] : null;
                return (
                  <PickerRow
                    key={t.id}
                    selected={selectedTasks.has(t.id)}
                    title={t.task}
                    sub={[t.section, eq && eq.name].filter(Boolean).join(' · ')}
                    onToggle={function () { toggleTask(t.id); }}
                  />
                );
              })}
            </PickerSection>
          )}

          {!loading && repairs.length > 0 && (
            <PickerSection title={'Repairs (' + repairs.length + ')'}>
              {repairs.map(function (r) {
                const eq = r.equipment_id ? equipmentById[r.equipment_id] : null;
                return (
                  <PickerRow
                    key={r.id}
                    selected={selectedRepairs.has(r.id)}
                    title={r.description}
                    sub={[r.section, eq && eq.name, r.status].filter(Boolean).join(' · ')}
                    onToggle={function () { toggleRepair(r.id); }}
                  />
                );
              })}
            </PickerSection>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexShrink: 0 }}>
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
            onClick={handleAdd}
            disabled={busy || totalSelected === 0}
            style={{
              flex: 2,
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy || totalSelected === 0 ? 'default' : 'pointer',
              opacity: busy || totalSelected === 0 ? 0.5 : 1,
            }}
          >
            {totalSelected === 0 ? 'Select items to add' : 'Add ' + totalSelected + ' to queue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PickerSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function PickerRow({ selected, title, sub, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: selected ? 'var(--brand-deep)' : 'var(--bg-subtle)',
        border: selected ? '1px solid var(--brand)' : '1px solid transparent',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: selected ? 'none' : '1.5px solid var(--text-muted)',
          background: selected ? 'var(--brand)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
        )}
      </div>
    </button>
  );
}

function AnchorIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="9" r="3" stroke="var(--text-muted)" strokeWidth="1.6" />
      <path
        d="M20 12V32M14 16h12M8 26c0 5 5 8 12 8s12-3 12-8M8 26l4 2M32 26l-4 2"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
