import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import CalendarPicker from "./CalendarPicker";
import type { StructuredEntry } from "../types";

interface EntryInputProps {
  onSubmitted: () => void;
  defaultDate?: string;
}

interface SuccessInfo {
  tasks: number;
  meetings: number;
  decisions: number;
  notes: number;
  tags: number;
  date: string;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EntryInput({ onSubmitted, defaultDate }: EntryInputProps) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(defaultDate || todayStr());
  const [files, setFiles] = useState<File[]>([]);
  const [highlight, setHighlight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 6000);
    return () => clearTimeout(t);
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const result = await api.submitEntry(text, files, date !== todayStr() ? date : undefined, highlight || undefined);
      const entry = result.entry as StructuredEntry;
      setSuccess({
        tasks: entry.tasks?.length || 0,
        meetings: entry.meetings?.length || 0,
        decisions: entry.decisions?.length || 0,
        notes: entry.notes?.length || 0,
        tags: entry.tags?.length || 0,
        date: result.date,
      });
      setText("");
      setFiles([]);
      setHighlight(false);
      if (fileRef.current) fileRef.current.value = "";
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--color-card-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: 24,
    boxShadow: "var(--shadow-sm)",
    transition: "box-shadow var(--transition-base), border-color var(--transition-base)",
    position: "relative",
  };

  function buildSummary(s: SuccessInfo): string {
    const parts: string[] = [];
    if (s.tasks > 0) parts.push(`${s.tasks} task${s.tasks > 1 ? "s" : ""}`);
    if (s.meetings > 0) parts.push(`${s.meetings} meeting${s.meetings > 1 ? "s" : ""}`);
    if (s.decisions > 0) parts.push(`${s.decisions} decision${s.decisions > 1 ? "s" : ""}`);
    if (s.notes > 0) parts.push(`${s.notes} note${s.notes > 1 ? "s" : ""}`);
    if (parts.length === 0) return "Entry processed.";
    const dateLabel = s.date === todayStr() ? "today" : s.date;
    return `Added ${parts.join(", ")} to ${dateLabel}.`;
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      {loading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--color-border)",
          overflow: "hidden",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}>
          <div style={{
            width: "40%",
            height: "100%",
            background: "var(--color-accent)",
            borderRadius: 2,
            animation: "processingSlide 1.2s ease-in-out infinite",
          }} />
        </div>
      )}

      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }}
      >
        What did you work on?
      </label>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSuccess(null); }}
        onPaste={(e) => {
          const items = e.clipboardData.items;
          const images: File[] = [];
          let hasText = false;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (file) images.push(file);
            } else if (items[i].type === "text/plain") {
              hasText = true;
            }
          }
          if (images.length > 0) {
            if (!hasText) e.preventDefault();
            setFiles((prev) => [...prev, ...images]);
          }
        }}
        placeholder="Had a standup at 10am, discussed sprint priorities... (paste screenshots here)"
        rows={3}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: 14,
          fontFamily: "inherit",
          lineHeight: 1.6,
          background: "var(--color-input-bg)",
          border: "1px solid var(--color-input-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
          resize: "none",
          outline: "none",
          transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
          boxSizing: "border-box",
          opacity: loading ? 0.6 : 1,
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

      {loading && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          padding: "8px 12px",
          background: "var(--color-bg-secondary)",
          borderRadius: "var(--radius-sm)",
          animation: "fadeIn 0.2s ease-out",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6" stroke="var(--color-border-strong)" strokeWidth="2" />
            <path d="M14 8a6 6 0 0 0-6-6" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {files.length > 0 ? "Processing text and images with AI..." : "Processing with AI..."}
          </span>
        </div>
      )}

      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      {success && !loading && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          padding: "8px 12px",
          background: "var(--color-success-bg, rgba(52, 199, 89, 0.08))",
          borderRadius: "var(--radius-sm)",
          animation: "fadeIn 0.25s ease-out",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" fill="var(--color-success)" />
            <polyline points="5 8 7 10 11 6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 13, color: "var(--color-success)", fontWeight: 500 }}>
            {buildSummary(success)}
          </span>
          {success.tags > 0 && (
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginLeft: 4 }}>
              ({success.tags} tag{success.tags > 1 ? "s" : ""})
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setHighlight((h) => !h)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              color: highlight ? "var(--color-warning, #e8a317)" : "var(--color-text-secondary)",
              background: highlight ? "var(--color-warning-bg, rgba(232, 163, 23, 0.1))" : "var(--color-bg-secondary)",
              border: highlight ? "1px solid var(--color-warning, #e8a317)" : "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill={highlight ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="8 1 10.2 5.4 15 6.1 11.5 9.5 12.4 14.3 8 12 3.6 14.3 4.5 9.5 1 6.1 5.8 5.4" />
            </svg>
            Highlight
          </button>
          <CalendarPicker
            selectedDate={date}
            label={date === todayStr() ? "Today" : date}
            onSelect={(d) => setDate(d)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            style={{ display: "none" }}
            id="screenshot-upload"
          />
          <label
            htmlFor="screenshot-upload"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
              <polyline points="8 2 8 10" />
              <polyline points="5 5 8 2 11 5" />
            </svg>
            Screenshot
          </label>
          {files.length > 0 && (
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-accent)",
              background: "var(--color-input-focus, rgba(0, 122, 255, 0.08))",
              padding: "3px 10px",
              borderRadius: 12,
            }}>
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || (!text.trim() && files.length === 0)}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            color: "#fff",
            background: loading ? "var(--color-text-tertiary)" : "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: loading ? "wait" : "pointer",
            opacity: !text.trim() && files.length === 0 ? 0.4 : 1,
            transition: "background var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = "var(--color-accent-hover)";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = "var(--color-accent)";
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </div>

      <style>{`
        @keyframes processingSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
}
