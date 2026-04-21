'use client';

import { useEffect } from 'react';
import { trackException } from '@/lib/posthog';

/**
 * Route-level error boundary.
 * Next.js automatically wraps every route in app/ with this component.
 * Catches errors thrown during rendering, in lifecycle methods, and in constructors
 * of components below the root layout.
 *
 * Errors caught here are reported to PostHog via trackException — they would not
 * otherwise reach PostHog's global capture_exceptions handler because React has
 * already caught them.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error);
    trackException(error, {
      source: 'error-boundary',
      scope: 'route',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '32px 24px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚓</div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          color: 'var(--text-primary)',
        }}
      >
        Something went aground
      </h1>
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          maxWidth: 440,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        The issue is on our end, not yours. Hit retry to get back on course, or head home and try
        again later.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--brand)',
            color: 'var(--text-on-brand)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <a
          href="/"
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Go home
        </a>
      </div>
      {error.digest && (
        <div
          style={{
            marginTop: 24,
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}
        >
          Error ID: {error.digest}
        </div>
      )}
    </div>
  );
}
