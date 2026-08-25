import { useEffect,useRef } from "react";

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;
    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) { void lock.release(); return }
        lockRef.current = lock;
      } catch {
        // wake lock unavailable or denied (e.g. low battery mode) - nothing else we can do
      }
    }
    void acquire();
    function handleVisibility() { if (document.visibilityState === "visible" && !lockRef.current) void acquire() }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}
