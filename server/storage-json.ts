import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import os from "os";
import type { IStorage } from "./storage";
import type { Tweak, InsertTweak, UpdateTweakRequest } from "@shared/schema";

interface StoreData {
  tweaks: Tweak[];
  settings: Record<string, string>;
  nextId: number;
}

function getStorePath(): string {
  if (process.env.JSON_STORE_PATH) return process.env.JSON_STORE_PATH;
  const dir = path.join(os.homedir(), ".jgoode-aio");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "data.json");
}

function loadStore(): StoreData {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    return { tweaks: [], settings: {}, nextId: 1 };
  }
  try {
    return JSON.parse(readFileSync(storePath, "utf-8"));
  } catch {
    return { tweaks: [], settings: {}, nextId: 1 };
  }
}

function saveStore(data: StoreData): void {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}

export class JsonStorage implements IStorage {
  getTweaks(): Promise<Tweak[]> {
    return Promise.resolve(loadStore().tweaks);
  }

  createTweak(tweak: InsertTweak): Promise<Tweak> {
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
    return Promise.resolve(newTweak);
  }

  updateTweak(id: number, updates: UpdateTweakRequest): Promise<Tweak | undefined> {
    const store = loadStore();
    const idx = store.tweaks.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.resolve(undefined);
    store.tweaks[idx] = { ...store.tweaks[idx], ...updates };
    saveStore(store);
    return Promise.resolve(store.tweaks[idx]);
  }

  clearTweaks(): Promise<void> {
    const store = loadStore();
    store.tweaks = [];
    store.nextId = 1;
    saveStore(store);
    return Promise.resolve();
  }

  getSetting(key: string): Promise<string | undefined> {
    return Promise.resolve(loadStore().settings[key]);
  }

  setSetting(key: string, value: string): Promise<void> {
    const store = loadStore();
    store.settings[key] = value;
    saveStore(store);
    return Promise.resolve();
  }

  getAllSettings(): Promise<Record<string, string>> {
    return Promise.resolve(loadStore().settings);
  }
}
