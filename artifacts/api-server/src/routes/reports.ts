import { Router } from "express";
import { db, reportsTable, transactionsTable, statementsTable } from "@workspace/db";
import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function mapReport(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/reports", async (req: AuthRequest, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.userId, req.userId!))
    .orderBy(reportsTable.createdAt);
  res.json(reports.map(mapReport));
});

router.post("/reports", async (req: AuthRequest, res): Promise<void> => {
  const { type, period, title } = req.body;
  if (!type || !period) { res.status(400).json({ error: "type and period required" }); return; }

  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable).where(eq(statementsTable.userId, req.userId!));
  const stmtIds = stmts.map(s => s.id);

  // Generate report data
  let data: any = {};
  let summary = `${type.charAt(0).toUpperCase() + type.slice(1)} report for ${period}`;

  if (stmtIds.length > 0) {
    const [startDate, endDate] = period.includes(":")
      ? period.split(":")
      : [`${period}-01`, `${period}-31`];
    const txns = await db.select().from(transactionsTable)
      .where(and(inArray(transactionsTable.statementId, stmtIds), gte(transactionsTable.date, startDate), lte(transactionsTable.date, endDate)));
    const income = txns.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    data = { income, expenses, netSavings: income - expenses, transactionCount: txns.length, period };
    summary = `Total income: ${income.toLocaleString()}, expenses: ${expenses.toLocaleString()}, net: ${(income - expenses).toLocaleString()}`;
  }

  const [report] = await db.insert(reportsTable).values({
    userId: req.userId!,
    type, period,
    title: title ?? `${type.charAt(0).toUpperCase() + type.slice(1)} Report — ${period}`,
    status: "ready",
    summary,
    data,
  }).returning();

  res.status(201).json(mapReport(report));
});

router.get("/reports/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [report] = await db.select().from(reportsTable).where(and(eq(reportsTable.id, id), eq(reportsTable.userId, req.userId!)));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapReport(report));
});

router.delete("/reports/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [report] = await db.delete(reportsTable).where(and(eq(reportsTable.id, id), eq(reportsTable.userId, req.userId!))).returning();
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

export default router;
