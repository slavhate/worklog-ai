import { Ollama } from "ollama";

const REQUIRED_MODELS = ["llama3.2", "llava", "nomic-embed-text"];

export interface SetupStatus {
  ready: boolean;
  error?: string;
  models: { name: string; ready: boolean; pulling: boolean }[];
}

let currentStatus: SetupStatus = {
  ready: false,
  models: REQUIRED_MODELS.map((name) => ({ name, ready: false, pulling: false })),
};

export function getSetupStatus(): SetupStatus {
  return currentStatus;
}

export async function ensureModels(ollamaUrl: string): Promise<void> {
  const client = new Ollama({ host: ollamaUrl });

  let available: string[];
  try {
    const list = await client.list();
    available = list.models.map((m) => m.name.split(":")[0]);
    currentStatus.error = undefined;
  } catch {
    currentStatus.error = `Cannot connect to Ollama at ${ollamaUrl}`;
    console.log(`Ollama not reachable at ${ollamaUrl}, will retry...`);
    return;
  }

  for (const model of REQUIRED_MODELS) {
    const modelStatus = currentStatus.models.find((m) => m.name === model)!;
    if (available.includes(model)) {
      modelStatus.ready = true;
      continue;
    }

    console.log(`Pulling model: ${model}...`);
    modelStatus.pulling = true;
    try {
      await client.pull({ model });
      modelStatus.ready = true;
      modelStatus.pulling = false;
      console.log(`Model ${model} ready.`);
    } catch (err) {
      modelStatus.pulling = false;
      console.error(`Failed to pull ${model}:`, err);
    }
  }

  currentStatus.ready = currentStatus.models.every((m) => m.ready);
}
