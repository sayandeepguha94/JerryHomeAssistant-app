import React, { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Loader2, Info } from "lucide-react";
import { useAuth } from "../lib/auth";
import { getServerUrl, getFallbackUrl } from "../lib/api";
import { friendlyErr } from "../lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim().toLowerCase(), password);
      toast.success("Welcome back");
      nav("/", { replace: true });
    } catch (e) {
      setError(friendlyErr(e));
      toast.error(friendlyErr(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset connection settings? This will revert to default localhost communication.")) {
      clearServerUrl();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Immersive background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1564078516393-cf04bd966897?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxsaXZpbmclMjByb29tJTIwZGFyayUyMGFtYmllbnQlMjBsaWdodGluZ3xlbnwwfHx8fDE3ODUxMzI1NjF8MA&ixlib=rb-4.1.0&q=85")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(24px) saturate(120%)",
          transform: "scale(1.15)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C10]/40 via-[#0B0C10]/85 to-[#0B0C10]" />

      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-[11px] tracking-[0.4em] text-white/40 mb-4">JERRY · VOICE HOME</div>
          <h1 className="font-heading text-[44px] leading-[1] font-bold">
            Command your<br />
            <span className="text-[#E05D26]">ecosystem.</span>
          </h1>
          <p className="mt-4 text-white/50 max-w-xs">
            Sign in to control lights, fans, media & voice commands across every room.
          </p>
        </motion.div>

        <div>
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="glass rounded-3xl p-6 space-y-5 mb-4"
            data-testid="login-form"
          >
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Username
              </label>
              <input
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoCapitalize="off"
                autoCorrect="off"
                className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-3 text-lg font-heading"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Password
              </label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-3 text-lg font-heading"
                required
              />
            </div>
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#E05D26] text-white font-heading font-semibold text-lg shadow-[0_0_30px_rgba(224,93,38,0.35)] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? "Signing in…" : "Enter"}
            </button>
            <p className="text-xs text-white/30 text-center">
              Default: <span className="text-white/50">admin / admin0466</span>
            </p>
          </motion.form>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-4 space-y-3 border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-[#E05D26] mt-0.5" />
                <div className="text-[10px] text-white/50 space-y-1 flex-1">
                  <p className="font-bold text-red-400">Connection Failed</p>
                  <p>The dashboard cannot reach your Node Server. Verify the IP below.</p>
                  <div className="pt-1 font-mono text-[9px] opacity-70">
                    <p>Target: {getFallbackUrl()}/api/login</p>
                    <p>Origin: {window.location.origin}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-white/70 hover:bg-white/10"
              >
                Reset Connection Settings
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
