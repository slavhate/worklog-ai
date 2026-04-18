import InlineEdit from "./InlineEdit";
import type { MeetingEntry } from "../types";

interface MeetingListProps {
  meetings: MeetingEntry[];
  onEditMeeting?: (index: number, field: keyof MeetingEntry, value: unknown) => void;
  onEditMeetingNote?: (meetingIndex: number, noteIndex: number, value: string) => void;
}

export default function MeetingList({ meetings, onEditMeeting, onEditMeetingNote }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", padding: "12px 0" }}>
        No meetings
      </p>
    );
  }

  return (
    <div
      style={{
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {meetings.map((m, i) => (
        <div
          key={i}
          style={{
            padding: "10px 16px",
            borderBottom: i < meetings.length - 1 ? "1px solid var(--color-border)" : "none",
            transition: "background var(--transition-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {onEditMeeting ? (
              <InlineEdit
                value={m.time}
                onSave={(v) => onEditMeeting(i, "time", v)}
                type="time"
                style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", width: 48, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                inputStyle={{ fontSize: 12, width: 80 }}
              />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", minWidth: 48, fontVariantNumeric: "tabular-nums" }}>
                {m.time}
              </span>
            )}
            {onEditMeeting ? (
              <InlineEdit
                value={m.text}
                onSave={(v) => onEditMeeting(i, "text", v)}
                style={{ flex: 1, fontSize: 14, color: "var(--color-text-primary)" }}
              />
            ) : (
              <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{m.text}</span>
            )}
          </div>
          {/* Attendees */}
          <div style={{ marginLeft: 62, marginTop: 4 }}>
            {onEditMeeting ? (
              <InlineEdit
                value={(m.attendees || []).join(", ")}
                onSave={(v) => onEditMeeting(i, "attendees", v.split(",").map((a) => a.trim()).filter(Boolean))}
                style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                inputStyle={{ fontSize: 12 }}
                placeholder="Add attendees"
              />
            ) : m.attendees && m.attendees.length > 0 ? (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {m.attendees.join(", ")}
              </span>
            ) : null}
          </div>
          {/* Notes */}
          {((m.notes && m.notes.length > 0) || onEditMeetingNote) && (
            <div style={{ marginLeft: 62, marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              {(m.notes || []).map((note, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-text-muted)", marginTop: 7, flexShrink: 0 }} />
                  {onEditMeetingNote ? (
                    <InlineEdit
                      value={note}
                      onSave={(v) => onEditMeetingNote(i, j, v)}
                      style={{ flex: 1, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}
                      inputStyle={{ fontSize: 13 }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{note}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
