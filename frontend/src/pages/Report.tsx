import { useState } from "react";
import TopBar from "../components/TopBar";
import { api } from "../services/api";
import { generateReportHtml, downloadHtml } from "../services/report-html";
import type { ReportData } from "../types";

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: "1px solid var(--color-border)",
};

export default function Report() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setReport(null);
    setAiSummary(null);
    setAiError(null);
    try {
      const data = await api.getReport(startDate, endDate);
      setReport(data);
    } catch (err) {
      console.error("Report failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSummary() {
    if (!report) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { summary } = await api.generateReportSummary(report.startDate, report.endDate);
      setAiSummary(summary);
    } catch {
      setAiError("Failed to generate AI summary. Check your AI provider settings and try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleDownload() {
    if (!report) return;
    const html = generateReportHtml(report, aiSummary || undefined);
    downloadHtml(html, `worklog-report-${report.startDate}-to-${report.endDate}.html`);
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    background: "var(--color-input-bg)",
    border: "1px solid var(--color-input-border)",
    borderRadius: "var(--radius-md)",
    color: "var(--color-text-primary)",
    outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    color: "#fff",
    background: "var(--color-accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
  };

  const btnSecondaryStyle: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "inherit",
    color: "var(--color-text-secondary)",
    background: "var(--color-input-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", transition: "background var(--transition-base)" }}>
      <TopBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: 24 }}>
          Work Summary Report
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          <button onClick={handleGenerate} disabled={loading || startDate > endDate} style={{ ...btnStyle, opacity: loading || startDate > endDate ? 0.6 : 1 }}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {report && (
          <>
            {/* Stats bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { value: `${report.stats.tasksCompleted}/${report.stats.tasksTotal}`, label: "Tasks Completed" },
                { value: report.stats.meetingsAttended, label: "Meetings" },
                { value: report.stats.decisionsMade, label: "Decisions" },
                { value: report.stats.notesCount, label: "Notes" },
                { value: report.stats.daysWithEntries, label: "Active Days" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    background: "var(--color-card-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-accent)", fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              <button onClick={handleAiSummary} disabled={aiLoading} style={{ ...btnSecondaryStyle, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? "Generating..." : aiSummary ? "Regenerate AI Summary" : "Generate AI Summary"}
              </button>
              <button onClick={handleDownload} style={btnSecondaryStyle}>
                Download HTML
              </button>
            </div>

            {/* AI Summary */}
            {aiSummary && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>AI Summary</h2>
                <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16, fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)" }}>
                  {aiSummary.split("\n\n").map((p, i) => (
                    <p key={i} style={{ marginBottom: i < aiSummary.split("\n\n").length - 1 ? 12 : 0 }}>{p}</p>
                  ))}
                </div>
              </section>
            )}
            {aiError && (
              <div style={{ marginBottom: 28, padding: 12, background: "var(--color-danger-bg)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--color-danger)" }}>
                {aiError}
                <button onClick={handleAiSummary} style={{ marginLeft: 12, fontSize: 13, fontWeight: 500, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Retry
                </button>
              </div>
            )}

            {/* Highlights */}
            {report.highlights.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Highlights</h2>
                <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {report.highlights.map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: i < report.highlights.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-warning, #e8a317)" stroke="var(--color-warning, #e8a317)" strokeWidth="1" style={{ marginTop: 3, flexShrink: 0 }}>
                        <polygon points="8 1 10.2 5.4 15 6.1 11.5 9.5 12.4 14.3 8 12 3.6 14.3 4.5 9.5 1 6.1 5.8 5.4" />
                      </svg>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{h.text}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>{h.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Decisions */}
            {report.decisions.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Decisions</h2>
                <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {report.decisions.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: i < report.decisions.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-purple)", marginTop: 7, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{d.text}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>{d.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Meetings */}
            {report.meetings.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Meetings</h2>
                <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {report.meetings.map((m, i) => (
                    <div key={i} style={{ padding: "10px 16px", borderBottom: i < report.meetings.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", fontVariantNumeric: "tabular-nums" }}>{m.time}</span>
                        <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{m.text}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>{m.date}</span>
                      </div>
                      {m.attendees && m.attendees.length > 0 && (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, paddingLeft: 48 }}>{m.attendees.join(", ")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pending tasks */}
            {report.pendingTasks.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Pending Tasks</h2>
                <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {report.pendingTasks.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: i < report.pendingTasks.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--color-border-strong)", flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{t.text}</span>
                        {t.due && <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "var(--color-warning-bg)", color: "var(--color-warning)", marginLeft: 8 }}>{t.due}</span>}
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>{t.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {report.tagFrequency.length > 0 && (
              <section>
                <h2 style={sectionTitle}>Top Tags</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {report.tagFrequency.slice(0, 15).map((t) => (
                    <span key={t.tag} style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, background: "var(--color-badge-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                      {t.tag} ({t.count})
                    </span>
                  ))}
                </div>
              </section>
            )}

            {report.stats.tasksTotal === 0 && report.meetings.length === 0 && report.decisions.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>No worklog entries found in this date range.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
