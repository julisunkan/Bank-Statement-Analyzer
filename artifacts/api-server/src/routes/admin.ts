import { Router } from "express";
import { db, usersTable, statementsTable, transactionsTable, reportsTable, auditLogsTable } from "@workspace/db";
import { eq, ilike, sql, or } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

function mapUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, status: u.status, createdAt: u.createdAt?.toISOString?.() ?? u.createdAt };
}

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)` }).from(usersTable);
  const [{ activeUsers }] = await db.select({ activeUsers: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.status, "active"));
  const [{ totalStatements }] = await db.select({ totalStatements: sql<number>`count(*)` }).from(statementsTable);
  const [{ totalTransactions }] = await db.select({ totalTransactions: sql<number>`count(*)` }).from(transactionsTable);
  const [{ totalReports }] = await db.select({ totalReports: sql<number>`count(*)` }).from(reportsTable);
  const [{ proUsers }] = await db.select({ proUsers: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.plan, "pro"));

  const monthStart = new Date();
  monthStart.setDate(1);
  const [{ newUsersThisMonth }] = await db.select({ newUsersThisMonth: sql<number>`count(*)` }).from(usersTable)
    .where(sql`${usersTable.createdAt} >= ${monthStart}`);

  res.json({
    totalUsers: Number(totalUsers),
    activeUsers: Number(activeUsers),
    totalStatements: Number(totalStatements),
    totalTransactions: Number(totalTransactions),
    totalReports: Number(totalReports),
    proUsers: Number(proUsers),
    newUsersThisMonth: Number(newUsersThisMonth),
  });
});

router.get("/admin/users", async (req: AuthRequest, res): Promise<void> => {
  const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  let query = db.select().from(usersTable).$dynamic();
  if (search) {
    query = query.where(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.name, `%${search}%`)));
  }
  const users = await query.limit(parseInt(limit, 10)).offset(parseInt(offset, 10));
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(usersTable);
  res.json({ users: users.map(mapUser), total: Number(total) });
});

router.patch("/admin/users/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { role, plan, status } = req.body;
  const update: any = {};
  if (role) update.role = role;
  if (plan) update.plan = plan;
  if (status) update.status = status;
  const [user] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  // Audit
  await db.insert(auditLogsTable).values({ userId: req.userId!, action: "update_user", entity: "user", entityId: id, details: JSON.stringify(update) });
  res.json(mapUser(user));
});

router.delete("/admin/users/:id", async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(auditLogsTable).values({ userId: req.userId!, action: "delete_user", entity: "user", entityId: id });
  res.json({ message: "Deleted" });
});

router.get("/admin/audit-logs", async (_req, res): Promise<void> => {
  const logs = await db.select({
    id: auditLogsTable.id,
    userId: auditLogsTable.userId,
    userEmail: usersTable.email,
    action: auditLogsTable.action,
    entity: auditLogsTable.entity,
    entityId: auditLogsTable.entityId,
    details: auditLogsTable.details,
    createdAt: auditLogsTable.createdAt,
  }).from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(auditLogsTable.createdAt)
    .limit(100);
  res.json(logs.map(l => ({ ...l, createdAt: l.createdAt?.toISOString?.() ?? l.createdAt })));
});

export default router;
