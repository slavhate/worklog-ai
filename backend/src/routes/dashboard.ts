import { Router } from "express";
import fs from "fs/promises";
import { parseWorklog, formatDate, getAllPendingTasks } from "../services/markdown.js";

export function createDashboardRouter(dataPath: string) {
  const router = Router();

  router.get("/dashboard", async (_req, res) => {
    try {
      const today = formatDate(new Date());
      const worklog = await parseWorklog(dataPath, today);
      const allPending = await getAllPendingTasks(dataPath);
      const overdue = allPending.filter((t) => t.due && t.due < today);

      let files: string[] = [];
      try {
        files = (await fs.readdir(dataPath)).filter((f) => f.endsWith(".md")).sort().reverse();
      } catch {}
      const recentHighlights: { text: string; date: string }[] = [];
      for (const f of files.slice(0, 30)) {
        const date = f.replace(".md", "");
        const wl = await parseWorklog(dataPath, date);
        for (const h of wl.highlights) {
          recentHighlights.push({ text: h, date });
        }
      }

      res.json({
        today: worklog,
        pendingTasks: allPending,
        overdueTasks: overdue,
        recentHighlights: recentHighlights.slice(0, 5),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  return router;
}
