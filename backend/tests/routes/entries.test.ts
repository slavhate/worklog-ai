import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createEntriesRouter } from "../../src/routes/entries.js";
import { AIProvider, StructuredEntry } from "../../src/types/index.js";
import { SearchService } from "../../src/services/search.js";

const mockEntry: StructuredEntry = {
  tasks: [{ text: "Test task", completed: false }],
  decisions: ["Test decision"],
  meetings: [{ time: "10:00", text: "Standup" }],
  notes: ["Test note"],
  tags: ["#test"],
};

const mockProvider: AIProvider = {
  processText: vi.fn().mockResolvedValue(mockEntry),
  processImage: vi.fn().mockResolvedValue("extracted text"),
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
};

const mockSearch = {
  indexEntry: vi.fn().mockResolvedValue(undefined),
  search: vi.fn().mockResolvedValue([]),
} as unknown as SearchService;

describe("entries routes", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-routes-"));
    app = express();
    app.use(express.json());
    app.use("/api", createEntriesRouter(tmpDir, () => mockProvider, () => mockSearch));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("POST /api/entries processes text and saves", async () => {
    const res = await request(app)
      .post("/api/entries")
      .field("text", "Had a meeting at 10am")
      .expect(200);

    expect(res.body.entry).toBeDefined();
    expect(mockProvider.processText).toHaveBeenCalled();
  });

  it("POST /api/entries returns 400 with no input", async () => {
    await request(app)
      .post("/api/entries")
      .expect(400);
  });

  it("GET /api/entries/:date returns worklog", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] Test\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    const res = await request(app)
      .get("/api/entries/2026-04-18")
      .expect(200);

    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].text).toBe("Test");
  });
});
