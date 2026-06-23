import { Router } from "express";
import { db, budgetsTable, categoriesTable, transactionsTable, statementsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function computeSpent(userId: number, categoryId: number, period: string, month: string | null): Promise<number> {
  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable).where(eq(statementsTable.userId, userId));
  if (stmts.length === 0) return 0;
  const stmtIds = stmts.map(s => s.id);

  const filters: any[] = [
    inArray(transactionsTable.statementId, stmtIds),
    eq(transactionsTable.categoryId, categoryId),
    eq(transactionsTable.type, "debit"),
  ];

  if (period === "monthly" && month) {
    filters.push(sql`${transactionsTable.date} like ${month + "%"}`);
  }

  const [{ total }] = await db.select({ total: sql<number>`coalesce(sum(${transactionsTable.amount}::numeric), 0)` })
    .from(transactionsTable).where(and(...filters));
  return Number(total);
}

router.get("/budgets", async (req: AuthRequest, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable);
  const catById: Record<number, string> = {};
  for (const c of cats) catById[c.id] = c.name;

  const budgets = await db.select().from(budgetsTable).where(eq(budgetsTable.userId, req.userId!));
  const result = await Promise.all(budgets.map(async (b) => {
    const spent = await computeSpent(req.userId!, b.categoryId, b.period, b.month);
    const amount = Number(b.amount);
    const remaining = Math.max(0, amount - spent);
    const percentUsed = amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: catById[b.categoryId] ?? "Unknown",
      period: b.period,
      amount,
      spent,
      remaining,
      percentUsed: Math.round(percentUsed),
      month: b.month,
      year: b.year,
    };
  }));
  res.json(result);
});

router.post("/budgets", async (req: AuthRequest, res): Promise<void> => {
  const { categoryId, period, amount, month, year } = req.body;
  if (!categoryId || !period || !amount) {
    res.status(400).json({ error: "categoryId, period, amount required" });
    return;
  }
  const [b] = await db.insert(budgetsTable).values({
    userId: req.userId!, categoryId: Number(categoryId), period, amount: String(amount), month: month ?? null, year: year ?? null,
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, b.categoryId));
  res.status(201).json({ id: b.id, categoryId: b.categoryId, categoryName: cat?.name ?? "", period: b.period, amount: Number(b.amount), spent: 0, remaining: Number(b.amount), percentUsed: 0, month: b.month, year: b.year });
});

router.patch("/budgets/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { amount, period } = req.body;
  const update: any = {};
  if (amount !== undefined) update.amount = String(amount);
  if (period !== undefined) update.period = period;
  const [b] = await db.update(budgetsTable).set(update).where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.userId!))).returning();
  if (!b) { res.status(404).json({ error: "Not found" }); return; }
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, b.categoryId));
  const spent = await computeSpent(req.userId!, b.categoryId, b.period, b.month);
  const amt = Number(b.amount);
  res.json({ id: b.id, categoryId: b.categoryId, categoryName: cat?.name ?? "", period: b.period, amount: amt, spent, remaining: Math.max(0, amt - spent), percentUsed: Math.round(amt > 0 ? Math.min(100, spent / amt * 100) : 0), month: b.month, year: b.year });
});

router.delete("/budgets/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [b] = await db.delete(budgetsTable).where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.userId!))).returning();
  if (!b) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

export default router;
