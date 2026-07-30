// auth.ts — drop-in authentication + user management module for the
// light_client_voice_assistant Node.js server. Adds:
//   - POST /api/auth/login
//   - GET  /api/auth/me
//   - GET/POST /api/users
//   - PATCH/DELETE /api/users/:id
//   - `requireAuth`, `requireAdmin` middleware
//   - Auto-seeds an "admin" user with password "admin0466" on startup.
//
// Users are persisted to ./users.json alongside your server.

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, Express } from "express";

const USERS_FILE = path.join(process.cwd(), "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-long-random-string";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin0466";
const TOKEN_TTL_DAYS = 30;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "user";
  allowedPages: string[];
  allowedDevices: string[];
  createdAt: number;
}

interface AuthedRequest extends Request {
  user?: User;
}

// ---------- persistence ----------
function loadUsers(): User[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error("[auth] Failed to load users.json:", e);
  }
  return [];
}
function saveUsers(users: User[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

let users: User[] = loadUsers();

function publicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    allowed_pages: u.allowedPages,
    allowed_devices: u.allowedDevices,
    created_at: new Date(u.createdAt).toISOString(),
  };
}

// ---------- seeding ----------
function ensureAdmin() {
  const admin = users.find((u) => u.username === ADMIN_USERNAME);
  if (!admin) {
    users.push({
      id: `u_${Date.now()}_admin`,
      username: ADMIN_USERNAME,
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      name: "Administrator",
      role: "admin",
      allowedPages: ["dashboard", "voice", "shopping", "settings", "users"],
      allowedDevices: [],
      createdAt: Date.now(),
    });
    saveUsers(users);
    console.log("[auth] Seeded admin user (admin / admin0466)");
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, admin.passwordHash)) {
    admin.passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    saveUsers(users);
    console.log("[auth] Reset admin password to admin0466");
  }
}
ensureAdmin();

// ---------- middleware ----------
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin required" });
    next();
  });
}

// ---------- route registration ----------
export function registerAuthRoutes(app: Express) {
  // Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const user = users.find((u) => u.username === String(username).trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
    res.json({ token, user: publicUser(user) });
  });

  // Whoami
  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
    res.json(publicUser(req.user!));
  });

  app.post("/api/auth/logout", (_req, res) => res.json({ ok: true }));

  // List users
  app.get("/api/users", requireAdmin, (_req, res) => {
    res.json(users.map(publicUser));
  });

  // Create user
  app.post("/api/users", requireAdmin, (req, res) => {
    const { username, password, name, allowed_pages, allowed_devices } = req.body || {};
    const uname = String(username || "").trim().toLowerCase();
    if (!uname || !password || String(password).length < 4) {
      return res.status(400).json({ error: "username & password (>=4) required" });
    }
    if (users.some((u) => u.username === uname)) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const u: User = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: uname,
      passwordHash: bcrypt.hashSync(password, 10),
      name: name || uname,
      role: "user",
      allowedPages: Array.isArray(allowed_pages) ? allowed_pages : ["dashboard"],
      allowedDevices: Array.isArray(allowed_devices) ? allowed_devices : [],
      createdAt: Date.now(),
    };
    users.push(u);
    saveUsers(users);
    res.json(publicUser(u));
  });

  // Update user
  app.patch("/api/users/:id", requireAdmin, (req, res) => {
    const u = users.find((x) => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: "User not found" });
    const { password, name, allowed_pages, allowed_devices } = req.body || {};
    if (password && String(password).length >= 4) u.passwordHash = bcrypt.hashSync(password, 10);
    if (name !== undefined) u.name = String(name);
    if (Array.isArray(allowed_pages)) u.allowedPages = allowed_pages;
    if (Array.isArray(allowed_devices)) u.allowedDevices = allowed_devices;
    saveUsers(users);
    res.json(publicUser(u));
  });

  // Delete user
  app.delete("/api/users/:id", requireAdmin, (req, res) => {
    const u = users.find((x) => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: "User not found" });
    if (u.role === "admin") return res.status(400).json({ error: "Cannot delete admin" });
    users = users.filter((x) => x.id !== req.params.id);
    saveUsers(users);
    res.json({ ok: true });
  });
}

/**
 * Wrap the built-in permission check for a device control action.
 * Call from your existing /api/devices/control handler if you want per-user device gating.
 */
export function canControlDevice(user: User | undefined, deviceId: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.allowedDevices.includes(deviceId);
}
