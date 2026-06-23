import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env.SESSION_SECRET ?? "bank-analyzer-secret-2024";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role, status: usersTable.status })
      .from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user || user.status === "suspended") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    logger.debug({ err }, "JWT verify failed");
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
