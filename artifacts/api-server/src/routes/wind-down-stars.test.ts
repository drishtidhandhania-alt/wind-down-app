import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { inArray } from "drizzle-orm";
import app from "../app";
import { hashSessionToken } from "../middlewares/auth";
import {
  authSessionsTable,
  db,
  pool,
  usersTable,
  windDownSessionsTable,
} from "@workspace/db";

test("session stars are unique and visible only to their owner", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const emailTag = randomUUID();
  const tokenA = randomBytes(32).toString("base64url");
  const tokenB = randomBytes(32).toString("base64url");
  const sessionAId = randomUUID();
  const sessionBId = randomUUID();
  const startedAt = new Date("2026-08-14T22:30:00.000Z");
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const cookieA = `wind_down_session=${tokenA}`;
    const cookieB = `wind_down_session=${tokenB}`;

    await db.insert(usersTable).values([
      {
        id: userAId,
        email: `wind-down-stars-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-stars-b-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
    ]);
    await db.insert(authSessionsTable).values([
      {
        userId: userAId,
        tokenHash: hashSessionToken(tokenA),
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        userId: userBId,
        tokenHash: hashSessionToken(tokenB),
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    await db.insert(windDownSessionsTable).values([
      {
        id: sessionAId,
        userId: userAId,
        startedAt,
        outcome: "A quiet evening",
      },
      {
        id: sessionBId,
        userId: userBId,
        startedAt,
        outcome: "A rested evening",
      },
    ]);

    const signedOutList = await fetch(`${baseUrl}/wind-down/stars`);
    assert.equal(signedOutList.status, 401);

    const starA = await fetch(`${baseUrl}/wind-down/sessions/${sessionAId}/star`, {
      method: "PUT",
      headers: { Cookie: cookieA },
    });
    assert.equal(starA.status, 200);
    assert.deepEqual(await starA.json(), { starred: true });

    const duplicateStarA = await fetch(
      `${baseUrl}/wind-down/sessions/${sessionAId}/star`,
      { method: "PUT", headers: { Cookie: cookieA } },
    );
    assert.equal(duplicateStarA.status, 200);

    const userAStars = await fetch(`${baseUrl}/wind-down/stars`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(userAStars.status, 200);
    assert.deepEqual(
      ((await userAStars.json()) as Array<{ id: string }>).map(({ id }) => id),
      [sessionAId],
    );

    const userBStarsBefore = await fetch(`${baseUrl}/wind-down/stars`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(userBStarsBefore.status, 200);
    assert.deepEqual(await userBStarsBefore.json(), []);

    const userBStarForeignSession = await fetch(
      `${baseUrl}/wind-down/sessions/${sessionAId}/star`,
      { method: "PUT", headers: { Cookie: cookieB } },
    );
    assert.equal(userBStarForeignSession.status, 404);

    const userBStarOwnSession = await fetch(
      `${baseUrl}/wind-down/sessions/${sessionBId}/star`,
      { method: "PUT", headers: { Cookie: cookieB } },
    );
    assert.equal(userBStarOwnSession.status, 200);

    const userBStars = await fetch(`${baseUrl}/wind-down/stars`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(userBStars.status, 200);
    assert.deepEqual(
      ((await userBStars.json()) as Array<{ id: string }>).map(({ id }) => id),
      [sessionBId],
    );

    const userBCannotUnstarA = await fetch(
      `${baseUrl}/wind-down/sessions/${sessionAId}/star`,
      { method: "DELETE", headers: { Cookie: cookieB } },
    );
    assert.equal(userBCannotUnstarA.status, 204);
    const userAStarsAfterForeignUnstar = await fetch(`${baseUrl}/wind-down/stars`, {
      headers: { Cookie: cookieA },
    });
    assert.deepEqual(
      ((await userAStarsAfterForeignUnstar.json()) as Array<{ id: string }>).map(
        ({ id }) => id,
      ),
      [sessionAId],
    );

    const unstarA = await fetch(
      `${baseUrl}/wind-down/sessions/${sessionAId}/star`,
      { method: "DELETE", headers: { Cookie: cookieA } },
    );
    assert.equal(unstarA.status, 204);
    const userAStarsAfterUnstar = await fetch(`${baseUrl}/wind-down/stars`, {
      headers: { Cookie: cookieA },
    });
    assert.deepEqual(await userAStarsAfterUnstar.json(), []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(usersTable).where(inArray(usersTable.id, [userAId, userBId]));
    await pool.end();
  }
});
