'use client';

import { useState, useEffect } from 'react';
import { hasCapability } from '../../lib/pricing';
import PartsView from './PartsView';
import SimpleListView from './SimpleListView';
import ListsLocked from './ListsLocked';

// ListsTab — entry for the Lists bottom-nav tab.
//
// Four parallel surfaces, each backed by its own table:
//   Parts     → saved_parts (existing; needed/ordered/received state lifecycle)
//   Supplies  → supplies (existing; +completed_at for tap-to-disappear)
//   Grocery   → grocery_items (Lists Session 1)
//   Haulout   → haulout_items (Lists Session 1)
//
// Parts is the default landing view and is open to all tiers (it's an
// extension of the AI bookmark flow, already gated by First Mate quotas).
// Supplies / Grocery / Haulout are Pro-only via the `lists` capability in
// lib/pricing.js. Locked pills stay visible & tappable — tapping flips the
// pill to active and shows <ListsLocked /> in place of the list, with an
// inline Upgrade CTA that opens the existing UpgradeModal via the
// onRequestUpgrade callback.
//
// pendingView / onConsumePending — optional escape hatch for callers
// (e.g. the My Boat FAB) that want to deep-link to a specific sub-pill.
export default function ListsTab({
  activeVesselId,
  pendingView,
  onConsumePending,
  userPlan,
  onRequestUpgrade,
}) {
  const [view, setView] = useState(pendingView || 'parts');
  const hasLists = hasCapability(userPlan, 'lists');

  useEffect(function () {
    if (pendingView && pendingView !== view) {
      setView(pendingView);
    }
    if (pendingView && onConsumePending) {
      onConsumePending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingView]);

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
        <PillButton active={view === 'supplies'} locked={!hasLists} onClick={function () { setView('supplies'); }}>
          Supplies
        </PillButton>
        <PillButton active={view === 'grocery'} locked={!hasLists} onClick={function () { setView('grocery'); }}>
          Grocery
        </PillButton>
        <PillButton active={view === 'haulout'} locked={!hasLists} onClick={function () { setView('haulout'); }}>
          Haulout
        </PillButton>
      </div>

      {view === 'parts' && <PartsView activeVesselId={activeVesselId} />}

      {view === 'supplies' && (
        hasLists ? (
          <SimpleListView
            activeVesselId={activeVesselId}
            tableName="supplies"
            surfaceLabel="supplies"
            emptyTitle="No supplies tracked"
            emptyHint="Tap + to add things you need to keep stocked aboard."
            addPlaceholder="e.g. spare impeller, fuel filter, oil"
          />
        ) : (
          <ListsLocked surface="supplies" onUpgrade={onRequestUpgrade} />
        )
      )}

      {view === 'grocery' && (
        hasLists ? (
          <SimpleListView
            activeVesselId={activeVesselId}
            tableName="grocery_items"
            surfaceLabel="grocery"
            emptyTitle="Empty grocery list"
            emptyHint="Tap + to add items for your next provisioning run."
            addPlaceholder="e.g. coffee, eggs, bread"
          />
        ) : (
          <ListsLocked surface="grocery" onUpgrade={onRequestUpgrade} />
        )
      )}

      {view === 'haulout' && (
        hasLists ? (
          <SimpleListView
            activeVesselId={activeVesselId}
            tableName="haulout_items"
            surfaceLabel="haulout"
            emptyTitle="No haulout items"
            emptyHint="Tap + to add jobs for the next time you're on the hard."
            addPlaceholder="e.g. bottom paint, replace zincs, polish prop"
          />
        ) : (
          <ListsLocked surface="haulout" onUpgrade={onRequestUpgrade} />
        )
      )}
    </div>
  );
}

function PillButton({ active, locked, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
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
        opacity: locked && !active ? 0.75 : 1,
      }}
    >
      {children}
      {locked && (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 1 1 8 0v4" />
        </svg>
      )}
    </button>
  );
}
