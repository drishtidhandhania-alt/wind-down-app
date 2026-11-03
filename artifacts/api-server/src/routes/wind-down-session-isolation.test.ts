import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { inArray } from "drizzle-orm";
import app from "../app";
import { hashSessionToken } from "../middlewares/auth";
import { authSessionsTable, db, pool, usersTable, windDownSessionsTable } from "@workspace/db";

test("User B cannot see a Wind Down session created by User A", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const sessionId = randomUUID();
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

    await db.insert(usersTable).values([
      {
        id: userAId,
        email: `wind-down-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-b-${emailTag}@example.test`,
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
    await db.insert(windDownSessionsTable).values({
      id: sessionId,
      userId: userAId,
      note: "private test session",
    });

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/api/wind-down/sessions/${sessionId}`;

    const userAResponse = await fetch(url, {
      headers: { Cookie: `wind_down_session=${tokenA}` },
    });
    assert.equal(userAResponse.status, 200);
    const userASession = (await userAResponse.json()) as {
      id?: string;
      userId?: string;
    };
    assert.equal(userASession.id, sessionId);
    assert.equal(userASession.userId, userAId);

    const userBResponse = await fetch(url, {
      headers: { Cookie: `wind_down_session=${tokenB}` },
    });
    assert.equal(userBResponse.status, 404);
    const userBResult = (await userBResponse.json()) as {
      error?: string;
      id?: string;
    };
    assert.equal(userBResult.error, "Wind Down session not found.");
    assert.equal(userBResult.id, undefined);

    const signedOutResponse = await fetch(url);
    assert.equal(signedOutResponse.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(usersTable).where(inArray(usersTable.id, [userAId, userBId]));
    await pool.end();
  }
});
