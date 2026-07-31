import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

dotenv.config();

const app = express();

// 1. Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`\x1b[36m[API]\x1b[0m ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 2. GLOBAL CORS - MUST BE FIRST
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

const PORT = 3000;

// Health check
app.get("/api/health", (req, res) => {
  res.send("OK");
});

// Centralized Ecosystem Devices State
interface Device {
  id: string;
  name: string;
  room: string;
  deviceKey: string;
  entityId: string;
  category: "lighting" | "fan" | "ac" | "media";
  on: boolean;
  value?: number;
  unit?: string;
  statusText: string;
}

let devices: Device[] = [
  // living room
  { id: "living room.ambient light", name: "Ambient Light", room: "living room", deviceKey: "ambient light", entityId: "switch.living_room_4node_smart_switch_4_ambient_light", category: "lighting", on: true, statusText: "On" },
  { id: "living room.party light", name: "Party Light", room: "living room", deviceKey: "party light", entityId: "switch.living_room_4node_smart_switch_4_party_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.passage light", name: "Passage Light", room: "living room", deviceKey: "passage light", entityId: "switch.living_room_4node_smart_switch_4_passage_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.spot light", name: "Spot Light", room: "living room", deviceKey: "spot light", entityId: "switch.living_room_4node_smart_switch_4_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.fan", name: "Ceiling Fan", room: "living room", deviceKey: "fan", entityId: "fan.fan_modular_switch", category: "fan", on: true, value: 3, unit: " Speed", statusText: "Speed 3" },
  { id: "living room.ac", name: "Air Conditioner", room: "living room", deviceKey: "ac", entityId: "ebc64582fc835bb94dlmh1", category: "ac", on: false, value: 22, unit: "°C", statusText: "Off" },
  { id: "living room.tv", name: "Television", room: "living room", deviceKey: "tv", entityId: "eb96ab0b34a335a694gasf", category: "media", on: false, statusText: "Off" },

  // dine-in
  { id: "dine-in.ambient light", name: "Ambient Light", room: "dine-in", deviceKey: "ambient light", entityId: "switch.dine_in_4sw_modular_touch_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.spot light", name: "Spot Light", room: "dine-in", deviceKey: "spot light", entityId: "switch.dine_in_4sw_modular_touch_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.low spot light", name: "Low Spot Light", room: "dine-in", deviceKey: "low spot light", entityId: "switch.dine_in_4sw_modular_touch_low_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.fan", name: "Fan Switch", room: "dine-in", deviceKey: "fan", entityId: "switch.dine_in_4sw_modular_touch_fan", category: "fan", on: false, statusText: "Off" },

  // bedroom
  { id: "bedroom.ambient light", name: "Ambient Light", room: "bedroom", deviceKey: "ambient light", entityId: "switch.bedroom_4node_smart_switch_2_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.bedside light", name: "Bedside Light", room: "bedroom", deviceKey: "bedside light", entityId: "switch.bedroom_4node_smart_switch_2_bedside_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.fan", name: "Fan Switch", room: "bedroom", deviceKey: "fan", entityId: "switch.bedroom_4node_smart_switch_2_fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom.spot light", name: "Spot Light", room: "bedroom", deviceKey: "spot light", entityId: "switch.bedroom_4node_smart_switch_2_spot_light", category: "lighting", on: false, statusText: "Off" },

  // bedroom 2
  { id: "bedroom 2.low ambient light", name: "Low Ambient Light", room: "bedroom 2", deviceKey: "low ambient light", entityId: "switch.bedroom_2_4node_smart_switch_3_low_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.fan", name: "Fan Switch", room: "bedroom 2", deviceKey: "fan", entityId: "switch.bedroom_2_4node_smart_switch_3_fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom 2.spot light", name: "Spot Light", room: "bedroom 2", deviceKey: "spot light", entityId: "switch.bedroom_2_4node_smart_switch_3_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.high ambient light", name: "High Ambient Light", room: "bedroom 2", deviceKey: "high ambient light", entityId: "switch.bedroom_2_4node_smart_switch_3_high_ambient_light", category: "lighting", on: false, statusText: "Off" }
];

// Centralized User State
interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: "admin" | "user";
  allowed_pages?: string[];
  allowed_devices?: string[];
}

const users: User[] = [
  {
    id: "admin-1",
    name: "System Admin",
    username: "admin",
    password: "admin0466",
    role: "admin"
  }
];

// Centralized Shopping List State
interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

