# Work Summary Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a date-range report feature that aggregates worklogs into a summary with volume stats, highlights, optional AI narrative, and HTML download.

**Architecture:** New backend `/api/report` endpoint aggregates parsed markdown files. New frontend Report page with date pickers, stats bar, breakdown sections, and HTML export. AI summary is on-demand via a separate endpoint that calls the existing provider's new `summarize()` method.

**Tech Stack:** TypeScript, Express, React 19, existing AI providers (Ollama/OpenAI/Claude)

---

## File Structure

### New files
- `backend/src/routes/report.ts` — report API endpoints (GET /api/report, POST /api/report/summary)
- `backend/src/services/report.ts` — report aggregation logic
- `frontend/src/pages/Report.tsx` — report page UI
- `frontend/src/services/report-html.ts` — self-contained HTML report generator

### Modified files
- `backend/src/types/index.ts` — add ReportData type, add `summarize()` to AIProvider
- `backend/src/services/ollama-provider.ts` — add `summarize()` method
- `backend/src/services/openai-provider.ts` — add `summarize()` method
- `backend/src/services/claude-provider.ts` — add `summarize()` method
- `backend/src/index.ts` — register report router
- `frontend/src/types/index.ts` — add ReportData type
- `frontend/src/services/api.ts` — add report API methods
- `frontend/src/App.tsx` — add /report route
- `frontend/src/components/TopBar.tsx` — add Reports link

---

### Task 1: Add ReportData types and summarize() to AIProvider interface

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add ReportData and update AIProvider in backend types**

In `backend/src/types/index.ts`, add after the `AIProvider` interface's `generateEmbedding` method:

```typescript
// Add to AIProvider interface (after generateEmbedding):
  summarize(prompt: string): Promise<string>;
```

Add at the end of the file:

```typescript
export interface ReportStats {
  tasksCompleted: number;
  tasksTotal: number;
  meetingsAttended: number;
  decisionsMade: number;
  notesCount: number;
  daysWithEntries: number;
}

export interface ReportData {
  startDate: string;
  endDate: string;
  stats: ReportStats;
  highlights: { text: string; date: string }[];
  decisions: { text: string; date: string }[];
  meetings: { time: string; text: string; date: string; attendees?: string[] }[];
  pendingTasks: { text: string; date: string; due?: string }[];
  tagFrequency: { tag: string; count: number }[];
}
```

- [ ] **Step 2: Add ReportData type to frontend types**

In `frontend/src/types/index.ts`, add at the end:

```typescript
export interface ReportStats {
  tasksCompleted: number;
  tasksTotal: number;
  meetingsAttended: number;
  decisionsMade: number;
  notesCount: number;
  daysWithEntries: number;
}

export interface ReportData {
  startDate: string;
  endDate: string;
  stats: ReportStats;
  highlights: { text: string; date: string }[];
  decisions: { text: string; date: string }[];
  meetings: { time: string; text: string; date: string; attendees?: string[] }[];
  pendingTasks: { text: string; date: string; due?: string }[];
  tagFrequency: { tag: string; count: number }[];
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/types/index.ts frontend/src/types/index.ts
git commit -m "feat: add ReportData types and summarize() to AIProvider interface"
```

---

### Task 2: Add summarize() to all three AI providers

**Files:**
- Modify: `backend/src/services/ollama-provider.ts`
- Modify: `backend/src/services/openai-provider.ts`
- Modify: `backend/src/services/claude-provider.ts`

- [ ] **Step 1: Add summarize() to OllamaProvider**

Add this method to the `OllamaProvider` class in `backend/src/services/ollama-provider.ts`:

```typescript
  async summarize(prompt: string): Promise<string> {
    trackUsage("text", prompt.length);
    const response = await this.client.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
    });
    return response.message.content;
  }
```

- [ ] **Step 2: Add summarize() to OpenAIProvider**

Add this method to the `OpenAIProvider` class in `backend/src/services/openai-provider.ts`:

```typescript
  async summarize(prompt: string): Promise<string> {
    trackUsage("text", prompt.length);
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content || "";
  }
```

- [ ] **Step 3: Add summarize() to ClaudeProvider**

Add this method to the `ClaudeProvider` class in `backend/src/services/claude-provider.ts`:

