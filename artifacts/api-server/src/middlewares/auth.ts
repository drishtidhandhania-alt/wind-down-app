import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { authSessionsTable, db } from "@workspace/db";

export const AUTH_COOKIE_NAME = "wind_down_session";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authSessionId?: string;
    }
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function loadAuthContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length > 512) {
    next();
    return;
  }

  try {
    const [session] = await db
      .select({
        id: authSessionsTable.id,
        userId: authSessionsTable.userId,
      })
      .from(authSessionsTable)
      .where(
        and(
          eq(authSessionsTable.tokenHash, hashSessionToken(token)),
          gt(authSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (session) {
      req.authUserId = session.userId;
      req.authSessionId = session.id;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUserId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}
