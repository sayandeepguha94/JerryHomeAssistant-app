// CLEAN VERSION - FALLBACK REMOVED
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Save, Server, User as UserIcon, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getServerUrl, setServerUrl, clearServerUrl, pingServer, getFallbackUrl, setFallbackUrl, api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [pythonUrl, setPythonUrl] = useState(getServerUrl());
  const [nodeUrl, setNodeUrl] = useState(getFallbackUrl());
  const [saving, setSaving] = useState(false);
  const [pythonStatus, setPythonStatus] = useState(null);
  const [nodeStatus, setNodeStatus] = useState(null);
  const isAdmin = true; // Always admin in this mode

  useEffect(() => {
    (async () => {
      const [ps, ns] = await Promise.all([
        pingServer(pythonUrl),
        nodeUrl ? pingServer(nodeUrl) : Promise.resolve(null)
      ]);
      setPythonStatus(ps);
      setNodeStatus(ns);
    })();
  }, []);

  const save = async () => {
    let p = pythonUrl.trim();
    let n = nodeUrl.trim();

    if (p && !p.startsWith("http://") && !p.startsWith("https://")) p = `http://${p}`;
    if (n && !n.startsWith("http://") && !n.startsWith("https://")) n = `http://${n}`;

    setSaving(true);
    try {
      setServerUrl(p);
      setFallbackUrl(n);

      const [ps, ns] = await Promise.all([
        pingServer(p),
        n ? pingServer(n) : Promise.resolve(null)
      ]);

      setPythonStatus(ps);
      setNodeStatus(ns);
      toast.success("Dual-server configuration saved");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setPythonStatus(null);
    setNodeStatus(null);
    const [ps, ns] = await Promise.all([
      pingServer(pythonUrl),
      nodeUrl ? pingServer(nodeUrl) : Promise.resolve(null)
    ]);
    setPythonStatus(ps);
    setNodeStatus(ns);
    toast[ps.online ? "success" : "error"](ps.online ? "Python server reachable" : "Python server unreachable");
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

      <div className="glass rounded-3xl p-5 mb-5" data-testid="settings-server-card">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[#B4F733]" />
          <h3 className="font-heading text-lg font-semibold text-[#B4F733]">Dashboard Server (Python)</h3>
          {pythonStatus && (
            <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full ${pythonStatus.online ? "text-[#B4F733]" : "text-red-400"}`}>
              {pythonStatus.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {pythonStatus.online ? "Online" : "Offline"}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mb-3">
          Target for <strong>Ecosystem Devices</strong>. Usually the local Node server acting as a bridge.
        </p>
        <input
          value={pythonUrl}
          onChange={(e) => setPythonUrl(e.target.value)}
          placeholder="http://localhost:3000"
          disabled={!isAdmin}
          className="w-full bg-transparent border-b border-white/20 focus:border-[#B4F733] outline-none py-2 text-base font-heading mb-8"
        />

        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[#E05D26]" />
          <h3 className="font-heading text-lg font-semibold">Dashboard Server (Node)</h3>
          {nodeStatus && (
            <span className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full ${nodeStatus.online ? "text-[#B4F733]" : "text-red-400"}`}>
              {nodeStatus.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {nodeStatus.online ? "Online" : "Offline"}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mb-3">
          Target for <strong>Household Runs & Users</strong>. Usually your remote server IP.
        </p>
        <input
          value={nodeUrl}
          onChange={(e) => setNodeUrl(e.target.value)}
          placeholder="http://192.168.29.179:3000"
          disabled={!isAdmin}
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-2 text-base font-heading mb-6"
        />

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