let shoppingList: ShoppingItem[] = [
  { id: "1", text: "Organic Milk (1 Gallon)", completed: false, createdAt: Date.now() - 3600000 * 5 },
  { id: "2", text: "Whole Grain Sourdough Bread", completed: true, createdAt: Date.now() - 3600000 * 4 },
  { id: "3", text: "Free Range Eggs (12 pk)", completed: false, createdAt: Date.now() - 3600000 * 3 },
  { id: "4", text: "Fresh Avocados & Bananas", completed: false, createdAt: Date.now() - 3600000 * 2 },
  { id: "5", text: "Dark Roast Coffee Beans", completed: true, createdAt: Date.now() - 3600000 * 1 },
];

let suggestions: string[] = [
  "potato / আলু", "tomato / টমেটো", "onion / পেঁয়াজ", "milk / দুধ", "Ginger / আদা",
  "garlic / রসুন", "Green vegies / সবুজ সবজি", "Chicken / মুরগির মাংস", "Katla Fish / কাতলা মাছ",
  "Lote fish / লোটে মাছ", "Chingri Fish / চিংড়ি মাছ", "Hilsa Fish / ইলিশ মাছ", "Masala / মশলা",
  "Egg / ডিম", "Capcicum / ক্যাপসিকাম", "Beans / বিনস", "Carrot / গাজর", "Rice / চাল",
  "Protine Atta / প্রোটিন আটা"
];

// Persistence Paths
const USERS_FILE = path.join(__dirname, "users.json");
const SHOPPING_FILE = path.join(__dirname, "shopping_list.json");
const STATE_FILE = path.join(__dirname, "device_state.json");
const SUGGESTIONS_FILE = path.join(__dirname, "suggestions.json");
const HUB_CONFIG_FILE = path.join(__dirname, "hub_config.json");

// IoT Hub Dynamic Configuration
let IOT_HUB_URL = "http://192.168.29.112:8000/";

// Helper to save hub config
function saveHubConfig() {
  try {
    fs.writeFileSync(HUB_CONFIG_FILE, JSON.stringify({ url: IOT_HUB_URL }, null, 2));
    console.log(`\x1b[32m[Config]\x1b[0m Hub URL persisted: ${IOT_HUB_URL}`);
  } catch (err) {
    console.error("[Config] Failed to save hub config:", err);
  }
}

// Persistence Helpers
function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(devices, null, 2)); } catch (err) {}
}

function saveUsers() {
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch (err) {}
}

function saveShopping() {
  try { fs.writeFileSync(SHOPPING_FILE, JSON.stringify(shoppingList, null, 2)); } catch (err) {}
}

function saveSuggestions() {
  try { fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2)); } catch (err) {}
}

function loadAllState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (Array.isArray(data)) devices = data;
    }
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
      if (Array.isArray(data)) {
        users.length = 0;
        users.push(...data);
      }
    }
    if (fs.existsSync(SHOPPING_FILE)) {
      const data = JSON.parse(fs.readFileSync(SHOPPING_FILE, "utf8"));
      if (Array.isArray(data)) shoppingList = data;
    }
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf8"));
      if (Array.isArray(data)) suggestions = data;
    }
    if (fs.existsSync(HUB_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(HUB_CONFIG_FILE, "utf8"));
      if (config.url) IOT_HUB_URL = config.url.endsWith("/") ? config.url : `${config.url}/`;
    }
    console.log(`[State] Loaded all persisted data.`);
  } catch (err) { console.error("[State] Loading failed:", err); }
}

