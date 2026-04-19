import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.js";

const PUBLIC_PATHS = ["/api/auth/", "/api/health"];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    (req as unknown as Record<string, unknown>).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
