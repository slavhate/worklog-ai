# WorkLog AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a containerized worklog app that converts natural language input and screenshots into structured daily markdown files with semantic search.

**Architecture:** Four Docker Compose services — React frontend (Vite/Nginx), Node.js/Express/TypeScript backend, Ollama (local LLM), and ChromaDB (vector search). Backend orchestrates AI processing and markdown file management. All commands run in WSL.

**Tech Stack:** React 19, Vite, Tailwind CSS, Node.js 22, Express, TypeScript, Ollama JS, OpenAI SDK, Anthropic SDK, ChromaDB client, Vitest, React Testing Library, Docker Compose.

---

## File Map

### Root
- `docker-compose.yml` — orchestrates all 4 services
- `config.json` — app configuration (data path, AI provider, API keys)
- `.gitignore` — ignore data/, node_modules/, dist/, .env, etc.
- `LICENSE` — MIT license
- `README.md` — project documentation

### Backend (`backend/`)
- `package.json` — dependencies and scripts
- `tsconfig.json` — TypeScript config
- `Dockerfile` — multi-stage build for production
- `src/index.ts` — Express server entry point, middleware setup
- `src/types/index.ts` — shared TypeScript interfaces (StructuredEntry, Config, SearchResult, etc.)
- `src/services/config.ts` — read/write config.json
- `src/services/markdown.ts` — parse and write markdown worklog files
- `src/services/ai-provider.ts` — provider interface + factory function
- `src/services/ollama-provider.ts` — Ollama implementation (text, vision, embeddings)
- `src/services/openai-provider.ts` — OpenAI implementation
- `src/services/claude-provider.ts` — Claude implementation (embeddings fall back to Ollama)
- `src/services/search.ts` — ChromaDB wrapper for indexing and querying
- `src/services/model-setup.ts` — check/pull required Ollama models on startup
- `src/routes/entries.ts` — POST /api/entries, GET /api/entries/:date
- `src/routes/tasks.ts` — GET /api/tasks, PATCH /api/tasks/toggle
- `src/routes/search.ts` — POST /api/search
- `src/routes/dashboard.ts` — GET /api/dashboard
- `src/routes/settings.ts` — GET/PUT /api/settings
- `src/routes/health.ts` — GET /api/health (model readiness)
- `tests/services/markdown.test.ts` — markdown parsing/writing tests
- `tests/services/config.test.ts` — config service tests
- `tests/services/ai-provider.test.ts` — provider interface tests with mocks
- `tests/routes/entries.test.ts` — entries API tests
- `tests/routes/tasks.test.ts` — tasks API tests
- `tests/routes/search.test.ts` — search API tests
- `tests/routes/dashboard.test.ts` — dashboard API tests
- `tests/routes/settings.test.ts` — settings API tests

### Frontend (`frontend/`)
- `package.json` — dependencies and scripts
- `tsconfig.json` — TypeScript config
- `vite.config.ts` — Vite config with proxy to backend
- `tailwind.config.js` — Tailwind CSS config
- `postcss.config.js` — PostCSS config for Tailwind
- `index.html` — HTML entry point
- `Dockerfile` — multi-stage build (Vite build → Nginx)
- `nginx.conf` — Nginx config for SPA routing + API proxy
- `src/main.tsx` — React entry point
- `src/App.tsx` — Router setup
- `src/services/api.ts` — API client (fetch wrapper for all backend endpoints)
- `src/types/index.ts` — shared frontend types
- `src/components/TopBar.tsx` — app header with search and settings nav
- `src/components/EntryInput.tsx` — text input + screenshot upload
- `src/components/TaskList.tsx` — task list with toggle
- `src/components/MeetingList.tsx` — meeting list display
- `src/components/DecisionList.tsx` — decision list display
- `src/components/SearchResult.tsx` — single search result card
- `src/components/SetupBanner.tsx` — shown when models are loading
- `src/pages/Dashboard.tsx` — main dashboard page
- `src/pages/Search.tsx` — search page
- `src/pages/Settings.tsx` — settings page
- `src/pages/DayView.tsx` — single day worklog view
- `src/__tests__/components/EntryInput.test.tsx` — entry input tests
- `src/__tests__/components/TaskList.test.tsx` — task list tests
- `src/__tests__/pages/Dashboard.test.tsx` — dashboard page tests
- `src/__tests__/pages/Settings.test.tsx` — settings page tests

---

## Task 1: Project Scaffolding and Root Config

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `config.json`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create .gitignore**

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Data
data/

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Superpowers
.superpowers/
```

- [ ] **Step 2: Create MIT LICENSE**

```
MIT License

Copyright (c) 2026 WorkLog AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Create default config.json**

```json
{
  "dataPath": "./data",
  "aiProvider": "ollama",
  "ollamaUrl": "http://ollama:11434",
  "openaiApiKey": "",
  "claudeApiKey": "",
  "chromaUrl": "http://chromadb:8000"
}
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    volumes:
      - ${DATA_PATH:-./data}:/app/data
      - ./config.json:/app/config.json
    depends_on:
      - ollama
      - chromadb
    environment:
      - DATA_PATH=/app/data
      - OLLAMA_URL=http://ollama:11434
      - CHROMA_URL=http://chromadb:8000

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  ollama_data:
  chroma_data:
```

- [ ] **Step 5: Create data directory placeholder**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && mkdir -p data && touch data/.gitkeep"
```

- [ ] **Step 6: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add .gitignore LICENSE config.json docker-compose.yml data/.gitkeep && git commit -m 'chore: project scaffolding with docker-compose, config, and license'"
```

---

## Task 2: Backend — Project Init and TypeScript Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/types/index.ts`

