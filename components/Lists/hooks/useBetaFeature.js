'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase-client';

// useBetaFeature(feature)
// Returns true if the current user has the given feature flag in their
// user_profiles.beta_features array. Defaults to false (kill-switch ready).
//
// Operational use:
//   To grant a user access:
//     UPDATE user_profiles SET beta_features = array_append(beta_features, 'lists')
//     WHERE id = '<user-id>';
//   To revoke for everyone (kill switch):
//     UPDATE user_profiles SET beta_features = array_remove(beta_features, 'lists');
export function useBetaFeature(feature) {
  const [enabled, setEnabled] = useState(false);

  useEffect(
    function () {
      var cancelled = false;
      (async function () {
        try {
          const sessionRes = await supabase.auth.getSession();
          const user = sessionRes.data.session && sessionRes.data.session.user;
          if (!user || cancelled) return;
          const { data, error } = await supabase
            .from('user_profiles')
            .select('beta_features')
            .eq('id', user.id)
            .single();
          if (cancelled) return;
          if (error) {
            setEnabled(false);
            return;
          }
          const arr = Array.isArray(data && data.beta_features) ? data.beta_features : [];
          setEnabled(arr.indexOf(feature) !== -1);
        } catch (e) {
          if (!cancelled) setEnabled(false);
        }
      })();
      return function () {
        cancelled = true;
      };
    },
    [feature]
  );

  return enabled;
}
