import { useState } from "react";

const RETAILERS = [
  { key: "westmarine", label: "West Marine", color: "#0066cc" },
  { key: "fisheries", label: "Fisheries Supply", color: "#1a6b3c" },
  { key: "defender", label: "Defender", color: "#8b1a1a" },
  { key: "other", label: "Other", color: "#555" },
];

function ConfidenceDot({ level }) {
  const color = level === "high" ? "#16a34a" : level === "medium" ? "#d97706" : "#9ca3af";
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        marginRight: 4,
        verticalAlign: "middle",
      }}
    />
  );
}

function RetailerCard({ retailerKey, retailerInfo, label }) {
  const hasUrl = retailerInfo?.url;
  const isDirect = retailerInfo?.confidence === "direct";
  const displayLabel = retailerKey === "other" && retailerInfo?.name ? retailerInfo.name : label;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${hasUrl ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 10,
        padding: "11px 13px",
        opacity: hasUrl ? 1 : 0.5,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "0.06em",
          marginBottom: 5,
          textTransform: "uppercase",
        }}
      >
        {displayLabel}
      </div>

      {hasUrl ? (
        <>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 3,
            }}
          >
            {retailerInfo.price || "See site"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.45)",
              marginBottom: 9,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ConfidenceDot level={isDirect ? "high" : "medium"} />
            {isDirect ? "Direct match" : "Search result"}
          </div>
          <a
            href={retailerInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              padding: "7px",
              background: "#1a6fc4",
              color: "#fff",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {isDirect ? `Buy at ${displayLabel}` : `Search ${displayLabel}`}
          </a>
        </>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
            padding: "10px 0",
          }}
        >
          Not available
        </div>
      )}
    </div>
  );
}

function PartResult({ part }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div
          style={{ fontSize: 15, fontWeight: 600, color: "#fff", flex: 1 }}
        >
          {part.partName}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          <ConfidenceDot level={part.confidence} />
          {part.confidence === "high"
            ? "High confidence"
            : part.confidence === "medium"
            ? "Likely match"
            : "Low confidence"}
        </div>
      </div>

      {part.partNumber && (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 10,
          }}
        >
          Part #{part.partNumber}
        </div>
      )}

      {part.notes && (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 7,
            padding: "7px 10px",
            marginBottom: 10,
          }}
        >
          {part.notes}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {RETAILERS.map(({ key, label }) => (
          <RetailerCard
            key={key}
            retailerKey={key}
            retailerInfo={part.retailers?.[key]}
            label={label}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4a9eff",
            display: "inline-block",
            animation: "kp-pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`@keyframes kp-pulse{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
// Props:
//   open: bool
//   onClose: fn
//   vessel: { vessel_name, make, model, year }
//   equipment: { name } | null   (may be null if no equipment linked)
//   task: string                 (maintenance_tasks.task or repairs.description)
//   section: string              (for display fallback)

export default function FindPartsSheet({
  open,
  onClose,
  vessel,
  equipment,
  task,
  section,
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Reset when sheet closes
  const handleClose = () => {
    setLoading(false);
    setResults(null);
    setError(null);
    setSearched(false);
    onClose();
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch("/api/find-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vesselMake: vessel?.make || "",
          vesselModel: vessel?.model || "",
          vesselYear: vessel?.year || "",
          vesselName: vessel?.vessel_name || "",
          equipmentName: equipment?.name || "",
          taskDescription: task,
          section: section || "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data.parts);
      } else {
        setError("Could not find parts. Try searching a retailer directly.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const vesselDisplay = [vessel?.year, vessel?.make, vessel?.model]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 1000,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1001,
          background: "#0f1f3d",
          borderRadius: "18px 18px 0 0",
          maxHeight: "82vh",
          overflowY: "auto",
          paddingBottom: 32,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            margin: "12px auto 16px",
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "0 18px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 3,
            }}
          >
            Find Parts
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            {task}
          </div>
          {(equipment?.name || vesselDisplay) && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginTop: 3,
              }}
            >
              {[equipment?.name, vesselDisplay].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px" }}>
          {!searched && !loading && (
            <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.45)",
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                First Mate will search West Marine, Fisheries Supply, and
                Defender for the exact part for your vessel.
              </div>
              <button
                onClick={handleSearch}
                style={{
                  background: "#1a6fc4",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 28px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Search for parts
              </button>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "28px 0",
                gap: 12,
              }}
            >
              <LoadingDots />
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                Searching for{" "}
                {equipment?.name
                  ? `parts for your ${equipment.name}`
                  : `parts for this task`}
                …
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                  textAlign: "center",
                }}
              >
                Checking West Marine, Fisheries Supply, Defender
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              {error}
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleSearch}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {results && results.length > 0 && (
            <>
              {results.map((part, i) => (
                <PartResult key={i} part={part} />
              ))}
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Powered by First Mate · Verify part number before ordering
              </div>
            </>
          )}

          {results && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              No specific parts found. Try searching a retailer directly.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