- [ ] **Step 1: Initialize backend package.json**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && mkdir -p backend/src && cd backend && npm init -y"
```

Then update `backend/package.json` to:

```json
{
  "name": "worklog-ai-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "multer": "^2.0.0",
    "cors": "^2.8.5",
    "ollama": "^0.5.14",
    "openai": "^4.86.2",
    "@anthropic-ai/sdk": "^0.39.0",
    "chromadb": "^1.9.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.2",
    "@types/multer": "^1.4.12",
    "@types/cors": "^2.8.17",
    "@types/node": "^22.15.3",
    "typescript": "^5.8.3",
    "tsx": "^4.19.4",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npm install"
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create shared types**

Create `backend/src/types/index.ts`:

```typescript
export interface TaskEntry {
  text: string;
  completed: boolean;
  due?: string;
}

export interface MeetingEntry {
  time: string;
  text: string;
}

export interface StructuredEntry {
  tasks: TaskEntry[];
  decisions: string[];
  meetings: MeetingEntry[];
  notes: string[];
  tags: string[];
}

export interface DayWorklog {
  date: string;
  tasks: TaskEntry[];
  decisions: string[];
  meetings: MeetingEntry[];
  notes: string[];
  tags: string[];
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
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx tsc --noEmit"
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/src/types/index.ts && git commit -m 'feat(backend): initialize project with TypeScript and shared types'"
```

---

## Task 3: Backend — Config Service

**Files:**
- Create: `backend/src/services/config.ts`
- Create: `backend/tests/services/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/services/config.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/config.test.ts"
```

Expected: FAIL — cannot find module `../../src/services/config.js`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/services/config.ts`:

```typescript
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
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeConfig(configPath: string, config: AppConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/config.test.ts"
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/services/config.ts backend/tests/services/config.test.ts && git commit -m 'feat(backend): add config service with read/write and defaults'"
```

---

## Task 4: Backend — Markdown Service

**Files:**
- Create: `backend/src/services/markdown.ts`
- Create: `backend/tests/services/markdown.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/services/markdown.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  parseWorklog,
  appendEntries,
  toggleTask,
  getAllPendingTasks,
  formatDate,
} from "../../src/services/markdown.js";
import { StructuredEntry } from "../../src/types/index.js";

describe("markdown service", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-md-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("formatDate", () => {
    it("formats a date as YYYY-MM-DD", () => {
      expect(formatDate(new Date(2026, 3, 18))).toBe("2026-04-18");
    });
  });

  describe("parseWorklog", () => {
    it("returns empty worklog for nonexistent file", async () => {
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.date).toBe("2026-04-18");
      expect(wl.tasks).toEqual([]);
      expect(wl.decisions).toEqual([]);
      expect(wl.meetings).toEqual([]);
      expect(wl.notes).toEqual([]);
      expect(wl.tags).toEqual([]);
    });

    it("parses a full worklog file", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Review PR
- [ ] Update docs (due: 2026-04-21)

## Decisions
- Push migration to Q3

## Meetings
- 10:00 Standup — sprint priorities

## Notes
- Check Grafana dashboard

## Tags
#project-alpha #migration
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks).toEqual([
        { text: "Review PR", completed: true },
        { text: "Update docs", completed: false, due: "2026-04-21" },
      ]);
      expect(wl.decisions).toEqual(["Push migration to Q3"]);
      expect(wl.meetings).toEqual([
        { time: "10:00", text: "Standup — sprint priorities" },
      ]);
      expect(wl.notes).toEqual(["Check Grafana dashboard"]);
      expect(wl.tags).toEqual(["#project-alpha", "#migration"]);
    });
  });

  describe("appendEntries", () => {
    it("creates a new file when none exists", async () => {
      const entry: StructuredEntry = {
        tasks: [{ text: "Write tests", completed: false }],
        decisions: ["Use Vitest"],
        meetings: [{ time: "09:00", text: "Planning" }],
        notes: ["Remember to update CI"],
        tags: ["#testing"],
      };
      await appendEntries(tmpDir, "2026-04-18", entry);
      const content = await fs.readFile(path.join(tmpDir, "2026-04-18.md"), "utf-8");
      expect(content).toContain("# Worklog - 2026-04-18");
      expect(content).toContain("- [ ] Write tests");
      expect(content).toContain("- Use Vitest");
      expect(content).toContain("- 09:00 Planning");
      expect(content).toContain("- Remember to update CI");
      expect(content).toContain("#testing");
    });

    it("appends to an existing file", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Existing task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      const entry: StructuredEntry = {
        tasks: [{ text: "New task", completed: false }],
        decisions: [],
        meetings: [],
        notes: [],
        tags: [],
      };
      await appendEntries(tmpDir, "2026-04-18", entry);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks).toHaveLength(2);
      expect(wl.tasks[0].text).toBe("Existing task");
      expect(wl.tasks[1].text).toBe("New task");
    });
  });

  describe("toggleTask", () => {
    it("toggles a task from incomplete to complete", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [ ] First task
- [ ] Second task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      await toggleTask(tmpDir, "2026-04-18", 1);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks[0].completed).toBe(false);
      expect(wl.tasks[1].completed).toBe(true);
    });

    it("toggles a task from complete to incomplete", async () => {
      const md = `# Worklog - 2026-04-18

## Tasks
- [x] Done task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);
      await toggleTask(tmpDir, "2026-04-18", 0);
      const wl = await parseWorklog(tmpDir, "2026-04-18");
      expect(wl.tasks[0].completed).toBe(false);
    });
  });

  describe("getAllPendingTasks", () => {
    it("returns pending tasks across multiple days", async () => {
      const md1 = `# Worklog - 2026-04-17

## Tasks
- [ ] Overdue task (due: 2026-04-16)
- [x] Done task

## Decisions

## Meetings

## Notes

## Tags
`;
      const md2 = `# Worklog - 2026-04-18

## Tasks
- [ ] Today task

## Decisions

## Meetings

## Notes

## Tags
`;
      await fs.writeFile(path.join(tmpDir, "2026-04-17.md"), md1);
      await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md2);

      const pending = await getAllPendingTasks(tmpDir);
      expect(pending).toHaveLength(2);
      expect(pending[0].text).toBe("Overdue task");
      expect(pending[0].date).toBe("2026-04-17");
      expect(pending[1].text).toBe("Today task");
      expect(pending[1].date).toBe("2026-04-18");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/markdown.test.ts"
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Write implementation**

Create `backend/src/services/markdown.ts`:

```typescript
import fs from "fs/promises";
import path from "path";
import { StructuredEntry, DayWorklog, TaskEntry } from "../types/index.js";

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function filePath(dataDir: string, date: string): string {
  return path.join(dataDir, `${date}.md`);
}

export async function parseWorklog(dataDir: string, date: string): Promise<DayWorklog> {
  const wl: DayWorklog = { date, tasks: [], decisions: [], meetings: [], notes: [], tags: [] };
  let content: string;
  try {
    content = await fs.readFile(filePath(dataDir, date), "utf-8");
  } catch {
    return wl;
  }

  let currentSection = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      currentSection = trimmed.slice(3).toLowerCase();
      continue;
    }
    if (!trimmed.startsWith("- ") && !trimmed.startsWith("#")) continue;

    switch (currentSection) {
      case "tasks": {
        const completedMatch = trimmed.match(/^- \[x\] (.+)$/);
        const pendingMatch = trimmed.match(/^- \[ \] (.+)$/);
        if (completedMatch) {
          const { text, due } = parseTaskText(completedMatch[1]);
          wl.tasks.push({ text, completed: true, ...(due && { due }) });
        } else if (pendingMatch) {
          const { text, due } = parseTaskText(pendingMatch[1]);
          wl.tasks.push({ text, completed: false, ...(due && { due }) });
        }
        break;
      }
      case "decisions": {
        if (trimmed.startsWith("- ")) wl.decisions.push(trimmed.slice(2));
        break;
      }
      case "meetings": {
        if (trimmed.startsWith("- ")) {
          const meetingMatch = trimmed.match(/^- (\d{1,2}:\d{2}) (.+)$/);
          if (meetingMatch) {
            wl.meetings.push({ time: meetingMatch[1], text: meetingMatch[2] });
          }
        }
        break;
      }
      case "notes": {
        if (trimmed.startsWith("- ")) wl.notes.push(trimmed.slice(2));
        break;
      }
      case "tags": {
        const tagMatches = trimmed.match(/#[\w-]+/g);
        if (tagMatches) wl.tags.push(...tagMatches);
        break;
      }
    }
  }
  return wl;
}

function parseTaskText(raw: string): { text: string; due?: string } {
  const dueMatch = raw.match(/\(due: (\d{4}-\d{2}-\d{2})\)/);
  if (dueMatch) {
    const text = raw.replace(` (due: ${dueMatch[1]})`, "").trim();
    return { text, due: dueMatch[1] };
  }
  return { text: raw };
}

export async function appendEntries(dataDir: string, date: string, entry: StructuredEntry): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  const fp = filePath(dataDir, date);
  let existing: DayWorklog;
  try {
    existing = await parseWorklog(dataDir, date);
  } catch {
    existing = { date, tasks: [], decisions: [], meetings: [], notes: [], tags: [] };
  }

  const merged: DayWorklog = {
    date,
    tasks: [...existing.tasks, ...entry.tasks],
    decisions: [...existing.decisions, ...entry.decisions],
    meetings: [...existing.meetings, ...entry.meetings],
    notes: [...existing.notes, ...entry.notes],
    tags: [...new Set([...existing.tags, ...entry.tags])],
  };

  await fs.writeFile(fp, renderWorklog(merged));
}

function renderWorklog(wl: DayWorklog): string {
  const lines: string[] = [`# Worklog - ${wl.date}`, ""];

  lines.push("## Tasks");
  for (const t of wl.tasks) {
    const check = t.completed ? "x" : " ";
    const due = t.due ? ` (due: ${t.due})` : "";
    lines.push(`- [${check}] ${t.text}${due}`);
  }
  lines.push("");

  lines.push("## Decisions");
  for (const d of wl.decisions) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## Meetings");
  for (const m of wl.meetings) lines.push(`- ${m.time} ${m.text}`);
  lines.push("");

  lines.push("## Notes");
  for (const n of wl.notes) lines.push(`- ${n}`);
  lines.push("");

  lines.push("## Tags");
  if (wl.tags.length > 0) lines.push(wl.tags.join(" "));
  lines.push("");

  return lines.join("\n");
}

