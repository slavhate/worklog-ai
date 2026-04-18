import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { AIProvider, StructuredEntry, DayWorklog } from "../types/index.js";
import { appendEntries, parseWorklog, formatDate, renderWorklog } from "../services/markdown.js";
import { SearchService } from "../services/search.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createEntriesRouter(dataPath: string, getProvider: () => AIProvider, getSearch: () => SearchService) {
  const router = Router();

  router.post("/entries", upload.array("screenshots", 10), async (req, res) => {
    try {
      const { text } = req.body || {};
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
      if (req.body.highlight === "true") {
        const summaryParts: string[] = [];
        for (const t of entry.tasks) summaryParts.push(t.text);
        for (const d of entry.decisions) summaryParts.push(d);
        for (const m of entry.meetings) summaryParts.push(m.text);
        if (summaryParts.length > 0) entry.highlights = summaryParts;
      }
      const targetDate = req.body.date && DATE_PATTERN.test(req.body.date)
        ? req.body.date
        : formatDate(new Date());
      await appendEntries(dataPath, targetDate, entry);

      const search = getSearch();
      try {
        const allTexts = [
          ...entry.tasks.map((t) => ({ text: t.text, type: "task" })),
          ...entry.decisions.map((d) => ({ text: d, type: "decision" })),
          ...entry.meetings.map((m) => ({ text: `${m.time} ${m.text}`, type: "meeting" })),
          ...entry.notes.map((n) => ({ text: n, type: "note" })),
        ];
        for (const item of allTexts) {
          await search.indexEntry(item.text, item.type, targetDate, entry.tags);
        }
      } catch (err) {
        console.error("Search indexing failed:", err);
      }

      res.json({ date: targetDate, entry });
    } catch (err) {
      console.error("Entry processing failed:", err);
      res.status(500).json({ error: "Failed to process entry" });
    }
  });

  router.get("/entries/:date", async (req, res) => {
    try {
      if (!DATE_PATTERN.test(req.params.date)) {
        res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
        return;
      }
      const worklog = await parseWorklog(dataPath, req.params.date);
      res.json(worklog);
    } catch (err) {
      res.status(500).json({ error: "Failed to read worklog" });
    }
  });

  router.put("/entries/:date", async (req, res) => {
    try {
      if (!DATE_PATTERN.test(req.params.date)) {
        res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
        return;
      }
      const wl: DayWorklog = req.body;
      wl.date = req.params.date;
      await fs.mkdir(dataPath, { recursive: true });
      await fs.writeFile(path.join(dataPath, `${wl.date}.md`), renderWorklog(wl));
      res.json(wl);
    } catch (err) {
      res.status(500).json({ error: "Failed to save worklog" });
    }
  });

  return router;
}
