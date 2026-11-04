import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { inArray } from "drizzle-orm";
import app from "../app";
import { hashSessionToken } from "../middlewares/auth";
import { authSessionsTable, db, pool, usersTable } from "@workspace/db";

test("session history CRUD is limited to the signed-in user", async () => {
  const userAId = randomUUID();
  const userBId = randomUUID();
  const emailTag = randomUUID();
  const tokenA = randomBytes(32).toString("base64url");
  const tokenB = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const startedAt = new Date("2026-08-14T22:30:00.000Z");
  const endedAt = new Date("2026-08-14T22:52:00.000Z");
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
        email: `wind-down-session-a-${emailTag}@example.test`,
        passwordHash: "test-only-password-hash",
      },
      {
        id: userBId,
        email: `wind-down-session-b-${emailTag}@example.test`,
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

    const signedOutList = await fetch(`${baseUrl}/wind-down/sessions`);
    assert.equal(signedOutList.status, 401);

    const createResponse = await fetch(`${baseUrl}/wind-down/sessions`, {
      method: "POST",
      headers: { Cookie: cookieA, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userBId,
        routineId: "evening-routine",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        outcome: "went to bed",
        minutesDelayed: 12,
        note: "A quiet evening",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      id: string;
      userId: string;
      note: string | null;
      minutesDelayed: number | null;
    };
    assert.equal(created.userId, userAId);
    assert.equal(created.note, "A quiet evening");
    assert.equal(created.minutesDelayed, 12);
    const createdId = created.id;

    const ownerListResponse = await fetch(`${baseUrl}/wind-down/sessions`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(ownerListResponse.status, 200);
    const ownerList = (await ownerListResponse.json()) as Array<{ id: string }>;
    assert.deepEqual(ownerList.map((session) => session.id), [createdId]);

    const otherListResponse = await fetch(`${baseUrl}/wind-down/sessions`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(otherListResponse.status, 200);
    assert.deepEqual(await otherListResponse.json(), []);

    const otherGet = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(otherGet.status, 404);

    const otherUpdate = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      method: "PATCH",
      headers: { Cookie: cookieB, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Not yours" }),
    });
    assert.equal(otherUpdate.status, 404);

    const otherDelete = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      method: "DELETE",
      headers: { Cookie: cookieB },
    });
    assert.equal(otherDelete.status, 404);

    const ownerGet = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(ownerGet.status, 200);
    assert.equal(((await ownerGet.json()) as { id: string }).id, createdId);

    const updateResponse = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      method: "PATCH",
      headers: { Cookie: cookieA, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Updated note", outcome: "rested" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      userId: string;
      note: string | null;
      outcome: string | null;
    };
    assert.equal(updated.userId, userAId);
    assert.equal(updated.note, "Updated note");
    assert.equal(updated.outcome, "rested");

    const deleteResponse = await fetch(`${baseUrl}/wind-down/sessions/${createdId}`, {
      method: "DELETE",
      headers: { Cookie: cookieA },
    });
    assert.equal(deleteResponse.status, 204);

    const finalListResponse = await fetch(`${baseUrl}/wind-down/sessions`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(finalListResponse.status, 200);
    assert.deepEqual(await finalListResponse.json(), []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(usersTable).where(
      inArray(usersTable.id, [userAId, userBId]),
    );
    await pool.end();
  }
});
