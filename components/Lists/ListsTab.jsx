'use client';

import { useBetaFeature } from './hooks/useBetaFeature';
import LandHoShell from './LandHoShell';

// ListsTab — entry point for the Lists bottom-nav tab.
//
// Session 1 (today): everyone sees LandHoShell because nobody has 'lists'
// in their user_profiles.beta_features array yet.
//
// Sessions 3+: when Garry (or beta testers) get 'lists' added to their
// beta_features, they'll see the real Need-to-buy / Supplies / Grocery /
// Haulout views instead. The kill-switch use case (post-public-launch
// rollback) flips it back: array_remove(beta_features, 'lists') for all
// rows reverts everyone to the shell with no deploy.
//
// The "real content" branch is intentionally still LandHoShell today —
// no consumer means no speculative scaffolding to maintain.
export default function ListsTab() {
  const hasLists = useBetaFeature('lists');

  if (!hasLists) {
    return <LandHoShell />;
  }

  // Future home for: <NeedToBuy /> (default) + pill router for
  // <SuppliesView /> / <GroceryView /> / <HaulQueue />
  return <LandHoShell />;
}
