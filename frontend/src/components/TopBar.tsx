import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

export default function TopBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--color-nav-bg)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid var(--color-nav-border)",
        transition: "background var(--transition-base)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/"
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              transition: "opacity var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            WorkLog AI
          </Link>
          <span
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              fontWeight: 400,
            }}
          >
            {today}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search worklogs..."
              style={{
                width: 240,
                padding: "6px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                background: "var(--color-input-bg)",
                border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-primary)",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-input-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </form>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-input-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: 16,
              transition: "background var(--transition-fast), transform var(--transition-fast)",
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-hover)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-input-bg)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
          </button>

          <Link
            to="/settings"
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              color: "var(--color-text-secondary)",
              background: "var(--color-input-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              transition: "background var(--transition-fast), color var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-hover)";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-input-bg)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
