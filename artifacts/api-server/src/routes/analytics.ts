import { Router } from "express";
import { db, transactionsTable, statementsTable, categoriesTable, budgetsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function getUserStmtIds(userId: number): Promise<number[]> {
  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable).where(eq(statementsTable.userId, userId));
  return stmts.map(s => s.id);
}

router.get("/analytics/summary", async (req: AuthRequest, res): Promise<void> => {
  const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);
  const stmtIds = await getUserStmtIds(req.userId!);
  if (stmtIds.length === 0) {
    res.json({ totalIncome: 0, totalExpenses: 0, netSavings: 0, savingsRate: 0, healthScore: 50, transactionCount: 0, month, topCategory: null, budgetUtilization: null });
    return;
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), gte(transactionsTable.date, startDate), lte(transactionsTable.date, endDate)));

  const totalIncome = txns.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txns.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Top category
  const catSpend: Record<number, number> = {};
  for (const t of txns.filter(t => t.type === "debit" && t.categoryId)) {
    catSpend[t.categoryId!] = (catSpend[t.categoryId!] ?? 0) + Number(t.amount);
  }
  let topCatId: number | null = null;
  let topCatAmt = 0;
  for (const [k, v] of Object.entries(catSpend)) {
    if (v > topCatAmt) { topCatAmt = v; topCatId = Number(k); }
  }
  let topCategory: string | null = null;
  if (topCatId) {
    const [c] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, topCatId));
    topCategory = c?.name ?? null;
  }

  // Health score (simple formula)
  const srScore = Math.min(40, Math.max(0, savingsRate * 0.4));
  const expRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1;
  const spScore = Math.max(0, 30 - expRatio * 30);
  const healthScore = Math.round(srScore + spScore + 30); // baseline 30 for having data

  res.json({ totalIncome, totalExpenses, netSavings, savingsRate, healthScore: Math.min(100, healthScore), transactionCount: txns.length, month, topCategory, budgetUtilization: null });
});

router.get("/analytics/spending-by-category", async (req: AuthRequest, res): Promise<void> => {
  const stmtIds = await getUserStmtIds(req.userId!);
  if (stmtIds.length === 0) { res.json([]); return; }

  const cats = await db.select().from(categoriesTable);
  const catById: Record<number, typeof cats[0]> = {};
  for (const c of cats) catById[c.id] = c;

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), eq(transactionsTable.type, "debit")));

  const totals: Record<number | string, number> = {};
  const counts: Record<number | string, number> = {};
  let grandTotal = 0;

  for (const t of txns) {
    const key = t.categoryId ?? "uncategorized";
    totals[key] = (totals[key] ?? 0) + Number(t.amount);
    counts[key] = (counts[key] ?? 0) + 1;
    grandTotal += Number(t.amount);
  }

  const result = Object.entries(totals).map(([k, amt]) => {
    const catId = k === "uncategorized" ? null : Number(k);
    const cat = catId ? catById[catId] : null;
    return {
      categoryId: catId,
      categoryName: cat?.name ?? "Uncategorized",
      color: cat?.color ?? "#94a3b8",
      icon: cat?.icon ?? "tag",
      amount: Math.round(amt * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((amt / grandTotal) * 1000) / 10 : 0,
      count: counts[k],
    };
  }).sort((a, b) => b.amount - a.amount);

  res.json(result);
});

router.get("/analytics/cashflow", async (req: AuthRequest, res): Promise<void> => {
  const months = parseInt((req.query.months as string) ?? "6", 10);
  const stmtIds = await getUserStmtIds(req.userId!);

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    if (stmtIds.length === 0) {
      result.push({ month, income: 0, expenses: 0, net: 0 });
      continue;
    }

    const txns = await db.select({ amount: transactionsTable.amount, type: transactionsTable.type })
      .from(transactionsTable)
      .where(and(inArray(transactionsTable.statementId, stmtIds), gte(transactionsTable.date, startDate), lte(transactionsTable.date, endDate)));

    const income = txns.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = txns.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
    result.push({ month, income: Math.round(income), expenses: Math.round(expenses), net: Math.round(income - expenses) });
  }

  res.json(result);
});

router.get("/analytics/merchant-insights", async (req: AuthRequest, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "10", 10);
  const stmtIds = await getUserStmtIds(req.userId!);
  if (stmtIds.length === 0) { res.json([]); return; }

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), eq(transactionsTable.type, "debit")));

  const merchantMap: Record<string, { total: number; count: number; last: string }> = {};
  for (const t of txns) {
    const m = t.merchant ?? t.description.split(" ").slice(0, 2).join(" ");
    if (!merchantMap[m]) merchantMap[m] = { total: 0, count: 0, last: t.date };
    merchantMap[m].total += Number(t.amount);
    merchantMap[m].count += 1;
    if (t.date > merchantMap[m].last) merchantMap[m].last = t.date;
  }

  const result = Object.entries(merchantMap)
    .map(([merchant, d]) => ({
      merchant,
      totalSpent: Math.round(d.total * 100) / 100,
      transactionCount: d.count,
      averageSpend: Math.round((d.total / d.count) * 100) / 100,
      lastTransaction: d.last,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  res.json(result);
});

router.get("/analytics/health-score", async (req: AuthRequest, res): Promise<void> => {
  const stmtIds = await getUserStmtIds(req.userId!);
  const month = new Date().toISOString().slice(0, 7);

  if (stmtIds.length === 0) {
    res.json({ score: 50, grade: "C", breakdown: { savingsRatio: 12, spendingPatterns: 13, budgetAdherence: 12, incomeStability: 13 }, recommendations: ["Upload a bank statement to get a personalized score"] });
    return;
  }

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), gte(transactionsTable.date, `${month}-01`), lte(transactionsTable.date, `${month}-31`)));

  const income = txns.filter(t => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txns.filter(t => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const savingsRatio = income > 0 ? Math.min(25, ((income - expenses) / income) * 25) : 0;
  const expRatio = income > 0 ? expenses / income : 1;
  const spendingPatterns = Math.max(0, 25 - expRatio * 15);
  const budgetAdherence = 20; // static for now
  const incomeStability = income > 0 ? 15 : 5;
  const score = Math.round(savingsRatio + spendingPatterns + budgetAdherence + incomeStability);
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  const recommendations = [];
  if (savingsRatio < 10) recommendations.push("Aim to save at least 20% of your income each month");
  if (expRatio > 0.8) recommendations.push("Your expenses are high relative to income — review discretionary spending");
  if (income === 0) recommendations.push("No income detected this month — ensure credits are categorized correctly");
  if (recommendations.length === 0) recommendations.push("You're on track! Keep maintaining your spending habits.");

  res.json({ score: Math.min(100, score), grade, breakdown: { savingsRatio: Math.round(savingsRatio), spendingPatterns: Math.round(spendingPatterns), budgetAdherence, incomeStability }, recommendations });
});

export default router;
