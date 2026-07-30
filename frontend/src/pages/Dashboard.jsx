import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Wifi, WifiOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, pythonApi, isUsingFallback } from "../lib/api";
import { useAuth } from "../lib/auth";
import { friendlyErr } from "../lib/utils";
import { useLiveSync } from "../lib/useLiveSync";
import DeviceCard from "../components/DeviceCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [online, setOnline] = useState(null);
  const inFlightRef = useRef(0); // # of pending control requests
  const fallbackMode = isUsingFallback();

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
    // Skip live-sync while a control action is in-flight so optimistic state isn't clobbered
    if (silent && inFlightRef.current > 0) return;
    try {
      // Parallelize fetching from Node and Python
      // If in fallback mode, we skip Python direct check
      const results = await Promise.allSettled([
        api.get("/devices"),
        fallbackMode ? Promise.resolve({ status: "skipped" }) : pythonApi.get("/")
      ]);

      let list = [];
      let liveStates = null;

      // Handle Node response (Catalog/Persistence)
      if (results[0].status === "fulfilled") {
        list = results[0].value.data;
      } else {
        throw results[0].reason; // Fail the load if Node is down
      }

      // Handle Python response (Live Physical States) DIRECT
      if (!fallbackMode && results[1].status === "fulfilled" && results[1].value.data?.status === "success") {
        liveStates = results[1].value.data.states;
      }

      // Merge live states if available
      if (liveStates) {
        list = list.map(d => {
          const room = d.room.toLowerCase();
          const key = d.deviceKey.toLowerCase();
          if (liveStates[room] && liveStates[room][key] !== undefined) {
            const val = liveStates[room][key];
            const isOn = val === "on" || val === true || val === 1 || (typeof val === "number" && val > 0) || (typeof val === "string" && parseInt(val) > 0);
            return {
              ...d,
              on: isOn,
              value: !isNaN(Number(val)) ? Number(val) : d.value,
              statusText: isOn ? (d.category === "fan" && !isNaN(Number(val)) ? `Speed ${val}` : "On") : "Off"
            };
          }
          return d;
        });
      }

      // Non-admin filtering
      if (user.role !== "admin") {
        const allowed = new Set(user.allowed_devices || []);
        list = list.filter((d) => allowed.has(d.id));
      }
      setDevices(list);
      setOnline(true);
    } catch (e) {
      if (!silent) toast.error(friendlyErr(e));
      setOnline(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user.role, user.allowed_devices, fallbackMode]);

  // Poll every 4s, and refresh when tab becomes visible / window regains focus
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

  const controlDevice = async (device, extra = {}, retryCount = 0) => {
    const id = device.id;
    if (retryCount === 0) setBusy((b) => ({ ...b, [id]: true }));
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

      if (fallbackMode) {
        // --- FALLBACK MODE: Use Node Proxy Only ---
        await api.post("/devices/control", body);
      } else {
        // --- PRIMARY MODE: Direct Python + Node Persistence ---
        const pythonPromise = pythonApi.post("/", body);
        const nodePromise = api.post("/devices/control", body);
        await Promise.all([pythonPromise, nodePromise]);
      }

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

      // --- RELIABILITY LOOP: Direct Verify and Retry ---
      if (retryCount < 3) {
        setTimeout(async () => {
          try {
            // Check status from the relevant source
            let live = null;
            if (fallbackMode) {
              const res = await api.get("/devices");
              const d = res.data.find(x => x.id === id);
              live = d?.on; // simplified for Node check
            } else {
              const checkRes = await pythonApi.get("/");
              if (checkRes.data?.status === "success") {
                live = checkRes.data.states[device.room.toLowerCase()]?.[device.deviceKey.toLowerCase()];
              }
            }

            if (live !== null) {
              const expectedOn = (action !== "turn_off");

              // More robust state matching (handles strings like "On", "1", "true")
              const actualOn = live && (
                live === "on" ||
                live === "On" ||
                live === true ||
                live === 1 ||
                live === "1" ||
                (typeof live === "number" && live > 0) ||
                (typeof live === "string" && !isNaN(parseInt(live)) && parseInt(live) > 0)
              );

              let match = (actualOn === expectedOn);
              if (match && action === "set_fan_speed" && extra.value !== undefined) {
                match = (Number(live) === extra.value);
              }

              if (!match) {
                console.log(`Verification failed for ${id}, retrying... (${retryCount + 1})`);
                controlDevice(device, extra, retryCount + 1);
              } else {
                setBusy((b) => ({ ...b, [id]: false }));
              }
            }
          } catch (err) {
            console.warn("Verification check failed", err);
            // On failure, don't keep spinner forever
            if (retryCount >= 2) setBusy((b) => ({ ...b, [id]: false }));
          }
        }, 800);
      } else {
        setBusy((b) => ({ ...b, [id]: false }));
      }

    } catch (e) {
      if (retryCount === 0) toast.error(friendlyErr(e));
      setBusy((b) => ({ ...b, [id]: false }));
    } finally {
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
    }
  };

  const allRoomOn = async (room) => {
    if (user.role !== "admin") return;
    inFlightRef.current++;
    try {
      const body = { room, action: "room_on" };
      if (fallbackMode) {
        await api.post("/devices/control", body);
      } else {
        // Trigger Physical DIRECT
        await pythonApi.post("/", body);
        // Persist
        await api.post("/devices/control", body);
      }
      toast.success(`All in ${room} turned ON`);
      load();
    } catch (e) { toast.error(friendlyErr(e)); }
    finally {
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 300);
    }
  };
  const allRoomOff = async (room) => {
    if (user.role !== "admin") return;
    inFlightRef.current++;
    try {
      const body = { room, action: "room_off" };
      if (fallbackMode) {
        await api.post("/devices/control", body);
      } else {
        // Trigger Physical DIRECT
        await pythonApi.post("/", body);
        // Persist
        await api.post("/devices/control", body);
      }
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
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Welcome, {user?.name}</p>
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
          <p className="text-white/60">
            {user.role === "admin"
              ? "No devices found. Check that your Node server URL is set correctly in Settings and that the server is reachable."
              : "You don't have any devices assigned yet. Ask the admin to grant access."}
          </p>
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
            data-testid={`room-section-${room.replace(/\s+/g, "-")}`}
          >
            <button
              onClick={() => toggleRoom(room)}
              className="w-full flex items-center justify-between mb-3 group"
              data-testid={`room-toggle-${room.replace(/\s+/g, "-")}`}
              aria-expanded={isOpen}
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
              {user.role === "admin" && (
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => allRoomOn(room)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 cursor-pointer"
                    data-testid={`room-all-on-${room.replace(/\s+/g, "-")}`}
                  >
                    ALL ON
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => allRoomOff(room)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 cursor-pointer"
                    data-testid={`room-all-off-${room.replace(/\s+/g, "-")}`}
                  >
                    ALL OFF
                  </span>
                </div>
              )}
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
