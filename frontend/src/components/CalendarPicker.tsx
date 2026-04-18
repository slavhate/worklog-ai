import { useState, useRef, useEffect } from "react";

interface CalendarPickerProps {
  onSelect: (date: string) => void;
  selectedDate?: string;
  label?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayISO() {
  const d = new Date();
  return formatISO(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarPicker({ onSelect, selectedDate, label }: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = todayISO();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-sans)",
          padding: "6px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
          background: "var(--color-card-bg)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          transition: "border-color var(--transition-fast), background var(--transition-fast)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = "var(--color-border)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" />
          <line x1="5.5" y1="1.5" x2="5.5" y2="4" />
          <line x1="10.5" y1="1.5" x2="10.5" y2="4" />
        </svg>
        {label || "View another day"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 100,
            width: 280,
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: 16,
            animation: "calendarFadeIn 0.15s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={prev} style={navBtn}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 2 4 6 8 10" />
              </svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{monthLabel}</span>
            <button onClick={next} style={navBtn}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 2 8 6 4 10" />
              </svg>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
            {DAYS.map((d) => (
              <div key={d} style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", padding: "4px 0" }}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const iso = formatISO(viewYear, viewMonth, day);
              const isToday = iso === today;
              const isSelected = selectedDate ? iso === selectedDate : false;
              const highlighted = isSelected || isToday;
              return (
                <button
                  key={day}
                  onClick={() => { onSelect(iso); setOpen(false); }}
                  style={{
                    width: 34,
                    height: 34,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: highlighted ? 600 : 400,
                    fontFamily: "var(--font-sans)",
                    color: highlighted ? "#fff" : "var(--color-text-primary)",
                    background: isSelected ? "var(--color-accent)" : isToday ? "var(--color-accent-hover)" : "transparent",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => { if (!highlighted) e.currentTarget.style.background = "var(--color-surface-hover)"; }}
                  onMouseLeave={(e) => { if (!highlighted) e.currentTarget.style.background = isSelected ? "var(--color-accent)" : isToday ? "var(--color-accent-hover)" : "transparent"; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes calendarFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
};