export async function toggleTask(dataDir: string, date: string, index: number): Promise<void> {
  const wl = await parseWorklog(dataDir, date);
  if (index < 0 || index >= wl.tasks.length) {
    throw new Error(`Task index ${index} out of range for ${date}`);
  }
  wl.tasks[index].completed = !wl.tasks[index].completed;
  await fs.writeFile(filePath(dataDir, date), renderWorklog(wl));
}

export interface PendingTask extends TaskEntry {
  date: string;
  index: number;
}

export async function getAllPendingTasks(dataDir: string): Promise<PendingTask[]> {
  let files: string[];
  try {
    files = await fs.readdir(dataDir);
  } catch {
    return [];
  }
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
  const pending: PendingTask[] = [];
  for (const f of mdFiles) {
    const date = f.replace(".md", "");
    const wl = await parseWorklog(dataDir, date);
    wl.tasks.forEach((t, i) => {
      if (!t.completed) {
        pending.push({ ...t, date, index: i });
      }
    });
  }
  return pending;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/markdown.test.ts"
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/services/markdown.ts backend/tests/services/markdown.test.ts && git commit -m 'feat(backend): add markdown parsing, writing, and task management'"
```

---

## Task 5: Backend — AI Provider Interface and Ollama Provider

**Files:**
- Create: `backend/src/services/ai-provider.ts`
- Create: `backend/src/services/ollama-provider.ts`
- Create: `backend/tests/services/ai-provider.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/services/ai-provider.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/ai-provider.test.ts"
```

Expected: FAIL.

- [ ] **Step 3: Create the AI provider factory**

Create `backend/src/services/ai-provider.ts`:

```typescript
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
```

- [ ] **Step 4: Create the Ollama provider**

Create `backend/src/services/ollama-provider.ts`:

```typescript
import { Ollama } from "ollama";
import { AIProvider, StructuredEntry } from "../types/index.js";

const EXTRACTION_PROMPT = `You are a worklog assistant. Extract structured data from the user's text.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "tasks": [{"text": "task description", "completed": false, "due": "YYYY-MM-DD or null"}],
  "decisions": ["decision text"],
  "meetings": [{"time": "HH:MM", "text": "meeting description"}],
  "notes": ["note text"],
  "tags": ["#tag1", "#tag2"]
}
Rules:
- Tasks are action items. If the text says something was done, mark completed: true.
- Decisions are choices or agreements made.
- Meetings have a time and description. If no time mentioned, use "00:00".
- Notes are anything else worth recording.
- Tags are topics, project names, or categories. Always prefix with #.
- If a category has no items, use an empty array.`;

export class OllamaProvider implements AIProvider {
  private client: Ollama;

  constructor(baseUrl: string) {
    this.client = new Ollama({ host: baseUrl });
  }

  async processText(text: string): Promise<StructuredEntry> {
    const response = await this.client.chat({
      model: "llama3.2",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: text },
      ],
      format: "json",
    });

    try {
      const parsed = JSON.parse(response.message.content);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        meetings: Array.isArray(parsed.meetings) ? parsed.meetings : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch {
      return { tasks: [], decisions: [], meetings: [], notes: [text], tags: [] };
    }
  }

  async processImage(image: Buffer): Promise<string> {
    const response = await this.client.chat({
      model: "llava",
      messages: [
        {
          role: "user",
          content: "Extract all text and important information from this image. Be thorough.",
          images: [image.toString("base64")],
        },
      ],
    });
    return response.message.content;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: "nomic-embed-text",
      input: text,
    });
    return response.embeddings[0];
  }
}
```

- [ ] **Step 5: Create the OpenAI provider**

Create `backend/src/services/openai-provider.ts`:

```typescript
import OpenAI from "openai";
import { AIProvider, StructuredEntry } from "../types/index.js";

const EXTRACTION_PROMPT = `You are a worklog assistant. Extract structured data from the user's text.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "tasks": [{"text": "task description", "completed": false, "due": "YYYY-MM-DD or null"}],
  "decisions": ["decision text"],
  "meetings": [{"time": "HH:MM", "text": "meeting description"}],
  "notes": ["note text"],
  "tags": ["#tag1", "#tag2"]
}
Rules:
- Tasks are action items. If the text says something was done, mark completed: true.
- Decisions are choices or agreements made.
- Meetings have a time and description. If no time mentioned, use "00:00".
- Notes are anything else worth recording.
- Tags are topics, project names, or categories. Always prefix with #.
- If a category has no items, use an empty array.`;

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async processText(text: string): Promise<StructuredEntry> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: text },
      ],
    });

    try {
      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        meetings: Array.isArray(parsed.meetings) ? parsed.meetings : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch {
      return { tasks: [], decisions: [], meetings: [], notes: [text], tags: [] };
    }
  }

  async processImage(image: Buffer): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text and important information from this image. Be thorough." },
            { type: "image_url", image_url: { url: `data:image/png;base64,${image.toString("base64")}` } },
          ],
        },
      ],
    });
    return response.choices[0].message.content || "";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

- [ ] **Step 6: Create the Claude provider**

Create `backend/src/services/claude-provider.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Ollama } from "ollama";
import { AIProvider, StructuredEntry } from "../types/index.js";

const EXTRACTION_PROMPT = `You are a worklog assistant. Extract structured data from the user's text.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "tasks": [{"text": "task description", "completed": false, "due": "YYYY-MM-DD or null"}],
  "decisions": ["decision text"],
  "meetings": [{"time": "HH:MM", "text": "meeting description"}],
  "notes": ["note text"],
  "tags": ["#tag1", "#tag2"]
}
Rules:
- Tasks are action items. If the text says something was done, mark completed: true.
- Decisions are choices or agreements made.
- Meetings have a time and description. If no time mentioned, use "00:00".
- Notes are anything else worth recording.
- Tags are topics, project names, or categories. Always prefix with #.
- If a category has no items, use an empty array.`;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private ollama: Ollama;

  constructor(apiKey: string, ollamaUrl: string) {
    this.client = new Anthropic({ apiKey });
    this.ollama = new Ollama({ host: ollamaUrl });
  }

  async processText(text: string): Promise<StructuredEntry> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system: EXTRACTION_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    try {
      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");
      const parsed = JSON.parse(content.text);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        meetings: Array.isArray(parsed.meetings) ? parsed.meetings : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch {
      return { tasks: [], decisions: [], meetings: [], notes: [text], tags: [] };
    }
  }

  async processImage(image: Buffer): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: image.toString("base64") },
            },
            { type: "text", text: "Extract all text and important information from this image. Be thorough." },
          ],
        },
      ],
    });
    const content = response.content[0];
    return content.type === "text" ? content.text : "";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ollama.embed({
      model: "nomic-embed-text",
      input: text,
    });
    return response.embeddings[0];
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/ai-provider.test.ts"
```

Expected: All 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/services/ai-provider.ts backend/src/services/ollama-provider.ts backend/src/services/openai-provider.ts backend/src/services/claude-provider.ts backend/tests/services/ai-provider.test.ts && git commit -m 'feat(backend): add AI provider abstraction with Ollama, OpenAI, and Claude'"
```

---

## Task 6: Backend — Search Service (ChromaDB)

**Files:**
- Create: `backend/src/services/search.ts`
- Create: `backend/tests/services/search.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/services/search.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchService } from "../../src/services/search.js";

const mockCollection = {
  add: vi.fn(),
  query: vi.fn(),
};

const mockClient = {
  getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
};

vi.mock("chromadb", () => ({
  ChromaClient: vi.fn().mockImplementation(() => mockClient),
}));

