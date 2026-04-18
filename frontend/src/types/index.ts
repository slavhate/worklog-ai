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

export interface TokenUsage {
  totalRequests: number;
  textProcessing: number;
  imageProcessing: number;
  embeddings: number;
  estimatedTokens: number;
  lastReset: string;
}

export interface SetupStatus {
  ready: boolean;
  error?: string;
  models: { name: string; ready: boolean; pulling: boolean }[];
  tokenUsage?: TokenUsage;
}

export interface PendingTask extends TaskEntry {
  date: string;
  index: number;
}

export interface DashboardData {
  today: DayWorklog;
  pendingTasks: PendingTask[];
  overdueTasks: PendingTask[];
  recentHighlights: { text: string; date: string }[];
}
