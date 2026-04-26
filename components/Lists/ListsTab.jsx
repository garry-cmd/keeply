'use client';

import { useState } from 'react';
import { useBetaFeature } from './hooks/useBetaFeature';
import LandHoShell from './LandHoShell';
import NeedToBuy from './NeedToBuy/NeedToBuy';
import Supplies from './Supplies/Supplies';

// ListsTab — entry point for the Lists bottom-nav tab.
//
// Session 1: schema + LandHoShell shipped behind 'lists' beta gate.
// Session 2: Need to buy view live (saved_parts procurement queue).
// Session 3: Supplies inventory view added; pill router introduced.
//
// Sessions 4+: add Grocery + Haulout as additional sub-views.
// Kill switch: array_remove(beta_features, 'lists') reverts everyone to LandHoShell instantly.
export default function ListsTab({ activeVesselId }) {
  const hasLists = useBetaFeature('lists');
  const [view, setView] = useState('need-to-buy');

  if (!hasLists) {
    return <LandHoShell />;
  }

  return (
    <div>
      {/* Sub-view pill router */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '12px 14px 0',
        }}
      >
        <PillButton active={view === 'need-to-buy'} onClick={function () { setView('need-to-buy'); }}>
          Need to buy
        </PillButton>
        <PillButton active={view === 'supplies'} onClick={function () { setView('supplies'); }}>
          Supplies
        </PillButton>
      </div>

      {view === 'need-to-buy' && <NeedToBuy activeVesselId={activeVesselId} />}
      {view === 'supplies' && <Supplies activeVesselId={activeVesselId} />}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
        background: active ? 'var(--brand-deep)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--text-muted)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
