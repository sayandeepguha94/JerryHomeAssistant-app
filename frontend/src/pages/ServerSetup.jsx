import React, { useState } from "react";
import { motion } from "framer-motion";
import { Server, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { setServerUrl, pingServer } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function ServerSetup({ onSaved }) {
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);

  const proceed = async (skipTest) => {
    let v = url.trim();
    if (!v) { toast.error("Please enter your server address"); return; }
    if (!v.startsWith("http://") && !v.startsWith("https://")) v = `http://${v}`;
    setTesting(true);
    try {
      if (!skipTest) {
        const ping = await pingServer(v);
        if (!ping.online) {
          toast.error("Server unreachable. Saved anyway — you can change it later.");
        } else {
          toast.success("Server reachable");
        }
      }
      setServerUrl(v);
      onSaved?.();
      nav("/", { replace: true });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1564078516393-cf04bd966897?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxsaXZpbmclMjByb29tJTIwZGFyayUyMGFtYmllbnQlMjBsaWdodGluZ3xlbnwwfHx8fDE3ODUxMzI1NjF8MA&ixlib=rb-4.1.0&q=85")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px) saturate(120%)",
          transform: "scale(1.15)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C10]/50 via-[#0B0C10]/90 to-[#0B0C10]" />

      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-[11px] tracking-[0.4em] text-white/40 mb-4">FIRST-TIME SETUP</div>
          <h1 className="font-heading text-[42px] leading-[1] font-bold">
            Point Jerry at your<br />
            <span className="text-[#E05D26]">home server.</span>
          </h1>
          <p className="mt-4 text-white/50 max-w-xs text-sm">
            Enter the local IP + port where your voice-assistant Node.js server is running.
            You can change this anytime in Settings.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glass rounded-3xl p-6 space-y-5"
          data-testid="server-setup-form"
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <Server className="w-3.5 h-3.5" /> Server address
            </label>
            <input
              data-testid="server-setup-url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.29.112:3000"
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="url"
              className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-3 text-lg font-heading"
            />
            <p className="text-[11px] text-white/40 mt-2">
              Find your server's IP by running <code className="text-white/70 bg-white/5 px-1 rounded">ifconfig</code> or <code className="text-white/70 bg-white/5 px-1 rounded">ip a</code> on the machine running the Node.js app.
            </p>
          </div>

          <button
            data-testid="server-setup-continue-btn"
            onClick={() => proceed(false)}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#E05D26] text-white font-heading font-semibold text-lg shadow-[0_0_30px_rgba(224,93,38,0.35)] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            {testing ? "Testing…" : "Continue"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
