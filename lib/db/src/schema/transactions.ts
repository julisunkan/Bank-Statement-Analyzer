import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { statementsTable } from "./statements";
import { categoriesTable } from "./categories";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  statementId: integer("statement_id").notNull().references(() => statementsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  merchant: text("merchant"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  type: text("type").notNull(), // credit | debit
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  reference: text("reference"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
