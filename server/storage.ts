import { JsonStorage } from "./storage-json";
import type { Tweak, InsertTweak, UpdateTweakRequest } from "@shared/schema";

export interface IStorage {
  getTweaks(): Promise<Tweak[]>;
  createTweak(tweak: InsertTweak): Promise<Tweak>;
  updateTweak(id: number, updates: UpdateTweakRequest): Promise<Tweak | undefined>;
  clearTweaks(): Promise<void>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;
}

// Always use JsonStorage for reliable web deployment
export const storage: IStorage = new JsonStorage();
