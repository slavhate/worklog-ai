import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createSettingsRouter } from "../../src/routes/settings.js";

describe("settings routes", () => {
  let tmpDir: string;
  let configPath: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-settings-"));
    configPath = path.join(tmpDir, "config.json");
    await fs.writeFile(configPath, JSON.stringify({
      dataPath: "./data",
      aiProvider: "ollama",
      ollamaUrl: "http://ollama:11434",
      openaiApiKey: "sk-real-key-12345",
      claudeApiKey: "",
      chromaUrl: "http://chromadb:8000",
    }));
    app = express();
    app.use(express.json());
    app.use("/api", createSettingsRouter(configPath, () => {}));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/settings masks API keys", async () => {
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.openaiApiKey).toBe("••••2345");
    expect(res.body.claudeApiKey).toBe("");
    expect(res.body.aiProvider).toBe("ollama");
  });

  it("PUT /api/settings updates config", async () => {
    await request(app)
      .put("/api/settings")
      .send({ aiProvider: "openai" })
      .expect(200);

    const raw = JSON.parse(await fs.readFile(configPath, "utf-8"));
    expect(raw.aiProvider).toBe("openai");
    expect(raw.openaiApiKey).toBe("sk-real-key-12345");
  });

  it("PUT /api/settings does not overwrite masked keys", async () => {
    await request(app)
      .put("/api/settings")
      .send({ openaiApiKey: "••••2345" })
      .expect(200);

    const raw = JSON.parse(await fs.readFile(configPath, "utf-8"));
    expect(raw.openaiApiKey).toBe("sk-real-key-12345");
  });
});
