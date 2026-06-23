import { Router } from "express";
import { db, goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function mapGoal(g: any) {
  const target = Number(g.targetAmount);
  const current = Number(g.currentAmount);
  const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  let estimatedCompletion: string | null = null;
  if (g.deadline) {
    estimatedCompletion = g.deadline;
  } else if (target > 0 && current < target) {
    // Estimate based on no info — project 12 months
    const monthsNeeded = Math.ceil((target - current) / (target / 12));
    const d = new Date();
    d.setMonth(d.getMonth() + monthsNeeded);
    estimatedCompletion = d.toISOString().slice(0, 10);
  }

  return {
    id: g.id,
    name: g.name,
    type: g.type,
    targetAmount: target,
    currentAmount: current,
    deadline: g.deadline,
    progressPercent,
    estimatedCompletion,
    notes: g.notes,
  };
}

router.get("/goals", async (req: AuthRequest, res): Promise<void> => {
  const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, req.userId!));
  res.json(goals.map(mapGoal));
});

router.post("/goals", async (req: AuthRequest, res): Promise<void> => {
  const { name, type, targetAmount, currentAmount, deadline, notes } = req.body;
  if (!name || !type || targetAmount == null) {
    res.status(400).json({ error: "name, type, targetAmount required" });
    return;
  }
  const [g] = await db.insert(goalsTable).values({
    userId: req.userId!, name, type, targetAmount: String(targetAmount),
    currentAmount: String(currentAmount ?? 0), deadline: deadline ?? null, notes: notes ?? null,
  }).returning();
  res.status(201).json(mapGoal(g));
});

router.patch("/goals/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, targetAmount, currentAmount, deadline, notes } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (targetAmount !== undefined) update.targetAmount = String(targetAmount);
  if (currentAmount !== undefined) update.currentAmount = String(currentAmount);
  if (deadline !== undefined) update.deadline = deadline;
  if (notes !== undefined) update.notes = notes;
  const [g] = await db.update(goalsTable).set(update).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!))).returning();
  if (!g) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapGoal(g));
});

router.delete("/goals/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [g] = await db.delete(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!))).returning();
  if (!g) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

export default router;
