export interface TaskEntry {
  text: string;
  completed: boolean;
  due?: string;
  time?: string;
}

export interface MeetingEntry {
  time: string;
  text: string;
  attendees?: string[];
  notes?: string[];
}

export interface StructuredEntry {
  tasks: TaskEntry[];
  decisions: string[];
  meetings: MeetingEntry[];
  notes: string[];
  tags: string[];
  highlights?: string[];
}

export interface DayWorklog {
  date: string;
  tasks: TaskEntry[];
  decisions: string[];
  meetings: MeetingEntry[];
  notes: string[];
  tags: string[];
  highlights: string[];
}

export interface SearchResult {
  text: string;
  type: "task" | "decision" | "meeting" | "note";
  date: string;
  score: number;
  tags: string[];
}

export interface AppConfig {
  dataPath: string;
  aiProvider: "ollama" | "openai" | "claude";
  ollamaUrl: string;
  openaiApiKey: string;
  claudeApiKey: string;
  chromaUrl: string;
}

export interface AIProvider {
  processText(text: string): Promise<StructuredEntry>;
  processImage(image: Buffer): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export interface ToggleTaskRequest {
  date: string;
  index: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}
