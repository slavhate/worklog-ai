import InlineEdit from "./InlineEdit";

interface DecisionListProps {
  decisions: { text: string; date?: string }[];
  showDate?: boolean;
  onEditDecision?: (index: number, value: string) => void;
  emptyText?: string;
}

export default function DecisionList({ decisions, showDate, onEditDecision, emptyText }: DecisionListProps) {
  if (decisions.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", padding: "12px 0" }}>
        {emptyText || "None"}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {decisions.map((d, i) => (
        <div
          key={i}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            transition: "background var(--transition-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-purple)",
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              {onEditDecision ? (
                <InlineEdit
                  value={d.text}
                  onSave={(v) => onEditDecision(i, v)}
                  style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                  inputStyle={{ fontSize: 13 }}
                />
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.5 }}>
                  {d.text}
                </p>
              )}
              {showDate && d.date && (
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                  {d.date}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
