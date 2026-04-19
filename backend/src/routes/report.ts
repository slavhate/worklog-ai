import { Router } from "express";
import { aggregateReport, buildSummaryPrompt } from "../services/report.js";
import type { AIProvider } from "../types/index.js";

export function createReportRouter(dataPath: string, getProvider: () => AIProvider) {
  const router = Router();

  router.get("/report", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end || typeof start !== "string" || typeof end !== "string") {
      res.status(400).json({ error: "start and end query parameters are required (YYYY-MM-DD)" });
      return;
    }
    if (start > end) {
      res.status(400).json({ error: "start date must be before or equal to end date" });
      return;
    }
    try {
      const report = await aggregateReport(dataPath, start, end);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  router.post("/report/summary", async (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }
    try {
      const report = await aggregateReport(dataPath, startDate, endDate);
      const prompt = buildSummaryPrompt(report);
      const summary = await getProvider().summarize(prompt);
      res.json({ summary });
    } catch (err) {
      res.status(503).json({ error: "AI summary generation failed" });
    }
  });

  return router;
}