describe("SearchService", () => {
  let service: SearchService;
  const mockEmbedFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService("http://localhost:8000", mockEmbedFn);
  });

  it("indexes an entry with embedding and metadata", async () => {
    await service.indexEntry("Test decision", "decision", "2026-04-18", ["#project"]);

    expect(mockEmbedFn).toHaveBeenCalledWith("Test decision");
    expect(mockCollection.add).toHaveBeenCalledWith({
      ids: [expect.stringContaining("2026-04-18-decision-")],
      documents: ["Test decision"],
      embeddings: [[0.1, 0.2, 0.3]],
      metadatas: [{ type: "decision", date: "2026-04-18", tags: "#project" }],
    });
  });

  it("queries and returns search results", async () => {
    mockCollection.query.mockResolvedValue({
      documents: [["Found decision"]],
      metadatas: [[{ type: "decision", date: "2026-04-18", tags: "#project" }]],
      distances: [[0.25]],
    });

    const results = await service.search("migration decisions", 5);

    expect(mockEmbedFn).toHaveBeenCalledWith("migration decisions");
    expect(results).toEqual([
      {
        text: "Found decision",
        type: "decision",
        date: "2026-04-18",
        score: 0.75,
        tags: ["#project"],
      },
    ]);
  });

  it("returns empty array when query returns no results", async () => {
    mockCollection.query.mockResolvedValue({
      documents: [[]],
      metadatas: [[]],
      distances: [[]],
    });

    const results = await service.search("nothing", 5);
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/search.test.ts"
```

Expected: FAIL.

- [ ] **Step 3: Write implementation**

Create `backend/src/services/search.ts`:

```typescript
import { ChromaClient, Collection } from "chromadb";
import { SearchResult } from "../types/index.js";

export type EmbedFunction = (text: string) => Promise<number[]>;

export class SearchService {
  private client: ChromaClient;
  private embed: EmbedFunction;
  private collection: Collection | null = null;

  constructor(chromaUrl: string, embedFn: EmbedFunction) {
    this.client = new ChromaClient({ path: chromaUrl });
    this.embed = embedFn;
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({ name: "worklogs" });
    }
    return this.collection;
  }

  async indexEntry(text: string, type: string, date: string, tags: string[]): Promise<void> {
    const collection = await this.getCollection();
    const embedding = await this.embed(text);
    const id = `${date}-${type}-${Date.now()}`;
    await collection.add({
      ids: [id],
      documents: [text],
      embeddings: [embedding],
      metadatas: [{ type, date, tags: tags.join(" ") }],
    });
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const collection = await this.getCollection();
    const queryEmbedding = await this.embed(query);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
    });

    if (!results.documents[0] || results.documents[0].length === 0) {
      return [];
    }

    return results.documents[0].map((doc, i) => {
      const meta = results.metadatas[0][i] as { type: string; date: string; tags: string };
      const distance = results.distances ? results.distances[0][i] : 0;
      return {
        text: doc || "",
        type: meta.type as SearchResult["type"],
        date: meta.date,
        score: Math.max(0, 1 - distance),
        tags: meta.tags ? meta.tags.split(" ").filter(Boolean) : [],
      };
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run tests/services/search.test.ts"
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/services/search.ts backend/tests/services/search.test.ts && git commit -m 'feat(backend): add ChromaDB search service with indexing and querying'"
```

---

## Task 7: Backend — Model Setup Service

**Files:**
- Create: `backend/src/services/model-setup.ts`

- [ ] **Step 1: Write the model setup service**

Create `backend/src/services/model-setup.ts`:

```typescript
import { Ollama } from "ollama";

const REQUIRED_MODELS = ["llama3.2", "llava", "nomic-embed-text"];

export interface SetupStatus {
  ready: boolean;
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
  } catch {
    console.log("Ollama not ready yet, will retry...");
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx tsc --noEmit"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/services/model-setup.ts && git commit -m 'feat(backend): add Ollama model setup service for first-run model pulling'"
```

---

## Task 8: Backend — Express Server and Routes

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/routes/entries.ts`
- Create: `backend/src/routes/tasks.ts`
- Create: `backend/src/routes/search.ts`
- Create: `backend/src/routes/dashboard.ts`
- Create: `backend/src/routes/settings.ts`

- [ ] **Step 1: Create the health route**

Create `backend/src/routes/health.ts`:

```typescript
import { Router } from "express";
import { getSetupStatus } from "../services/model-setup.js";

const router = Router();

router.get("/health", (_req, res) => {
  const status = getSetupStatus();
  res.json(status);
});

export default router;
```

- [ ] **Step 2: Create the entries route**

Create `backend/src/routes/entries.ts`:

```typescript
import { Router } from "express";
import multer from "multer";
import { AIProvider, StructuredEntry } from "../types/index.js";
import { appendEntries, parseWorklog, formatDate } from "../services/markdown.js";
import { SearchService } from "../services/search.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function createEntriesRouter(dataPath: string, getProvider: () => AIProvider, getSearch: () => SearchService) {
  const router = Router();

  router.post("/entries", upload.array("screenshots", 10), async (req, res) => {
    try {
      const { text } = req.body;
      const files = req.files as Express.Multer.File[] | undefined;

      let combinedText = text || "";

      if (files && files.length > 0) {
        const provider = getProvider();
        for (const file of files) {
          try {
            const extracted = await provider.processImage(file.buffer);
            combinedText += "\n" + extracted;
          } catch (err) {
            console.error("Image processing failed:", err);
          }
        }
      }

      if (!combinedText.trim()) {
        res.status(400).json({ error: "No text or screenshots provided" });
        return;
      }

      const provider = getProvider();
      const entry = await provider.processText(combinedText);
      const today = formatDate(new Date());
      await appendEntries(dataPath, today, entry);

      const search = getSearch();
      try {
        const allTexts = [
          ...entry.tasks.map((t) => ({ text: t.text, type: "task" })),
          ...entry.decisions.map((d) => ({ text: d, type: "decision" })),
          ...entry.meetings.map((m) => ({ text: `${m.time} ${m.text}`, type: "meeting" })),
          ...entry.notes.map((n) => ({ text: n, type: "note" })),
        ];
        for (const item of allTexts) {
          await search.indexEntry(item.text, item.type, today, entry.tags);
        }
      } catch (err) {
        console.error("Search indexing failed:", err);
      }

      res.json({ date: today, entry });
    } catch (err) {
      console.error("Entry processing failed:", err);
      res.status(500).json({ error: "Failed to process entry" });
    }
  });

  router.get("/entries/:date", async (req, res) => {
    try {
      const worklog = await parseWorklog(dataPath, req.params.date);
      res.json(worklog);
    } catch (err) {
      res.status(500).json({ error: "Failed to read worklog" });
    }
  });

  return router;
}
```

- [ ] **Step 3: Create the tasks route**

Create `backend/src/routes/tasks.ts`:

```typescript
import { Router } from "express";
import { getAllPendingTasks, toggleTask } from "../services/markdown.js";
import { ToggleTaskRequest } from "../types/index.js";

export function createTasksRouter(dataPath: string) {
  const router = Router();

  router.get("/tasks", async (_req, res) => {
    try {
      const tasks = await getAllPendingTasks(dataPath);
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  router.patch("/tasks/toggle", async (req, res) => {
    try {
      const { date, index } = req.body as ToggleTaskRequest;
      await toggleTask(dataPath, date, index);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to toggle task" });
    }
  });

  return router;
}
```

- [ ] **Step 4: Create the search route**

Create `backend/src/routes/search.ts`:

```typescript
import { Router } from "express";
import { SearchService } from "../services/search.js";

export function createSearchRouter(getSearch: () => SearchService) {
  const router = Router();

  router.post("/search", async (req, res) => {
    try {
      const { query, limit = 20 } = req.body;
      if (!query) {
        res.status(400).json({ error: "Query is required" });
        return;
      }
      const search = getSearch();
      const results = await search.search(query, limit);
      res.json(results);
    } catch (err) {
      console.error("Search failed:", err);
      res.status(500).json({ error: "Search failed" });
    }
  });

  return router;
}
```

- [ ] **Step 5: Create the dashboard route**

Create `backend/src/routes/dashboard.ts`:

```typescript
import { Router } from "express";
import { parseWorklog, formatDate, getAllPendingTasks } from "../services/markdown.js";

export function createDashboardRouter(dataPath: string) {
  const router = Router();

  router.get("/dashboard", async (_req, res) => {
    try {
      const today = formatDate(new Date());
      const worklog = await parseWorklog(dataPath, today);
      const allPending = await getAllPendingTasks(dataPath);
      const overdue = allPending.filter((t) => t.due && t.due < today);

      res.json({
        today: worklog,
        pendingTasks: allPending,
        overdueTasks: overdue,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  return router;
}
```

- [ ] **Step 6: Create the settings route**

Create `backend/src/routes/settings.ts`:

```typescript
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
      const updates = req.body as Partial<AppConfig>;

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
```

- [ ] **Step 7: Create the Express server entry point**

Create `backend/src/index.ts`:

```typescript
import express from "express";
import cors from "cors";
import path from "path";
import { readConfig } from "./services/config.js";
import { createProvider } from "./services/ai-provider.js";
import { SearchService } from "./services/search.js";
import { ensureModels } from "./services/model-setup.js";
import { AIProvider, AppConfig } from "./types/index.js";
import healthRouter from "./routes/health.js";
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

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", healthRouter);
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
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx tsc --noEmit"
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/src/index.ts backend/src/routes/ && git commit -m 'feat(backend): add Express server with all API routes'"
```

---

## Task 9: Backend — Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/Dockerfile && git commit -m 'feat(backend): add production Dockerfile'"
```

---

## Task 10: Backend — Route Tests

**Files:**
- Create: `backend/tests/routes/entries.test.ts`
- Create: `backend/tests/routes/tasks.test.ts`
- Create: `backend/tests/routes/dashboard.test.ts`
- Create: `backend/tests/routes/settings.test.ts`

- [ ] **Step 1: Write entries route test**

Create `backend/tests/routes/entries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createEntriesRouter } from "../../src/routes/entries.js";
import { AIProvider, StructuredEntry } from "../../src/types/index.js";
import { SearchService } from "../../src/services/search.js";

const mockEntry: StructuredEntry = {
  tasks: [{ text: "Test task", completed: false }],
  decisions: ["Test decision"],
  meetings: [{ time: "10:00", text: "Standup" }],
  notes: ["Test note"],
  tags: ["#test"],
};

const mockProvider: AIProvider = {
  processText: vi.fn().mockResolvedValue(mockEntry),
  processImage: vi.fn().mockResolvedValue("extracted text"),
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
};

const mockSearch = {
  indexEntry: vi.fn().mockResolvedValue(undefined),
  search: vi.fn().mockResolvedValue([]),
} as unknown as SearchService;

describe("entries routes", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-routes-"));
    app = express();
    app.use(express.json());
    app.use("/api", createEntriesRouter(tmpDir, () => mockProvider, () => mockSearch));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("POST /api/entries processes text and saves", async () => {
    const res = await request(app)
      .post("/api/entries")
      .field("text", "Had a meeting at 10am")
      .expect(200);

    expect(res.body.entry).toBeDefined();
    expect(mockProvider.processText).toHaveBeenCalled();
  });

  it("POST /api/entries returns 400 with no input", async () => {
    await request(app)
      .post("/api/entries")
      .expect(400);
  });

  it("GET /api/entries/:date returns worklog", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] Test\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    const res = await request(app)
      .get("/api/entries/2026-04-18")
      .expect(200);

    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].text).toBe("Test");
  });
});
```

- [ ] **Step 2: Add supertest dependency**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npm install -D supertest @types/supertest"
```

