# Work Summary Report — Design Spec

## Goal

Add a Report feature that lets users select a date range, view an aggregated summary of their worklogs with volume stats and highlights, optionally generate an AI narrative summary, and download the report as a self-contained HTML file.

## Architecture

### Backend

Two new endpoints in a new `routes/report.ts` file:

**`GET /api/report?start=YYYY-MM-DD&end=YYYY-MM-DD`**

- Iterates all markdown files in the data directory whose filenames fall within the date range (inclusive)
- Parses each using the existing `parseWorklog()` from `services/markdown.ts`
- Aggregates into a `ReportData` response:

```typescript
interface ReportData {
  startDate: string;
  endDate: string;
  stats: {
    tasksCompleted: number;
    tasksTotal: number;
    meetingsAttended: number;
    decisionsMade: number;
    notesCount: number;
    daysWithEntries: number;
  };
  highlights: { text: string; date: string }[];
  decisions: { text: string; date: string }[];
  meetings: { time: string; text: string; date: string; attendees?: string[] }[];
  pendingTasks: { text: string; date: string; due?: string }[];
  tagFrequency: { tag: string; count: number }[];
}
```

- Protected by existing auth middleware
- No AI involvement — pure data aggregation, instant response

**`POST /api/report/summary`**

- Request body: `{ startDate: string, endDate: string }`
- Collects all worklogs in range (same as above)
- Builds a text representation of the aggregated data
- Sends to the current AI provider with a prompt asking for a narrative summary suitable for performance reviews
- Returns: `{ summary: string }`
- Protected by existing auth middleware

### Frontend

**New page: `pages/Report.tsx`**

Route: `/report`

**Layout (top to bottom):**

1. **Date range selector** — two date inputs (start, end) and a "Generate Report" button
2. **Stats header bar** — horizontal row of stat cards showing:
   - Tasks completed / total
   - Meetings attended
   - Decisions made
   - Notes count
   - Days with entries
3. **Action buttons row** — "Generate AI Summary" button and "Download HTML" button
4. **Highlights section** — all starred highlights listed with dates, visually distinct
5. **AI Summary section** — hidden until generated, shows narrative text with a loading indicator during generation
6. **Detailed breakdown sections:**
   - Decisions (grouped by date)
   - Meetings (grouped by date, with attendees)
   - Pending tasks (incomplete tasks from the range)
   - Top tags (most frequently used)

**Navigation:** Add "Reports" link to TopBar, between Settings and Logout.

### HTML Download

Generated entirely on the frontend — no backend endpoint needed.

- Builds a self-contained HTML string with inline CSS from the current report state
- Includes: stats, highlights, AI summary (if generated), detailed breakdown
- Styled for both screen viewing and printing (clean, professional layout)
- Uses `@media print` CSS rules for clean printing
- Triggered via `Blob` + `URL.createObjectURL` + anchor click pattern
- Filename: `worklog-report-YYYY-MM-DD-to-YYYY-MM-DD.html`
- No external dependencies (fonts, stylesheets, scripts) — fully self-contained

### AI Summary Prompt

The prompt sent to the AI provider:

```
Summarize the following work log data for a performance review. Write 2-3 paragraphs covering:
1. Key themes and focus areas during this period
2. Notable accomplishments and decisions
3. Work patterns and collaboration

Data:
- Period: {startDate} to {endDate}
- Tasks completed: {count} of {total}
- Meetings attended: {count}
- Decisions made: {count}

Highlights:
{highlights list}

Decisions:
{decisions list}

Meeting topics:
{meetings list}

Keep the tone professional and factual. Focus on impact and patterns.
```

### AI Provider Change

The current `AIProvider` interface has `processText()`, `processImage()`, and `generateEmbedding()`. None of these support general text completion/summarization. Add a new method:

```typescript
summarize(prompt: string): Promise<string>;
```

This method sends a free-form prompt to the provider and returns the text response. Implemented in all three providers (Ollama, OpenAI, Claude) using their respective chat completion APIs with the same model used for `processText()`.

## Data Flow

1. User navigates to `/report`
2. Selects date range, clicks "Generate Report"
3. Frontend calls `GET /api/report?start=...&end=...`
4. Backend parses markdown files in range, aggregates, returns `ReportData` JSON
5. Frontend renders stats bar, highlights, detailed breakdown
6. User optionally clicks "Generate AI Summary"
7. Frontend calls `POST /api/report/summary` with date range
8. Backend collects worklogs, sends to AI provider, returns narrative text
9. Frontend displays AI summary in the report
10. User clicks "Download HTML"
11. Frontend builds self-contained HTML from current report state, triggers download

## File Changes

### New files
- `backend/src/routes/report.ts` — report endpoints
- `frontend/src/pages/Report.tsx` — report page

### Modified files
- `backend/src/index.ts` — register report router
- `frontend/src/App.tsx` — add `/report` route
- `frontend/src/components/TopBar.tsx` — add Reports link
- `frontend/src/services/api.ts` — add report API methods
- `frontend/src/types/index.ts` — add ReportData type
- `backend/src/types/index.ts` — add ReportData type

## Error Handling

- If no markdown files exist in the date range, return empty stats (all zeros) and empty arrays — not an error
- If AI summary generation fails, show error message in the AI summary section with a retry button
- If date range is invalid (start > end), disable the Generate button on the frontend
- AI summary endpoint returns 503 if AI provider is not configured/available

## Testing

- Backend: test report aggregation with mock markdown files (correct counts, date filtering, tag frequency sorting)
- Backend: test edge cases (empty range, single day, range with no files)
- Frontend: test report page renders stats correctly, download triggers
