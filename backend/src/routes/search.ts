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