- [ ] **Step 3: Write tasks route test**

Create `backend/tests/routes/tasks.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createTasksRouter } from "../../src/routes/tasks.js";

describe("tasks routes", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-tasks-"));
    app = express();
    app.use(express.json());
    app.use("/api", createTasksRouter(tmpDir));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/tasks returns pending tasks", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] Pending task\n- [x] Done task\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    const res = await request(app).get("/api/tasks").expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].text).toBe("Pending task");
  });

  it("PATCH /api/tasks/toggle toggles a task", async () => {
    const md = `# Worklog - 2026-04-18\n\n## Tasks\n- [ ] My task\n\n## Decisions\n\n## Meetings\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, "2026-04-18.md"), md);

    await request(app)
      .patch("/api/tasks/toggle")
      .send({ date: "2026-04-18", index: 0 })
      .expect(200);

    const content = await fs.readFile(path.join(tmpDir, "2026-04-18.md"), "utf-8");
    expect(content).toContain("- [x] My task");
  });
});
```

- [ ] **Step 4: Write dashboard route test**

Create `backend/tests/routes/dashboard.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createDashboardRouter } from "../../src/routes/dashboard.js";
import { formatDate } from "../../src/services/markdown.js";

describe("dashboard route", () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-dash-"));
    app = express();
    app.use(express.json());
    app.use("/api", createDashboardRouter(tmpDir));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/dashboard returns today's data", async () => {
    const today = formatDate(new Date());
    const md = `# Worklog - ${today}\n\n## Tasks\n- [ ] Today task\n\n## Decisions\n- A decision\n\n## Meetings\n- 10:00 Standup\n\n## Notes\n\n## Tags\n`;
    await fs.writeFile(path.join(tmpDir, `${today}.md`), md);

    const res = await request(app).get("/api/dashboard").expect(200);
    expect(res.body.today.tasks).toHaveLength(1);
    expect(res.body.today.decisions).toHaveLength(1);
    expect(res.body.pendingTasks).toHaveLength(1);
  });

  it("GET /api/dashboard works with no data", async () => {
    const res = await request(app).get("/api/dashboard").expect(200);
    expect(res.body.today.tasks).toEqual([]);
    expect(res.body.pendingTasks).toEqual([]);
  });
});
```

- [ ] **Step 5: Write settings route test**

Create `backend/tests/routes/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createSettingsRouter } from "../../src/routes/settings.js";

describe("settings routes", () => {
  let tmpDir: string;
  let configPath: string;
  let app: express.Express;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "worklog-settings-"));
    configPath = path.join(tmpDir, "config.json");
    await fs.writeFile(configPath, JSON.stringify({
      dataPath: "./data",
      aiProvider: "ollama",
      ollamaUrl: "http://ollama:11434",
      openaiApiKey: "sk-real-key-12345",
      claudeApiKey: "",
      chromaUrl: "http://chromadb:8000",
    }));
    app = express();
    app.use(express.json());
    app.use("/api", createSettingsRouter(configPath, () => {}));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("GET /api/settings masks API keys", async () => {
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.openaiApiKey).toBe("••••2345");
    expect(res.body.claudeApiKey).toBe("");
    expect(res.body.aiProvider).toBe("ollama");
  });

  it("PUT /api/settings updates config", async () => {
    await request(app)
      .put("/api/settings")
      .send({ aiProvider: "openai" })
      .expect(200);

    const raw = JSON.parse(await fs.readFile(configPath, "utf-8"));
    expect(raw.aiProvider).toBe("openai");
    expect(raw.openaiApiKey).toBe("sk-real-key-12345");
  });

  it("PUT /api/settings does not overwrite masked keys", async () => {
    await request(app)
      .put("/api/settings")
      .send({ openaiApiKey: "••••2345" })
      .expect(200);

    const raw = JSON.parse(await fs.readFile(configPath, "utf-8"));
    expect(raw.openaiApiKey).toBe("sk-real-key-12345");
  });
});
```

- [ ] **Step 6: Run all tests**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run"
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add backend/tests/routes/ backend/package.json backend/package-lock.json && git commit -m 'test(backend): add route tests for entries, tasks, dashboard, and settings'"
```

---

## Task 11: Frontend — Project Init

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Scaffold React project with Vite**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && npm create vite@latest frontend -- --template react-ts"
```

- [ ] **Step 2: Install dependencies**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npm install react-router-dom tailwindcss @tailwindcss/vite && npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vitest"
```

- [ ] **Step 3: Update vite.config.ts**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `frontend/src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create index.css with Tailwind**

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create shared frontend types**

Create `frontend/src/types/index.ts`:

```typescript
export interface TaskEntry {
  text: string;
  completed: boolean;
  due?: string;
}

export interface MeetingEntry {
  time: string;
  text: string;
}