```typescript
  async summarize(prompt: string): Promise<string> {
    trackUsage("text", prompt.length);
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.content[0];
    return content.type === "text" ? content.text : "";
  }
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/ollama-provider.ts backend/src/services/openai-provider.ts backend/src/services/claude-provider.ts
git commit -m "feat: add summarize() method to all AI providers"
```

---

### Task 3: Create report aggregation service

**Files:**
- Create: `backend/src/services/report.ts`

- [ ] **Step 1: Create the report service**

Create `backend/src/services/report.ts`:

```typescript
import fs from "fs/promises";
import { parseWorklog } from "./markdown.js";
import type { ReportData } from "../types/index.js";

export async function aggregateReport(dataPath: string, startDate: string, endDate: string): Promise<ReportData> {
  let files: string[];
  try {
    files = (await fs.readdir(dataPath)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    files = [];
  }

  const inRange = files.filter((f) => {
    const date = f.replace(".md", "");
    return date >= startDate && date <= endDate;
  });

  const highlights: ReportData["highlights"] = [];
  const decisions: ReportData["decisions"] = [];
  const meetings: ReportData["meetings"] = [];
  const pendingTasks: ReportData["pendingTasks"] = [];
  const tagCounts = new Map<string, number>();
  let tasksCompleted = 0;
  let tasksTotal = 0;
  let notesCount = 0;

  for (const file of inRange) {
    const date = file.replace(".md", "");
    const wl = await parseWorklog(dataPath, date);

    for (const t of wl.tasks) {
      tasksTotal++;
      if (t.completed) tasksCompleted++;
      else pendingTasks.push({ text: t.text, date, due: t.due });
    }

    for (const d of wl.decisions) decisions.push({ text: d, date });
    for (const m of wl.meetings) meetings.push({ time: m.time, text: m.text, date, attendees: m.attendees });
    for (const h of wl.highlights) highlights.push({ text: h, date });

    notesCount += wl.notes.length;

    for (const tag of wl.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const tagFrequency = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    startDate,
    endDate,
    stats: {
      tasksCompleted,
      tasksTotal,
      meetingsAttended: meetings.length,
      decisionsMade: decisions.length,
      notesCount,
      daysWithEntries: inRange.length,
    },
    highlights,
    decisions,
    meetings,
    pendingTasks,
    tagFrequency,
  };
}

export function buildSummaryPrompt(report: ReportData): string {
  const highlightsList = report.highlights.map((h) => `- ${h.text} (${h.date})`).join("\n") || "None";
  const decisionsList = report.decisions.map((d) => `- ${d.text} (${d.date})`).join("\n") || "None";
  const meetingsList = report.meetings.map((m) => `- ${m.text} (${m.date})`).join("\n") || "None";

  return `Summarize the following work log data for a performance review. Write 2-3 paragraphs covering:
1. Key themes and focus areas during this period
2. Notable accomplishments and decisions
3. Work patterns and collaboration

Data:
- Period: ${report.startDate} to ${report.endDate}
- Tasks completed: ${report.stats.tasksCompleted} of ${report.stats.tasksTotal}
- Meetings attended: ${report.stats.meetingsAttended}
- Decisions made: ${report.stats.decisionsMade}

Highlights:
${highlightsList}

Decisions:
${decisionsList}

Meeting topics:
${meetingsList}

Keep the tone professional and factual. Focus on impact and patterns.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/report.ts
git commit -m "feat: add report aggregation service"
```

---

### Task 4: Create report API routes

**Files:**
- Create: `backend/src/routes/report.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create the report router**

Create `backend/src/routes/report.ts`:

```typescript
import { Router } from "express";
import { aggregateReport, buildSummaryPrompt } from "../services/report.js";
import type { AIProvider } from "../types/index.js";

export function createReportRouter(dataPath: string, getProvider: () => AIProvider) {
  const router = Router();

  router.get("/report", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end || typeof start !== "string" || typeof end !== "string") {
      res.status(400).json({ error: "start and end query parameters are required (YYYY-MM-DD)" });
      return;
    }
    if (start > end) {
      res.status(400).json({ error: "start date must be before or equal to end date" });
      return;
    }
    try {
      const report = await aggregateReport(dataPath, start, end);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  router.post("/report/summary", async (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }
    try {
      const report = await aggregateReport(dataPath, startDate, endDate);
      const prompt = buildSummaryPrompt(report);
      const summary = await getProvider().summarize(prompt);
      res.json({ summary });
    } catch (err) {
      res.status(503).json({ error: "AI summary generation failed" });
    }
  });

  return router;
}
```

