import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { authSessionsTable, db, usersTable } from "@workspace/db";
import { AUTH_COOKIE_NAME, hashSessionToken } from "../middlewares/auth";

const router: IRouter = Router();
const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 10;

type PublicUser = { id: string; email: string };

function publicUser(user: { id: string; email: string }): PublicUser {
  return { id: user.id, email: user.email };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }
  return email;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltText, hashText] = storedHash.split(":");
  if (!saltText || !hashText) return false;

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: req.secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

async function createSession(
  userId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(authSessionsTable).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  setSessionCookie(req, res, token);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (
    !email ||
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > 1024
  ) {
    res.status(400).json({
      error: `Enter a valid email and a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const userId = randomUUID();
    const [user] = await db
      .insert(usersTable)
      .values({ id: userId, email, passwordHash })
      .returning({ id: usersTable.id, email: usersTable.email });
    if (!user) {
      res.status(500).json({ error: "Unable to create your account." });
      return;
    }

    await createSession(user.id, req, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== "string" || password.length > 1024) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  await createSession(user.id, req, res);
  res.json({ user: publicUser(user) });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.authUserId) {
    res.status(401).json({ error: "You are signed out." });
    return;
  }
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.authUserId))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "You are signed out." });
    return;
  }
  res.json(publicUser(user));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  if (req.authSessionId) {
    await db
      .delete(authSessionsTable)
      .where(eq(authSessionsTable.id, req.authSessionId));
  }
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: req.secure,
    sameSite: "lax",
    path: "/",
  });
  res.status(204).end();
});

export default router;
