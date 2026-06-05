import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const helplinesTable = pgTable("helplines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  number: text("number").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  available247: boolean("available_247").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHelplineSchema = createInsertSchema(helplinesTable).omit({ id: true, createdAt: true });
export type InsertHelpline = z.infer<typeof insertHelplineSchema>;
export type Helpline = typeof helplinesTable.$inferSelect;
