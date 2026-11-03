import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import app from "../app";
import { hashSessionToken } from "../middlewares/auth";
import {
  authSessionsTable,
  db,
  pool,
  usersTable,
} from "@workspace/db";

test("account-owned settings stay private while the Shortcut token still works", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const emailTag = randomUUID();
  const tokenA = randomBytes(32).toString("base64url");
  const tokenB = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 60_000);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    await db.insert(usersTable).values([
      {
        id: userAId,
        email: `wind-down-owner-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-owner-b-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
    ]);
    await db.insert(authSessionsTable).values([
      {
        userId: userAId,
        tokenHash: hashSessionToken(tokenA),
        expiresAt,
      },
      {
        userId: userBId,
        tokenHash: hashSessionToken(tokenB),
        expiresAt,
      },
    ]);

    const createResponse = await fetch(`${baseUrl}/wind-down/testers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wind_down_session=${tokenA}`,
      },
      body: JSON.stringify({ timezone: "UTC" }),
    });
    assert.equal(createResponse.status, 201);
    const tester = (await createResponse.json()) as { token: string };
    assert.ok(tester.token);

    const settingsHeaders = {
      "X-Tester-Token": tester.token,
      Cookie: `wind_down_session=${tokenA}`,
    };
    const updateResponse = await fetch(`${baseUrl}/wind-down/me`, {
      method: "PATCH",
      headers: {
        ...settingsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bedtime: "22:30",
        morningEnd: "07:00",
        timezone: "UTC",
        testMode: true,
      }),
    });
    assert.equal(updateResponse.status, 200);

    const otherAccountSettings = await fetch(`${baseUrl}/wind-down/me`, {
      headers: {
        "X-Tester-Token": tester.token,
        Cookie: `wind_down_session=${tokenB}`,
      },
    });
    assert.equal(otherAccountSettings.status, 403);

    const shortcutCheck = await fetch(`${baseUrl}/wind-down/check`, {
      method: "POST",
      headers: { "X-Tester-Token": tester.token },
    });
    assert.equal(shortcutCheck.status, 200);
    const decision = (await shortcutCheck.json()) as {
      decision: string;
      pauseUrl: string | null;
    };
    assert.equal(decision.decision, "pause");
    assert.ok(decision.pauseUrl?.endsWith("/pause"));

    const pauseChoice = await fetch(`${baseUrl}/wind-down/pause-choice`, {
      method: "POST",
      headers: {
        "X-Tester-Token": tester.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ choice: "continue_to_instagram" }),
    });
    assert.equal(pauseChoice.status, 200);
    const bypass = (await pauseChoice.json()) as {
      bypassExpiresAt: string | null;
    };
    assert.ok(bypass.bypassExpiresAt);
    const remainingMs = new Date(bypass.bypassExpiresAt).getTime() - Date.now();
    assert.ok(remainingMs > 9 * 60_000 && remainingMs <= 10 * 60_000);

    const bypassCheck = await fetch(`${baseUrl}/wind-down/check`, {
      method: "POST",
      headers: { "X-Tester-Token": tester.token },
    });
    assert.equal(bypassCheck.status, 200);
    const bypassDecision = (await bypassCheck.json()) as {
      decision: string;
      reason: string;
    };
    assert.equal(bypassDecision.decision, "allow");
    assert.equal(bypassDecision.reason, "active_bypass");

    const routineCompletion = await fetch(
      `${baseUrl}/wind-down/routine/complete`,
      {
        method: "POST",
        headers: {
          "X-Tester-Token": tester.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedSteps: [
            "phone_on_charger",
            "brush_teeth",
            "read_five_minutes",
          ],
        }),
      },
    );
    assert.equal(routineCompletion.status, 201);
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
