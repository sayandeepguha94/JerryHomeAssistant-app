import axios from "axios";

const PYTHON_URL_KEY = "jerry_python_server_url"; // For Ecosystem Devices
const NODE_URL_KEY = "jerry_node_server_url";     // For Household Runs/Users
const TOKEN_KEY = "jerry_token";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

export const getServerUrl = () => localStorage.getItem(PYTHON_URL_KEY) || getBaseUrl();
export const getFallbackUrl = () => localStorage.getItem(NODE_URL_KEY) || "";

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
  const pythonUrl = localStorage.getItem(PYTHON_URL_KEY) || getBaseUrl();
  const nodeUrl = localStorage.getItem(NODE_URL_KEY) || pythonUrl; // Default to same if not set

  // Specialized Routing based on feature path
  const isHousehold = config.url.includes("/shopping-list") ||
                     config.url.includes("/users") ||
                     config.url.includes("/auth") ||
                     config.url.includes("/login") ||
                     config.url.includes("/shopping-suggestions");

  const targetBase = isHousehold ? nodeUrl : pythonUrl;

  // Construct absolute URL
  const path = config.url.startsWith("/") ? config.url : `/${config.url}`;
  config.url = `${targetBase.replace(/\/+$/, "")}/api${path}`;

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    // Failback logic removed as requested
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
    const r = await axios.get(`${base}/api/devices`, { timeout: 6000 });
    return { online: r.status === 200 && Array.isArray(r.data), status: r.status };
  } catch (e) {
    return { online: false, error: e.message };
  }
}
