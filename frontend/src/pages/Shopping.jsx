import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, ShoppingBasket, ListChecks, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { friendlyErr } from "../lib/utils";
import { useLiveSync } from "../lib/useLiveSync";

export default function Shopping() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("progress"); // "progress" | "manage"
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const inFlightRef = useRef(0);

  const load = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    if (silent && inFlightRef.current > 0) return;
    if (!silent) setLoading(true);
    try {
      const r = await api.get("/shopping-list");
      setItems(r.data || []);
    } catch (e) {
      if (!silent) toast.error(friendlyErr(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveSync(() => load({ silent: true }), 5000);

  const addItem = async () => {
    const t = text.trim();
    if (!t) return;
    setAdding(true);
    inFlightRef.current++;
    try {
      const r = await api.post("/shopping-list/add", { text: t });
      setItems(r.data.items || []);
      setText("");
    } catch (e) {
      toast.error(friendlyErr(e));
    } finally {
      setAdding(false);
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 800);
    }
  };

  const toggle = async (item) => {
    const next = items.map((it) => (it.id === item.id ? { ...it, completed: !it.completed } : it));
    setItems(next);
    inFlightRef.current++;
    try {
      await api.post("/shopping-list", { items: next });
    } catch (e) {
      toast.error(friendlyErr(e));
      load();
    } finally {
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 800);
    }
  };

  const removeByText = async (itemText) => {
    const next = items.filter((it) => it.text !== itemText);
    setItems(next);
    inFlightRef.current++;
    try {
      await api.post("/shopping-list", { items: next });
    } catch (e) {
      toast.error(friendlyErr(e));
      load();
    } finally {
      setTimeout(() => { inFlightRef.current = Math.max(0, inFlightRef.current - 1); }, 800);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-5 pt-10 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Shopping List</p>
        <h1 className="font-heading text-4xl font-bold">Household <span className="text-[#B4F733]">runs.</span></h1>
      </motion.div>

      {/* Mode Switcher */}
      <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
        <button
          onClick={() => setMode("progress")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            mode === "progress" ? "bg-[#B4F733] text-black shadow-lg" : "text-white/60"
          }`}
        >
          <ListChecks className="w-4 h-4" /> Progress
        </button>
        <button
          onClick={() => setMode("manage")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            mode === "manage" ? "bg-[#B4F733] text-black shadow-lg" : "text-white/60"
          }`}
        >
          <Settings2 className="w-4 h-4" /> Manage
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "progress" ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            {loading && items.length === 0 && <p className="text-center text-white/40">Loading…</p>}

            {!loading && items.length === 0 && (
              <div className="text-center py-16 text-white/40">
                <ShoppingBasket className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>Your list is empty. Go to Manage to add items.</p>
              </div>
            )}

            <ul className="space-y-2">
              {items.map((it) => (
                <motion.li
                  key={it.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <button
                    onClick={() => toggle(it)}
                    className={`w-6 h-6 rounded-full grid place-items-center border transition-colors ${
                      it.completed ? "bg-[#B4F733] border-[#B4F733]" : "border-white/30"
                    }`}
                  >
                    {it.completed && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm ${it.completed ? "line-through text-white/40" : "text-white/90"}`}>{it.text}</span>
                  <button
                    onClick={() => removeByText(it.text)}
                    className="text-white/30 hover:text-red-400 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.div
            key="manage"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="pt-4 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-white/30 ml-2">Add item to list</p>
                <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                    placeholder="Item name…"
                    className="flex-1 bg-transparent outline-none py-2 text-sm"
                  />
                  <button
                    onClick={() => addItem()}
                    disabled={!text.trim() || adding}
                    className="w-8 h-8 rounded-full bg-[#E05D26] grid place-items-center disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
