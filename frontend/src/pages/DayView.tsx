import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import TaskList from "../components/TaskList";
import MeetingList from "../components/MeetingList";
import InlineEdit from "../components/InlineEdit";
import { api } from "../services/api";
import type { DayWorklog } from "../types";

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 12,
};

export default function DayView() {
  const { date } = useParams<{ date: string }>();
  const [worklog, setWorklog] = useState<DayWorklog | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorklog = useCallback(async () => {
    if (!date) return;
    try {
      const data = await api.getEntries(date);
      setWorklog(data);
    } catch (err) {
      console.error("Failed to load worklog:", err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadWorklog();
  }, [loadWorklog]);

  async function saveWorklog(updater: (wl: DayWorklog) => DayWorklog) {
    if (!worklog || !date) return;
    const updated = updater(worklog);
    await api.updateEntries(date, updated);
    loadWorklog();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <TopBar />
        <p style={{ textAlign: "center", padding: 60, fontSize: 15, color: "var(--color-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!worklog) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <TopBar />
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>No worklog found for {date}</p>
          <Link to="/" style={{ display: "inline-block", marginTop: 16, fontSize: 14, fontWeight: 500, color: "var(--color-accent)", textDecoration: "none" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tasks = worklog.tasks.map((t, i) => ({ ...t, date: worklog.date, index: i }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", transition: "background var(--transition-base)" }}>
      <TopBar />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--color-accent)", textDecoration: "none", marginBottom: 8, transition: "opacity var(--transition-fast)" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="10 3 5 8 10 13" />
            </svg>
            Dashboard
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
            {worklog.date}
          </h1>
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>Tasks</h2>
          <TaskList
            tasks={tasks}
            onToggle={loadWorklog}
            onEditTask={(index, field, value) => {
              saveWorklog((wl) => {
                const t = [...wl.tasks];
                t[index] = { ...t[index], [field]: value };
                return { ...wl, tasks: t };
              });
            }}
          />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>Decisions</h2>
          {worklog.decisions.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", padding: "12px 0" }}>None</p>
          ) : (
            <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {worklog.decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: i < worklog.decisions.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-purple)", marginTop: 7, flexShrink: 0 }} />
                  <InlineEdit
                    value={d}
                    onSave={(v) => {
                      saveWorklog((wl) => {
                        const decisions = [...wl.decisions];
                        decisions[i] = v;
                        return { ...wl, decisions };
                      });
                    }}
                    style={{ flex: 1, fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>Meetings</h2>
          <MeetingList
            meetings={worklog.meetings}
            onEditMeeting={(index, field, value) => {
              saveWorklog((wl) => {
                const meetings = [...wl.meetings];
                meetings[index] = { ...meetings[index], [field]: value };
                return { ...wl, meetings };
              });
            }}
            onEditMeetingNote={(mIdx, nIdx, value) => {
              saveWorklog((wl) => {
                const meetings = [...wl.meetings];
                const notes = [...(meetings[mIdx].notes || [])];
                notes[nIdx] = value;
                meetings[mIdx] = { ...meetings[mIdx], notes };
                return { ...wl, meetings };
              });
            }}
          />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={sectionTitle}>Notes</h2>
          {worklog.notes.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", padding: "12px 0" }}>None</p>
          ) : (
            <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
              {worklog.notes.map((n, i) => (
                <div key={i} style={{ margin: i > 0 ? "6px 0 0" : 0 }}>
                  <InlineEdit
                    value={n}
                    onSave={(v) => {
                      saveWorklog((wl) => {
                        const notes = [...wl.notes];
                        notes[i] = v;
                        return { ...wl, notes };
                      });
                    }}
                    style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {worklog.highlights && worklog.highlights.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Highlights</h2>
            <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {worklog.highlights.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: i < worklog.highlights.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-warning, #e8a317)" stroke="var(--color-warning, #e8a317)" strokeWidth="1" style={{ marginTop: 3, flexShrink: 0 }}>
                    <polygon points="8 1 10.2 5.4 15 6.1 11.5 9.5 12.4 14.3 8 12 3.6 14.3 4.5 9.5 1 6.1 5.8 5.4" />
                  </svg>
                  <InlineEdit
                    value={h}
                    onSave={(v) => {
                      saveWorklog((wl) => {
                        const highlights = [...wl.highlights];
                        highlights[i] = v;
                        return { ...wl, highlights };
                      });
                    }}
                    style={{ flex: 1, fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {worklog.tags.length > 0 && (
          <section>
            <h2 style={sectionTitle}>Tags</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {worklog.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, background: "var(--color-badge-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