- [ ] **Step 2: Register the report router in index.ts**

In `backend/src/index.ts`, add the import at the top with the other route imports:

```typescript
import { createReportRouter } from "./routes/report.js";
```

Add after the settings router registration (the `app.use("/api", createSettingsRouter(...))` block):

```typescript
  app.use("/api", createReportRouter(dataPath, () => provider));
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/report.ts backend/src/index.ts
git commit -m "feat: add report API endpoints"
```

---

### Task 5: Add report API methods to frontend

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add report methods to the api object**

In `frontend/src/services/api.ts`, add these methods before the closing `};` of the `api` object:

```typescript
  getReport(start: string, end: string): Promise<ReportData> {
    return fetchJSON(`/report?start=${start}&end=${end}`);
  },

  generateReportSummary(startDate: string, endDate: string): Promise<{ summary: string }> {
    return fetchJSON("/report/summary", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate }),
    });
  },
```

Add `ReportData` to the import at the top of the file:

```typescript
import type { DayWorklog, DashboardData, SearchResult, AppConfig, SetupStatus, PendingTask, ReportData } from "../types";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add report API methods to frontend"
```

---

### Task 6: Create HTML report generator

**Files:**
- Create: `frontend/src/services/report-html.ts`

- [ ] **Step 1: Create the HTML report generator**

Create `frontend/src/services/report-html.ts`:

