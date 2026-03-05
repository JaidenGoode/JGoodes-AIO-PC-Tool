import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import type { IStorage } from "./storage";
import type { Tweak, InsertTweak, UpdateTweakRequest } from "@shared/schema";

function getDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  const dir = path.join(os.homedir(), ".jgoode-aio");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "data.db");
}

let _sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!_sqliteDb) {
    const dbPath = getDbPath();
    _sqliteDb = new Database(dbPath);
    _sqliteDb.pragma("journal_mode = WAL");
    _sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS tweaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        warning TEXT,
        feature_breaks TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );
    `);
  }
  return _sqliteDb;
}

function rowToTweak(row: any): Tweak {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    isActive: row.is_active === 1,
    warning: row.warning ?? null,
    featureBreaks: row.feature_breaks ?? null,
  };
}

export class SqliteStorage implements IStorage {
  getTweaks(): Promise<Tweak[]> {
    const db = getSqliteDb();
    const rows = db.prepare("SELECT * FROM tweaks ORDER BY id").all();
    return Promise.resolve(rows.map(rowToTweak));
  }

  createTweak(tweak: InsertTweak): Promise<Tweak> {
    const db = getSqliteDb();
    const result = db
      .prepare(
        `INSERT INTO tweaks (title, description, category, is_active, warning, feature_breaks)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        tweak.title,
        tweak.description,
        tweak.category,
        tweak.isActive ? 1 : 0,
        tweak.warning ?? null,
        tweak.featureBreaks ?? null
      );
    const row = db
      .prepare("SELECT * FROM tweaks WHERE id = ?")
      .get(result.lastInsertRowid);
    return Promise.resolve(rowToTweak(row));
  }

  updateTweak(id: number, updates: UpdateTweakRequest): Promise<Tweak | undefined> {
    const db = getSqliteDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description); }
    if (updates.category !== undefined) { fields.push("category = ?"); values.push(updates.category); }
    if (updates.isActive !== undefined) { fields.push("is_active = ?"); values.push(updates.isActive ? 1 : 0); }
    if (updates.warning !== undefined) { fields.push("warning = ?"); values.push(updates.warning); }
    if (updates.featureBreaks !== undefined) { fields.push("feature_breaks = ?"); values.push(updates.featureBreaks); }

    if (fields.length === 0) {
      const row = db.prepare("SELECT * FROM tweaks WHERE id = ?").get(id);
      return Promise.resolve(row ? rowToTweak(row) : undefined);
    }

    values.push(id);
    db.prepare(`UPDATE tweaks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    const row = db.prepare("SELECT * FROM tweaks WHERE id = ?").get(id);
    return Promise.resolve(row ? rowToTweak(row) : undefined);
  }

  clearTweaks(): Promise<void> {
    const db = getSqliteDb();
    db.prepare("DELETE FROM tweaks").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'tweaks'").run();
    return Promise.resolve();
  }

  getSetting(key: string): Promise<string | undefined> {
    const db = getSqliteDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as any;
    return Promise.resolve(row?.value);
  }

  setSetting(key: string, value: string): Promise<void> {
    const db = getSqliteDb();
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(key, value);
    return Promise.resolve();
  }

  getAllSettings(): Promise<Record<string, string>> {
    const db = getSqliteDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as any[];
    return Promise.resolve(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  }
}
