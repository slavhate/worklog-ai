import { Link } from "react-router-dom";
import type { SearchResult as SearchResultType } from "../types";

interface SearchResultProps {
  result: SearchResultType;
}

const typeStyles: Record<string, { bg: string; color: string }> = {
  task: { bg: "var(--color-accent-light)", color: "var(--color-accent)" },
  decision: { bg: "var(--color-purple-bg)", color: "var(--color-purple)" },
  meeting: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
  note: { bg: "var(--color-badge-bg)", color: "var(--color-text-secondary)" },
};

export default function SearchResult({ result }: SearchResultProps) {
  const style = typeStyles[result.type] || typeStyles.note;

  return (
    <Link
      to={`/day/${result.date}`}
      style={{
        display: "block",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 18px",
        textDecoration: "none",
        transition: "border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-strong)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 20,
            background: style.bg,
            color: style.color,
            textTransform: "capitalize",
          }}
        >
          {result.type}
        </span>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{result.date}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>
          {Math.round(result.score * 100)}% match
        </span>
      </div>
      <p style={{ fontSize: 14, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.5 }}>
        {result.text}
      </p>
      {result.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {result.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 20,
                background: "var(--color-badge-bg)",
                color: "var(--color-text-tertiary)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
