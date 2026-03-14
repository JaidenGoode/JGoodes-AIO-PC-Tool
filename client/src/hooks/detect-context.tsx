import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { detectTweaks } from "@/lib/api";
import type { Tweak } from "@shared/schema";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;
const PERIODIC_INTERVAL_MS = 60_000; // Re-scan every 60 seconds silently

interface DetectContextValue {
  triggerDetect: (delayMs?: number) => void;
  isDetecting: boolean;
  hasInitialDetect: boolean;
  lastDetectedAt: Date | null;
}

const DetectContext = createContext<DetectContextValue>({
  triggerDetect: () => {},
  isDetecting: false,
  hasInitialDetect: false,
  lastDetectedAt: null,
});

export function DetectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasInitialDetect, setHasInitialDetect] = useState(false);
  const [lastDetectedAt, setLastDetectedAt] = useState<Date | null>(null);
  const isRunningRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runDetect = useCallback(async () => {
    if (isRunningRef.current) {
      pendingRef.current = true;
      return;
    }
    isRunningRef.current = true;
    setIsDetecting(true);
    try {
      const result = await detectTweaks();

      if (result.results && Object.keys(result.results).length > 0) {
        const current = queryClient.getQueryData<Tweak[]>(["/api/tweaks"]);
        if (current) {
          const updated = current.map(t =>
            result.results[t.title] !== undefined
              ? { ...t, isActive: result.results[t.title] === 1 }
              : t
          );
          queryClient.setQueryData<Tweak[]>(["/api/tweaks"], updated);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
      setLastDetectedAt(new Date());
    } catch (err) {
      console.error("[detect] Failed:", err);
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
    } finally {
      isRunningRef.current = false;
      setIsDetecting(false);
      setHasInitialDetect(true);
      if (pendingRef.current) {
        pendingRef.current = false;
        setTimeout(runDetect, 300);
      }
    }
  }, [queryClient]);

  const triggerDetect = useCallback((delayMs = 0) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runDetect, delayMs);
  }, [runDetect]);

  useEffect(() => {
    // 1. Run detection immediately on mount (app open)
    runDetect();

    // 2. Periodic silent detection every 60s
    periodicRef.current = setInterval(() => {
      runDetect();
    }, PERIODIC_INTERVAL_MS);

    // 3. Re-detect when window gains focus (user switches back to the app)
    const onFocus = () => {
      triggerDetect(500);
    };
    window.addEventListener("focus", onFocus);

    // 4. Electron-specific: listen for app activate/show events
    let unsubElectron: (() => void) | undefined;
    if (isElectron && window.electronAPI?.onWindowFocus) {
      unsubElectron = window.electronAPI.onWindowFocus(() => {
        triggerDetect(500);
      });
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (periodicRef.current) clearInterval(periodicRef.current);
      window.removeEventListener("focus", onFocus);
      unsubElectron?.();
    };
  }, []);

  return (
    <DetectContext.Provider value={{ triggerDetect, isDetecting, hasInitialDetect, lastDetectedAt }}>
      {children}
    </DetectContext.Provider>
  );
}

export function useDetect() {
  return useContext(DetectContext);
}
