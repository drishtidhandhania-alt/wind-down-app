import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import app from "../app";
import { hashSessionToken } from "../middlewares/auth";
import {
  authSessionsTable,
  db,
  pool,
  usersTable,
  windDownEventsTable,
  windDownSessionsTable,
  windDownTestersTable,
} from "@workspace/db";

const ROUTINE_STEPS = [
  "phone_on_charger",
  "brush_teeth",
  "read_five_minutes",
] as const;
const LEGACY_COMPLETION_NOTE =
  "Actual start time and duration were not recorded. This timestamp is when completion was logged.";

function hashTesterToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

test("routine completion saves one owned history session and preserves legacy requests", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const emailTag = randomUUID();
  const testerAId = randomUUID();
  const testerBId = randomUUID();
  const unlinkedTesterId = randomUUID();
  const authTokenA = randomBytes(32).toString("base64url");
  const authTokenB = randomBytes(32).toString("base64url");
  const testerTokenA = randomBytes(32).toString("base64url");
  const testerTokenB = randomBytes(32).toString("base64url");
  const unlinkedTesterToken = randomBytes(32).toString("base64url");
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const cookieA = `wind_down_session=${authTokenA}`;
    const cookieB = `wind_down_session=${authTokenB}`;

    await db.insert(usersTable).values([
      {
        id: userAId,
        email: `wind-down-routine-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-routine-b-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
    ]);
    await db.insert(authSessionsTable).values([
      {
        userId: userAId,
        tokenHash: hashSessionToken(authTokenA),
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        userId: userBId,
        tokenHash: hashSessionToken(authTokenB),
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    await db.insert(windDownTestersTable).values([
      {
        id: testerAId,
        userId: userAId,
        tokenHash: hashTesterToken(testerTokenA),
        timezone: "UTC",
      },
      {
        id: testerBId,
        userId: userBId,
        tokenHash: hashTesterToken(testerTokenB),
        timezone: "UTC",
      },
      {
        id: unlinkedTesterId,
        userId: null,
        tokenHash: hashTesterToken(unlinkedTesterToken),
        timezone: "UTC",
      },
    ]);

    const postCompletion = (
      testerToken: string,
      body: unknown,
      cookie?: string,
    ) =>
      fetch(`${baseUrl}/wind-down/routine/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tester-Token": testerToken,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });

    const incomplete = await postCompletion(
      testerTokenA,
      {
        completedSteps: ROUTINE_STEPS.slice(0, 2),
        startedAt: new Date(Date.now() - 10_000).toISOString(),
      },
      cookieA,
    );
    assert.equal(incomplete.status, 400);

    const invalidStart = await postCompletion(
      testerTokenA,
      { completedSteps: ROUTINE_STEPS, startedAt: "not-a-date" },
      cookieA,
    );
    assert.equal(invalidStart.status, 400);

    const futureStart = await postCompletion(
      testerTokenA,
      {
        completedSteps: ROUTINE_STEPS,
        startedAt: new Date(Date.now() + 60_000).toISOString(),
      },
      cookieA,
    );
    assert.equal(futureStart.status, 400);
    assert.deepEqual(
      await db
        .select()
        .from(windDownSessionsTable)
        .where(eq(windDownSessionsTable.userId, userAId)),
      [],
    );
    assert.deepEqual(
      await db
        .select()
        .from(windDownEventsTable)
        .where(eq(windDownEventsTable.testerId, testerAId)),
      [],
    );

    const pageStartedAt = new Date(Date.now() - 20_000);
    const browserCompletion = await postCompletion(
      testerTokenA,
      {
        completedSteps: ROUTINE_STEPS,
        startedAt: pageStartedAt.toISOString(),
      },
      cookieA,
    );
    assert.equal(browserCompletion.status, 201);
    const browserResult = (await browserCompletion.json()) as {
      completed: boolean;
      completedAt: string;
    };
    assert.equal(browserResult.completed, true);
    const [browserSession] = await db
      .select()
      .from(windDownSessionsTable)
      .where(eq(windDownSessionsTable.userId, userAId));
    assert.ok(browserSession);
    assert.equal(browserSession.userId, userAId);
    assert.equal(browserSession.startedAt.getTime(), pageStartedAt.getTime());
    assert.equal(
      browserSession.endedAt?.getTime(),
      new Date(browserResult.completedAt).getTime(),
    );
    assert.equal(browserSession.outcome, "routine_completed");
    assert.equal(browserSession.minutesDelayed, null);
    assert.equal(browserSession.note, null);

    const tokenOnlyStartedAt = new Date(Date.now() - 15_000);
    const tokenOnlyCompletion = await postCompletion(testerTokenB, {
      completedSteps: ROUTINE_STEPS,
      startedAt: tokenOnlyStartedAt.toISOString(),
    });
    assert.equal(tokenOnlyCompletion.status, 201);
    const tokenOnlyResult = (await tokenOnlyCompletion.json()) as {
      completedAt: string;
    };
    const tokenOnlySessions = await db
      .select()
      .from(windDownSessionsTable)
      .where(eq(windDownSessionsTable.userId, userBId));
    assert.equal(tokenOnlySessions.length, 1);
    assert.equal(tokenOnlySessions[0].userId, userBId);
    assert.equal(
      tokenOnlySessions[0].startedAt.getTime(),
      tokenOnlyStartedAt.getTime(),
    );
    assert.equal(
      tokenOnlySessions[0].endedAt?.getTime(),
      new Date(tokenOnlyResult.completedAt).getTime(),
    );

    const legacyCompletion = await postCompletion(testerTokenB, {
      completedSteps: ROUTINE_STEPS,
    });
    assert.equal(legacyCompletion.status, 201);
    const legacyResult = (await legacyCompletion.json()) as {
      completedAt: string;
    };
    const legacySessions = await db
      .select()
      .from(windDownSessionsTable)
      .where(eq(windDownSessionsTable.userId, userBId));
    assert.equal(legacySessions.length, 2);
    const legacySession = legacySessions.find(
      (session) => session.note === LEGACY_COMPLETION_NOTE,
    );
    assert.ok(legacySession);
    assert.equal(
      legacySession.startedAt.getTime(),
      new Date(legacyResult.completedAt).getTime(),
    );
    assert.equal(
      legacySession.endedAt?.getTime(),
      new Date(legacyResult.completedAt).getTime(),
    );
    assert.equal(legacySession.minutesDelayed, null);
    assert.equal(legacySession.outcome, "routine_completed");

    const unlinkedCompletion = await postCompletion(unlinkedTesterToken, {
      completedSteps: ROUTINE_STEPS,
    });
    assert.equal(unlinkedCompletion.status, 409);
    assert.deepEqual(
      await db
        .select()
        .from(windDownEventsTable)
        .where(eq(windDownEventsTable.testerId, unlinkedTesterId)),
      [],
    );

    const crossAccountCompletion = await postCompletion(
      testerTokenB,
      { completedSteps: ROUTINE_STEPS },
      cookieA,
    );
    assert.equal(crossAccountCompletion.status, 403);
    assert.equal(
      (
        await db
          .select()
          .from(windDownSessionsTable)
          .where(eq(windDownSessionsTable.userId, userBId))
      ).length,
      2,
    );
    const [browserEvent] = await db
      .select()
      .from(windDownEventsTable)
      .where(
        and(
          eq(windDownEventsTable.testerId, testerAId),
          eq(windDownEventsTable.eventType, "routine_complete"),
        ),
      );
    assert.deepEqual(browserEvent.details, {
      completedSteps: [...ROUTINE_STEPS],
    });
    assert.equal(
      (
        await db
          .select()
          .from(windDownEventsTable)
          .where(eq(windDownEventsTable.testerId, testerBId))
      ).length,
      2,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db
      .delete(windDownTestersTable)
      .where(eq(windDownTestersTable.id, unlinkedTesterId))
      .catch(() => undefined);
    await db
      .delete(usersTable)
      .where(eq(usersTable.id, userAId))
      .catch(() => undefined);
    await db
      .delete(usersTable)
      .where(eq(usersTable.id, userBId))
      .catch(() => undefined);
    await pool.end();
  }
});
