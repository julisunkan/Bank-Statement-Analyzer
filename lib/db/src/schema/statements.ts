import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const statementsTable = pgTable("statements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  fileName: text("file_name").notNull().default("upload"),
  transactionCount: integer("transaction_count").notNull().default(0),
  totalDebits: numeric("total_debits", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCredits: numeric("total_credits", { precision: 18, scale: 2 }).notNull().default("0"),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  status: text("status").notNull().default("ready"), // processing | ready | error
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStatementSchema = createInsertSchema(statementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStatement = z.infer<typeof insertStatementSchema>;
export type Statement = typeof statementsTable.$inferSelect;
