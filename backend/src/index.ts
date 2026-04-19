import express from "express";
import cors from "cors";
import path from "path";
import { readConfig } from "./services/config.js";
import { createProvider } from "./services/ai-provider.js";
import { SearchService } from "./services/search.js";
import { ensureModels } from "./services/model-setup.js";
import { AIProvider, AppConfig } from "./types/index.js";
import { initTokenUsage } from "./services/token-usage.js";
import { initAuth } from "./services/auth.js";
import { authMiddleware } from "./middleware/auth.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import { createEntriesRouter } from "./routes/entries.js";
import { createTasksRouter } from "./routes/tasks.js";
import { createSearchRouter } from "./routes/search.js";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createSettingsRouter } from "./routes/settings.js";

const PORT = 4000;
const CONFIG_PATH = process.env.CONFIG_PATH || "./config.json";

async function main() {
  let config = await readConfig(CONFIG_PATH);
  let provider: AIProvider = createProvider(config);
  let search = new SearchService(config.chromaUrl, (text) => provider.generateEmbedding(text));

  const dataPath = process.env.DATA_PATH || config.dataPath;
  initTokenUsage(dataPath);
  await initAuth(dataPath);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use(authMiddleware);
  app.use("/api", createEntriesRouter(dataPath, () => provider, () => search));
  app.use("/api", createTasksRouter(dataPath));
  app.use("/api", createSearchRouter(() => search));
  app.use("/api", createDashboardRouter(dataPath));
  app.use("/api", createSettingsRouter(CONFIG_PATH, (newConfig: AppConfig) => {
    config = newConfig;
    provider = createProvider(config);
    search = new SearchService(config.chromaUrl, (text) => provider.generateEmbedding(text));
  }));

  if (config.aiProvider === "ollama") {
    ensureModels(config.ollamaUrl).catch(console.error);
    const interval = setInterval(async () => {
      try {
        await ensureModels(config.ollamaUrl);
        const { getSetupStatus } = await import("./services/model-setup.js");
        if (getSetupStatus().ready) clearInterval(interval);
      } catch {}
    }, 10000);
  }

  app.listen(PORT, () => {
    console.log(`WorkLog AI backend running on port ${PORT}`);
  });
}

main().catch(console.error);
