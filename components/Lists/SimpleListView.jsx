'use client';

// SimpleListView — generic list component used by Supplies, Grocery, AND Haulout.
//
// Lists Session 1 (this commit): stub placeholder. Renders the empty state copy
// passed in by the parent so each surface looks distinct even before logic ships.
//
// Lists Session 3: full implementation. Same shape on all three surfaces:
//   - Repair-card row: bubble (left) | name (center) | edit/delete (right)
//   - FAB to add a new item
//   - Tap bubble → row collapses, "Done — undo" toast for ~3s, then row removed
//     from view. completed_at set on the underlying row (rows aren't deleted —
//     keeps history if we ever want it later).
//   - Active-only filter: query rows WHERE completed_at IS NULL.
//
// Parameters:
//   tableName       — Postgres table to read/write (supplies | grocery_items | haulout_items)
//   surfaceLabel    — short string used in toast copy ("supply", "grocery item", etc.)
//   emptyTitle      — heading shown when list is empty
//   emptyHint       — sub-line shown under the heading
//   addPlaceholder  — input placeholder when adding a new item
export default function SimpleListView({
  activeVesselId,
  tableName,
  surfaceLabel,
  emptyTitle,
  emptyHint,
  addPlaceholder,
}) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
        {emptyTitle}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>
        {emptyHint}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 12 }}>
        Coming soon.
      </div>
    </div>
  );
}
