import { useEffect, useRef } from "react";

/**
 * Runs `fn` on mount, then repeatedly every `intervalMs`,
 * and again whenever the tab becomes visible / window is focused.
 * Pauses polling while the tab is hidden.
 */
export function useLiveSync(fn, intervalMs = 5000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let timer;
    let stopped = false;

    const tick = () => {
      if (stopped || document.hidden) return;
      fnRef.current?.();
    };

    const start = () => {
      clearInterval(timer);
      timer = setInterval(tick, intervalMs);
    };

    const onVisible = () => {
      if (!document.hidden) {
        fnRef.current?.();
        start();
      }
    };

    // initial fetch + interval
    fnRef.current?.();
    start();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [intervalMs]);
}
