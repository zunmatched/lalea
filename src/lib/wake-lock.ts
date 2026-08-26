import { useEffect,useRef,useState } from "react";

export type WakeLockStatus = "idle" | "active" | "unsupported" | "denied" | "error";
export const wakeLockStatusLabels: Record<WakeLockStatus, string> = { idle: "尚未啟用", active: "🔒 螢幕保持喚醒中", unsupported: "此瀏覽器不支援螢幕喚醒鎖", denied: "螢幕喚醒鎖被拒絕", error: "螢幕喚醒鎖發生錯誤" };

export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("idle");
  const lockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!active) { Promise.resolve().then(() => setStatus("idle")); return }
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) { Promise.resolve().then(() => setStatus("unsupported")); return }
    let cancelled = false;
    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) { void lock.release(); return }
        lockRef.current = lock;
        setStatus("active");
        lock.addEventListener("release", () => { if (!cancelled) setStatus("idle") });
      } catch (err) {
        if (cancelled) return;
        setStatus(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
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
  return status;
}
