import { Router } from "express";
import { db, transactionsTable, statementsTable } from "@workspace/db";
import { eq, and, gte, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/forecasts", async (req: AuthRequest, res): Promise<void> => {
  const horizon = parseInt((req.query.horizon as string) ?? "90", 10);

  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable).where(eq(statementsTable.userId, req.userId!));
  if (stmts.length === 0) {
    // Return empty forecast
    const result = [];
    for (let i = 0; i < horizon; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      result.push({ date: d.toISOString().slice(0, 10), projectedBalance: 0, projectedIncome: 0, projectedExpenses: 0, confidence: 0 });
    }
    res.json(result);
    return;
  }
  const stmtIds = stmts.map(s => s.id);

  // Get last 90 days of data for averaging
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), gte(transactionsTable.date, cutoff.toISOString().slice(0, 10))));

  const totalIncome = txns.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txns.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const days = Math.max(1, txns.length > 0 ? 90 : 1);
  const dailyIncome = totalIncome / days;
  const dailyExpenses = totalExpenses / days;

  let balance = totalIncome - totalExpenses;
  const result = [];
  for (let i = 0; i < horizon; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const projIncome = Math.round(dailyIncome * (1 + (Math.random() - 0.5) * 0.1));
    const projExp = Math.round(dailyExpenses * (1 + (Math.random() - 0.5) * 0.1));
    balance += projIncome - projExp;
    const confidence = Math.max(10, 90 - i * (80 / horizon));
    result.push({
      date: d.toISOString().slice(0, 10),
      projectedBalance: Math.round(balance),
      projectedIncome: projIncome,
      projectedExpenses: projExp,
      confidence: Math.round(confidence),
    });
  }
  res.json(result);
});

export default router;
