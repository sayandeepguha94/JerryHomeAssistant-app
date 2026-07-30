import axios from "axios";

const URL_KEY = "jerry_server_url";
const FALLBACK_URL_KEY = "jerry_fallback_url";
const TOKEN_KEY = "jerry_token";

let activeNodeUrl = localStorage.getItem(URL_KEY) || process.env.REACT_APP_SERVER_URL || "";

// If no URL is set and we're in a browser, default to the current host
if (!activeNodeUrl && typeof window !== "undefined") {
  // Use current origin if we are served by the Node server
  activeNodeUrl = window.location.origin;
}

export const getServerUrl = () => activeNodeUrl;
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
  baseURL: activeNodeUrl ? `${activeNodeUrl}/api` : "",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL.startsWith("/api")) {
    config.baseURL = `${activeNodeUrl}/api`;
  }
  // Token handling kept for compatibility if needed later, but backend is gone.
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
