'use client';

import { useState } from 'react';
import PartsView from './PartsView';
import SimpleListView from './SimpleListView';

// ListsTab — entry for the Lists bottom-nav tab.
//
// Four parallel surfaces, each backed by its own table:
//   Parts     → saved_parts (existing; needed/ordered/received state lifecycle)
//   Supplies  → supplies (existing; +completed_at for tap-to-disappear)
//   Grocery   → grocery_items (Lists Session 1)
//   Haulout   → haulout_items (Lists Session 1)
//
// Parts is the default landing view. Supplies/Grocery/Haulout share
// <SimpleListView /> — same shape, same UX (tap bubble → undo toast → row gone).
//
// Sessions:
//   Session 1 (this commit): schema + skeleton + 4-pill router. Sub-views are stubs.
//   Session 2: PartsView built (its own component — bubble + archive icon).
//   Session 3: SimpleListView built; Supplies/Grocery/Haulout all live via that one component.
//   Session 4: polish pass across all four.
export default function ListsTab({ activeVesselId }) {
  const [view, setView] = useState('parts');

  return (
    <div>
      {/* Pill router */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 14px 0',
          overflowX: 'auto',
        }}
      >
        <PillButton active={view === 'parts'} onClick={function () { setView('parts'); }}>
          Parts
        </PillButton>
        <PillButton active={view === 'supplies'} onClick={function () { setView('supplies'); }}>
          Supplies
        </PillButton>
        <PillButton active={view === 'grocery'} onClick={function () { setView('grocery'); }}>
          Grocery
        </PillButton>
        <PillButton active={view === 'haulout'} onClick={function () { setView('haulout'); }}>
          Haulout
        </PillButton>
      </div>

      {view === 'parts' && <PartsView activeVesselId={activeVesselId} />}

      {view === 'supplies' && (
        <SimpleListView
          activeVesselId={activeVesselId}
          tableName="supplies"
          surfaceLabel="supplies"
          emptyTitle="No supplies tracked"
          emptyHint="Tap + to add things you need to keep stocked aboard."
          addPlaceholder="e.g. spare impeller, fuel filter, oil"
        />
      )}

      {view === 'grocery' && (
        <SimpleListView
          activeVesselId={activeVesselId}
          tableName="grocery_items"
          surfaceLabel="grocery"
          emptyTitle="Empty grocery list"
          emptyHint="Tap + to add items for your next provisioning run."
          addPlaceholder="e.g. coffee, eggs, bread"
        />
      )}

      {view === 'haulout' && (
        <SimpleListView
          activeVesselId={activeVesselId}
          tableName="haulout_items"
          surfaceLabel="haulout"
          emptyTitle="No haulout items"
          emptyHint="Tap + to add jobs for the next time you're on the hard."
          addPlaceholder="e.g. bottom paint, replace zincs, polish prop"
        />
      )}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px',
        borderRadius: 10,
        border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
        background: active ? 'var(--brand)' : 'transparent',
        color: active ? 'var(--text-on-brand)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        boxShadow: active ? '0 2px 10px rgba(0,0,0,0.18)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}
