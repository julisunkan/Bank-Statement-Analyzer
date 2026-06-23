import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function mapUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, status: u.status, createdAt: u.createdAt?.toISOString?.() ?? u.createdAt };
}

router.get("/users/profile", async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapUser(user));
});

router.patch("/users/profile", async (req: AuthRequest, res): Promise<void> => {
  const { name, currency } = req.body;
  const update: any = {};
  if (name) update.name = name;
  if (currency) update.currency = currency;
  const [user] = await db.update(usersTable).set(update).where(eq(usersTable.id, req.userId!)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapUser(user));
});

export default router;
