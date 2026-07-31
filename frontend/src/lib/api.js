import axios from "axios";

const PYTHON_URL_KEY = "jerry_python_server_url"; // For Ecosystem Devices
const NODE_URL_KEY = "jerry_node_server_url";     // For Household Runs/Users
const OLD_URL_KEY = "jerry_server_url";           // For migration
const TOKEN_KEY = "jerry_token";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

// Migration Logic: Pull from old key if new ones are missing
const getStoredNodeUrl = () => {
  const node = localStorage.getItem(NODE_URL_KEY);
  if (node) return node;
  const old = localStorage.getItem(OLD_URL_KEY);
  if (old && !old.includes("0.0.0.0")) return old;
  return getBaseUrl();
};

export const getServerUrl = () => localStorage.getItem(PYTHON_URL_KEY) || getBaseUrl();
export const getFallbackUrl = () => getStoredNodeUrl();

export const setServerUrl = (url) => {
  const normalized = (url || "").trim().replace(/\/+$/, "");
  localStorage.setItem(PYTHON_URL_KEY, normalized);
};

export const setFallbackUrl = (url) => {
  const normalized = (url || "").trim().replace(/\/+$/, "");
  localStorage.setItem(NODE_URL_KEY, normalized);
};

export const clearServerUrl = () => {
  localStorage.removeItem(PYTHON_URL_KEY);
  localStorage.removeItem(NODE_URL_KEY);
  localStorage.removeItem(OLD_URL_KEY);
};

export const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const pythonUrl = localStorage.getItem(PYTHON_URL_KEY) || getBaseUrl();
  const nodeUrl = getStoredNodeUrl();

  const isHousehold = config.url.includes("/shopping-list") ||
                     config.url.includes("/users") ||
                     config.url.includes("/auth") ||
                     config.url.includes("/login") ||
                     config.url.includes("/shopping-suggestions");

  const targetBase = isHousehold ? nodeUrl : pythonUrl;

  // SMART ROUTING: Use relative paths if targeting current host or localhost
  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  const targetHost = targetBase.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const isSameOrigin = !targetBase ||
                       targetHost === currentHost ||
                       targetHost === "localhost:3000" ||
                       targetHost === "127.0.0.1:3000";

  const cleanPath = config.url.replace(/^\/api/, "").replace(/^\//, "");

  if (isSameOrigin) {
    config.url = `/api/${cleanPath}`;
  } else {
    config.url = `${targetBase.replace(/\/+$/, "")}/api/${cleanPath}`;
  }

  console.log(`[API] ${config.method?.toUpperCase()} -> ${config.url}`);

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    return Promise.reject(err);
  }
);

/** Fetch the audio blob for a given id from the Node.js server. */
export async function fetchAudioBlob(audioId) {
  const r = await api.get(`/audio/${audioId}`, { responseType: "blob" });
  return URL.createObjectURL(r.data);
}

/** Health/reachability check for the configured server. */
export async function pingServer(customUrl) {
  const base = (customUrl || getServerUrl() || "").replace(/\/+$/, "");
  if (!base) return { online: false, error: "no server url" };
  try {
    const r = await axios.get(`${base}/api/health`, { timeout: 6000 });
    return { online: r.status === 200, status: r.status };
  } catch (e) {
    return { online: false, error: e.message };
  }
}
