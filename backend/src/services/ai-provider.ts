import { AIProvider, AppConfig } from "../types/index.js";
import { OllamaProvider } from "./ollama-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import { ClaudeProvider } from "./claude-provider.js";

export function createProvider(config: AppConfig): AIProvider {
  switch (config.aiProvider) {
    case "ollama":
      return new OllamaProvider(config.ollamaUrl);
    case "openai":
      return new OpenAIProvider(config.openaiApiKey);
    case "claude":
      return new ClaudeProvider(config.claudeApiKey, config.ollamaUrl);
    default:
      throw new Error(`Unknown AI provider: ${config.aiProvider}`);
  }
}
