import { useQuery } from "@tanstack/react-query";
import { getSystemInfo, getTemps, getSystemUsage } from "@/lib/api";
import type { SystemUsage } from "@/lib/api";

export function useSystemInfo() {
  return useQuery({
    queryKey: ["/api/system/info"],
    queryFn: getSystemInfo,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useTemps() {
  return useQuery({
    queryKey: ["/api/system/temps"],
    queryFn: getTemps,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 25000,
  });
}

export function useSystemUsage() {
  return useQuery<SystemUsage>({
    queryKey: ["/api/system/usage"],
    queryFn: getSystemUsage,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  });
}
