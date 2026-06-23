import { Router } from "express";
import { db, transactionsTable, statementsTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, gte, lte, sql, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function mapTx(t: any, catName?: string) {
  return {
    id: t.id,
    statementId: t.statementId,
    date: t.date,
    description: t.description,
    merchant: t.merchant,
    amount: Number(t.amount),
    type: t.type,
    categoryId: t.categoryId,
    categoryName: catName ?? null,
    notes: t.notes,
    isRecurring: t.isRecurring,
    createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
  };
}

router.get("/transactions", async (req: AuthRequest, res): Promise<void> => {
  const { statementId, categoryId, type, search, startDate, endDate, limit = "100", offset = "0" } = req.query as Record<string, string>;

  // Get user's statement ids
  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable)
    .where(eq(statementsTable.userId, req.userId!));
  const stmtIds = stmts.map(s => s.id);
  if (stmtIds.length === 0) {
    res.json({ transactions: [], total: 0 });
    return;
  }

  const filters: any[] = [inArray(transactionsTable.statementId, stmtIds)];
  if (statementId) filters.push(eq(transactionsTable.statementId, parseInt(statementId, 10)));
  if (categoryId) filters.push(eq(transactionsTable.categoryId, parseInt(categoryId, 10)));
  if (type) filters.push(eq(transactionsTable.type, type));
  if (search) filters.push(ilike(transactionsTable.description, `%${search}%`));
  if (startDate) filters.push(gte(transactionsTable.date, startDate));
  if (endDate) filters.push(lte(transactionsTable.date, endDate));

  const cats = await db.select().from(categoriesTable);
  const catById: Record<number, string> = {};
  for (const c of cats) catById[c.id] = c.name;

  const all = await db.select().from(transactionsTable)
    .where(and(...filters))
    .orderBy(transactionsTable.date, transactionsTable.id)
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable)
    .where(and(...filters));
  const total = Number(countResult[0]?.count ?? 0);

  res.json({ transactions: all.map(t => mapTx(t, t.categoryId ? catById[t.categoryId] : undefined)), total });
});

router.get("/transactions/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }

  let catName: string | undefined;
  if (tx.categoryId) {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, tx.categoryId));
    catName = c?.name;
  }
  res.json(mapTx(tx, catName));
});

router.patch("/transactions/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { categoryId, notes, merchant, isRecurring } = req.body;
  const update: any = {};
  if (categoryId !== undefined) update.categoryId = categoryId;
  if (notes !== undefined) update.notes = notes;
  if (merchant !== undefined) update.merchant = merchant;
  if (isRecurring !== undefined) update.isRecurring = isRecurring;

  const [tx] = await db.update(transactionsTable).set(update).where(eq(transactionsTable.id, id)).returning();
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }

  let catName: string | undefined;
  if (tx.categoryId) {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, tx.categoryId));
    catName = c?.name;
  }
  res.json(mapTx(tx, catName));
});

const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  salary: "Salary", transfer: "Transfers", "atm": "Other",
  uber: "Transport", bolt: "Transport", fuel: "Fuel", petrol: "Fuel",
  kfc: "Food", shoprite: "Groceries", spar: "Groceries",
  netflix: "Entertainment", spotify: "Entertainment", dstv: "Entertainment",
  airtel: "Utilities", mtn: "Utilities", glo: "Utilities", "9mobile": "Utilities",
  amazon: "Shopping", jumia: "Shopping",
  hospital: "Healthcare", pharmacy: "Healthcare", clinic: "Healthcare",
  tax: "Taxes", loan: "Loans", savings: "Savings", investment: "Investments",
};

router.post("/transactions/bulk-categorize", async (req: AuthRequest, res): Promise<void> => {
  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable)
    .where(eq(statementsTable.userId, req.userId!));
  const stmtIds = stmts.map(s => s.id);
  if (stmtIds.length === 0) { res.json({ updated: 0 }); return; }

  const cats = await db.select().from(categoriesTable);
  const catByName: Record<string, number> = {};
  for (const c of cats) catByName[c.name] = c.id;

  const uncategorized = await db.select().from(transactionsTable)
    .where(and(
      inArray(transactionsTable.statementId, stmtIds),
      sql`${transactionsTable.categoryId} is null`,
    ));

  let updated = 0;
  for (const tx of uncategorized) {
    const desc = tx.description.toLowerCase();
    let matched: string | undefined;
    for (const [keyword, catName] of Object.entries(KEYWORD_CATEGORY_MAP)) {
      if (desc.includes(keyword)) { matched = catName; break; }
    }
    if (!matched) matched = tx.type === "credit" ? "Salary" : "Other";
    const catId = catByName[matched];
    if (catId) {
      await db.update(transactionsTable).set({ categoryId: catId }).where(eq(transactionsTable.id, tx.id));
      updated++;
    }
  }

  res.json({ updated });
});

export default router;
