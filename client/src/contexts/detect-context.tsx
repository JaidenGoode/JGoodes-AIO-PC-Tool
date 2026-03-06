import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { detectTweaks } from "@/lib/api";

interface DetectContextValue {
  triggerDetect: (delayMs?: number) => void;
  isDetecting: boolean;
  hasInitialDetect: boolean;
}

const DetectContext = createContext<DetectContextValue>({
  triggerDetect: () => {},
  isDetecting: false,
  hasInitialDetect: false,
});

export function DetectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasInitialDetect, setHasInitialDetect] = useState(false);
  const isRunningRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDetect = useCallback(async () => {
    if (isRunningRef.current) {
      pendingRef.current = true;
      return;
    }
    isRunningRef.current = true;
    setIsDetecting(true);
    try {
      const result = await detectTweaks();
      console.log("[detect] Detection complete:", result.active, "active of", result.total, "scanned");
      await queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
    } catch (err) {
      console.error("[detect] Detection failed:", err);
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
    runDetect();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <DetectContext.Provider value={{ triggerDetect, isDetecting, hasInitialDetect }}>
      {children}
    </DetectContext.Provider>
  );
}

export function useDetect() {
  return useContext(DetectContext);
}
