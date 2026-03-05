import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tweaks = pgTable("tweaks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  warning: text("warning"),
  featureBreaks: text("feature_breaks"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertTweakSchema = createInsertSchema(tweaks).omit({ id: true });
export type Tweak = typeof tweaks.$inferSelect;
export type InsertTweak = z.infer<typeof insertTweakSchema>;
export type UpdateTweakRequest = Partial<InsertTweak>;

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export const systemInfoSchema = z.object({
  cpu: z.object({
    model: z.string(),
    cores: z.number(),
  }),
  gpu: z.object({
    model: z.string(),
    vram: z.string(),
  }),
  memory: z.object({
    total: z.string(),
    type: z.string(),
  }),
  system: z.object({
    os: z.string(),
    version: z.string(),
  }),
  storage: z.object({
    primaryDisk: z.string(),
    totalSpace: z.string(),
  }),
});

export type SystemInfo = z.infer<typeof systemInfoSchema>;
