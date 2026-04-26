'use client';

import { useBetaFeature } from './hooks/useBetaFeature';
import LandHoShell from './LandHoShell';
import NeedToBuy from './NeedToBuy/NeedToBuy';

// ListsTab — entry point for the Lists bottom-nav tab.
//
// Session 1: schema + LandHoShell shipped. Beta gate via user_profiles.beta_features.
// Session 2: Need to buy view goes live behind the same 'lists' beta flag.
//   Garry flips his own profile to dogfood; everyone else stays on the shell.
//   Kill switch: array_remove(beta_features, 'lists') reverts everyone instantly.
//
// Sessions 3+ will add Supplies / Grocery / Haulout sub-pills inside ListsTab,
// at which point this becomes a router. For now Need to buy is the only real surface.
export default function ListsTab({ activeVesselId }) {
  const hasLists = useBetaFeature('lists');

  if (!hasLists) {
    return <LandHoShell />;
  }

  return <NeedToBuy activeVesselId={activeVesselId} />;
}
