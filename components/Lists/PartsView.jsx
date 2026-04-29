'use client';

// PartsView — Parts surface for the Lists tab.
//
// Lists Session 1 (this commit): stub placeholder so the pill router renders cleanly.
// Lists Session 2: full implementation — bubble fills on tap (state: needed → ordered),
//   archive icon on the right archives received items (state: ordered → received, hidden).
//   Backed by the existing saved_parts table; no schema change needed.
//
// Why a separate component (not SimpleListView): Parts has an ordered intermediate
// state and an archive icon. The other three surfaces are pure tap-and-disappear.
export default function PartsView({ activeVesselId }) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
        Parts
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>
        Coming soon. This will track parts you've saved from anywhere in the
        app and walk them through ordered → received.
      </div>
    </div>
  );
}
