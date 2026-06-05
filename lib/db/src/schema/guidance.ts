import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guidanceStepsTable = pgTable("guidance_steps", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  instruction: text("instruction").notNull(),
  icon: text("icon").notNull().default("check-circle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuidanceStepSchema = createInsertSchema(guidanceStepsTable).omit({ id: true, createdAt: true });
export type InsertGuidanceStep = z.infer<typeof insertGuidanceStepSchema>;
export type GuidanceStep = typeof guidanceStepsTable.$inferSelect;
