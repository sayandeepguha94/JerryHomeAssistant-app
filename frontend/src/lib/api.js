import axios from "axios";

const PYTHON_URL_KEY = "jerry_python_server_url"; // For Ecosystem Devices & Auth
const NODE_URL_KEY = "jerry_node_server_url";     // For Household Runs
const TOKEN_KEY = "jerry_token";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

const getStoredNodeUrl = () => {
  return localStorage.getItem(NODE_URL_KEY); // Return null if not set
};

export const getServerUrl = () => localStorage.getItem(PYTHON_URL_KEY) || getBaseUrl();
export const getFallbackUrl = () => getStoredNodeUrl() || getBaseUrl();

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
};

export const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const pythonUrl = getServerUrl();
  const nodeUrl = getStoredNodeUrl();

  // ROUTING LOGIC:
  // - Machine .179 (Node Server): Handles shopping list.
  // - Machine .112 (Python Server/Bridge): Handles Auth, Passwords, Devices.
  const isShopping = config.url.includes("/shopping-list") ||
                     config.url.includes("/shopping-suggestions");

  const targetBase = isShopping ? (nodeUrl || getBaseUrl()) : (pythonUrl || getBaseUrl());

  // SMARTER LOCAL DETECTION:
  const targetHost = targetBase.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const currentHost = typeof window !== "undefined" ? window.location.host : "";

  // Use relative if target is same IP, OR if target is literally 'localhost'
  const isLocal = targetHost === currentHost ||
                  targetHost.toLowerCase().includes("localhost") ||
                  targetHost.includes("127.0.0.1") ||
                  targetHost.includes("0.0.0.0");

  const cleanPath = config.url.replace(/^\/api/, "").replace(/^\//, "");

  if (isLocal) {
    config.url = `/api/${cleanPath}`;
  } else {
    config.url = `${targetBase.replace(/\/+$/, "")}/api/${cleanPath}`;
  }

  console.log(`[API] ${config.method?.toUpperCase()} -> ${config.url}`);

  const token = localStorage.getItem("jerry_admin_token") ||
                localStorage.getItem("jerry_home_token") ||
                localStorage.getItem("jerry_list_token");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    return Promise.reject(err);
  }
);

/** Health/reachability check for the configured server. */
export async function pingServer(customUrl) {
  const base = (customUrl || "").trim().replace(/\/+$/, "");
  if (!base) return { online: false, error: "no server url" };
  try {
    const isLocal = base.toLowerCase().includes("localhost") || base.includes("127.0.0.1");
    const target = isLocal ? "" : base.replace(/\/+$/, "");
    const r = await axios.get(`${target}/api/health`, { timeout: 6000 });
    return { online: r.status === 200, status: r.status };
  } catch (e) {
    return { online: false, error: e.message };
  }
}
