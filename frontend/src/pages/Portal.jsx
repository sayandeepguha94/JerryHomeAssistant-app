import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingBasket, Shield, Key, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Portal() {
  const { validateGateway } = useAuth();
  const nav = useNavigate();
  const [selectedMode, setSelectedMode] = useState(null); // 'home', 'list', 'admin'
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const options = [
    { mode: "home", label: "Home Dashboard", desc: "Control ecosystem devices", Icon: Home, color: "#B4F733" },
    { mode: "list", label: "Household List", desc: "Manage shopping items", Icon: ShoppingBasket, color: "#E05D26" },
    { mode: "admin", label: "Admin Gateway", desc: "Full master configuration", Icon: Shield, color: "#FFFFFF" },
  ];

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await validateGateway(selectedMode, password);
      if (success) {
        toast.success(`Access granted to ${selectedMode}`);
        nav(selectedMode === "admin" ? "/admin" : `/${selectedMode}`);
      } else {
        toast.error("Invalid password");
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E05D26]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#B4F733]/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="text-[11px] tracking-[0.4em] text-white/40 mb-4 uppercase">Jerry · Gateway</div>
        <h1 className="font-heading text-[44px] leading-[1] font-bold mb-12">
          Select your<br />
          <span className="text-[#E05D26]">destination.</span>
        </h1>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {!selectedMode ? (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {options.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setSelectedMode(opt.mode)}
                    className="w-full glass rounded-3xl p-5 flex items-center gap-4 text-left hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <opt.Icon className="w-6 h-6" style={{ color: opt.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold">{opt.label}</h3>
                      <p className="text-xs text-white/40">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleVerify} className="glass rounded-3xl p-8 space-y-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Key className="w-8 h-8 text-[#E05D26]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-bold">Secure Access</h3>
                      <p className="text-xs text-white/40">Enter password for {selectedMode} mode</p>
                    </div>
                  </div>

                  <input
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-b border-white/20 focus:border-[#E05D26] outline-none py-3 text-center text-2xl tracking-[0.5em]"
                    required
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setSelectedMode(null); setPassword(""); }}
                      className="flex-1 py-4 rounded-2xl border border-white/10 text-sm font-semibold hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#E05D26] text-white font-heading font-semibold shadow-[0_0_30px_rgba(224,93,38,0.35)]"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
