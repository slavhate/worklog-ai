import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createDashboardRouter } from "../../src/routes/dashboard.js";
import { formatDate } from "../../src/services/markdown.js";

describe("dashboard route", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-dash-"));
    app = express();
    app.use(express.json());
    app.use("/api", createDashboardRouter(tmpDir));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/dashboard returns today's data", async () => {
    const today = formatDate(new Date());
    const md = `# Worklog - ${today}\n\n## Tasks\n- [ ] Today task\n\n## Decisions\n- A decision\n\n## Meetings\n- 10:00 Standup\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, `${today}.md`), md);

    const res = await request(app).get("/api/dashboard").expect(200);
    expect(res.body.today.tasks).toHaveLength(1);
    expect(res.body.today.decisions).toHaveLength(1);
    expect(res.body.pendingTasks).toHaveLength(1);
  });

  it("GET /api/dashboard works with no data", async () => {
    const res = await request(app).get("/api/dashboard").expect(200);
    expect(res.body.today.tasks).toEqual([]);
    expect(res.body.pendingTasks).toEqual([]);
  });
});
