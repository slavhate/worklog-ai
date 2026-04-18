# WorkLog AI — Design Specification

## Overview

WorkLog AI is a single-user, containerized web application for capturing daily work activities via natural language input. An AI layer (Ollama by default, with optional OpenAI/Claude support) processes free text and screenshots into structured worklog entries stored as human-readable markdown files — one per day. Semantic search powered by ChromaDB enables querying across all worklogs for decisions, pending items, and historical context.

## Goals

- Capture daily tasks, decisions, meetings, and notes with minimal friction
- Extract structured data from natural language and screenshots using local AI
- Produce human-readable markdown worklogs that work outside the app
- Enable semantic search across all worklogs for performance reviews, decision tracking, and todo management
- Run entirely in Docker with one `docker compose up` command
- Open-source friendly, publishable to GitHub

## Architecture

### Containers (Docker Compose)

| Container | Image/Stack | Port | Purpose |
|-----------|-------------|------|---------|
| frontend | React + Vite, Nginx (prod) | 3000 | UI — input, dashboard, search, settings |
| backend | Node.js + Express + TypeScript | 4000 | REST API, AI orchestration, file management |
| ollama | ollama/ollama | 11434 | Local LLM (llama3.2 for text, llava for vision) |
| chromadb | chromadb/chroma | 8000 | Vector store for semantic search |

### Data Flow

#### Input Processing

1. User submits free text and/or screenshot uploads via the frontend
2. Backend receives the request
3. Screenshots are sent to the vision model (llava) for OCR/text extraction
4. All text (user input + extracted screenshot text) is sent to the text model (llama3.2) with a structured extraction prompt
5. The AI returns structured JSON containing categorized entries: tasks, decisions, meetings, notes, and tags
6. Backend appends the structured entries to today's markdown file
7. Backend generates embeddings for each entry and stores them in ChromaDB with metadata (date, type, tags, people)

#### Search

1. User submits a search query
2. Backend generates an embedding for the query via Ollama
3. ChromaDB performs similarity search against stored embeddings
4. Results are returned ranked by relevance, with links to source markdown files and dates

## Markdown File Format

One file per day, stored at `{dataPath}/YYYY-MM-DD.md`:

```markdown
# Worklog - 2026-04-18

## Tasks
- [x] Completed task with details
- [ ] Pending task (due: 2026-04-21)

## Decisions
- Migration timeline pushed to Q3 — agreed with John

## Meetings
- 10:00 Standup — discussed sprint priorities

## Notes
- Free-form observations, ideas, links

## Tags
#project-alpha #migration #sprint-12
```

Sections are appended to throughout the day. If a section already exists in the file, new entries are added under it. If the file doesn't exist yet, it's created with the full template.

## Frontend

### Tech Stack
- React 19 with Vite
- TypeScript
- Tailwind CSS for styling
- React Router for navigation

### Pages

#### Dashboard (/)
- **Top bar**: App name, current date, search bar, settings icon
- **Main area**: 
  - Text input box with placeholder "What did you work on?" and screenshot upload button
  - Today's tasks with completion status and due dates (clickable to toggle)
  - Today's meetings with times and summaries
- **Right sidebar**:
  - Recent decisions (last 7 days)
  - Overdue/pending items across all days

#### Search (/search)
- Search input with results displayed below
- Each result shows the matched entry, its type (task/decision/meeting/note), date, and relevance score
- Click a result to navigate to that day's full worklog

#### Settings (/settings)
- Data storage path configuration
- AI provider selection (Ollama/OpenAI/Claude)
- API key input fields for OpenAI and Claude (shown conditionally)
- Ollama URL configuration
- Connection test button for the selected provider

#### Day View (/day/:date)
- Full rendered view of a specific day's markdown worklog
- Edit capability for individual entries

## Backend