```typescript
import type { ReportData } from "../types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateReportHtml(report: ReportData, aiSummary?: string): string {
  const s = report.stats;

  const statsHtml = `
    <div class="stats-bar">
      <div class="stat"><div class="stat-value">${s.tasksCompleted}/${s.tasksTotal}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="stat"><div class="stat-value">${s.meetingsAttended}</div><div class="stat-label">Meetings</div></div>
      <div class="stat"><div class="stat-value">${s.decisionsMade}</div><div class="stat-label">Decisions</div></div>
      <div class="stat"><div class="stat-value">${s.notesCount}</div><div class="stat-label">Notes</div></div>
      <div class="stat"><div class="stat-value">${s.daysWithEntries}</div><div class="stat-label">Active Days</div></div>
    </div>`;

  const highlightsHtml = report.highlights.length > 0
    ? `<section><h2>Highlights</h2><ul>${report.highlights.map((h) => `<li><strong>${escapeHtml(h.date)}</strong> — ${escapeHtml(h.text)}</li>`).join("")}</ul></section>`
    : "";

  const aiSummaryHtml = aiSummary
    ? `<section><h2>AI Summary</h2><div class="ai-summary">${escapeHtml(aiSummary).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</div></section>`
    : "";

  const decisionsHtml = report.decisions.length > 0
    ? `<section><h2>Decisions</h2><ul>${report.decisions.map((d) => `<li><strong>${escapeHtml(d.date)}</strong> — ${escapeHtml(d.text)}</li>`).join("")}</ul></section>`
    : "";

  const meetingsHtml = report.meetings.length > 0
    ? `<section><h2>Meetings</h2><ul>${report.meetings.map((m) => `<li><strong>${escapeHtml(m.date)} ${escapeHtml(m.time)}</strong> — ${escapeHtml(m.text)}${m.attendees && m.attendees.length > 0 ? ` <em>(${m.attendees.map(escapeHtml).join(", ")})</em>` : ""}</li>`).join("")}</ul></section>`
    : "";

  const pendingHtml = report.pendingTasks.length > 0
    ? `<section><h2>Pending Tasks</h2><ul>${report.pendingTasks.map((t) => `<li>${escapeHtml(t.text)}${t.due ? ` <span class="due">(due: ${escapeHtml(t.due)})</span>` : ""} <em class="muted">from ${escapeHtml(t.date)}</em></li>`).join("")}</ul></section>`
    : "";

  const tagsHtml = report.tagFrequency.length > 0
    ? `<section><h2>Top Tags</h2><div class="tags">${report.tagFrequency.slice(0, 15).map((t) => `<span class="tag">${escapeHtml(t.tag)} (${t.count})</span>`).join(" ")}</div></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Work Report — ${report.startDate} to ${report.endDate}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 24px; line-height: 1.6; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
  .stats-bar { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 100px; background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 700; color: #2563eb; }
  .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #444; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; }
  ul { list-style: none; padding: 0; }
  li { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  li:last-child { border-bottom: none; }
  strong { font-weight: 600; }
  em { font-style: normal; color: #888; }
  .due { color: #dc2626; font-weight: 500; }
  .muted { color: #999; font-size: 12px; }
  .ai-summary { background: #f0f7ff; border-left: 3px solid #2563eb; padding: 16px; border-radius: 4px; font-size: 14px; }
  .ai-summary p { margin-bottom: 12px; }
  .ai-summary p:last-child { margin-bottom: 0; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { font-size: 12px; font-weight: 500; padding: 4px 12px; border-radius: 20px; background: #e8e8e8; color: #555; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center; }
  @media print { body { padding: 0; } .stat { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Work Summary Report</h1>
  <p class="subtitle">${report.startDate} to ${report.endDate}</p>
  ${statsHtml}
  ${highlightsHtml}
  ${aiSummaryHtml}
  ${decisionsHtml}
  ${meetingsHtml}
  ${pendingHtml}
  ${tagsHtml}
  <div class="footer">Generated by WorkLog AI</div>
</body>
</html>`;
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/report-html.ts
git commit -m "feat: add HTML report generator for download"
```

---

### Task 7: Create Report page

**Files:**
- Create: `frontend/src/pages/Report.tsx`

- [ ] **Step 1: Create the Report page**

Create `frontend/src/pages/Report.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Report.tsx
git commit -m "feat: add Report page UI"
```

---

### Task 8: Wire Report page into routing and navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/TopBar.tsx`

- [ ] **Step 1: Add /report route to App.tsx**

In `frontend/src/App.tsx`, add the import:

```typescript
import Report from "./pages/Report";
```

Add the route inside `<Routes>`, after the Settings route:

```typescript
      <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
```

- [ ] **Step 2: Add Reports link to TopBar**

In `frontend/src/components/TopBar.tsx`, add a "Reports" link right before the Settings link. Use the same style as the Settings link:

```typescript
          <Link
            to="/report"
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
            Reports
          </Link>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/TopBar.tsx
git commit -m "feat: add Reports to navigation and routing"
```

---

### Task 9: Build and verify

- [ ] **Step 1: Rebuild containers**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && docker compose up --build -d"
```

Expected: Both containers build successfully and start.

- [ ] **Step 2: Test report endpoint**

```bash
wsl bash -c 'curl -s http://localhost:4000/api/auth/status'
```

Then register/login to get a token and test:

```bash
wsl bash -c 'curl -s "http://localhost:4000/api/report?start=2026-04-01&end=2026-04-19" -H "Authorization: Bearer <TOKEN>"'
```

Expected: JSON response with stats, highlights, decisions, meetings, pendingTasks, tagFrequency.

- [ ] **Step 3: Test in browser**

Open http://localhost:3000/report, select a date range, click "Generate Report". Verify stats bar, highlights, breakdown sections render. Click "Download HTML" and verify the downloaded file opens in a browser with correct content.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete work summary report feature"
```

---

## Self-Review

**Spec coverage:**
- ✅ Date range selection → Task 7 (date inputs)
- ✅ Volume stats header → Task 7 (stats bar)
- ✅ Highlights listed separately → Task 7 (highlights section)
- ✅ AI narrative summary on-demand → Tasks 2, 3, 4, 7
- ✅ Download as HTML → Task 6
- ✅ In-browser view → Task 7
- ✅ Decisions grouped by date → Task 7
- ✅ Meetings grouped by date → Task 7
- ✅ Pending tasks → Task 7
- ✅ Tag frequency → Task 7
- ✅ Reports link in TopBar → Task 8
- ✅ AIProvider.summarize() → Tasks 1, 2
- ✅ Report aggregation service → Task 3
- ✅ Error handling (AI failure, empty range) → Tasks 4, 7

**Placeholder scan:** No TBD/TODO found. All code blocks are complete.

**Type consistency:** `ReportData`, `ReportStats` used consistently across backend types, frontend types, services, and components. `summarize(prompt: string): Promise<string>` signature matches across interface and all three implementations.
