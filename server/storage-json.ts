import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "fs";
import path from "path";
import os from "os";
import type { IStorage, CleaningHistoryEntry } from "./storage";
import type { Tweak, InsertTweak, UpdateTweakRequest } from "@shared/schema";

interface StoreData {
  tweaks: Tweak[];
  settings: Record<string, string>;
  nextId: number;
  cleaningHistory: CleaningHistoryEntry[];
}

let cachedStore: StoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function getStorePath(): string {
  if (process.env.JSON_STORE_PATH) return process.env.JSON_STORE_PATH;
  const dir = path.join(os.homedir(), ".jgoode-aio");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "data.json");
}

function loadStore(): StoreData {
  if (cachedStore) return cachedStore;
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    cachedStore = { tweaks: [], settings: {}, nextId: 1, cleaningHistory: [] };
    return cachedStore;
  }
  try {
    const raw = JSON.parse(readFileSync(storePath, "utf-8"));
    const store: StoreData = { cleaningHistory: [], ...raw };
    cachedStore = store;
    return store;
  } catch {
    const store: StoreData = { tweaks: [], settings: {}, nextId: 1, cleaningHistory: [] };
    cachedStore = store;
    return store;
  }
}

function saveStore(data: StoreData & object): void {
  cachedStore = { ...data };
  const storePath = getStorePath();
  const tmpPath = storePath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, storePath);
}

function withLock<T>(fn: () => T): Promise<T> {
  const result = writeQueue.then(fn);
  writeQueue = result.then(() => {}, () => {});
  return result;
}

export class JsonStorage implements IStorage {
  getTweaks(): Promise<Tweak[]> {
    return Promise.resolve([...loadStore().tweaks]);
  }

  createTweak(tweak: InsertTweak): Promise<Tweak> {
    return withLock(() => {
      const store = loadStore();
      const newTweak: Tweak = {
        id: store.nextId++,
        title: tweak.title,
        description: tweak.description,
        category: tweak.category,
        isActive: tweak.isActive ?? false,
        warning: tweak.warning ?? null,
        featureBreaks: tweak.featureBreaks ?? null,
      };
      store.tweaks.push(newTweak);
      saveStore(store);
      return newTweak;
    });
  }

  updateTweak(id: number, updates: UpdateTweakRequest): Promise<Tweak | undefined> {
    return withLock(() => {
      const store = loadStore();
      const idx = store.tweaks.findIndex((t) => t.id === id);
      if (idx === -1) return undefined;
      store.tweaks[idx] = { ...store.tweaks[idx], ...updates };
      saveStore(store);
      return store.tweaks[idx];
    });
  }

  clearTweaks(): Promise<void> {
    return withLock(() => {
      const store = loadStore();
      store.tweaks = [];
      store.nextId = 1;
      saveStore(store);
    });
  }

  removeTweaksByCategory(category: string): Promise<number> {
    return withLock(() => {
      const store = loadStore();
      const before = store.tweaks.length;
      store.tweaks = store.tweaks.filter((t) => t.category !== category);
      const removed = before - store.tweaks.length;
      if (removed > 0) saveStore(store);
      return removed;
    });
  }

  removeTweaksNotInSeed(seedTitles: string[]): Promise<number> {
    return withLock(() => {
      const store = loadStore();
      const before = store.tweaks.length;
      const titleSet = new Set(seedTitles);
      store.tweaks = store.tweaks.filter((t) => titleSet.has(t.title));
      const removed = before - store.tweaks.length;
      if (removed > 0) saveStore(store);
      return removed;
    });
  }

  getSetting(key: string): Promise<string | undefined> {
    return Promise.resolve(loadStore().settings[key]);
  }

  setSetting(key: string, value: string): Promise<void> {
    return withLock(() => {
      const store = loadStore();
      store.settings[key] = value;
      saveStore(store);
    });
  }

  getAllSettings(): Promise<Record<string, string>> {
    return Promise.resolve({ ...loadStore().settings });
  }

  getCleaningHistory(): Promise<CleaningHistoryEntry[]> {
    return Promise.resolve([...loadStore().cleaningHistory]);
  }

  addCleaningHistory(entry: CleaningHistoryEntry): Promise<void> {
    return withLock(() => {
      const store = loadStore();
      store.cleaningHistory.unshift(entry);
      if (store.cleaningHistory.length > 50) store.cleaningHistory.length = 50;
      saveStore(store);
    });
  }
}
