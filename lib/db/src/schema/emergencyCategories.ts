import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emergencyCategoriesTable = pgTable("emergency_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  description: text("description").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmergencyCategorySchema = createInsertSchema(emergencyCategoriesTable).omit({ createdAt: true });
export type InsertEmergencyCategory = z.infer<typeof insertEmergencyCategorySchema>;
export type EmergencyCategory = typeof emergencyCategoriesTable.$inferSelect;