### Tech Stack
- Node.js 22 LTS
- Express.js
- TypeScript
- Multer for file uploads
- Ollama JS client (`ollama`)
- OpenAI SDK (`openai`)
- Anthropic SDK (`@anthropic-ai/sdk`)
- ChromaDB client (`chromadb`)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/entries` | POST | Submit free text + screenshots; AI processes and saves to markdown + ChromaDB |
| `/api/entries/:date` | GET | Get all entries for a specific date (parsed from markdown) |
| `/api/tasks` | GET | Get pending/overdue tasks across all days |
| `/api/tasks/toggle` | PATCH | Toggle task completion; body: `{ date, section, index }` identifying the task by its position in the markdown |
| `/api/search` | POST | Semantic search across all worklogs via ChromaDB |
| `/api/dashboard` | GET | Today's summary: tasks, meetings, decisions, overdue items |
| `/api/settings` | GET | Read current settings |
| `/api/settings` | PUT | Update settings (data path, AI provider, API keys) |

### AI Provider Abstraction

A provider interface that all three providers implement:

- `processText(text: string): Promise<StructuredEntry>` — extract tasks, decisions, meetings, notes, tags from text
- `processImage(image: Buffer): Promise<string>` — extract text from a screenshot
- `generateEmbedding(text: string): Promise<number[]>` — generate vector embedding for search

Providers:
- **OllamaProvider** (default): Uses llama3.2 for text, llava for vision, nomic-embed-text for embeddings
- **OpenAIProvider**: Uses gpt-4o for text + vision, text-embedding-3-small for embeddings
- **ClaudeProvider**: Uses claude-sonnet-4-6-20250514 for text + vision; embeddings fall back to Ollama (Anthropic doesn't offer an embedding model)

## Configuration

Stored in `config.json` at the app root (mounted volume):

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

- `dataPath`: Where markdown worklog files are stored. Defaults to `./data` in the app directory. Configurable to any path on the host via volume mount.
- `aiProvider`: Active provider — `ollama`, `openai`, or `claude`.
- API keys are stored in the config file; the settings UI masks them after entry.

## Docker Compose

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    volumes:
      - ${DATA_PATH:-./data}:/app/data
      - ./config.json:/app/config.json
    depends_on: [ollama, chromadb]
    environment:
      - DATA_PATH=/app/data

  ollama:
    image: ollama/ollama
    ports: ["11434:11434"]
    volumes:
      - ollama_data:/root/.ollama

  chromadb:
    image: chromadb/chroma
    ports: ["8000:8000"]
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  ollama_data:
  chroma_data:
```

## First-Run Setup

On first `docker compose up`, Ollama starts with no models. The backend checks for required models on startup and pulls them automatically:
- `llama3.2` — text processing
- `llava` — vision/screenshot OCR
- `nomic-embed-text` — embeddings for semantic search

The frontend shows a setup progress indicator until models are ready. Subsequent startups skip this step since models persist in the `ollama_data` volume.

## Error Handling

- If Ollama is not running or models aren't pulled, the backend returns a clear error and the frontend shows setup instructions
- If ChromaDB is unavailable, search is disabled but entry submission still works (markdown files are always written)
- Screenshot processing failures don't block text processing — errors are logged and the user is notified
- Invalid AI responses are caught and the raw text is saved as a note rather than lost

## Testing Strategy

- **Backend**: Unit tests for AI provider abstraction, markdown parsing/writing, and API endpoints using Vitest
- **Frontend**: Component tests with React Testing Library, integration tests for key flows
- **E2E**: Optional docker compose test setup with mock Ollama responses

## Project Structure

```
worklog-ai/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Dashboard, Search, Settings, DayView
│   │   ├── services/        # API client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/          # Express route handlers
│   │   ├── services/        # AI providers, markdown, search
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── data/                    # Default worklog storage (gitignored)
├── docker-compose.yml
├── config.json              # App configuration
├── .gitignore
├── LICENSE
└── README.md
```
