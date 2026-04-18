# WorkLog AI

AI-powered daily worklog manager. Type what you worked on in natural language, and AI extracts tasks, decisions, meetings, and notes into structured, searchable markdown files.

## Features

- **Natural language input** — describe your day and AI structures it automatically
- **Screenshot processing** — upload or paste (Ctrl+V) screenshots for AI text extraction
- **Daily markdown files** — human-readable, one file per day, works outside the app
- **Semantic search** — find decisions, tasks, and notes by meaning, not just keywords
- **Dark / light theme** — toggle between themes, respects system preference
- **Calendar navigation** — browse any day's worklog or log entries to a future date
- **Inline editing** — click the pencil icon on any entry to edit it in place
- **Meeting details** — attendees and notes shown as sub-items under each meeting
- **Task time tracking** — tasks can carry a time (e.g. 15:00) shown in the UI
- **Starred highlights** — mark entries as important with the star toggle, shown in sidebar
- **AI usage metrics** — sidebar tracks daily AI request counts and estimated tokens (persisted across restarts)
- **Processing indicators** — animated progress bar and success summary on submission
- **Dashboard** — today's tasks, meetings, pending items, overdue items at a glance
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

#### Ollama setup

By default the backend connects to Ollama on the host machine at `http://host.docker.internal:11434`. Install Ollama natively and pull the required models:

```bash
ollama pull llama3.2          # text processing
ollama pull llava             # screenshot/image OCR
ollama pull nomic-embed-text  # embeddings for semantic search
```

To run Ollama inside Docker instead, start with the `with-ollama` profile:

```bash
docker compose --profile with-ollama up --build
```

A setup banner on the dashboard shows model download progress.

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
│ :3000    │     │ :4000    │     │ :11434   │
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

Use the Settings page in the UI, or create a `config.json` in the project root:

| Setting | Default | Description |
|---------|---------|-------------|
| `dataPath` | `./data` | Where markdown files are stored |
| `aiProvider` | `ollama` | AI provider: `ollama`, `openai`, or `claude` |
| `ollamaUrl` | `http://host.docker.internal:11434` | Ollama server URL |
| `openaiApiKey` | (empty) | OpenAI API key (required if using OpenAI) |
| `claudeApiKey` | (empty) | Claude API key (required if using Claude) |
| `chromaUrl` | `http://chromadb:8000` | ChromaDB URL |

Environment variables `OLLAMA_URL`, `CHROMA_URL`, and `DATA_PATH` override the corresponding config values (set automatically in Docker).

## Worklog Format

Each day produces a markdown file (`YYYY-MM-DD.md`):

```markdown
# Worklog - 2026-04-18

## Tasks
- [x] 15:00 Reviewed PR #142.
- [ ] Update API documentation. (due: 2026-04-21)

## Decisions
- Migration timeline pushed to Q3

## Meetings
- 10:00 Daily standup.
  - Attendees: Alice, Bob, Charlie
  - Discussed sprint blockers on payment API.
  - Agreed to prioritise hotfix for checkout latency.

## Notes
- Check Grafana dashboard for latency spikes

## Highlights
- Migration timeline pushed to Q3

## Tags
#sprint-12 #migration #api
```

## Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, TypeScript
- **Backend:** Node.js 22, Express, TypeScript
- **AI:** Ollama (llama3.2, llava, nomic-embed-text), OpenAI (gpt-4o), Claude (sonnet)
- **Search:** ChromaDB with vector embeddings
- **Infrastructure:** Docker Compose

## License

MIT
