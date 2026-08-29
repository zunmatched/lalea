import { useCallback,useEffect,useRef,useState } from "react";

export type WakeLockStatus = "idle" | "active" | "unsupported" | "denied" | "error";
export const wakeLockStatusLabels: Record<WakeLockStatus, string> = { idle: "尚未啟用，點一下開啟", active: "🔒 螢幕保持喚醒中", unsupported: "此瀏覽器不支援螢幕喚醒鎖", denied: "螢幕喚醒鎖被拒絕，點一下重試", error: "螢幕喚醒鎖發生錯誤，點一下重試" };

export function useWakeLock(active: boolean): [WakeLockStatus, () => void] {
  const [status, setStatus] = useState<WakeLockStatus>("idle");
  const [retryTick, setRetryTick] = useState(0);
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
        lock.addEventListener("release", () => {
          // the OS releases the lock the instant the screen turns off (manual power button included) —
          // clearing the ref here is what lets the visibilitychange handler below know to re-acquire
          if (lockRef.current === lock) lockRef.current = null;
          if (!cancelled) setStatus("idle");
        });
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
  }, [active, retryTick]);
  const retry = useCallback(() => setRetryTick((value) => value + 1), []);
  return [status, retry];
}
