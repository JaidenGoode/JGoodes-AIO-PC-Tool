import { useQuery } from "@tanstack/react-query";
import { getSystemInfo, getTemps, getSystemUsage } from "@/lib/api";
import type { SystemUsage } from "@/lib/api";

export function useSystemInfo() {
  return useQuery({
    queryKey: ["/api/system/info"],
    queryFn: getSystemInfo,
  });
}

export function useTemps() {
  return useQuery({
    queryKey: ["/api/system/temps"],
    queryFn: getTemps,
    refetchInterval: 15000,
  });
}

export function useSystemUsage() {
  return useQuery<SystemUsage>({
    queryKey: ["/api/system/usage"],
    queryFn: getSystemUsage,
    refetchInterval: 4000,
  });
}
