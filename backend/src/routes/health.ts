import { Router } from "express";
import { getSetupStatus } from "../services/model-setup.js";
import { getTokenUsage } from "../services/token-usage.js";

const router = Router();

router.get("/health", (_req, res) => {
  const status = getSetupStatus();
  res.json({ ...status, tokenUsage: getTokenUsage() });
});

export default router;
