import { Router } from "express";
import { readConfig, writeConfig } from "../services/config.js";
import { AppConfig } from "../types/index.js";

export function createSettingsRouter(configPath: string, onConfigChange: (config: AppConfig) => void) {
  const router = Router();

  router.get("/settings", async (_req, res) => {
    try {
      const config = await readConfig(configPath);
      const masked = {
        ...config,
        openaiApiKey: config.openaiApiKey ? "••••" + config.openaiApiKey.slice(-4) : "",
        claudeApiKey: config.claudeApiKey ? "••••" + config.claudeApiKey.slice(-4) : "",
      };
      res.json(masked);
    } catch (err) {
      res.status(500).json({ error: "Failed to read settings" });
    }
  });

  router.put("/settings", async (req, res) => {
    try {
      const currentConfig = await readConfig(configPath);
      const allowedKeys = new Set(["dataPath", "aiProvider", "ollamaUrl", "openaiApiKey", "claudeApiKey", "chromaUrl"]);
      const validProviders = new Set(["ollama", "openai", "claude"]);
      const updates: Partial<AppConfig> = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (allowedKeys.has(key) && typeof value === "string") {
          (updates as Record<string, string>)[key] = value;
        }
      }
      if (updates.aiProvider && !validProviders.has(updates.aiProvider)) {
        res.status(400).json({ error: "Invalid AI provider" });
        return;
      }

      const newConfig: AppConfig = {
        ...currentConfig,
        ...updates,
        openaiApiKey: updates.openaiApiKey === undefined || updates.openaiApiKey?.startsWith("••••")
          ? currentConfig.openaiApiKey
          : updates.openaiApiKey,
        claudeApiKey: updates.claudeApiKey === undefined || updates.claudeApiKey?.startsWith("••••")
          ? currentConfig.claudeApiKey
          : updates.claudeApiKey,
      };

      await writeConfig(configPath, newConfig);
      onConfigChange(newConfig);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  return router;
}
