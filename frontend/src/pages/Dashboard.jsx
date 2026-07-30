import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Wifi, WifiOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { friendlyErr } from "../lib/utils";
import { useLiveSync } from "../lib/useLiveSync";
import DeviceCard from "../components/DeviceCard";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [online, setOnline] = useState(null);
  const inFlightRef = useRef(0);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jerry_collapsed_rooms") || "{}");
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem("jerry_collapsed_rooms", JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleRoom = (room) => setCollapsed((c) => ({ ...c, [room]: !c[room] }));

  const load = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    if (silent && inFlightRef.current > 0) return;
    try {
      const res = await api.get("/devices");
      setDevices(res.data);
      setOnline(true);
    } catch (e) {
      if (!silent) toast.error(friendlyErr(e));
      setOnline(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useLiveSync(() => load({ silent: true }), 4000);

  const rooms = useMemo(() => {
    const g = {};
    for (const d of devices) {
      const r = d.room;
      g[r] = g[r] || [];
      g[r].push(d);
    }
    return g;
  }, [devices]);

  const controlDevice = async (device, extra = {}) => {
    const id = device.id;
    setBusy((b) => ({ ...b, [id]: true }));
    inFlightRef.current++;
    try {
      const action = extra.action || (device.on ? "turn_off" : "turn_on");
      const body = {
        room: device.room,
        device: device.deviceKey,
        deviceId: device.id,
        action,
        ...(extra.value !== undefined ? { value: extra.value } : {}),
      };

      // Node server now handles background hardware triggering and state persistence
      await api.post("/devices/control", body);

      // optimistic local update
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          if (action === "turn_on") return { ...d, on: true, statusText: d.category === "fan" && d.value ? `Speed ${d.value}` : "On" };
          if (action === "turn_off") return { ...d, on: false, statusText: "Off" };
          if (action === "set_fan_speed") return { ...d, on: true, value: extra.value, statusText: `Speed ${extra.value}` };
          return d;
        })
      );
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
    }
  };

  const allRoomOn = async (room) => {
    inFlightRef.current++;
    try {
      const body = { room, action: "room_on" };
      await api.post("/devices/control", body);
      toast.success(`All in ${room} turned ON`);
      load();
    } catch (e) { toast.error(friendlyErr(e)); }
    finally {
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 300);
    }
  };

  const allRoomOff = async (room) => {
    inFlightRef.current++;
    try {
      const body = { room, action: "room_off" };
      await api.post("/devices/control", body);
      toast.success(`All in ${room} turned OFF`);
      load();
    } catch (e) { toast.error(friendlyErr(e)); }
    finally {
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 300);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="font-heading text-4xl font-bold leading-tight mt-1">Your <span className="text-[#E05D26]">ecosystem</span>.</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full glass ${online === false ? "text-red-400" : online ? "text-[#B4F733]" : "text-white/40"}`} data-testid="server-status-badge">
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online === null ? "…" : online ? "Online" : "Offline"}
          </div>
          <button data-testid="refresh-btn" onClick={() => load()} className="w-9 h-9 rounded-full glass grid place-items-center">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      {loading && devices.length === 0 && (
        <p className="text-white/40 text-center mt-20" data-testid="dashboard-loading">Loading devices…</p>
      )}

      {!loading && devices.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center" data-testid="dashboard-empty">
          <p className="text-white/60">No devices found. Check your Node server and configuration.</p>
        </div>
      )}

      {Object.entries(rooms).map(([room, list], idx) => {
        const isOpen = !collapsed[room];
        const activeCount = list.filter((d) => d.on).length;
        return (
          <motion.section
            key={room}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="mb-4"
          >
            <button
              onClick={() => toggleRoom(room)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{ duration: 0.25 }}
                  className="text-white/60 group-hover:text-white"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
                <h2 className="font-heading text-xl uppercase tracking-widest text-white/80 group-hover:text-white">
                  {room}
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 font-mono">
                  {activeCount}/{list.length}
                </span>
              </div>
              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => allRoomOn(room)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 cursor-pointer"
                >
                  ALL ON
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => allRoomOff(room)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 cursor-pointer"
                >
                  ALL OFF
                </span>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    {list.map((d) => (
                      <DeviceCard
                        key={d.id}
                        device={d}
                        loading={!!busy[d.id]}
                        onToggle={(dev) => controlDevice(dev)}
                        onValueChange={(dev, v) => controlDevice(dev, { action: "set_fan_speed", value: v })}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </div>
  );
}
