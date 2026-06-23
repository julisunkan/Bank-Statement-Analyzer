import { pgTable, serial, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull().unique(),
  network: text("network").notNull().default("trc20"), // trc20 | erc20
  amountUsdt: numeric("amount_usdt", { precision: 18, scale: 6 }).notNull(),
  walletFrom: text("wallet_from"),
  walletTo: text("wallet_to").notNull(),
  licenseKey: text("license_key").notNull().unique(),
  productId: text("product_id").notNull().default("excel_addin_pro"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export type Payment = typeof paymentsTable.$inferSelect;
