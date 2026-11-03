import { and, eq } from "drizzle-orm";
import { db, windDownSessionsTable, type WindDownSession } from "@workspace/db";

export async function findWindDownSessionForUser(
  sessionId: string,
  userId: string,
): Promise<WindDownSession | undefined> {
  const [session] = await db
    .select()
    .from(windDownSessionsTable)
    .where(
      and(
        eq(windDownSessionsTable.id, sessionId),
        eq(windDownSessionsTable.userId, userId),
      ),
    )
    .limit(1);
  return session;
}
