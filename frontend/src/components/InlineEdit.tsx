import { useState, useRef, useEffect } from "react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  type?: "text" | "time";
}

export default function InlineEdit({ value, onSave, style, inputStyle, placeholder, type = "text" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        style={{
          fontSize: 14,
          fontFamily: "var(--font-sans)",
          padding: "4px 8px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-accent)",
          background: "var(--color-card-bg)",
          color: "var(--color-text-primary)",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", width: "100%", ...style }}
      onClick={() => setEditing(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Click to edit"
    >
      <span style={{ flex: 1 }}>{value || <span style={{ color: "var(--color-text-muted)" }}>{placeholder}</span>}</span>
      <svg
        width="12" height="12" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: "var(--color-text-muted)", opacity: hovered ? 0.7 : 0, transition: "opacity 0.15s", flexShrink: 0 }}
      >
        <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
      </svg>
    </span>
  );
}
