"use client";

import { useEffect } from "react";

/**
 * Global error boundary — last line of defense.
 * Catches errors in the root layout itself, which means neither layout nor
 * globals.css are reliably loaded. Must include its own <html> and <body>
 * tags AND use inline styles rather than CSS variables.
 *
 * Colors here must match body.dark-mode values from globals.css.
 *
 * When Sentry is installed, it will auto-capture these errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0e2847",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚓</div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: "#e2e8f0",
          }}
        >
          Something went seriously aground
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#94a3b8",
            maxWidth: 440,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          We hit a rough patch. Try reloading — if the problem continues, we're
          already on it.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#4a96d8",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
        {error.digest && (
          <div
            style={{
              marginTop: 24,
              fontSize: 11,
              color: "#64748b",
              fontFamily: "monospace",
            }}
          >
            Error ID: {error.digest}
          </div>
        )}
      </body>
    </html>
  );
}
