import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { readConfig, writeConfig } from "../../src/services/config.js";

describe("config service", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-test-"));
    configPath = path.join(tmpDir, "config.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns default config when file does not exist", async () => {
    const config = await readConfig(path.join(tmpDir, "nonexistent.json"));
    expect(config.dataPath).toBe("./data");
    expect(config.aiProvider).toBe("ollama");
    expect(config.ollamaUrl).toBe("http://ollama:11434");
    expect(config.openaiApiKey).toBe("");
    expect(config.claudeApiKey).toBe("");
    expect(config.chromaUrl).toBe("http://chromadb:8000");
  });

  it("reads existing config file", async () => {
    await fs.writeFile(configPath, JSON.stringify({
      dataPath: "/custom/path",
      aiProvider: "openai",
      ollamaUrl: "http://localhost:11434",
      openaiApiKey: "sk-test",
      claudeApiKey: "",
      chromaUrl: "http://localhost:8000"
    }));
    const config = await readConfig(configPath);
    expect(config.dataPath).toBe("/custom/path");
    expect(config.aiProvider).toBe("openai");
    expect(config.openaiApiKey).toBe("sk-test");
  });

  it("writes config and reads it back", async () => {
    const config = {
      dataPath: "/new/path",
      aiProvider: "claude" as const,
      ollamaUrl: "http://ollama:11434",
      openaiApiKey: "",
      claudeApiKey: "sk-ant-test",
      chromaUrl: "http://chromadb:8000"
    };
    await writeConfig(configPath, config);
    const loaded = await readConfig(configPath);
    expect(loaded).toEqual(config);
  });
});
