import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import EntryInput from "../components/EntryInput";
import TaskList from "../components/TaskList";
import MeetingList from "../components/MeetingList";
import DecisionList from "../components/DecisionList";
import SetupBanner from "../components/SetupBanner";
import CalendarPicker from "../components/CalendarPicker";
import InlineEdit from "../components/InlineEdit";
import { api } from "../services/api";
import type { DashboardData, SetupStatus, DayWorklog } from "../types";

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 12,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dashboard, health] = await Promise.all([
        api.getDashboard(),
        api.getHealth(),
      ]);
      setData(dashboard);
      setSetup(health);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (setup && !setup.ready) {
      const interval = setInterval(async () => {
        const health = await api.getHealth();
        setSetup(health);
        if (health.ready) clearInterval(interval);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [setup]);

  async function saveToday(updater: (wl: DayWorklog) => DayWorklog) {
    if (!data) return;
    const updated = updater(data.today);
    await api.updateEntries(updated.date, updated);
    loadData();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
        <TopBar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
          <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  const todayTasks = (data?.today.tasks || []).map((t, i) => ({
    ...t,
    date: data?.today.date,
    index: i,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", transition: "background var(--transition-base)" }}>
      <TopBar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 40 }}>
        <main style={{ flex: 1, minWidth: 0 }}>
          {setup && !setup.ready && <SetupBanner status={setup} />}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
              Today
            </h1>
            <CalendarPicker onSelect={(date) => navigate(`/day/${date}`)} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <EntryInput onSubmitted={loadData} />
          </div>

          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Today's Tasks</h2>
            <TaskList
              tasks={todayTasks}
              onToggle={loadData}
              onEditTask={(index, field, value) => {
                saveToday((wl) => {
                  const tasks = [...wl.tasks];
                  tasks[index] = { ...tasks[index], [field]: value };
                  return { ...wl, tasks };
                });
              }}
            />
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Meetings</h2>
            <MeetingList
              meetings={data?.today.meetings || []}
              onEditMeeting={(index, field, value) => {
                saveToday((wl) => {
                  const meetings = [...wl.meetings];
                  meetings[index] = { ...meetings[index], [field]: value };
                  return { ...wl, meetings };
                });
              }}
              onEditMeetingNote={(mIdx, nIdx, value) => {
                saveToday((wl) => {
                  const meetings = [...wl.meetings];
                  const notes = [...(meetings[mIdx].notes || [])];
                  notes[nIdx] = value;
                  meetings[mIdx] = { ...meetings[mIdx], notes };
                  return { ...wl, meetings };
                });
              }}
            />
          </section>

          {(data?.today.notes?.length ?? 0) > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={sectionTitle}>Notes</h2>
              <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
                {data!.today.notes.map((n, i) => (
                  <div key={i} style={{ margin: i > 0 ? "6px 0 0" : 0 }}>
                    <InlineEdit
                      value={n}
                      onSave={(v) => {
                        saveToday((wl) => {
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
            </section>
          )}
        </main>

        <aside style={{ width: 300, flexShrink: 0 }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Recent Highlights</h2>
            <DecisionList
              decisions={data?.recentHighlights || []}
              showDate
              emptyText="No starred worklogs"
            />
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Overdue Items</h2>
            <TaskList tasks={(data?.overdueTasks || []).map((t) => ({ ...t }))} showDate />
          </section>

          {setup?.tokenUsage && (
            <section>
              <h2 style={sectionTitle}>AI Usage</h2>
              <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 14 }}>
                {[
                  { label: "Total requests", value: setup.tokenUsage.totalRequests },
                  { label: "Text processing", value: setup.tokenUsage.textProcessing },
                  { label: "Image processing", value: setup.tokenUsage.imageProcessing },
                  { label: "Embeddings", value: setup.tokenUsage.embeddings },
                  { label: "Est. tokens", value: setup.tokenUsage.estimatedTokens.toLocaleString() },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8, marginBottom: 0 }}>
                  Resets daily. Since {setup.tokenUsage.lastReset}.
                </p>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
