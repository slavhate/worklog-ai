import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { User, JwtPayload } from "../types/index.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

let jwtSecret: string;
let usersFilePath: string;
let users: User[] = [];

export async function initAuth(dataPath: string): Promise<void> {
  usersFilePath = path.join(dataPath, "users.json");
  const secretPath = path.join(dataPath, ".jwt-secret");

  try {
    jwtSecret = await fs.readFile(secretPath, "utf-8");
  } catch {
    jwtSecret = crypto.randomBytes(64).toString("hex");
    await fs.mkdir(dataPath, { recursive: true });
    await fs.writeFile(secretPath, jwtSecret);
  }

  try {
    const raw = await fs.readFile(usersFilePath, "utf-8");
    users = JSON.parse(raw);
  } catch {
    users = [];
  }
}

async function saveUsers(): Promise<void> {
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
}

export async function registerUser(username: string, password: string): Promise<User> {
  if (users.find((u) => u.username === username)) {
    throw new Error("Username already taken");
  }
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers();
  return user;
}

export async function authenticateUser(username: string, password: string): Promise<User> {
  const user = users.find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error("Invalid username or password");
  }
  return user;
}

export function generateToken(user: User): string {
  const payload: JwtPayload = { userId: user.id, username: user.username };
  return jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret) as JwtPayload;
}

export function getUserCount(): number {
  return users.length;
}
