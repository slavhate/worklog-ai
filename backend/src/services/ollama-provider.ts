import { Ollama } from "ollama";
import { AIProvider, StructuredEntry } from "../types/index.js";
import { trackUsage } from "./token-usage.js";

const EXTRACTION_PROMPT = `You are a worklog assistant. Extract structured data from the user's text.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "tasks": [{"text": "task description", "completed": false, "due": "YYYY-MM-DD or null", "time": "HH:MM or null"}],
  "decisions": ["decision text"],
  "meetings": [{"time": "HH:MM", "text": "meeting description", "attendees": ["person name"], "notes": ["key point or discussion note"]}],
  "notes": ["note text"],
  "tags": ["#tag1", "#tag2"]
}
Rules:
- Each item must appear in EXACTLY ONE category. Never put the same item in multiple categories.
- Tasks are action items or work done (e.g. "reviewed PR", "wrote tests", "fixed bug"). If the text says something was done, mark completed: true. If a time is mentioned for the task, include it in "time" (HH:MM format). Otherwise set time to null.
- Meetings are ONLY scheduled gatherings or calls with other people (e.g. "standup", "1:1", "sync", "retrospective"). An individual activity like "reviewed code" or "wrote docs" is a task, NOT a meeting, even if it has a time.
- Decisions are choices or agreements made.
- Meeting attendees are people mentioned as participants. Put them in the meeting's "attendees" array. If no attendees are mentioned, use an empty array.
- Meeting notes are details, discussion points, or outcomes specific to that meeting. Put them in the meeting's "notes" array. Only put notes unrelated to any meeting in the top-level "notes" array.
- Notes are anything else worth recording.
- Tags are topics, project names, or categories. Always prefix with #.
- If a category has no items, use an empty array.
- IMPORTANT: All text output must use proper English grammar. Start every sentence with a capital letter. End every sentence with a full stop. Use correct punctuation throughout.`;

export class OllamaProvider implements AIProvider {
  private client: Ollama;

  constructor(baseUrl: string) {
    this.client = new Ollama({ host: baseUrl });
  }

  async processText(text: string): Promise<StructuredEntry> {
    trackUsage("text", text.length);
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
    trackUsage("image", image.length);
    const response = await this.client.chat({
      model: "llava",
      messages: [
        {
          role: "user",
          content: "Extract all text and important information from this image. Be thorough. Output ONLY the extracted content. Do NOT add any commentary, disclaimers, redaction notices, or privacy warnings.",
          images: [image.toString("base64")],
        },
      ],
    });
    return response.message.content;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    trackUsage("embedding", text.length);
    const response = await this.client.embed({
      model: "nomic-embed-text",
      input: text,
    });
    return response.embeddings[0];
  }

  async summarize(prompt: string): Promise<string> {
    trackUsage("text", prompt.length);
    const response = await this.client.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
    });
    return response.message.content;
  }
}
