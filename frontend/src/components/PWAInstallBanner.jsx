import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      if (!localStorage.getItem("jerry_pwa_dismissed")) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !prompt) return null;

  const install = async () => {
    prompt.prompt();
    await prompt.userChoice;
    setVisible(false);
  };
  const dismiss = () => {
    localStorage.setItem("jerry_pwa_dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="fixed top-3 left-3 right-3 z-50 glass rounded-2xl px-4 py-3 flex items-center gap-3" data-testid="pwa-install-banner">
      <Download className="w-5 h-5 text-[#E05D26]" />
      <div className="flex-1">
        <p className="text-sm font-semibold">Install Jerry</p>
        <p className="text-xs text-white/50">Add to home screen for full app experience.</p>
      </div>
      <button onClick={install} className="text-sm bg-[#E05D26] px-3 py-1.5 rounded-full font-semibold" data-testid="pwa-install-btn">Install</button>
      <button onClick={dismiss} className="text-white/40" data-testid="pwa-dismiss-btn"><X className="w-4 h-4" /></button>
    </div>
  );
}
