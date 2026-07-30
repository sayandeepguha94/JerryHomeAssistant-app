import axios from "axios";

const URL_KEY = "jerry_server_url";
const FALLBACK_URL_KEY = "jerry_fallback_url";
const TOKEN_KEY = "jerry_token";

/**
 * In consolidated mode, we ALWAYS use relative paths (/api) for the Node server.
 * This ensures consistency whether you access via localhost, 0.0.0.0, or LAN IP.
 */
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.REACT_APP_SERVER_URL || "";
};

let activeNodeUrl = getBaseUrl();

export const getServerUrl = () => {
  const saved = localStorage.getItem(URL_KEY);
  // Ignore 0.0.0.0 or placeholders that break browsers
  if (!saved || saved.includes("0.0.0.0")) return getBaseUrl();
  return saved;
};

export const getFallbackUrl = () => localStorage.getItem(FALLBACK_URL_KEY) || "";

export const isUsingFallback = () => {
  const fb = getFallbackUrl();
  return fb && activeNodeUrl === fb.trim().replace(/\/+$/, "");
};

export const getEffectiveUrl = () => activeNodeUrl;

export const setServerUrl = (url) => {
  if (!url) return;
  const normalized = url.trim().replace(/\/+$/, "");
  localStorage.setItem(URL_KEY, normalized);
  activeNodeUrl = normalized;
  api.defaults.baseURL = `${normalized}/api`;
};

export const setFallbackUrl = (url) => {
  const normalized = url.trim().replace(/\/+$/, "");
  localStorage.setItem(FALLBACK_URL_KEY, normalized);
};

export const clearServerUrl = () => {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(FALLBACK_URL_KEY);
  activeNodeUrl = "";
};

export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const savedUrl = localStorage.getItem(URL_KEY);
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  // If a custom Node Server is set AND it's different from current host, use it.
  if (savedUrl) {
    const normalizedSaved = savedUrl.trim().replace(/\/+$/, "");
    if (normalizedSaved && !normalizedSaved.includes(window.location.host)) {
      config.baseURL = `${normalizedSaved}/api`;
    } else {
      config.baseURL = "/api";
    }
  } else {
    config.baseURL = "/api";
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const originalRequest = err.config;

    if ((!err.response || err.code === 'ECONNABORTED' || err.message === 'Network Error') && !originalRequest._retry) {
      const fallback = getFallbackUrl();
      if (fallback) {
        const normalizedFallback = fallback.trim().replace(/\/+$/, "");
        if (activeNodeUrl !== normalizedFallback) {
          originalRequest._retry = true;
          activeNodeUrl = normalizedFallback;
          api.defaults.baseURL = `${normalizedFallback}/api`;
          originalRequest.baseURL = `${normalizedFallback}/api`;
          console.log(`Failover: Switching to fallback server: ${normalizedFallback}`);
          return api(originalRequest);
        }
      }
    }
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
