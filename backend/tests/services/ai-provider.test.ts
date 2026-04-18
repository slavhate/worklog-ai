import { describe, it, expect, vi } from "vitest";
import { createProvider } from "../../src/services/ai-provider.js";
import { AIProvider, AppConfig } from "../../src/types/index.js";

const baseConfig: AppConfig = {
  dataPath: "./data",
  aiProvider: "ollama",
  ollamaUrl: "http://localhost:11434",
  openaiApiKey: "",
  claudeApiKey: "",
  chromaUrl: "http://localhost:8000",
};

describe("createProvider", () => {
  it("returns an OllamaProvider for ollama config", () => {
    const provider = createProvider(baseConfig);
    expect(provider).toBeDefined();
    expect(provider.processText).toBeTypeOf("function");
    expect(provider.processImage).toBeTypeOf("function");
    expect(provider.generateEmbedding).toBeTypeOf("function");
  });

  it("returns an OpenAIProvider for openai config", () => {
    const config = { ...baseConfig, aiProvider: "openai" as const, openaiApiKey: "sk-test" };
    const provider = createProvider(config);
    expect(provider).toBeDefined();
  });

  it("returns a ClaudeProvider for claude config", () => {
    const config = { ...baseConfig, aiProvider: "claude" as const, claudeApiKey: "sk-ant-test" };
    const provider = createProvider(config);
    expect(provider).toBeDefined();
  });

  it("throws for unknown provider", () => {
    const config = { ...baseConfig, aiProvider: "unknown" as any };
    expect(() => createProvider(config)).toThrow("Unknown AI provider: unknown");
  });
});
