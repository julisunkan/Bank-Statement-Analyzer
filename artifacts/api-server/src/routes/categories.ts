import { Router } from "express";
import { db, categoriesTable, transactionsTable } from "@workspace/db";
import { eq, or, isNull, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/categories", async (req: AuthRequest, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable)
    .where(or(eq(categoriesTable.isDefault, true), eq(categoriesTable.userId, req.userId!)));

  const withCounts = await Promise.all(cats.map(async (c) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(transactionsTable).where(eq(transactionsTable.categoryId, c.id));
    return { ...c, transactionCount: Number(count) };
  }));

  res.json(withCounts);
});

router.post("/categories", async (req: AuthRequest, res): Promise<void> => {
  const { name, icon, color, type } = req.body;
  if (!name || !icon || !color || !type) {
    res.status(400).json({ error: "name, icon, color, type are required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({ userId: req.userId!, name, icon, color, type, isDefault: false }).returning();
  res.status(201).json({ ...cat, transactionCount: 0 });
});

router.patch("/categories/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, icon, color } = req.body;
  const [cat] = await db.update(categoriesTable).set({ name, icon, color }).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...cat, transactionCount: 0 });
});

router.delete("/categories/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [cat] = await db.delete(categoriesTable)
    .where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

export default router;
