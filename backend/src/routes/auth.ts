import { Router } from "express";
import { registerUser, authenticateUser, generateToken, getUserCount } from "../services/auth.js";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }
  try {
    const user = await registerUser(username.trim(), password);
    const token = generateToken(user);
    res.json({ token, username: user.username });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(409).json({ error: message });
  }
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  try {
    const user = await authenticateUser(username.trim(), password);
    const token = generateToken(user);
    res.json({ token, username: user.username });
  } catch {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

router.get("/auth/status", (_req, res) => {
  res.json({ hasUsers: getUserCount() > 0 });
});

export default router;
