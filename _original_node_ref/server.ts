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

// Persistence Paths (Absolute for Docker stability)
const STATE_FILE = path.join(process.cwd(), "device_state.json");
const SHOPPING_FILE = path.join(process.cwd(), "shopping_list.json");
const PASSWORDS_FILE = path.join(process.cwd(), "passwords.json");
const SUGGESTIONS_FILE = path.join(process.cwd(), "suggestions.json");
const HUB_CONFIG_FILE = path.join(process.cwd(), "hub_config.json");

// Gateway State
interface Passwords {
  home: string;
  list: string;
  admin: string;
}

let passwords: Passwords = {
  home: "home0466",
  list: "list0466",
  admin: "admin0466"
};

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
  { id: "admin-1", name: "System Admin", username: "admin", password: "admin0466", role: "admin" }
];

// Centralized Shopping List State
interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

let shoppingList: ShoppingItem[] = [];

let suggestions: string[] = [
  "potato / আলু", "tomato / টমেটো", "onion / পেঁয়াজ", "milk / দুধ", "Ginger / আদা",
  "garlic / রসুন", "Green vegies / সবুজ সবজি", "Chicken / মুরগির মাংস", "Katla Fish / কাতলা মাছ",
  "Lote fish / লোটে মাছ", "Chingri Fish / চিংড়ি মাছ", "Hilsa Fish / ইলিশ মাছ", "Masala / মশলা",
  "Egg / ডিম", "Capcicum / ক্যাপসিকাম", "Beans / বিনস", "Carrot / গাজর", "Rice / চাল",
  "Protine Atta / প্রোটিন আটা"
];

// IoT Hub Dynamic Configuration
let IOT_HUB_URL = "http://192.168.29.112:8000/";

// Persistence Helpers
function saveHubConfig() { saveAll(); }
function saveState() { saveAll(); }
function saveShopping() { saveAll(); }
function saveSuggestions() { saveAll(); }

function saveAll() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(devices, null, 2));
    fs.writeFileSync(SHOPPING_FILE, JSON.stringify(shoppingList, null, 2));
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
    fs.writeFileSync(HUB_CONFIG_FILE, JSON.stringify({ url: IOT_HUB_URL }, null, 2));
  } catch (err) {}
}

function loadAllState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (Array.isArray(data)) devices = data;
    }

    if (fs.existsSync(SHOPPING_FILE)) {
      const data = JSON.parse(fs.readFileSync(SHOPPING_FILE, "utf8"));
      if (Array.isArray(data)) shoppingList = data;
    }
    if (fs.existsSync(PASSWORDS_FILE)) {
      const loadedPasswords = JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf8"));
      passwords = { ...passwords, ...loadedPasswords };
      console.log("[State] Loaded custom gateway passwords from disk.");
    } else {
      console.log("[State] Using default gateway passwords.");
    }
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf8"));
      if (Array.isArray(data)) suggestions = data;
    }
    if (fs.existsSync(HUB_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(HUB_CONFIG_FILE, "utf8"));
      if (config.url) IOT_HUB_URL = config.url.endsWith("/") ? config.url : `${config.url}/`;
    }
  } catch (err) {}
}

// THE TRIGGER MECHANISM (Exact Replication from Frontend Server)
async function executeHubAction(payload: any) {
  try {
    const url = IOT_HUB_URL;
    console.log(`\x1b[35m[Bridge]\x1b[0m Dispatching POST -> ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`\x1b[32m[Bridge]\x1b[0m Trigger successful:`, data.message || data.status || "OK");
      return data;
    } else {
      console.error(`\x1b[31m[Bridge]\x1b[0m Hub error: ${response.status}`);
      return null;
    }
  } catch (err: any) {
    console.error(`\x1b[31m[Bridge]\x1b[0m Hub unreachable at ${IOT_HUB_URL}: ${err.message}`);
    return null;
  }
}

// Status Polling
async function syncDevicesWithHardware() {
  try {
    const response = await fetch(IOT_HUB_URL);
    if (response.ok) {
      const data = await response.json();
      if (data && data.states) {
        let updated = false;
        devices.forEach(dev => {
          const roomName = dev.room.toLowerCase();
          const deviceKey = dev.deviceKey.toLowerCase();
          if (data.states[roomName] && data.states[roomName][deviceKey] !== undefined) {
            const raw = data.states[roomName][deviceKey];
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
    }
  } catch (err) {}
}

// Control Logic
async function applyBackendControl(room: string, deviceKey: string | null, action: string, value?: number) {
  const normalizedRoom = room.toLowerCase();
  const normalizedKey = deviceKey?.toLowerCase() || "";

  console.log(`[State] Local update: ${room} / ${deviceKey} -> ${action}`);

  // 1. Memory Update
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

  // 2. Hub Dispatch
  const payload = {
    deviceId: deviceKey ? `${room}.${deviceKey}` : null,
    room,
    device: deviceKey,
    action,
    value
  };
  await executeHubAction(payload);
}

// API Endpoints
app.get("/api/health", (req, res) => res.send("OK"));

// AUTH Gateway: Verify passwords for home, list, or admin
app.post("/api/auth/verify", (req, res) => {
  const { mode, password } = req.body;
  if (!mode || !password) return res.status(400).json({ error: "Mode and password required" });

  console.log(`\x1b[34m[Auth]\x1b[0m Verification attempt for mode: ${mode}`);

  // BULLETPROOF ADMIN: admin0466 always works for admin mode
  if (mode === "admin" && password === "admin0466") {
    const token = jwt.sign({ mode }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`\x1b[32m[Auth]\x1b[0m Master Admin access granted`);
    return res.json({ success: true, token });
  }

  const validPassword = (passwords as any)[mode];
  if (password === validPassword) {
    const token = jwt.sign({ mode }, JWT_SECRET, { expiresIn: "30d" });
    console.log(`\x1b[32m[Auth]\x1b[0m Access granted for ${mode}`);
    return res.json({ success: true, token });
  }

  console.warn(`\x1b[31m[Auth]\x1b[0m Invalid password for ${mode}`);
  res.status(401).json({ error: "Invalid password" });
});

// Admin: Manage gateway passwords
app.get("/api/admin/passwords", (req, res) => {
  // Authentication check for admin token would go here
  res.json(passwords);
});

app.post("/api/admin/passwords", (req, res) => {
  const { home, list, admin } = req.body;
  if (home) passwords.home = home;
  if (list) passwords.list = list;
  if (admin) passwords.admin = admin;
  saveAll();
  res.json({ success: true, passwords });
});

// Device Control
app.get("/api/devices", (req, res) => res.json(devices));
app.post("/api/devices/control", async (req, res) => {
  const { room, device, action, value } = req.body;
  await applyBackendControl(room, device, action, value);
  res.json({ success: true });
});

app.get("/api/hub-config", (req, res) => res.json({ url: IOT_HUB_URL }));
app.get("/api/hub-health", async (req, res) => {
  const response = await fetch(IOT_HUB_URL).catch(() => null);
  res.json({ online: !!(response && response.ok) });
});
app.post("/api/hub-config", (req, res) => {
  IOT_HUB_URL = req.body.url.endsWith("/") ? req.body.url : `${req.body.url}/`;
  saveHubConfig();
  res.json({ success: true });
});

app.get("/api/shopping-list", (req, res) => res.json(shoppingList));
app.post("/api/shopping-list", (req, res) => {
  shoppingList = req.body.items || [];
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

app.post("/api/proxy", async (req, res) => {
  const { url, method, body } = req.body;
  try {
    const r = await fetch(url, {
      method: method || "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

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
