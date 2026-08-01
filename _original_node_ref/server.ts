import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "jerry-secret-key-123";

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`\x1b[36m[API]\x1b[0m ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// GLOBAL CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

// Persistence Paths (Absolute for Docker stability)
const STATE_FILE = path.join(process.cwd(), "device_state.json");
const SHOPPING_FILE = path.join(process.cwd(), "shopping_list.json");
const USERS_FILE = path.join(process.cwd(), "users.json");
const SUGGESTIONS_FILE = path.join(process.cwd(), "suggestions.json");
const HUB_CONFIG_FILE = path.join(process.cwd(), "hub_config.json");
const PASSWORDS_FILE = path.join(process.cwd(), "passwords.json");

// Centralized State
interface Device {
  id: string;
  name: string;
  room: string;
  deviceKey: string;
  category: string;
  on: boolean;
  value?: number;
  statusText: string;
}

interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "user";
  allowedPages: string[];
  allowedDevices: string[];
  createdAt: number;
}

interface Passwords {
  home: string;
  list: string;
  admin: string;
}

let devices: Device[] = [
  { id: "living room.ambient light", name: "Ambient Light", room: "living room", deviceKey: "ambient light", category: "lighting", on: true, statusText: "On" },
  { id: "living room.party light", name: "Party Light", room: "living room", deviceKey: "party light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.passage light", name: "Passage Light", room: "living room", deviceKey: "passage light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.spot light", name: "Spot Light", room: "living room", deviceKey: "spot light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.fan", name: "Ceiling Fan", room: "living room", deviceKey: "fan", category: "fan", on: true, value: 3, statusText: "Speed 3" },
  { id: "living room.ac", name: "Air Conditioner", room: "living room", deviceKey: "ac", category: "ac", on: false, value: 22, statusText: "Off" },
  { id: "living room.tv", name: "Television", room: "living room", deviceKey: "tv", category: "media", on: false, statusText: "Off" },
  { id: "dine-in.ambient light", name: "Ambient Light", room: "dine-in", deviceKey: "ambient light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.spot light", name: "Spot Light", room: "dine-in", deviceKey: "spot light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.low spot light", name: "Low Spot Light", room: "dine-in", deviceKey: "low spot light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.fan", name: "Fan Switch", room: "dine-in", deviceKey: "fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom.ambient light", name: "Ambient Light", room: "bedroom", deviceKey: "ambient light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.bedside light", name: "Bedside Light", room: "bedroom", deviceKey: "bedside light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.fan", name: "Fan Switch", room: "bedroom", deviceKey: "fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom.spot light", name: "Spot Light", room: "bedroom", deviceKey: "spot light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.low ambient light", name: "Low Ambient Light", room: "bedroom 2", deviceKey: "low ambient light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.fan", name: "Fan Switch", room: "bedroom 2", deviceKey: "fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom 2.spot light", name: "Spot Light", room: "bedroom 2", deviceKey: "spot light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.high ambient light", name: "High Ambient Light", room: "bedroom 2", deviceKey: "high ambient light", category: "lighting", on: false, statusText: "Off" }
];

let users: User[] = [];
let shoppingList: any[] = [];
let suggestions: string[] = [
  "potato / আলু", "tomato / টমেটো", "onion / পেঁয়াজ", "milk / দুধ", "Ginger / আদা",
  "garlic / রসুন", "Green vegies / সবুজ সবজি", "Chicken / মুরগির মাংস", "Katla Fish / কাতলা মাছ",
  "Lote fish / লোটে মাছ", "Chingri Fish / চিংড়ি মাছ", "Hilsa Fish / ইলিশ মাছ", "Masala / মশলা",
  "Egg / ডিম", "Capcicum / ক্যাপসিকাম", "Beans / বিনস", "Carrot / গাজর", "Rice / চাল",
  "Protine Atta / প্রোটিন আটা"
];
let passwords: Passwords = { home: "home0466", list: "list0466", admin: "admin0466" };
let IOT_HUB_URL = "http://192.168.29.112:8000/";

// ---------- Helpers ----------
function saveAll() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(devices, null, 2));
    fs.writeFileSync(SHOPPING_FILE, JSON.stringify(shoppingList, null, 2));
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    fs.writeFileSync(HUB_CONFIG_FILE, JSON.stringify({ url: IOT_HUB_URL }, null, 2));
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
  } catch (e) {}
}

function loadAll() {
  try {
    if (fs.existsSync(STATE_FILE)) devices = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (fs.existsSync(SHOPPING_FILE)) shoppingList = JSON.parse(fs.readFileSync(SHOPPING_FILE, "utf8"));
    if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    if (fs.existsSync(SUGGESTIONS_FILE)) suggestions = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf8"));
    if (fs.existsSync(PASSWORDS_FILE)) {
      const loaded = JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf8"));
      passwords = { ...passwords, ...loaded };
    }
    if (fs.existsSync(HUB_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(HUB_CONFIG_FILE, "utf8"));
      if (config.url) IOT_HUB_URL = config.url.endsWith("/") ? config.url : `${config.url}/`;
    }
  } catch (e) {}

  // Ensure default admin user always exists in the DB too
  if (!users.find(u => u.username === "admin")) {
    users.push({
      id: "u_admin",
      username: "admin",
      passwordHash: bcrypt.hashSync("admin0466", 10),
      name: "Administrator",
      role: "admin",
      allowedPages: ["dashboard", "shopping", "settings"],
      allowedDevices: [],
      createdAt: Date.now()
    });
  }
}

async function forwardToHub(method: string, payload: any) {
  try {
    const response = await fetch(IOT_HUB_URL, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify({ ...payload, timestamp: new Date().toISOString() }) : undefined,
    });
    if (response.ok) return await response.json();
  } catch (e) {}
  return null;
}

async function syncHardware() {
  const data = await forwardToHub("GET", null);
  if (data && data.states) {
    devices.forEach(dev => {
      const room = dev.room.toLowerCase();
      const key = dev.deviceKey.toLowerCase();
      if (data.states[room] && data.states[room][key] !== undefined) {
        const raw = data.states[room][key];
        dev.on = (String(raw).toLowerCase() === "on" || String(raw) === "1" || String(raw) === "true");
        dev.statusText = dev.on ? (dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On") : "Off";
      }
    });
  }
}

// ---------- Auth Routes ----------
app.post("/api/auth/verify", (req, res) => {
  const { mode, password } = req.body;
  if (!mode || !password) return res.status(400).json({ error: "Mode and password required" });

  console.log(`[Auth] Verification request: Mode=${mode}, Password=[HIDDEN]`);

  // ABSOLUTE ADMIN BYPASS: admin0466 always works for admin mode
  if (mode === "admin" && password === "admin0466") {
    const token = jwt.sign({ mode }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`[Auth] Master Bypass success for Admin Gateway`);
    return res.json({ success: true, token });
  }

  const validPassword = (passwords as any)[mode];
  if (password === validPassword) {
    const token = jwt.sign({ mode }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`[Auth] Standard success for ${mode}`);
    return res.json({ success: true, token });
  }

  console.warn(`[Auth] Failed verification for ${mode}`);
  res.status(401).json({ error: "Invalid password" });
});

app.get("/api/auth/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { mode: string };
    if (payload.mode === "admin") return res.json({ id: "u_admin", username: "admin", name: "Administrator", role: "admin" });
    return res.json({ id: `guest_${payload.mode}`, username: payload.mode, name: `${payload.mode} User`, role: "user" });
  } catch (e) {}
  res.status(401).send();
});

// ---------- Feature Routes ----------
app.get("/api/health", (req, res) => res.send("OK"));

app.get("/api/admin/passwords", (req, res) => res.json(passwords));
app.post("/api/admin/passwords", (req, res) => {
  const { home, list, admin } = req.body;
  if (home) passwords.home = home;
  if (list) passwords.list = list;
  if (admin) passwords.admin = admin;
  saveAll();
  res.json({ success: true, passwords });
});

app.get("/api/devices", (req, res) => res.json(devices));
app.post("/api/devices/control", async (req, res) => {
  const { room, device, action, value } = req.body;
  const dev = devices.find(d => d.room.toLowerCase() === room.toLowerCase() && d.deviceKey.toLowerCase() === device.toLowerCase());
  if (dev) {
    if (action === "turn_on") dev.on = true;
    else if (action === "turn_off") dev.on = false;
    else if (action === "set_fan_speed") { dev.on = true; dev.value = value; }
    dev.statusText = dev.on ? (dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On") : "Off";
  }
  saveAll();
  await forwardToHub("POST", { deviceId: `${room}.${device}`, room, device, action, value });
  res.json({ success: true });
});

app.get("/api/shopping-list", (req, res) => res.json(shoppingList));
app.post("/api/shopping-list", (req, res) => { shoppingList = req.body.items || []; saveAll(); res.json({ success: true }); });
app.post("/api/shopping-list/add", (req, res) => {
  const item = { id: `${Date.now()}`, text: req.body.text, completed: false, createdAt: Date.now() };
  shoppingList.unshift(item);
  saveAll();
  res.json({ success: true, item, items: shoppingList });
});
app.get("/api/shopping-suggestions", (req, res) => res.json(suggestions));

app.get("/api/hub-config", (req, res) => res.json({ url: IOT_HUB_URL }));
app.post("/api/hub-config", (req, res) => { IOT_HUB_URL = req.body.url.endsWith("/") ? req.body.url : `${req.body.url}/`; saveAll(); res.json({ success: true }); });

app.post("/api/parse-command", async (req, res) => {
  const result = await forwardToHub("POST", { query: req.body.text });
  res.json(result || { error: "Hub unreachable" });
});

// ---------- App Startup ----------
async function start() {
  loadAll();
  setInterval(syncHardware, 5000);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, cors: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname);
    app.use(express.static(dist));
    app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`[Server] Listening on port ${PORT}`));
}
start();
