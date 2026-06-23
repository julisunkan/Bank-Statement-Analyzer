import { Router } from "express";
import { db, statementsTable, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/statements", async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(statementsTable)
    .where(eq(statementsTable.userId, req.userId!))
    .orderBy(statementsTable.createdAt);
  res.json(rows.map(s => ({
    ...s,
    totalDebits: Number(s.totalDebits),
    totalCredits: Number(s.totalCredits),
    createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/statements", async (req: AuthRequest, res): Promise<void> => {
  const { bankName, fileName, transactions: txns } = req.body;
  if (!bankName || !Array.isArray(txns)) {
    res.status(400).json({ error: "bankName and transactions[] are required" });
    return;
  }

  // Fetch default categories for auto-categorization
  const cats = await db.select().from(categoriesTable)
    .where(eq(categoriesTable.isDefault, true));
  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.name.toLowerCase()] = c.id;

  const totalDebits = txns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalCredits = txns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const dates = txns.map((t: any) => t.date).sort();

  const [stmt] = await db.insert(statementsTable).values({
    userId: req.userId!,
    bankName,
    fileName: fileName ?? "upload",
    transactionCount: txns.length,
    totalDebits: String(totalDebits),
    totalCredits: String(totalCredits),
    startDate: dates[0] ?? "",
    endDate: dates[dates.length - 1] ?? "",
    status: "ready",
  }).returning();

  if (txns.length > 0) {
    const txRows = txns.map((t: any) => ({
      statementId: stmt.id,
      date: t.date,
      description: t.description,
      merchant: t.merchant ?? null,
      amount: String(Math.abs(Number(t.amount))),
      type: t.type,
      reference: t.reference ?? null,
      isRecurring: false,
    }));
    await db.insert(transactionsTable).values(txRows);
  }

  res.status(201).json({
    ...stmt,
    totalDebits: Number(stmt.totalDebits),
    totalCredits: Number(stmt.totalCredits),
    createdAt: stmt.createdAt.toISOString(),
  });
});

router.get("/statements/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [stmt] = await db.select().from(statementsTable)
    .where(and(eq(statementsTable.id, id), eq(statementsTable.userId, req.userId!)));
  if (!stmt) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...stmt, totalDebits: Number(stmt.totalDebits), totalCredits: Number(stmt.totalCredits), createdAt: stmt.createdAt.toISOString() });
});

router.delete("/statements/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [stmt] = await db.delete(statementsTable)
    .where(and(eq(statementsTable.id, id), eq(statementsTable.userId, req.userId!)))
    .returning();
  if (!stmt) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

export default router;
