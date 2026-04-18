import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createTasksRouter } from "../../src/routes/tasks.js";

describe("tasks routes", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-tasks-"));
    app = express();
    app.use(express.json());
    app.use("/api", createTasksRouter(tmpDir));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/tasks returns pending tasks", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] Pending task\n- [x] Done task\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    const res = await request(app).get("/api/tasks").expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].text).toBe("Pending task");
  });

  it("PATCH /api/tasks/toggle toggles a task", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] My task\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    await request(app)
      .patch("/api/tasks/toggle")
      .send({ date: "2026-04-18", index: 0 })
      .expect(200);

    const content = await fs.readFile(path.join(tmpDir, "2026-04-18.md"), "utf-8");
    expect(content).toContain("- [x] My task");
  });
});
