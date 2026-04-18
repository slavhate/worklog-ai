import { Router } from "express";
import { getAllPendingTasks, toggleTask } from "../services/markdown.js";
import { ToggleTaskRequest } from "../types/index.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
      if (!date || !DATE_PATTERN.test(date) || typeof index !== "number") {
        res.status(400).json({ error: "Invalid request. Requires date (YYYY-MM-DD) and index (number)" });
        return;
      }
      await toggleTask(dataPath, date, index);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to toggle task" });
    }
  });

  return router;
}
