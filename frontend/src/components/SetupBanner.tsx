import type { SetupStatus } from "../types";

interface SetupBannerProps {
  status: SetupStatus;
}

export default function SetupBanner({ status }: SetupBannerProps) {
  if (status.ready) return null;

  const isError = !!status.error;

  return (
    <div
      style={{
        background: isError ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
        border: `1px solid ${isError ? "var(--color-danger)" : "var(--color-warning)"}`,
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        marginBottom: 20,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isError ? "var(--color-danger)" : "var(--color-warning)",
          margin: "0 0 10px",
        }}
      >
        {isError ? "Cannot connect to Ollama" : "Setting up AI models..."}
      </h3>
      {isError ? (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          Make sure Ollama is running and accessible from the backend container.
          The app will automatically retry the connection.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {status.models.map((m) => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: m.ready
                      ? "var(--color-success)"
                      : m.pulling
                        ? "var(--color-warning)"
                        : "var(--color-bg-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {m.ready ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  ) : m.pulling ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 2 6 10" />
                      <polyline points="3 7 6 10 9 7" />
                    </svg>
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-muted)" }} />
                  )}
                </div>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{m.name}</span>
                {m.pulling && (
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>downloading...</span>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "12px 0 0" }}>
            This only happens on first launch. Models persist across restarts.
          </p>
        </>
      )}
    </div>
  );
}
