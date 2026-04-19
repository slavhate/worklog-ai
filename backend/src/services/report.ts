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
