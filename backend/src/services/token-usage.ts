import fs from "fs";
import path from "path";

export interface TokenUsage {
  totalRequests: number;
  textProcessing: number;
  imageProcessing: number;
  embeddings: number;
  estimatedTokens: number;
  lastReset: string;
}

let storagePath = "";

const usage: TokenUsage = {
  totalRequests: 0,
  textProcessing: 0,
  imageProcessing: 0,
  embeddings: 0,
  estimatedTokens: 0,
  lastReset: todayStr(),
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load() {
  if (!storagePath) return;
  try {
    const data = JSON.parse(fs.readFileSync(storagePath, "utf-8"));
    usage.totalRequests = data.totalRequests ?? 0;
    usage.textProcessing = data.textProcessing ?? 0;
    usage.imageProcessing = data.imageProcessing ?? 0;
    usage.embeddings = data.embeddings ?? 0;
    usage.estimatedTokens = data.estimatedTokens ?? 0;
    usage.lastReset = data.lastReset ?? todayStr();
  } catch {}
}

function save() {
  if (!storagePath) return;
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(usage, null, 2));
  } catch {}
}

function resetIfNewDay() {
  const today = todayStr();
  if (today !== usage.lastReset) {
    usage.totalRequests = 0;
    usage.textProcessing = 0;
    usage.imageProcessing = 0;
    usage.embeddings = 0;
    usage.estimatedTokens = 0;
    usage.lastReset = today;
    save();
  }
}

export function initTokenUsage(dataDir: string) {
  storagePath = path.join(dataDir, ".token-usage.json");
  load();
  resetIfNewDay();
  save();
}

export function trackUsage(type: "text" | "image" | "embedding", inputLength: number) {
  resetIfNewDay();
  usage.totalRequests++;
  const estimatedTokens = Math.ceil(inputLength / 4);
  usage.estimatedTokens += estimatedTokens;
  switch (type) {
    case "text": usage.textProcessing++; break;
    case "image": usage.imageProcessing++; break;
    case "embedding": usage.embeddings++; break;
  }
  save();
}

export function getTokenUsage(): TokenUsage {
  resetIfNewDay();
  return { ...usage };
}
