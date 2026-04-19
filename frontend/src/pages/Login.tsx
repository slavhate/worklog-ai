import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../services/api";

export default function Login() {
  const { login, register, token } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
      return;
    }
    api.authStatus().then((s) => {
      if (!s.hasUsers) setIsRegister(true);
      setCheckingStatus(false);
    }).catch(() => setCheckingStatus(false));
  }, [token, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingStatus) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background var(--transition-base)" }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          style={{
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--color-input-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 16,
            color: "var(--color-text-secondary)",
          }}
        >
          {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
        </button>
      </div>

      <div style={{ width: 380, padding: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 4 }}>
          WorkLog AI
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 32 }}>
          {isRegister ? "Create your account to get started" : "Sign in to your worklog"}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15, fontFamily: "inherit",
                background: "var(--color-input-bg)", border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", outline: "none",
                boxSizing: "border-box",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-input-focus)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-input-border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15, fontFamily: "inherit",
                background: "var(--color-input-bg)", border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", outline: "none",
                boxSizing: "border-box",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-input-focus)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-input-border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "var(--color-danger)", marginBottom: 16, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "10px 0", fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              color: "#fff", background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
              transition: "background var(--transition-fast), opacity var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
          >
            {submitting ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", marginTop: 20 }}>
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{
              background: "none", border: "none", color: "var(--color-accent)",
              cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, padding: 0,
            }}
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}
