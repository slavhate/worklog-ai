import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  parseWorklog,
  appendEntries,
  toggleTask,
  getAllPendingTasks,
  formatDate,
} from "../../src/services/markdown.js";
import { StructuredEntry } from "../../src/types/index.js";

describe("markdown service", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-md-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("formatDate", () => {
    it("formats a date as YYYY-MM-DD", () => {
      expect(formatDate(new Date(2026, 3, 18))).toBe("2026-04-18");
    });
  });

  describe("parseWorklog", () => {
    it("returns empty worklog for nonexistent file", async () => {
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.date).toBe("2026-04-18");
      expect(wl.tasks).toEqual([]);
      expect(wl.decisions).toEqual([]);
      expect(wl.meetings).toEqual([]);
      expect(wl.notes).toEqual([]);
      expect(wl.tags).toEqual([]);
    });

    it("parses a full worklog file", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Review PR
- [ ] Update docs (due: 2026-04-21)

## Decisions
- Push migration to Q3

## Meetings
- 10:00 Standup — sprint priorities

## Notes
- Check Grafana dashboard

## Tags
#project-alpha #migration
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks).toEqual([
        { text: "Review PR", completed: true },
        { text: "Update docs", completed: false, due: "2026-04-21" },
      ]);
      expect(wl.decisions).toEqual(["Push migration to Q3"]);
      expect(wl.meetings).toEqual([
        { time: "10:00", text: "Standup — sprint priorities" },
      ]);
      expect(wl.notes).toEqual(["Check Grafana dashboard"]);
      expect(wl.tags).toEqual(["#project-alpha", "#migration"]);
    });
  });

  describe("appendEntries", () => {
    it("creates a new file when none exists", async () => {
      const entry: StructuredEntry = {
        tasks: [{ text: "Write tests", completed: false }],
        decisions: ["Use Vitest"],
        meetings: [{ time: "09:00", text: "Planning" }],
        notes: ["Remember to update CI"],
        tags: ["#testing"],
      };
      await appendEntries(tmpDir, "2026-04-18", entry);
      const content = await fs.readFile(path.join(tmpDir, "2026-04-18.md"), "utf-8");
      expect(content).toContain("# Worklog - 2026-04-18");
      expect(content).toContain("- [ ] Write tests");
      expect(content).toContain("- Use Vitest");
      expect(content).toContain("- 09:00 Planning");
      expect(content).toContain("- Remember to update CI");
      expect(content).toContain("#testing");
    });

    it("appends to an existing file", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Existing task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      const entry: StructuredEntry = {
        tasks: [{ text: "New task", completed: false }],
        decisions: [],
        meetings: [],
        notes: [],
        tags: [],
      };
      await appendEntries(tmpDir, "2026-04-18", entry);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks).toHaveLength(2);
      expect(wl.tasks[0].text).toBe("Existing task");
      expect(wl.tasks[1].text).toBe("New task");
    });
  });

  describe("toggleTask", () => {
    it("toggles a task from incomplete to complete", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [ ] First task
- [ ] Second task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      await toggleTask(tmpDir, "2026-04-18", 1);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks[0].completed).toBe(false);
      expect(wl.tasks[1].completed).toBe(true);
    });

    it("toggles a task from complete to incomplete", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Done task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      await toggleTask(tmpDir, "2026-04-18", 0);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks[0].completed).toBe(false);
    });
  });

  describe("getAllPendingTasks", () => {
    it("returns pending tasks across multiple days", async () => {
      const md1 = `# Worklog - 2026-04-17

## Tasks
- [ ] Overdue task (due: 2026-04-16)
- [x] Done task

## Decisions

## Meetings

## Notes

## Tags
`;
      const md2 = `# Worklog - 2026-04-18

## Tasks
- [ ] Today task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-17.md"), md1);
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md2);

      const pending = await getAllPendingTasks(tmpDir);
      expect(pending).toHaveLength(2);
      expect(pending[0].text).toBe("Overdue task");
      expect(pending[0].date).toBe("2026-04-17");
      expect(pending[1].text).toBe("Today task");
      expect(pending[1].date).toBe("2026-04-18");
    });
  });
});
