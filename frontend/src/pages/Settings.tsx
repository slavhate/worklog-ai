import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { api } from "../services/api";
import type { AppConfig } from "../types";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
  boxSizing: "border-box" as const,
};

function focusHandler(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "var(--color-accent)";
  e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-input-focus)";
}

function blurHandler(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "var(--color-input-border)";
  e.currentTarget.style.boxShadow = "none";
}

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getSettings().then(setConfig).catch(console.error);
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      await api.updateSettings(config);
      setMessage("Settings saved successfully");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage("");
    try {
      const health = await api.getHealth();
      setMessage(health.ready ? "Connection successful — all models ready" : "Connected, but models are still loading");
    } catch {
      setMessage("Connection failed");
    } finally {
      setTesting(false);
    }
  }

  if (!config) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <TopBar />
        <p style={{ textAlign: "center", padding: 60, fontSize: 15, color: "var(--color-text-muted)" }}>
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", transition: "background var(--transition-base)" }}>
      <TopBar />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: 32,
          }}
        >
          Settings
        </h1>

        <div
          style={{
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Data Storage Path</label>
              <input
                type="text"
                value={config.dataPath}
                onChange={(e) => setConfig({ ...config, dataPath: e.target.value })}
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            <div>
              <label style={labelStyle}>AI Provider</label>
              <select
                value={config.aiProvider}
                onChange={(e) => setConfig({ ...config, aiProvider: e.target.value as AppConfig["aiProvider"] })}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2386868b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  paddingRight: 40,
                }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Ollama URL</label>
              <input
                type="text"
                value={config.ollamaUrl}
                onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            {config.aiProvider === "openai" && (
              <div>
                <label style={labelStyle}>OpenAI API Key</label>
                <input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                  placeholder="sk-..."
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            )}

            {config.aiProvider === "claude" && (
              <div>
                <label style={labelStyle}>Claude API Key</label>
                <input
                  type="password"
                  value={config.claudeApiKey}
                  onChange={(e) => setConfig({ ...config, claudeApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                color: "#fff",
                background: "var(--color-accent)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "background var(--transition-fast), opacity var(--transition-fast)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                color: "var(--color-text-secondary)",
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                cursor: testing ? "wait" : "pointer",
                opacity: testing ? 0.6 : 1,
                transition: "background var(--transition-fast), color var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-bg-tertiary)";
                e.currentTarget.style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-bg-secondary)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>

          {message && (
            <p
              style={{
                marginTop: 14,
                fontSize: 13,
                fontWeight: 500,
                color: message.includes("fail") || message.includes("Failed")
                  ? "var(--color-danger)"
                  : "var(--color-success)",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
