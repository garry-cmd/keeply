'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, capture } from '@/lib/posthog';

// Inner component uses useSearchParams — must live inside <Suspense>.
// PostHog autocapture's pageview detection misses Next.js client-side route
// changes (push-state, not full reload), so we manually fire pageview when
// pathname/searchParams change. The capture queues if PostHog hasn't loaded
// yet; flushes in order on init.
function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      capture('$pageview', { $current_url: window.location.href });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </>
  );
}