export interface DayWorklog {
  date: string;
  tasks: TaskEntry[];
  decisions: string[];
  meetings: MeetingEntry[];
  notes: string[];
  tags: string[];
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

export interface SetupStatus {
  ready: boolean;
  models: { name: string; ready: boolean; pulling: boolean }[];
}

export interface PendingTask extends TaskEntry {
  date: string;
  index: number;
}

export interface DashboardData {
  today: DayWorklog;
  pendingTasks: PendingTask[];
  overdueTasks: PendingTask[];
}
```

- [ ] **Step 7: Create App.tsx with routing**

Replace `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import DayView from "./pages/DayView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/day/:date" element={<DayView />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: Create placeholder pages**

Create `frontend/src/pages/Dashboard.tsx`:

```tsx
export default function Dashboard() {
  return <div>Dashboard</div>;
}
```

Create `frontend/src/pages/Search.tsx`:

```tsx
export default function Search() {
  return <div>Search</div>;
}
```

Create `frontend/src/pages/Settings.tsx`:

```tsx
export default function Settings() {
  return <div>Settings</div>;
}
```

Create `frontend/src/pages/DayView.tsx`:

```tsx
export default function DayView() {
  return <div>Day View</div>;
}
```

- [ ] **Step 9: Update main.tsx**

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 10: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 11: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/ && git commit -m 'feat(frontend): scaffold React project with Vite, Tailwind, and routing'"
```

---

## Task 12: Frontend — API Client

**Files:**
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: Create API client**

Create `frontend/src/services/api.ts`:

```typescript
import type { DayWorklog, DashboardData, SearchResult, AppConfig, SetupStatus, PendingTask } from "../types";

const BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getDashboard(): Promise<DashboardData> {
    return fetchJSON("/dashboard");
  },

  getEntries(date: string): Promise<DayWorklog> {
    return fetchJSON(`/entries/${date}`);
  },

  async submitEntry(text: string, screenshots: File[]): Promise<{ date: string; entry: unknown }> {
    const form = new FormData();
    if (text) form.append("text", text);
    for (const file of screenshots) form.append("screenshots", file);
    const res = await fetch(`${BASE}/entries`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Submit failed");
    }
    return res.json();
  },

  getTasks(): Promise<PendingTask[]> {
    return fetchJSON("/tasks");
  },

  toggleTask(date: string, index: number): Promise<{ success: boolean }> {
    return fetchJSON("/tasks/toggle", {
      method: "PATCH",
      body: JSON.stringify({ date, index }),
    });
  },

  search(query: string, limit = 20): Promise<SearchResult[]> {
    return fetchJSON("/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
  },

  getSettings(): Promise<AppConfig> {
    return fetchJSON("/settings");
  },

  updateSettings(settings: Partial<AppConfig>): Promise<{ success: boolean }> {
    return fetchJSON("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  getHealth(): Promise<SetupStatus> {
    return fetchJSON("/health");
  },
};
```

- [ ] **Step 2: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/services/api.ts && git commit -m 'feat(frontend): add API client for all backend endpoints'"
```

---

## Task 13: Frontend — Shared Components

**Files:**
- Create: `frontend/src/components/TopBar.tsx`
- Create: `frontend/src/components/EntryInput.tsx`
- Create: `frontend/src/components/TaskList.tsx`
- Create: `frontend/src/components/MeetingList.tsx`
- Create: `frontend/src/components/DecisionList.tsx`
- Create: `frontend/src/components/SetupBanner.tsx`

- [ ] **Step 1: Create TopBar component**

Create `frontend/src/components/TopBar.tsx`:

```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function TopBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-lg font-bold text-white hover:text-slate-200">
          WorkLog AI
        </Link>
        <span className="text-sm text-slate-500">{today}</span>
      </div>
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search worklogs..."
            className="w-64 px-3 py-1.5 text-sm bg-slate-700 rounded-md text-slate-300 placeholder-slate-500 border border-slate-600 focus:outline-none focus:border-blue-500"
          />
        </form>
        <Link
          to="/settings"
          className="px-2.5 py-1.5 text-sm bg-slate-700 rounded-md text-slate-400 hover:text-white border border-slate-600"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create EntryInput component**

Create `frontend/src/components/EntryInput.tsx`:

```tsx
import { useState, useRef } from "react";
import { api } from "../services/api";

interface EntryInputProps {
  onSubmitted: () => void;
}

export default function EntryInput({ onSubmitted }: EntryInputProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    setLoading(true);
    setError("");
    try {
      await api.submitEntry(text, files);
      setText("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <label className="block text-sm text-slate-400 mb-2">What did you work on?</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Had a standup at 10am, discussed sprint priorities..."
        rows={3}
        className="w-full px-3 py-2 text-sm bg-slate-900 rounded-md text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-blue-500 resize-none"
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="hidden"
            id="screenshot-upload"
          />
          <label
            htmlFor="screenshot-upload"
            className="px-3 py-1 text-xs bg-slate-700 rounded text-slate-400 cursor-pointer hover:bg-slate-600"
          >
            Upload Screenshot
          </label>
          {files.length > 0 && (
            <span className="text-xs text-slate-500">{files.length} file(s)</span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || (!text.trim() && files.length === 0)}
          className="px-4 py-1 text-sm bg-blue-600 rounded text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create TaskList component**

Create `frontend/src/components/TaskList.tsx`:

```tsx
import { api } from "../services/api";
import type { TaskEntry } from "../types";

interface TaskListProps {
  tasks: (TaskEntry & { date?: string; index?: number })[];
  showDate?: boolean;
  onToggle?: () => void;
}

export default function TaskList({ tasks, showDate, onToggle }: TaskListProps) {
  async function handleToggle(date: string, index: number) {
    await api.toggleTask(date, index);
    onToggle?.();
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-600">No tasks</p>;
  }

  return (
    <div className="bg-slate-800 rounded-md overflow-hidden">
      {tasks.map((task, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 border-b border-slate-900 last:border-0"
        >
          <button
            onClick={() => task.date != null && task.index != null && handleToggle(task.date, task.index)}
            className={`text-sm ${task.completed ? "text-emerald-400" : "text-amber-400"}`}
          >
            {task.completed ? "✓" : "○"}
          </button>
          <span className={`text-sm flex-1 ${task.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
            {task.text}
          </span>
          {showDate && task.date && (
            <span className="text-xs text-slate-600">{task.date}</span>
          )}
          {task.due && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              task.due < new Date().toISOString().slice(0, 10) ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"
            }`}>
              due: {task.due}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create MeetingList component**

Create `frontend/src/components/MeetingList.tsx`:

```tsx
import type { MeetingEntry } from "../types";

interface MeetingListProps {
  meetings: MeetingEntry[];
}

export default function MeetingList({ meetings }: MeetingListProps) {
  if (meetings.length === 0) {
    return <p className="text-sm text-slate-600">No meetings</p>;
  }

  return (
    <div className="bg-slate-800 rounded-md overflow-hidden">
      {meetings.map((m, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-slate-900 last:border-0">
          <span className="text-sm text-blue-400 min-w-[45px]">{m.time}</span>
          <span className="text-sm text-slate-200">{m.text}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create DecisionList component**

Create `frontend/src/components/DecisionList.tsx`:

```tsx
interface DecisionListProps {
  decisions: { text: string; date?: string }[];
  showDate?: boolean;
}

export default function DecisionList({ decisions, showDate }: DecisionListProps) {
  if (decisions.length === 0) {
    return <p className="text-sm text-slate-600">No decisions</p>;
  }

  return (
    <div className="space-y-2">
      {decisions.map((d, i) => (
        <div key={i} className="text-sm text-slate-300">
          <div>{d.text}</div>
          {showDate && d.date && (
            <div className="text-xs text-slate-600">{d.date}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create SetupBanner component**

Create `frontend/src/components/SetupBanner.tsx`:

```tsx
import type { SetupStatus } from "../types";

interface SetupBannerProps {
  status: SetupStatus;
}

export default function SetupBanner({ status }: SetupBannerProps) {
  if (status.ready) return null;

  return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 mb-4">
      <h3 className="text-amber-400 font-bold text-sm mb-2">Setting up AI models...</h3>
      <div className="space-y-1">
        {status.models.map((m) => (
          <div key={m.name} className="flex items-center gap-2 text-sm">
            <span className={m.ready ? "text-emerald-400" : m.pulling ? "text-amber-400" : "text-slate-500"}>
              {m.ready ? "✓" : m.pulling ? "↓" : "○"}
            </span>
            <span className="text-slate-300">{m.name}</span>
            {m.pulling && <span className="text-xs text-amber-500">downloading...</span>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-2">This only happens on first launch. Models persist across restarts.</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/components/ && git commit -m 'feat(frontend): add shared UI components'"
```

---

## Task 14: Frontend — Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement the Dashboard page**

Replace `frontend/src/pages/Dashboard.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import TopBar from "../components/TopBar";
import EntryInput from "../components/EntryInput";
import TaskList from "../components/TaskList";
import MeetingList from "../components/MeetingList";
import DecisionList from "../components/DecisionList";
import SetupBanner from "../components/SetupBanner";
import { api } from "../services/api";
import type { DashboardData, SetupStatus } from "../types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dashboard, health] = await Promise.all([
        api.getDashboard(),
        api.getHealth(),
      ]);
      setData(dashboard);
      setSetup(health);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (setup && !setup.ready) {
      const interval = setInterval(async () => {
        const health = await api.getHealth();
        setSetup(health);
        if (health.ready) clearInterval(interval);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [setup]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <TopBar />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const todayTasks = (data?.today.tasks || []).map((t, i) => ({
    ...t,
    date: data?.today.date,
    index: i,
  }));

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />
      <div className="flex">
        <main className="flex-1 p-6 max-w-4xl">
          {setup && !setup.ready && <SetupBanner status={setup} />}

          <div className="mb-6">
            <EntryInput onSubmitted={loadData} />
          </div>

          <section className="mb-6">
            <h2 className="text-white font-bold text-sm mb-3">Today's Tasks</h2>
            <TaskList tasks={todayTasks} onToggle={loadData} />
          </section>

          <section className="mb-6">
            <h2 className="text-white font-bold text-sm mb-3">Meetings</h2>
            <MeetingList meetings={data?.today.meetings || []} />
          </section>
        </main>

        <aside className="w-72 border-l border-slate-800 p-6">
          <section className="mb-6">
            <h2 className="text-white font-bold text-sm mb-3">Recent Decisions</h2>
            <DecisionList decisions={(data?.today.decisions || []).map((d) => ({ text: d }))} />
          </section>

          <section>
            <h2 className="text-white font-bold text-sm mb-3">Overdue Items</h2>
            <TaskList
              tasks={(data?.overdueTasks || []).map((t) => ({ ...t }))}
              showDate
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/pages/Dashboard.tsx && git commit -m 'feat(frontend): implement Dashboard page with input, tasks, meetings, decisions'"
```

---

## Task 15: Frontend — Search Page

**Files:**
- Modify: `frontend/src/pages/Search.tsx`
- Create: `frontend/src/components/SearchResult.tsx`

- [ ] **Step 1: Create SearchResult component**

Create `frontend/src/components/SearchResult.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { SearchResult as SearchResultType } from "../types";

interface SearchResultProps {
  result: SearchResultType;
}

const typeColors: Record<string, string> = {
  task: "bg-blue-900/30 text-blue-400",
  decision: "bg-purple-900/30 text-purple-400",
  meeting: "bg-emerald-900/30 text-emerald-400",
  note: "bg-slate-700 text-slate-400",
};

export default function SearchResult({ result }: SearchResultProps) {
  return (
    <Link to={`/day/${result.date}`} className="block bg-slate-800 rounded-md p-3 hover:bg-slate-750 border border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[result.type] || typeColors.note}`}>
          {result.type}
        </span>
        <span className="text-xs text-slate-500">{result.date}</span>
        <span className="text-xs text-slate-600 ml-auto">{Math.round(result.score * 100)}% match</span>
      </div>
      <p className="text-sm text-slate-300">{result.text}</p>
      {result.tags.length > 0 && (
        <div className="flex gap-1 mt-1">
          {result.tags.map((tag) => (
            <span key={tag} className="text-xs text-slate-500">{tag}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Implement Search page**

Replace `frontend/src/pages/Search.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import SearchResultCard from "../components/SearchResult";
import { api } from "../services/api";
import type { SearchResult } from "../types";

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  async function performSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(q.trim());
      setResults(res);
      setSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />
      <main className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your worklogs..."
              className="flex-1 px-4 py-2 bg-slate-800 rounded-md text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {searched && results.length === 0 && (
          <p className="text-slate-500 text-center py-8">No results found</p>
        )}

        <div className="space-y-3">
          {results.map((result, i) => (
            <SearchResultCard key={i} result={result} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/pages/Search.tsx frontend/src/components/SearchResult.tsx && git commit -m 'feat(frontend): implement Search page with semantic search results'"
```

---

## Task 16: Frontend — Settings Page

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Implement Settings page**

Replace `frontend/src/pages/Settings.tsx`:

```tsx
import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { api } from "../services/api";
import type { AppConfig } from "../types";

export default function Settings() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getSettings().then(setConfig).catch(console.error);
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      await api.updateSettings(config);
      setMessage("Settings saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage("");
    try {
      const health = await api.getHealth();
      setMessage(health.ready ? "Connection successful — all models ready" : "Connected, but models are still loading");
    } catch {
      setMessage("Connection failed");
    } finally {
      setTesting(false);
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900">
        <TopBar />
        <p className="text-slate-500 text-center py-8">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-white text-lg font-bold mb-6">Settings</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Data Storage Path</label>
            <input
              type="text"
              value={config.dataPath}
              onChange={(e) => setConfig({ ...config, dataPath: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 rounded-md text-slate-300 border border-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">AI Provider</label>
            <select
              value={config.aiProvider}
              onChange={(e) => setConfig({ ...config, aiProvider: e.target.value as AppConfig["aiProvider"] })}
              className="w-full px-3 py-2 bg-slate-800 rounded-md text-slate-300 border border-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Ollama URL</label>
            <input
              type="text"
              value={config.ollamaUrl}
              onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 rounded-md text-slate-300 border border-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {(config.aiProvider === "openai" || config.aiProvider === "claude") && (
            <>
              {config.aiProvider === "openai" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    value={config.openaiApiKey}
                    onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-slate-800 rounded-md text-slate-300 border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {config.aiProvider === "claude" && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Claude API Key</label>
                  <input
                    type="password"
                    value={config.claudeApiKey}
                    onChange={(e) => setConfig({ ...config, claudeApiKey: e.target.value })}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 bg-slate-800 rounded-md text-slate-300 border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.includes("fail") ? "text-red-400" : "text-emerald-400"}`}>
            {message}
          </p>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/pages/Settings.tsx && git commit -m 'feat(frontend): implement Settings page with provider selection and API key management'"
```

---

## Task 17: Frontend — Day View Page

**Files:**
- Modify: `frontend/src/pages/DayView.tsx`

- [ ] **Step 1: Implement DayView page**

Replace `frontend/src/pages/DayView.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import TaskList from "../components/TaskList";
import MeetingList from "../components/MeetingList";
import { api } from "../services/api";
import type { DayWorklog } from "../types";

export default function DayView() {
  const { date } = useParams<{ date: string }>();
  const [worklog, setWorklog] = useState<DayWorklog | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadWorklog() {
    if (!date) return;
    try {
      const data = await api.getEntries(date);
      setWorklog(data);
    } catch (err) {
      console.error("Failed to load worklog:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorklog();
  }, [date]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <TopBar />
        <p className="text-slate-500 text-center py-8">Loading...</p>
      </div>
    );
  }

  if (!worklog) {
    return (
      <div className="min-h-screen bg-slate-900">
        <TopBar />
        <p className="text-slate-500 text-center py-8">No worklog found for {date}</p>
      </div>
    );
  }

  const tasks = worklog.tasks.map((t, i) => ({ ...t, date: worklog.date, index: i }));

  return (
    <div className="min-h-screen bg-slate-900">
      <TopBar />
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm">&larr; Dashboard</Link>
          <h1 className="text-white text-lg font-bold">Worklog — {worklog.date}</h1>
        </div>

        <section className="mb-6">
          <h2 className="text-white font-bold text-sm mb-3">Tasks</h2>
          <TaskList tasks={tasks} onToggle={loadWorklog} />
        </section>

        <section className="mb-6">
          <h2 className="text-white font-bold text-sm mb-3">Decisions</h2>
          {worklog.decisions.length === 0 ? (
            <p className="text-sm text-slate-600">None</p>
          ) : (
            <ul className="space-y-1">
              {worklog.decisions.map((d, i) => (
                <li key={i} className="text-sm text-slate-300">• {d}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-white font-bold text-sm mb-3">Meetings</h2>
          <MeetingList meetings={worklog.meetings} />
        </section>

        <section className="mb-6">
          <h2 className="text-white font-bold text-sm mb-3">Notes</h2>
          {worklog.notes.length === 0 ? (
            <p className="text-sm text-slate-600">None</p>
          ) : (
            <ul className="space-y-1">
              {worklog.notes.map((n, i) => (
                <li key={i} className="text-sm text-slate-300">• {n}</li>
              ))}
            </ul>
          )}
        </section>

        {worklog.tags.length > 0 && (
          <section>
            <h2 className="text-white font-bold text-sm mb-3">Tags</h2>
            <div className="flex gap-2 flex-wrap">
              {worklog.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400">{tag}</span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build"
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/pages/DayView.tsx && git commit -m 'feat(frontend): implement Day View page for viewing individual worklog entries'"
```

---

## Task 18: Frontend — Dockerfile and Nginx Config

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create nginx.conf**

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 20M;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/Dockerfile frontend/nginx.conf && git commit -m 'feat(frontend): add Dockerfile and Nginx config for production deployment'"
```

---

## Task 19: Frontend — Component Tests

**Files:**
- Create: `frontend/src/__tests__/components/EntryInput.test.tsx`
- Create: `frontend/src/__tests__/components/TaskList.test.tsx`

- [ ] **Step 1: Write EntryInput test**

Create `frontend/src/__tests__/components/EntryInput.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import EntryInput from "../../components/EntryInput";

vi.mock("../../services/api", () => ({
  api: {
    submitEntry: vi.fn().mockResolvedValue({ date: "2026-04-18", entry: {} }),
  },
}));

describe("EntryInput", () => {
  it("renders the input form", () => {
    render(<EntryInput onSubmitted={() => {}} />);
    expect(screen.getByPlaceholderText(/had a standup/i)).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByText("Upload Screenshot")).toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    render(<EntryInput onSubmitted={() => {}} />);
    expect(screen.getByText("Submit")).toBeDisabled();
  });

  it("submit button is enabled when text is entered", async () => {
    const user = userEvent.setup();
    render(<EntryInput onSubmitted={() => {}} />);
    await user.type(screen.getByPlaceholderText(/had a standup/i), "test entry");
    expect(screen.getByText("Submit")).toBeEnabled();
  });
});
```

- [ ] **Step 2: Write TaskList test**

Create `frontend/src/__tests__/components/TaskList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TaskList from "../../components/TaskList";

describe("TaskList", () => {
  it("renders 'No tasks' when list is empty", () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText("No tasks")).toBeInTheDocument();
  });

  it("renders tasks with completion status", () => {
    const tasks = [
      { text: "Done task", completed: true },
      { text: "Pending task", completed: false, due: "2026-04-21" },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.getByText("Pending task")).toBeInTheDocument();
    expect(screen.getByText("due: 2026-04-21")).toBeInTheDocument();
  });

  it("renders date when showDate is true", () => {
    const tasks = [{ text: "Task", completed: false, date: "2026-04-18", index: 0 }];
    render(<TaskList tasks={tasks} showDate />);
    expect(screen.getByText("2026-04-18")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run frontend tests**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vitest run"
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add frontend/src/__tests__/ && git commit -m 'test(frontend): add component tests for EntryInput and TaskList'"
```

---

## Task 20: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:

````markdown
# WorkLog AI

AI-powered daily worklog manager. Type what you worked on in natural language, and AI extracts tasks, decisions, meetings, and notes into structured, searchable markdown files.

## Features

- **Natural language input** — describe your day and AI structures it automatically
- **Screenshot processing** — upload meeting screenshots and AI extracts key details
- **Daily markdown files** — human-readable, one file per day, works outside the app
- **Semantic search** — find decisions, tasks, and notes by meaning, not just keywords
- **Dashboard** — see today's tasks, meetings, pending items, and recent decisions at a glance
- **Multiple AI providers** — Ollama (local, default), OpenAI, or Claude
- **Fully containerized** — one `docker compose up` to start everything

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run

```bash
git clone <repo-url> worklog-ai
cd worklog-ai
docker compose up --build
```

Open http://localhost:3000 in your browser.

On first launch, Ollama will automatically download the required models (~4GB total):
- `llama3.2` — text processing
- `llava` — screenshot/image OCR
- `nomic-embed-text` — embeddings for semantic search

This takes a few minutes depending on your connection. A progress indicator is shown in the dashboard.

### Development

**Backend:**
```bash
cd backend
npm install
npm run dev        # starts on port 4000
npm test           # run tests
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # starts on port 5173, proxies /api to :4000
npm test           # run tests
```

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ Backend  │────▶│  Ollama  │
│ React    │     │ Express  │     │  LLM     │
│ :3000    │     │ :4000    │     │  :11434  │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                      ├──▶ Markdown files (./data/)
                      │
                 ┌────▼─────┐
                 │ ChromaDB │
                 │ Vectors  │
                 │ :8000    │
                 └──────────┘
```

**Data flow:**
1. User types free text or uploads screenshots
2. Backend sends to AI for structured extraction
3. Structured data is saved to daily markdown file and indexed in ChromaDB
4. Dashboard shows today's entries; search queries ChromaDB for semantic matches

## Configuration

Edit `config.json` or use the Settings page in the UI:

| Setting | Default | Description |
|---------|---------|-------------|
| `dataPath` | `./data` | Where markdown files are stored |
| `aiProvider` | `ollama` | AI provider: `ollama`, `openai`, or `claude` |
| `ollamaUrl` | `http://ollama:11434` | Ollama server URL |
| `openaiApiKey` | (empty) | OpenAI API key (required if using OpenAI) |
| `claudeApiKey` | (empty) | Claude API key (required if using Claude) |
| `chromaUrl` | `http://chromadb:8000` | ChromaDB URL |

## Worklog Format

Each day produces a markdown file (`YYYY-MM-DD.md`):

```markdown
# Worklog - 2026-04-18

## Tasks
- [x] Reviewed PR #142
- [ ] Update API documentation (due: 2026-04-21)

## Decisions
- Migration timeline pushed to Q3

## Meetings
- 10:00 Standup — sprint priorities, blocker on payment API

## Notes
- Check Grafana dashboard for latency spikes

## Tags
#sprint-12 #migration #api
```

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, TypeScript
- **Backend:** Node.js 22, Express, TypeScript
- **AI:** Ollama (llama3.2, llava, nomic-embed-text), OpenAI (gpt-4o), Claude (sonnet)
- **Search:** ChromaDB with vector embeddings
- **Infrastructure:** Docker Compose

## License

MIT
````

- [ ] **Step 2: Commit**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git add README.md && git commit -m 'docs: add README with setup instructions, architecture, and usage guide'"
```

---

## Task 21: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx vitest run"
```

Expected: All tests PASS.

- [ ] **Step 2: Run all frontend tests**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vitest run"
```

Expected: All tests PASS.

- [ ] **Step 3: Verify both projects build**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/backend && npx tsc --noEmit && echo 'Backend OK'"
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai/frontend && npx vite build && echo 'Frontend OK'"
```

Expected: Both succeed.

- [ ] **Step 4: Verify git log looks clean**

```bash
wsl bash -c "cd /mnt/c/Users/slavhate/worklog-ai && git log --oneline"
```

Expected: A clean series of atomic commits from scaffolding through to docs.
