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

function hashTesterToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

test("bypass choices save the linked user's session and keep the exact 10-minute grant", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const emailTag = randomUUID();
  const testerAId = randomUUID();
  const testerBId = randomUUID();
  const authTokenA = randomBytes(32).toString("base64url");
  const authTokenB = randomBytes(32).toString("base64url");
  const testerTokenA = randomBytes(32).toString("base64url");
  const testerTokenB = randomBytes(32).toString("base64url");
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
        email: `wind-down-bypass-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-bypass-b-${emailTag}@example.test`,
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
    ]);

    const postChoice = (
      testerToken: string,
      body: unknown,
      cookie?: string,
    ) =>
      fetch(`${baseUrl}/wind-down/pause-choice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tester-Token": testerToken,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });

    for (const body of [
      { choice: "continue_to_instagram" },
      { choice: "continue_to_instagram", reason: " \t\n " },
    ]) {
      const rejected = await postChoice(testerTokenA, body);
      assert.equal(rejected.status, 400);
    }
    assert.deepEqual(
      await db
        .select()
        .from(windDownSessionsTable)
        .where(eq(windDownSessionsTable.userId, userAId)),
      [],
    );
    const [testerAfterRejectedReasons] = await db
      .select()
      .from(windDownTestersTable)
      .where(eq(windDownTestersTable.id, testerAId));
    assert.equal(testerAfterRejectedReasons.bypassExpiresAt, null);
    assert.deepEqual(
      await db
        .select()
        .from(windDownEventsTable)
        .where(eq(windDownEventsTable.testerId, testerAId)),
      [],
    );

    const browserReason = "Finish one message to my family.";
    const browserChoiceStartedAt = Date.now();
    const browserResponse = await postChoice(
      testerTokenA,
      {
        choice: "continue_to_instagram",
        reason: `  ${browserReason}  `,
      },
      cookieA,
    );
    const browserChoiceFinishedAt = Date.now();
    assert.equal(browserResponse.status, 200);
    const browserResult = (await browserResponse.json()) as {
      bypassExpiresAt: string;
    };
    const [browserSession] = await db
      .select()
      .from(windDownSessionsTable)
      .where(eq(windDownSessionsTable.userId, userAId));
    assert.ok(browserSession);
    assert.equal(browserSession.userId, userAId);
    assert.equal(browserSession.routineId, null);
    assert.equal(browserSession.outcome, "bypass");
    assert.equal(browserSession.minutesDelayed, null);
    assert.equal(browserSession.note, browserReason);
    assert.ok(browserSession.startedAt.getTime() >= browserChoiceStartedAt);
    assert.ok(browserSession.startedAt.getTime() <= browserChoiceFinishedAt);
    assert.equal(
      browserSession.endedAt?.getTime(),
      browserSession.startedAt.getTime(),
    );
    assert.equal(
      new Date(browserResult.bypassExpiresAt).getTime() -
        browserSession.startedAt.getTime(),
      10 * 60 * 1000,
    );
    const [browserEvent] = await db
      .select()
      .from(windDownEventsTable)
      .where(
        and(
          eq(windDownEventsTable.testerId, testerAId),
          eq(windDownEventsTable.eventType, "pause_choice"),
        ),
      );
    assert.deepEqual(browserEvent.details, {
      choice: "continue_to_instagram",
      reason: browserReason,
    });

    const shortcutReason = "Check a message before putting my phone away.";
    const shortcutStartedAt = Date.now();
    const shortcutResponse = await postChoice(testerTokenB, {
      choice: "continue_to_instagram",
      reason: shortcutReason,
    });
    const shortcutFinishedAt = Date.now();
    assert.equal(shortcutResponse.status, 200);
    const shortcutResult = (await shortcutResponse.json()) as {
      bypassExpiresAt: string;
    };
    const [shortcutSession] = await db
      .select()
      .from(windDownSessionsTable)
      .where(eq(windDownSessionsTable.userId, userBId));
    assert.ok(shortcutSession);
    assert.equal(shortcutSession.userId, userBId);
    assert.equal(shortcutSession.outcome, "bypass");
    assert.equal(shortcutSession.minutesDelayed, null);
    assert.equal(shortcutSession.note, shortcutReason);
    assert.ok(shortcutSession.startedAt.getTime() >= shortcutStartedAt);
    assert.ok(shortcutSession.startedAt.getTime() <= shortcutFinishedAt);
    assert.equal(
      shortcutSession.endedAt?.getTime(),
      shortcutSession.startedAt.getTime(),
    );
    assert.equal(
      new Date(shortcutResult.bypassExpiresAt).getTime() -
        shortcutSession.startedAt.getTime(),
      10 * 60 * 1000,
    );

    const crossAccountChoice = await postChoice(
      testerTokenB,
      {
        choice: "continue_to_instagram",
        reason: "This must not be saved for the other account.",
      },
      cookieA,
    );
    assert.equal(crossAccountChoice.status, 403);
    assert.equal(
      (
        await db
          .select()
          .from(windDownSessionsTable)
          .where(eq(windDownSessionsTable.userId, userBId))
      ).length,
      1,
    );

    const legacyStartChoice = await postChoice(
      testerTokenA,
      { choice: "start_wind_down" },
      cookieA,
    );
    assert.equal(legacyStartChoice.status, 200);
    const legacyStartResult = (await legacyStartChoice.json()) as {
      bypassExpiresAt: string | null;
    };
    assert.equal(legacyStartResult.bypassExpiresAt, null);
    assert.equal(
      (
        await db
          .select()
          .from(windDownSessionsTable)
          .where(eq(windDownSessionsTable.userId, userAId))
      ).length,
      1,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
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
