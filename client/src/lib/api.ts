async function fetchApi<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `${method} ${path} failed`);
  }
  return res.json();
}

import type { Tweak } from "@shared/schema";

export type ScanCategory = {
  id: string;
  name: string;
  description: string;
  size: number;
  sizeHuman: string;
  fileCount: number;
  found: boolean;
};

export type ScanResult = {
  categories: ScanCategory[];
  totalSize: number;
  totalSizeHuman: string;
  totalCount: number;
};

export type CleanResult = {
  success: boolean;
  freed: number;
  freedHuman: string;
  cleaned: string[];
};

export type SystemUsage = {
  cpu: { usage: number; cores: number };
  ram: { usage: number; usedGb: number; totalGb: number };
  gpu: { usage: number | null; model: string | null; temp: number | null };
  disk: { usage: number; readMb: number; writeMb: number };
};

export type BulkUpdateResult = { updated: number };

export type CleaningHistoryEntry = {
  date: string;
  freed: number;
  freedHuman: string;
  count: number;
};

export type CleaningHistory = {
  entries: CleaningHistoryEntry[];
  totalFreed: number;
  totalFreedHuman: string;
};

export const getTweaks = (): Promise<Tweak[]> => fetchApi("/api/tweaks");
export const updateTweak = (id: number, isActive: boolean): Promise<Tweak> =>
  fetchApi(`/api/tweaks/${id}`, "PATCH", { isActive });

export const bulkUpdateTweaks = (
  titles: string[],
  isActive: boolean
): Promise<BulkUpdateResult> =>
  fetchApi("/api/tweaks/bulk", "POST", { titles, isActive });

export type DetectResult = { active: number; total: number; results: Record<string, number> };
export const detectTweaks = (): Promise<DetectResult> =>
  fetchApi("/api/tweaks/detect", "POST");

export const getSystemInfo = (): Promise<unknown> => fetchApi("/api/system/info");
export const getSystemUsage = (): Promise<SystemUsage> => fetchApi("/api/system/usage");
export const getTemps = (): Promise<unknown> => fetchApi("/api/system/temps");

export const scanCleaner = (): Promise<ScanResult> => fetchApi("/api/cleaner/scan");
export const cleanCategories = (ids: string[]): Promise<CleanResult> =>
  fetchApi("/api/cleaner/clean", "POST", { ids });

export const getCleaningHistory = (): Promise<CleaningHistory> =>
  fetchApi("/api/cleaner/history");
export const addCleaningHistory = (entry: Omit<CleaningHistoryEntry, "date">): Promise<void> =>
  fetchApi("/api/cleaner/history", "POST", entry);

export const getDns = (): Promise<unknown> => fetchApi("/api/dns/current");
export const setDns = (provider: string): Promise<unknown> =>
  fetchApi("/api/dns/set", "POST", { provider });

export const createRestorePoint = (name: string): Promise<unknown> =>
  fetchApi("/api/restore/create", "POST", { name });

export const runUtility = (action: string): Promise<unknown> =>
  fetchApi("/api/utilities/run", "POST", { action });

export const getSettings = (): Promise<unknown> => fetchApi("/api/settings");
export const saveSettings = (data: Record<string, unknown>): Promise<unknown> =>
  fetchApi("/api/settings", "POST", data);

export const checkUpdate = (): Promise<unknown> => fetchApi("/api/check-update");
export const getAppVersion = (): Promise<string> => Promise.resolve("3.0.0");
export const openUrl = (url: string): Promise<void> =>
  Promise.resolve(void window.open(url, "_blank", "noreferrer"));
