import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emergencySessionsTable = pgTable("emergency_sessions", {
  id: serial("id").primaryKey(),
  transcript: text("transcript").notNull(),
  language: text("language").default("en"),
  category: text("category"),
  urgency: text("urgency"),
  detectedTitle: text("detected_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmergencySessionSchema = createInsertSchema(emergencySessionsTable).omit({ id: true, createdAt: true });
export type InsertEmergencySession = z.infer<typeof insertEmergencySessionSchema>;
export type EmergencySession = typeof emergencySessionsTable.$inferSelect;
