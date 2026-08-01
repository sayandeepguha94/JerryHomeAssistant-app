import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Save, Server, Shield, Key, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getServerUrl, setServerUrl, clearServerUrl, pingServer, getFallbackUrl, setFallbackUrl, api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate, useLocation } from "react-router-dom";

function UrlRow({ label, url }) {
  const fullUrl = window.location.origin + url;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-white/30">{label}</p>
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
        <code className="text-xs text-[#B4F733] font-mono break-all">{fullUrl}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fullUrl);
            toast.success(`${label} URL copied`);
          }}
          className="text-[10px] text-white/40 hover:text-white uppercase font-bold"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-white/30">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E05D26] transition-colors"
      />
    </div>
  );
}

export default function Settings() {
  const { tokens, logout } = useAuth();
  const nav = useNavigate();
  const [pythonUrl, setPythonUrl] = useState(getServerUrl());
  const [nodeUrl, setNodeUrl] = useState(getFallbackUrl());
  const [saving, setSaving] = useState(false);
  const [pythonStatus, setPythonStatus] = useState(null);
  const [nodeStatus, setNodeStatus] = useState(null);

  // Gateway Passwords
  const [gateways, setGateways] = useState({ home: "", list: "", admin: "" });

  const { pathname } = useLocation();
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminAuthed = !!tokens.admin;

  useEffect(() => {
    (async () => {
      const [ps, ns] = await Promise.all([
        pingServer(pythonUrl),
        nodeUrl ? pingServer(nodeUrl) : Promise.resolve(null)
      ]);
      setPythonStatus(ps);
      setNodeStatus(ns);

      // Fetch passwords if admin
      if (isAdminAuthed) {
        try {
          const res = await api.get("/admin/passwords");
          setGateways(res.data);
        } catch (e) { console.error("Failed to fetch passwords", e); }
      }
    })();
  }, [isAdminAuthed]);

  const save = async () => {
    let p = pythonUrl.trim();
    let n = nodeUrl.trim();

    if (p && !p.startsWith("http://") && !p.startsWith("https://")) p = `http://${p}`;
    if (n && !n.startsWith("http://") && !n.startsWith("https://")) n = `http://${n}`;

    setSaving(true);
    try {
      setServerUrl(p);
      setFallbackUrl(n);

      // Save passwords if admin
      if (isAdminAuthed) {
        await api.post("/admin/passwords", gateways);
      }

      const [ps, ns] = await Promise.all([
        pingServer(p),
        n ? pingServer(n) : Promise.resolve(null)
      ]);

      setPythonStatus(ps);
      setNodeStatus(ns);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen pb-40 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Settings</p>
          <h1 className="font-heading text-4xl font-bold">Configure.</h1>
        </div>
        {isAdminAuthed && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-red-400 border border-red-400/20 px-4 py-2.5 rounded-full hover:bg-red-400/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        )}
      </motion.div>

      {isAdminPath && (
        <div className="glass rounded-3xl p-5 mb-5" data-testid="settings-access-card">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-[#E05D26]" />
            <h3 className="font-heading text-lg font-semibold text-[#E05D26]">Access URLs</h3>
          </div>
          <p className="text-xs text-white/50 mb-4">
            Direct paths for specific access levels.
          </p>
          <div className="space-y-4">
            <UrlRow label="Public Home" url="/home" />
            <UrlRow label="Public List" url="/list" />
            <UrlRow label="Admin Gateway" url="/admin" />
          </div>
        </div>
      )}

      {isAdminAuthed && (
        <div className="glass rounded-3xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#B4F733]" />
            <h3 className="font-heading text-lg font-semibold text-[#B4F733]">Security & Passwords</h3>
          </div>
          <p className="text-xs text-white/50 mb-4">
            Update passwords for the three access modes.
          </p>
          <div className="space-y-4">
            <PasswordInput
              label="Home Password"
              value={gateways.home}
              onChange={(v) => setGateways({...gateways, home: v})}
            />
            <PasswordInput
              label="List Password"
              value={gateways.list}
              onChange={(v) => setGateways({...gateways, list: v})}
            />
            <PasswordInput
              label="Admin Password"
              value={gateways.admin}
              onChange={(v) => setGateways({...gateways, admin: v})}
            />
          </div>
        </div>
      )}

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
          Bridge for <strong>Ecosystem Devices</strong>.
        </p>
        <input
          value={pythonUrl}
          onChange={(e) => setPythonUrl(e.target.value)}
          placeholder="http://localhost:3000"
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
          Persistence for <strong>Household Runs</strong>.
        </p>
        <input
          value={nodeUrl}
          onChange={(e) => setNodeUrl(e.target.value)}
          placeholder="http://192.168.29.179:3000"
          className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-2 text-base font-heading mb-6"
        />

        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#E05D26] font-semibold disabled:opacity-50"
            data-testid="settings-save-btn"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setPythonStatus(null); setNodeStatus(null); save(); }} className="px-4 py-2.5 rounded-full border border-white/10 text-sm">
            Test
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 mt-5 text-xs text-white/50 leading-relaxed" data-testid="settings-about-card">
        <p className="font-semibold text-white/80 mb-1 font-heading">About Jerry</p>
        <p>Direct Gateway access with mode-specific security. Configuration applies to the current device session.</p>
      </div>

      {!tokens.admin && !tokens.home && !tokens.list && (
        <button
          onClick={() => nav("/")}
          className="w-full py-4 mt-4 rounded-2xl border border-white/10 text-white/40 font-heading text-sm hover:bg-white/5 transition-colors"
        >
          Return to Portal
        </button>
      )}
    </div>
  );
}
