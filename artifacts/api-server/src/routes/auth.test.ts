import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, pool, usersTable } from "@workspace/db";

test("sign-up persists a user and login/logout manage the browser session", async () => {
  const email = `wind-down-auth-${randomUUID()}@example.test`;
  const password = "WindDown-Prototype-2026!";
  const server = app.listen(0, "127.0.0.1");
  let userId: string | undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const signupResponse = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(signupResponse.status, 201);
    const signup = (await signupResponse.json()) as {
      user: { id: string; email: string };
    };
    userId = signup.user.id;
    assert.equal(signup.user.email, email);
    const signupCookie = signupResponse.headers.get("set-cookie");
    assert.ok(signupCookie?.includes("HttpOnly"));
    assert.ok(signupCookie?.toLowerCase().includes("samesite=lax"));
    const sessionCookie = signupCookie?.match(/wind_down_session=([^;]+)/)?.[1];
    assert.ok(sessionCookie);

    const [storedUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    assert.ok(storedUser);
    assert.equal(storedUser.email, email);
    assert.notEqual(storedUser.passwordHash, password);
    assert.ok(storedUser.passwordHash.includes(":"));

    const currentUserResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: `wind_down_session=${sessionCookie}` },
    });
    assert.equal(currentUserResponse.status, 200);

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { Cookie: `wind_down_session=${sessionCookie}` },
    });
    assert.equal(logoutResponse.status, 204);
    const clearedCookie = logoutResponse.headers.get("set-cookie") ?? "";
    assert.ok(clearedCookie.includes("Expires="));
    assert.match(clearedCookie, /1970/);

    const signedOutResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: `wind_down_session=${sessionCookie}` },
    });
    assert.equal(signedOutResponse.status, 401);

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toUpperCase(), password }),
    });
    assert.equal(loginResponse.status, 200);
    const login = (await loginResponse.json()) as {
      user: { id: string; email: string };
    };
    assert.equal(login.user.id, userId);

    const badLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "incorrect-password" }),
    });
    assert.equal(badLoginResponse.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (userId) {
      await db.delete(usersTable).where(eq(usersTable.id, userId));
    }
    await pool.end();
  }
});
