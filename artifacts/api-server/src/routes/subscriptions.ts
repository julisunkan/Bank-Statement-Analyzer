import { Router } from "express";
import { db, transactionsTable, statementsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const KNOWN_SUBSCRIPTIONS = [
  "netflix", "spotify", "apple", "google", "amazon prime", "dstv", "gotv",
  "microsoft", "adobe", "dropbox", "canva", "hbo", "disney", "youtube premium",
  "tidal", "audible", "linkedin",
];

router.get("/subscriptions/detected", async (req: AuthRequest, res): Promise<void> => {
  const stmts = await db.select({ id: statementsTable.id }).from(statementsTable).where(eq(statementsTable.userId, req.userId!));
  if (stmts.length === 0) { res.json([]); return; }
  const stmtIds = stmts.map(s => s.id);

  const txns = await db.select().from(transactionsTable)
    .where(and(inArray(transactionsTable.statementId, stmtIds), eq(transactionsTable.type, "debit")));

  const merchantMap: Record<string, { amounts: number[]; dates: string[]; catId: number | null }> = {};
  for (const t of txns) {
    const desc = t.description.toLowerCase();
    const matchedSub = KNOWN_SUBSCRIPTIONS.find(s => desc.includes(s));
    const key = matchedSub ?? (t.merchant?.toLowerCase() ?? "");
    if (!key) continue;

    if (!merchantMap[key]) merchantMap[key] = { amounts: [], dates: [], catId: t.categoryId };
    merchantMap[key].amounts.push(Number(t.amount));
    merchantMap[key].dates.push(t.date);
  }

  let id = 1;
  const result = [];
  for (const [merchant, data] of Object.entries(merchantMap)) {
    if (data.amounts.length < 2) continue; // Need at least 2 occurrences
    const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
    const dates = data.dates.sort();
    const lastDate = dates[dates.length - 1];

    // Determine frequency from date gaps
    let frequency: "weekly" | "monthly" | "quarterly" | "annual" = "monthly";
    if (data.dates.length >= 2) {
      const d1 = new Date(dates[0]), d2 = new Date(dates[1]);
      const dayGap = (d2.getTime() - d1.getTime()) / (1000 * 86400);
      if (dayGap <= 10) frequency = "weekly";
      else if (dayGap <= 40) frequency = "monthly";
      else if (dayGap <= 100) frequency = "quarterly";
      else frequency = "annual";
    }

    const monthlyCost = frequency === "weekly" ? avgAmount * 4.33
      : frequency === "monthly" ? avgAmount
      : frequency === "quarterly" ? avgAmount / 3
      : avgAmount / 12;

    const nextD = new Date(lastDate);
    if (frequency === "weekly") nextD.setDate(nextD.getDate() + 7);
    else if (frequency === "monthly") nextD.setMonth(nextD.getMonth() + 1);
    else if (frequency === "quarterly") nextD.setMonth(nextD.getMonth() + 3);
    else nextD.setFullYear(nextD.getFullYear() + 1);

    result.push({
      id: id++,
      merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      annualCost: Math.round(monthlyCost * 12 * 100) / 100,
      lastDate,
      nextExpected: nextD.toISOString().slice(0, 10),
      categoryId: data.catId,
    });
  }

  res.json(result.sort((a, b) => b.annualCost - a.annualCost));
});

export default router;
