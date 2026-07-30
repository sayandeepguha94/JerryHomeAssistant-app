import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Trash2, X, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { friendlyErr } from "../lib/utils";
import { useAuth } from "../lib/auth";

const ALL_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "shopping", label: "Shopping List" },
  { key: "settings", label: "Settings" },
];

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([api.get("/users"), api.get("/devices")]);
      setUsers(u.data);
      // Turn full device list into catalog format
      setCatalog(c.data.map((d) => ({ id: d.id, name: d.name, room: d.room, category: d.category })));
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (e) { toast.error(friendlyErr(e)); }
  };

  return (
    <div className="min-h-screen pb-32 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Users</p>
          <h1 className="font-heading text-4xl font-bold">Team & <span className="text-[#E05D26]">access.</span></h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm bg-[#E05D26] px-4 py-2.5 rounded-full font-semibold"
          data-testid="users-create-btn"
        >
          <UserPlus className="w-4 h-4" /> New
        </button>
      </motion.div>

      {loading && <p className="text-center text-white/40" data-testid="users-loading">Loading…</p>}

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="glass rounded-2xl p-4 flex items-center gap-3" data-testid={`user-row-${u.username}`}>
            <div className={`w-10 h-10 rounded-xl grid place-items-center ${u.role === "admin" ? "bg-[#E05D26]" : "bg-white/10"}`}>
              {u.role === "admin" ? <Shield className="w-5 h-5" /> : <span className="font-heading font-bold">{u.username[0]?.toUpperCase()}</span>}
            </div>
            <div className="flex-1">
              <p className="font-heading font-semibold">{u.name}</p>
              <p className="text-xs text-white/50">@{u.username} · {u.role}</p>
              {u.role !== "admin" && (
                <p className="text-[10px] text-white/40 mt-1">
                  {u.allowed_pages?.length || 0} pages · {u.allowed_devices?.length || 0} devices
                </p>
              )}
            </div>
            {u.role !== "admin" && u.id !== me.id && (
              <button onClick={() => deleteUser(u)} className="text-white/40 hover:text-red-400 p-2" data-testid={`user-delete-${u.username}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {showCreate && (
          <CreateUserModal catalog={catalog} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateUserModal({ catalog, onClose, onCreated }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pages, setPages] = useState(["dashboard"]);
  const [devices, setDevices] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = (arr, setter, val) =>
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const rooms = {};
  for (const d of catalog) (rooms[d.room] = rooms[d.room] || []).push(d);

  const create = async () => {
    if (!username.trim() || password.length < 4) {
      toast.error("Username + password (4+ chars) required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", {
        username: username.trim().toLowerCase(),
        password,
        name: name.trim() || username.trim(),
        allowed_pages: pages,
        allowed_devices: devices,
      });
      toast.success("User created");
      onCreated();
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
      data-testid="user-create-modal"
    >
      <motion.div
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="glass rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">Create User</p>
            <h2 className="font-heading text-2xl font-bold">New teammate</h2>
          </div>
          <button onClick={onClose} className="text-white/50" data-testid="user-modal-close-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <FormInput label="Username" value={username} onChange={setUsername} placeholder="e.g. dad" testid="new-user-username" />
          <FormInput label="Display Name" value={name} onChange={setName} placeholder="e.g. Dad" testid="new-user-name" />
          <FormInput label="Password" value={password} onChange={setPassword} type="password" placeholder="min 4 chars" testid="new-user-password" />

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/40 mt-4 mb-2">Allowed Pages</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PAGES.map((p) => (
                <Chip key={p.key} label={p.label} active={pages.includes(p.key)} onClick={() => toggle(pages, setPages, p.key)} testid={`new-user-page-${p.key}`} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/40 mt-4 mb-2">Allowed Devices</label>
            {Object.entries(rooms).map(([room, list]) => (
              <div key={room} className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-white/60 uppercase tracking-wider">{room}</p>
                  <button
                    className="text-[10px] text-[#E05D26]"
                    onClick={() => {
                      const ids = list.map((d) => d.id);
                      const allIn = ids.every((id) => devices.includes(id));
                      setDevices(allIn ? devices.filter((x) => !ids.includes(x)) : Array.from(new Set([...devices, ...ids])));
                    }}
                    data-testid={`new-user-room-toggle-${room.replace(/\s+/g, "-")}`}
                  >
                    Toggle all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((d) => (
                    <Chip key={d.id} label={d.name} small active={devices.includes(d.id)} onClick={() => toggle(devices, setDevices, d.id)} testid={`new-user-device-${d.id.replace(/[\s.]+/g, "-")}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={create}
          disabled={saving}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#E05D26] font-semibold disabled:opacity-50"
          data-testid="new-user-submit-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {saving ? "Creating…" : "Create user"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function FormInput({ label, value, onChange, type = "text", placeholder, testid }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-white/40 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-2 text-base font-heading"
        data-testid={testid}
      />
    </div>
  );
}

function Chip({ label, active, onClick, small, testid }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? "text-[11px] px-2.5 py-1" : "text-xs px-3 py-1.5"} rounded-full border transition-colors ${
        active
          ? "bg-[#E05D26] border-[#E05D26] text-white"
          : "bg-white/5 border-white/10 text-white/70"
      }`}
      data-testid={testid}
    >
      {label}
    </button>
  );
}
