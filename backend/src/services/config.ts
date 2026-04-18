import fs from "fs/promises";
import { AppConfig } from "../types/index.js";

const DEFAULT_CONFIG: AppConfig = {
  dataPath: "./data",
  aiProvider: "ollama",
  ollamaUrl: "http://ollama:11434",
  openaiApiKey: "",
  claudeApiKey: "",
  chromaUrl: "http://chromadb:8000",
};

export async function readConfig(configPath: string): Promise<AppConfig> {
  let config: AppConfig;
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
  if (process.env.OLLAMA_URL) config.ollamaUrl = process.env.OLLAMA_URL;
  if (process.env.CHROMA_URL) config.chromaUrl = process.env.CHROMA_URL;
  if (process.env.DATA_PATH) config.dataPath = process.env.DATA_PATH;
  return config;
}

export async function writeConfig(configPath: string, config: AppConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
