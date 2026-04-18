import fs from "fs/promises";
import path from "path";
import { StructuredEntry, DayWorklog, TaskEntry } from "../types/index.js";

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function filePath(dataDir: string, date: string): string {
  return path.join(dataDir, `${date}.md`);
}

export async function parseWorklog(dataDir: string, date: string): Promise<DayWorklog> {
  const wl: DayWorklog = { date, tasks: [], decisions: [], meetings: [], notes: [], tags: [], highlights: [] };
  let content: string;
  try {
    content = await fs.readFile(filePath(dataDir, date), "utf-8");
  } catch {
    return wl;
  }

  let currentSection = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.slice(3).toLowerCase();
      continue;
    }

    const isIndented = line.startsWith("  ") && trimmed.startsWith("- ");
    if (!trimmed.startsWith("- ") && !trimmed.startsWith("#")) continue;

    switch (currentSection) {
      case "tasks": {
        const completedMatch = trimmed.match(/^- \[x\] (.+)$/);
        const pendingMatch = trimmed.match(/^- \[ \] (.+)$/);
        if (completedMatch) {
          const { text, due, time } = parseTaskText(completedMatch[1]);
          wl.tasks.push({ text, completed: true, ...(due && { due }), ...(time && { time }) });
        } else if (pendingMatch) {
          const { text, due, time } = parseTaskText(pendingMatch[1]);
          wl.tasks.push({ text, completed: false, ...(due && { due }), ...(time && { time }) });
        }
        break;
      }
      case "decisions": {
        if (trimmed.startsWith("- ")) wl.decisions.push(trimmed.slice(2));
        break;
      }
      case "meetings": {
        if (isIndented) {
          const lastMeeting = wl.meetings[wl.meetings.length - 1];
          if (lastMeeting) {
            const subText = trimmed.slice(2);
            if (subText.startsWith("Attendees: ")) {
              lastMeeting.attendees = subText.slice(11).split(",").map((a) => a.trim());
            } else {
              if (!lastMeeting.notes) lastMeeting.notes = [];
              lastMeeting.notes.push(subText);
            }
          }
        } else if (trimmed.startsWith("- ")) {
          const meetingMatch = trimmed.match(/^- (\d{1,2}:\d{2}) (.+)$/);
          if (meetingMatch) {
            wl.meetings.push({ time: meetingMatch[1], text: meetingMatch[2] });
          }
        }
        break;
      }
      case "notes": {
        if (trimmed.startsWith("- ")) wl.notes.push(trimmed.slice(2));
        break;
      }
      case "highlights": {
        if (trimmed.startsWith("- ")) wl.highlights.push(trimmed.slice(2));
        break;
      }
      case "tags": {
        const tagMatches = trimmed.match(/#[\w-]+/g);
        if (tagMatches) wl.tags.push(...tagMatches);
        break;
      }
    }
  }
  return wl;
}

function parseTaskText(raw: string): { text: string; due?: string; time?: string } {
  let remaining = raw;
  let time: string | undefined;
  const timeMatch = remaining.match(/^(\d{1,2}:\d{2}) /);
  if (timeMatch) {
    time = timeMatch[1];
    remaining = remaining.slice(timeMatch[0].length);
  }
  const dueMatch = remaining.match(/\(due: (\d{4}-\d{2}-\d{2})\)/);
  if (dueMatch) {
    remaining = remaining.replace(` (due: ${dueMatch[1]})`, "").trim();
    return { text: remaining, due: dueMatch[1], time };
  }
  return { text: remaining, time };
}

function timeToMinutes(time?: string | null): number {
  if (!time) return Infinity;
  const parts = time.match(/^(\d{1,2}):(\d{2})/);
  if (!parts) return Infinity;
  return parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

export async function appendEntries(dataDir: string, date: string, entry: StructuredEntry): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  const fp = filePath(dataDir, date);
  let existing: DayWorklog;
  try {
    existing = await parseWorklog(dataDir, date);
  } catch {
    existing = { date, tasks: [], decisions: [], meetings: [], notes: [], tags: [], highlights: [] };
  }

  const tasks = [...existing.tasks, ...entry.tasks].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const meetings = [...existing.meetings, ...entry.meetings].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const merged: DayWorklog = {
    date,
    tasks,
    decisions: [...existing.decisions, ...entry.decisions],
    meetings,
    notes: [...existing.notes, ...entry.notes],
    tags: [...new Set([...existing.tags, ...entry.tags])],
    highlights: [...existing.highlights, ...(entry.highlights || [])],
  };

  await fs.writeFile(fp, renderWorklog(merged));
}

export function renderWorklog(wl: DayWorklog): string {
  const lines: string[] = [`# Worklog - ${wl.date}`, ""];

  lines.push("## Tasks");
  for (const t of wl.tasks) {
    const check = t.completed ? "x" : " ";
    const time = t.time ? `${t.time} ` : "";
    const due = t.due ? ` (due: ${t.due})` : "";
    lines.push(`- [${check}] ${time}${t.text}${due}`);
  }
  lines.push("");

  lines.push("## Decisions");
  for (const d of wl.decisions) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## Meetings");
  for (const m of wl.meetings) {
    lines.push(`- ${m.time} ${m.text}`);
    if (m.attendees && m.attendees.length > 0) {
      lines.push(`  - Attendees: ${m.attendees.join(", ")}`);
    }
    if (m.notes && m.notes.length > 0) {
      for (const n of m.notes) lines.push(`  - ${n}`);
    }
  }
  lines.push("");

  lines.push("## Notes");
  for (const n of wl.notes) lines.push(`- ${n}`);
  lines.push("");

  if (wl.highlights && wl.highlights.length > 0) {
    lines.push("## Highlights");
    for (const h of wl.highlights) lines.push(`- ${h}`);
    lines.push("");
  }

  lines.push("## Tags");
  if (wl.tags.length > 0) lines.push(wl.tags.join(" "));
  lines.push("");

  return lines.join("\n");
}

export async function toggleTask(dataDir: string, date: string, index: number): Promise<void> {
  const wl = await parseWorklog(dataDir, date);
  if (index < 0 || index >= wl.tasks.length) {
    throw new Error(`Task index ${index} out of range for ${date}`);
  }
  wl.tasks[index].completed = !wl.tasks[index].completed;
  await fs.writeFile(filePath(dataDir, date), renderWorklog(wl));
}

export interface PendingTask extends TaskEntry {
  date: string;
  index: number;
}

export async function getAllPendingTasks(dataDir: string): Promise<PendingTask[]> {
  let files: string[];
  try {
    files = await fs.readdir(dataDir);
  } catch {
    return [];
  }
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
  const pending: PendingTask[] = [];
  for (const f of mdFiles) {
    const date = f.replace(".md", "");
    const wl = await parseWorklog(dataDir, date);
    wl.tasks.forEach((t, i) => {
      if (!t.completed) {
        pending.push({ ...t, date, index: i });
      }
    });
  }
  return pending;
}