// IoT Bridge Forwarder
async function forwardToIoTHub(method: string, payload: any) {
  try {
    console.log(`\x1b[35m[Bridge]\x1b[0m ${method} -> ${IOT_HUB_URL}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(IOT_HUB_URL, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify({ ...payload, timestamp: new Date().toISOString() }) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (response.ok) return await response.json();
    console.error(`\x1b[31m[Bridge] Hub error: ${response.status}\x1b[0m`);
    return null;
  } catch (err: any) {
    console.error(`\x1b[31m[Bridge] Connection failed:\x1b[0m`, err.message);
    return null;
  }
}

// Background Sync Loop
async function syncDevicesWithHardware() {
  try {
    const data = await forwardToIoTHub("GET", null);
    if (data && data.states) {
      const remoteStates = data.states;
      let updated = false;
      devices.forEach(dev => {
        const roomName = dev.room.toLowerCase();
        const deviceKey = dev.deviceKey.toLowerCase();
        if (remoteStates[roomName] && remoteStates[roomName][deviceKey] !== undefined) {
          const raw = remoteStates[roomName][deviceKey];
          const isOn = (String(raw).toLowerCase() === "on" || String(raw) === "1" || String(raw) === "true");
          if (dev.on !== isOn) {
            dev.on = isOn;
            dev.statusText = isOn ? (dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On") : "Off";
            updated = true;
          }
        }
      });
      if (updated) saveState();
    }
  } catch (err) {}
}

// Hub Control Helper
async function applyBackendControl(room: string, deviceKey: string | null, action: string, value?: number) {
  const normalizedRoom = room.toLowerCase();
  const normalizedKey = deviceKey?.toLowerCase() || "";

  // 1. Update Memory
  if (action === "room_on" || action === "room_off") {
    devices.forEach(dev => {
      if (dev.room.toLowerCase() === normalizedRoom) {
        dev.on = (action === "room_on");
        dev.statusText = dev.on ? (dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On") : "Off";
      }
    });
  } else {
    const dev = devices.find(d => d.room.toLowerCase() === normalizedRoom && d.deviceKey.toLowerCase() === normalizedKey);
    if (dev) {
      if (action === "turn_on") { dev.on = true; dev.statusText = dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On"; }
      else if (action === "turn_off") { dev.on = false; dev.statusText = "Off"; }
      else if (action === "set_fan_speed" && value !== undefined) { dev.on = true; dev.value = value; dev.statusText = `Speed ${value}`; }
    }
  }
  saveState();

  // 2. Forward to Python Hub (bridge.py expects deviceId, action, value at root /)
  const payload = { deviceId: deviceKey ? `${room}.${deviceKey}` : null, room, device: deviceKey, action, value };
  forwardToIoTHub("POST", payload);
}

// AUTH Endpoints (Supporting both existing UI and reference repo)
const handleLogin = (req: any, res: any) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });
  const token = `mock-token-${user.id}`;
  const { password: _, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
};

app.post("/api/login", handleLogin);
app.post("/api/auth/login", handleLogin);

app.get("/api/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const userId = auth.split(" ")[1].replace("mock-token-", "");
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: "Invalid session" });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// User Management
app.get("/api/users", (req, res) => res.json(users.map(({ password: _, ...u }) => u)));
app.post("/api/users", (req, res) => {
  const { username, password, name } = req.body;
  if (users.find(u => u.username === username.toLowerCase())) return res.status(409).json({ error: "Exists" });
  const newUser: User = { id: `u-${Date.now()}`, username: username.toLowerCase(), password, name, role: "user" };
  users.push(newUser);
  saveUsers();
  res.json(newUser);
});

// Device Control
app.get("/api/devices", (req, res) => res.json(devices));
app.post("/api/devices/control", async (req, res) => {
  const { room, device, action, value } = req.body;
  await applyBackendControl(room, device, action, value);
  res.json({ success: true });
});

// Hub Management
app.get("/api/hub-config", (req, res) => res.json({ url: IOT_HUB_URL }));
app.get("/api/hub-health", async (req, res) => {
  const data = await forwardToIoTHub("GET", null);
  res.json({ online: !!data });
});
app.post("/api/hub-config", (req, res) => {
  IOT_HUB_URL = req.body.url.endsWith("/") ? req.body.url : `${req.body.url}/`;
  saveHubConfig();
  res.json({ success: true });
});

// Shopping List
app.get("/api/shopping-list", (req, res) => res.json(shoppingList));
app.post("/api/shopping-list", (req, res) => {
  shoppingList = req.body.items;
  saveShopping();
  res.json({ success: true });
});
app.post("/api/shopping-list/add", (req, res) => {
  const newItem = { id: `${Date.now()}`, text: req.body.text, completed: false, createdAt: Date.now() };
  shoppingList.unshift(newItem);
  saveShopping();
  res.json({ success: true, item: newItem, items: shoppingList });
});
app.get("/api/shopping-suggestions", (req, res) => res.json(suggestions));

// Command Proxy
app.post("/api/parse-command", async (req, res) => {
  const result = await forwardToIoTHub("POST", { query: req.body.text });
  if (result) res.json(result);
  else res.status(502).json({ error: "Hub unreachable" });
});

// Lazy Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  return aiClient;
}

// Server Startup
async function startServer() {
  loadAllState();
  setInterval(syncDevicesWithHardware, 5000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, cors: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname);
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) res.sendFile(indexPath);
      else res.status(404).send("Build missing");
    });
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`[Server] Running on port ${PORT}`));
}

startServer();
