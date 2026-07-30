import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Save, Server, User as UserIcon, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getServerUrl, setServerUrl, clearServerUrl, pingServer, getFallbackUrl, setFallbackUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [serverUrl, setUrl] = useState(getServerUrl());
  const [fallbackUrl, setFallback] = useState(getFallbackUrl());
  const [hubUrl, setHubUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [fallbackStatus, setFallbackStatus] = useState(null);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    (async () => {
      // Load hub config from Node server
      try {
        const res = await api.get("/hub-config");
        if (res.data.url) setHubUrl(res.data.url);
      } catch (e) { console.error("Hub config load failed", e); }

      const [s, fs] = await Promise.all([
        pingServer(),
        getFallbackUrl() ? pingServer(getFallbackUrl()) : Promise.resolve(null)
      ]);
      setStatus(s);
      setFallbackStatus(fs);
    })();
  }, []);

  const save = async () => {
    let v = serverUrl.trim();
    let f = fallbackUrl.trim();
    let h = hubUrl.trim();

    if (!v && !localStorage.getItem("jerry_server_url")) {
      // Allow empty if we want to use current host, but warn if nothing at all
    }

    if (v && !v.startsWith("http://") && !v.startsWith("https://")) v = `http://${v}`;
    if (f && !f.startsWith("http://") && !f.startsWith("https://")) f = `http://${f}`;
    if (h && !h.startsWith("http://") && !h.startsWith("https://")) h = `http://${h}`;

    setSaving(true);
    try {
      // 1. Save Hub Config to Node
      if (h) {
        await api.post("/hub-config", { url: h });
        toast.success("IoT Hub address updated on server");
      }

      // 2. Save Node Server (Frontend Server)
      setServerUrl(v);
      setUrl(v);
      setFallbackUrl(f);
      setFallback(f);

      const [s, fs] = await Promise.all([
        pingServer(v),
        f ? pingServer(f) : Promise.resolve(null)
      ]);

      setStatus(s);
      setFallbackStatus(fs);

      if (s.online) {
        toast.success("Dashboard settings saved");
      }
    } catch (e) {
      toast.error("Failed to save some settings");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setStatus(null);
    setFallbackStatus(null);
    const [s, fs] = await Promise.all([
      pingServer(serverUrl),
      fallbackUrl ? pingServer(fallbackUrl) : Promise.resolve(null)
    ]);
    setStatus(s);
    setFallbackStatus(fs);
    toast[s.online ? "success" : "error"](s.online ? "Primary reachable" : "Primary unreachable");
  };

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  const changeServer = () => {
    if (!window.confirm("Change server? You'll need to log in again.")) return;
    clearServerUrl();
    logout();
    nav("/server-setup", { replace: true });
  };

  return (
    <div className="min-h-screen pb-32 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Settings</p>
        <h1 className="font-heading text-4xl font-bold">Configure.</h1>
      </motion.div>

      <div className="glass rounded-3xl p-5 mb-5 flex items-center gap-4" data-testid="settings-profile-card">
        <div className="w-12 h-12 rounded-2xl bg-[#E05D26] grid place-items-center">
          <UserIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-heading text-lg font-semibold">{user.name}</p>
          <p className="text-xs text-white/50 uppercase tracking-widest">{user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-white/70 border border-white/10 px-3 py-2 rounded-full"
          data-testid="settings-logout-btn"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      <div className="glass rounded-3xl p-5 mb-5" data-testid="settings-server-card">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[#B4F733]" />
          <h3 className="font-heading text-lg font-semibold text-[#B4F733]">IoT Hub (Python Backend)</h3>
        </div>
        <p className="text-xs text-white/50 mb-3">
          The address of your Python hardware controller (triggers devices).
        </p>
        <input
          value={hubUrl}
          onChange={(e) => setHubUrl(e.target.value)}
          placeholder="http://192.168.29.112:8000"
          disabled={!isAdmin}
          className="w-full bg-transparent border-b border-white/20 focus:border-[#B4F733] outline-none py-2 text-base font-heading mb-8"
        />

        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[#E05D26]" />
          <h3 className="font-heading text-lg font-semibold">Dashboard Server (Node)</h3>
          {status && (
            <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.online ? "text-[#B4F733]" : "text-red-400"}`} data-testid="settings-status-badge">
              {status.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {status.online ? "Online" : "Offline"}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mb-3">
          The address of this frontend server (syncs runs/users). Leave <strong>EMPTY</strong> to auto-detect.
        </p>
        <input
          data-testid="settings-server-url-input"
          value={serverUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={window.location.origin}
          disabled={!isAdmin}
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-2 text-base font-heading mb-6"
        />

        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-white/40" />
          <h3 className="font-heading text-lg font-semibold text-white/60">Fallback Server</h3>
          {fallbackStatus && (
            <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full ${fallbackStatus.online ? "text-[#B4F733]" : "text-red-400"}`}>
              {fallbackStatus.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {fallbackStatus.online ? "Online" : "Offline"}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mb-3">
          Optional secondary URL to use if the primary server is unreachable.
        </p>
        <input
          data-testid="settings-fallback-url-input"
          value={fallbackUrl}
          onChange={(e) => setFallback(e.target.value)}
          placeholder="http://192.168.29.179:3000"
          disabled={!isAdmin}
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-2 text-base font-heading"
        />
        {!isAdmin && (
          <p className="text-xs text-white/30 mt-2">Only admin can modify.</p>
        )}
        {isAdmin && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#E05D26] font-semibold disabled:opacity-50"
              data-testid="settings-save-btn"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={test} className="px-4 py-2.5 rounded-full border border-white/10 text-sm" data-testid="settings-test-btn">
              Test
            </button>
            <button onClick={changeServer} className="px-4 py-2.5 rounded-full border border-white/10 text-sm text-red-400/80" data-testid="settings-change-server-btn">
              Switch
            </button>
          </div>
        )}
      </div>

      <div className="glass rounded-3xl p-5 text-xs text-white/50 leading-relaxed" data-testid="settings-about-card">
        <p className="font-semibold text-white/80 mb-1 font-heading">About Jerry</p>
        <p>Local Android app for the light_client_voice_assistant Node.js server. All device controls, voice commands and shopping list sync directly with your local server over Wi-Fi.</p>
      </div>
    </div>
  );
}
