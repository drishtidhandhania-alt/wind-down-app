import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  CheckWindDownResponse,
  CompleteWindDownRoutineBody,
  CompleteWindDownRoutineResponse,
  CreateWindDownSessionBody,
  CreateWindDownSessionResponse,
  CreateWindDownTesterBody,
  CreateWindDownTesterResponse,
  GetWindDownSessionResponse,
  GetWindDownTesterResponse,
  ListWindDownSessionsResponse,
  ListStarredWindDownSessionsResponse,
  SaveWindDownPauseChoiceBody,
  SaveWindDownPauseChoiceResponse,
  StarWindDownSessionResponse,
  UpdateWindDownSessionBody,
  UpdateWindDownSessionResponse,
  UpdateWindDownSettingsBody,
  UpdateWindDownSettingsResponse,
} from "@workspace/api-zod";
import {
  db,
  starsTable,
  windDownEventsTable,
  windDownSessionsTable,
  windDownTestersTable,
  type WindDownTester,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { findWindDownSessionForUser } from "../services/wind-down-sessions";

const router: IRouter = Router();
const ROUTINE_STEPS = [
  "phone_on_charger",
  "brush_teeth",
  "read_five_minutes",
] as const;
type RoutineStep = (typeof ROUTINE_STEPS)[number];
const LEGACY_ROUTINE_COMPLETION_NOTE =
  "Actual start time and duration were not recorded. This timestamp is when completion was logged.";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function findTester(req: Request): Promise<WindDownTester | undefined> {
  const token = req.header("x-tester-token");
  if (!token || token.length > 512) return undefined;

  const [tester] = await db
    .select()
    .from(windDownTestersTable)
    .where(eq(windDownTestersTable.tokenHash, hashToken(token)))
    .limit(1);
  return tester;
}

async function findOwnedTester(
  req: Request,
  res: Response,
): Promise<WindDownTester | undefined> {
  const userId = req.authUserId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your Wind Down settings." });
    return undefined;
  }

  const tester = await findTester(req);
  if (!tester) {
    res.status(401).json({ error: "A valid private tester token is required." });
    return undefined;
  }

  if (tester.userId === userId) return tester;
  if (tester.userId !== null) {
    res.status(403).json({ error: "This private tester belongs to another account." });
    return undefined;
  }

  const [alreadyLinked] = await db
    .select({ id: windDownTestersTable.id })
    .from(windDownTestersTable)
    .where(eq(windDownTestersTable.userId, userId))
    .limit(1);
  if (alreadyLinked) {
    res.status(409).json({
      error: "Your account already has a different private tester token.",
    });
    return undefined;
  }

  const [claimed] = await db
    .update(windDownTestersTable)
    .set({ userId })
    .where(
      and(
        eq(windDownTestersTable.id, tester.id),
        isNull(windDownTestersTable.userId),
      ),
    )
    .returning();
  if (claimed) return claimed;

  const [current] = await db
    .select()
    .from(windDownTestersTable)
    .where(eq(windDownTestersTable.id, tester.id))
    .limit(1);
  if (current?.userId === userId) return current;

  res.status(403).json({ error: "This private tester belongs to another account." });
  return undefined;
}

async function findActionTester(
  req: Request,
  res: Response,
): Promise<WindDownTester | undefined> {
  if (req.header("x-tester-token") !== undefined) {
    if (req.authUserId) return findOwnedTester(req, res);

    const tester = await findTester(req);
    if (!tester) {
      res.status(401).json({ error: "A valid private tester token is required." });
    }
    return tester;
  }

  if (!req.authUserId) {
    res.status(401).json({ error: "A valid private tester token is required." });
    return undefined;
  }

  const [tester] = await db
    .select()
    .from(windDownTestersTable)
    .where(eq(windDownTestersTable.userId, req.authUserId))
    .limit(1);
  return tester;
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function minuteOfDay(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

function asMinute(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isInWindow(tester: WindDownTester, now: Date): boolean {
  if (tester.testMode) return true;

  const current = minuteOfDay(now, tester.timezone);
  const bedtime = asMinute(tester.bedtime);
  const morningEnd = asMinute(tester.morningEnd);

  // A later bedtime crosses midnight; an earlier bedtime is a same-day window.
  return bedtime > morningEnd
    ? current >= bedtime || current < morningEnd
    : current >= bedtime && current < morningEnd;
}

function pauseUrl(req: Request): string {
  const proto = (req.get("x-forwarded-proto") ?? req.protocol)
    .split(",")[0]
    .trim();
  const host = (req.get("x-forwarded-host") ?? req.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (!host || !["http", "https"].includes(proto)) {
    throw new Error("Unable to determine the app URL for the pause page.");
  }
  return new URL("/pause", `${proto}://${host}`).toString();
}

function testerState(tester: WindDownTester, now = new Date()) {
  const activeBypass =
    tester.bypassExpiresAt && tester.bypassExpiresAt.getTime() > now.getTime()
      ? tester.bypassExpiresAt.toISOString()
      : null;
  return {
    bedtime: tester.bedtime,
    morningEnd: tester.morningEnd,
    timezone: tester.timezone,
    testMode: tester.testMode,
    windowActive: isInWindow(tester, now),
    bypassExpiresAt: activeBypass,
  };
}

async function recordEvent(
  testerId: string,
  eventType: string,
  details: Record<string, string | string[] | boolean> = {},
): Promise<void> {
  await db.insert(windDownEventsTable).values({ testerId, eventType, details });
}

router.post("/wind-down/testers", async (req, res): Promise<void> => {
  if (!req.authUserId) {
    res.status(401).json({ error: "Sign in before creating a private tester." });
    return;
  }
  const parsed = CreateWindDownTesterBody.safeParse(req.body);
  if (!parsed.success || !validTimezone(parsed.data.timezone)) {
    res.status(400).json({ error: "Enter a valid IANA timezone." });
    return;
  }

  const [existing] = await db
    .select({ id: windDownTestersTable.id })
    .from(windDownTestersTable)
    .where(eq(windDownTestersTable.userId, req.authUserId))
    .limit(1);
  if (existing) {
    res.status(409).json({
      error: "A private tester is already linked to your account. Restore its token.",
    });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const [tester] = await db
    .insert(windDownTestersTable)
    .values({
      userId: req.authUserId,
      timezone: parsed.data.timezone,
      tokenHash: hashToken(token),
    })
    .returning();

  if (!tester) {
    res.status(500).json({ error: "Unable to create the private tester." });
    return;
  }

  res.status(201).json(
    CreateWindDownTesterResponse.parse({ token, ...testerState(tester) }),
  );
});

router.get("/wind-down/me", async (req, res): Promise<void> => {
  const tester = await findOwnedTester(req, res);
  if (!tester) {
    return;
  }
  res.json(GetWindDownTesterResponse.parse(testerState(tester)));
});

router.patch("/wind-down/me", async (req, res): Promise<void> => {
  const tester = await findOwnedTester(req, res);
  if (!tester) {
    return;
  }

  const parsed = UpdateWindDownSettingsBody.safeParse(req.body);
  if (
    !parsed.success ||
    parsed.data.bedtime === parsed.data.morningEnd ||
    !validTimezone(parsed.data.timezone)
  ) {
    res.status(400).json({
      error: "Use different start and end times and a valid IANA timezone.",
    });
    return;
  }

  const [updated] = await db
    .update(windDownTestersTable)
    .set(parsed.data)
    .where(eq(windDownTestersTable.id, tester.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Tester not found." });
    return;
  }
  res.json(UpdateWindDownSettingsResponse.parse(testerState(updated)));
});

router.post("/wind-down/check", async (req, res): Promise<void> => {
  const tester = await findTester(req);
  if (!tester) {
    res.status(401).json({ error: "A valid tester token is required." });
    return;
  }

  const now = new Date();
  const bypassActive =
    tester.bypassExpiresAt !== null &&
    tester.bypassExpiresAt.getTime() > now.getTime();
  const inWindow = isInWindow(tester, now);
  const decision = bypassActive || !inWindow ? "allow" : "pause";
  const reason = bypassActive
    ? "active_bypass"
    : !inWindow
      ? "outside_window"
      : tester.testMode
        ? "test_mode"
        : "wind_down_window";

  await recordEvent(
    tester.id,
    decision === "pause"
      ? "pause"
      : bypassActive
        ? "bypassed_open"
        : "allowed_open",
    { decision, reason },
  );

  res.json(
    CheckWindDownResponse.parse({
      decision,
      reason,
      pauseUrl: decision === "pause" ? pauseUrl(req) : null,
      bypassExpiresAt: bypassActive
        ? tester.bypassExpiresAt!.toISOString()
        : null,
    }),
  );
});

router.post("/wind-down/pause-choice", async (req, res): Promise<void> => {
  const tester = await findActionTester(req, res);
  if (!tester) {
    if (!res.headersSent) {
      res.status(401).json({ error: "A valid private tester token is required." });
    }
    return;
  }

  const parsed = SaveWindDownPauseChoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const isBypass = parsed.data.choice === "continue_to_instagram";
  const reason = parsed.data.reason?.trim();
  if (isBypass && !reason) {
    res.status(400).json({
      error: "A short reason is required to continue to Instagram.",
    });
    return;
  }
  if (isBypass && !tester.userId) {
    res.status(409).json({
      error: "Connect this private tester to your account in Setup first.",
    });
    return;
  }

  const choiceAt = new Date();
  const bypassExpiresAt =
    isBypass ? new Date(choiceAt.getTime() + 10 * 60 * 1000) : null;
  await db.transaction(async (tx) => {
    if (bypassExpiresAt) {
      await tx
        .update(windDownTestersTable)
        .set({ bypassExpiresAt })
        .where(eq(windDownTestersTable.id, tester.id));
      await tx.insert(windDownSessionsTable).values({
        id: randomUUID(),
        userId: tester.userId!,
        routineId: null,
        startedAt: choiceAt,
        endedAt: choiceAt,
        outcome: "bypass",
        minutesDelayed: null,
        note: reason!,
      });
    }

    await tx.insert(windDownEventsTable).values({
      testerId: tester.id,
      eventType: "pause_choice",
      details: {
        choice: parsed.data.choice,
        ...(isBypass ? { reason: reason! } : {}),
      },
    });
  });

  res.json(
    SaveWindDownPauseChoiceResponse.parse({
      choice: parsed.data.choice,
      bypassExpiresAt: bypassExpiresAt?.toISOString() ?? null,
    }),
  );
});

router.post("/wind-down/routine/complete", async (req, res): Promise<void> => {
  const tester = await findActionTester(req, res);
  if (res.headersSent) return;

  const bodyHasStartedAt =
    typeof req.body === "object" &&
    req.body !== null &&
    Object.prototype.hasOwnProperty.call(req.body, "startedAt");
  const rawStartedAt = bodyHasStartedAt ? req.body.startedAt : undefined;
  if (bodyHasStartedAt && typeof rawStartedAt !== "string") {
    res.status(400).json({ error: "Provide a valid routine start time." });
    return;
  }

  const parsed = CompleteWindDownRoutineBody.safeParse(req.body);
  if (!parsed.success) {
    const invalidStartedAt = parsed.error.issues.some(
      (issue) => issue.path[0] === "startedAt",
    );
    res.status(400).json({
      error: invalidStartedAt
        ? "Provide a valid routine start time."
        : "Check all three routine steps before finishing.",
    });
    return;
  }

  const completedSteps = [...new Set(parsed.data.completedSteps)];
  if (
    completedSteps.length !== ROUTINE_STEPS.length ||
    !ROUTINE_STEPS.every((step: RoutineStep) => completedSteps.includes(step))
  ) {
    res.status(400).json({
      error: "Check all three routine steps before finishing.",
    });
    return;
  }

  const completedAt = new Date();
  const suppliedStartedAt = parsed.data.startedAt;
  if (
    suppliedStartedAt &&
    (!Number.isFinite(suppliedStartedAt.getTime()) ||
      suppliedStartedAt.getTime() > completedAt.getTime())
  ) {
    res.status(400).json({
      error: "Routine start time must not be later than completion.",
    });
    return;
  }

  const userId = req.authUserId ?? tester?.userId;
  if (!userId) {
    res.status(409).json({
      error: "Connect this private tester to your account before saving a routine completion.",
    });
    return;
  }

  const startedAt = suppliedStartedAt ?? completedAt;
  await db.transaction(async (tx) => {
    if (tester) {
      await tx.insert(windDownEventsTable).values({
        testerId: tester.id,
        eventType: "routine_complete",
        details: { completedSteps },
      });
    }
    await tx.insert(windDownSessionsTable).values({
      id: randomUUID(),
      userId,
      routineId: null,
      startedAt,
      endedAt: completedAt,
      outcome: "routine_completed",
      minutesDelayed: null,
      note: suppliedStartedAt ? null : LEGACY_ROUTINE_COMPLETION_NOTE,
    });
  });

  res.status(201).json(
    CompleteWindDownRoutineResponse.parse({
      completed: true,
      completedAt: completedAt.toISOString(),
    }),
  );
});

router.get("/wind-down/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUserId;
  if (!userId) return;

  const sessions = await db
    .select()
    .from(windDownSessionsTable)
    .where(eq(windDownSessionsTable.userId, userId))
    .orderBy(desc(windDownSessionsTable.startedAt));

  res.json(ListWindDownSessionsResponse.parse(sessions));
});

router.get("/wind-down/stars", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUserId;
  if (!userId) return;

  const starredSessions = await db
    .select({ session: windDownSessionsTable })
    .from(starsTable)
    .innerJoin(
      windDownSessionsTable,
      eq(starsTable.sessionId, windDownSessionsTable.id),
    )
    .where(
      and(
        eq(starsTable.userId, userId),
        eq(windDownSessionsTable.userId, userId),
      ),
    )
    .orderBy(desc(windDownSessionsTable.startedAt));

  res.json(
    ListStarredWindDownSessionsResponse.parse(
      starredSessions.map(({ session }) => session),
    ),
  );
});

router.put(
  "/wind-down/sessions/:sessionId/star",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.authUserId;
    if (!userId) return;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId || !(await findWindDownSessionForUser(sessionId, userId))) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }

    await db
      .insert(starsTable)
      .values({ userId, sessionId })
      .onConflictDoNothing({
        target: [starsTable.userId, starsTable.sessionId],
      });

    res.json(StarWindDownSessionResponse.parse({ starred: true }));
  },
);

router.delete(
  "/wind-down/sessions/:sessionId/star",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.authUserId;
    if (!userId) return;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }

    await db
      .delete(starsTable)
      .where(
        and(
          eq(starsTable.userId, userId),
          eq(starsTable.sessionId, sessionId),
        ),
      );
    res.status(204).end();
  },
);

router.post("/wind-down/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.authUserId;
  if (!userId) return;

  const parsed = CreateWindDownSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter valid session details." });
    return;
  }

  const [session] = await db
    .insert(windDownSessionsTable)
    .values({
      id: randomUUID(),
      userId,
      routineId: parsed.data.routineId ?? null,
      startedAt: parsed.data.startedAt,
      endedAt: parsed.data.endedAt ?? null,
      outcome: parsed.data.outcome ?? null,
      minutesDelayed: parsed.data.minutesDelayed ?? null,
      note: parsed.data.note ?? null,
    })
    .returning();

  res.status(201).json(CreateWindDownSessionResponse.parse(session));
});

router.get(
  "/wind-down/sessions/:sessionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.authUserId;
    if (!userId) return;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }
    const session = await findWindDownSessionForUser(sessionId, userId);
    if (!session) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }
    res.json(GetWindDownSessionResponse.parse(session));
  },
);

router.patch(
  "/wind-down/sessions/:sessionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.authUserId;
    if (!userId) return;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }

    const parsed = UpdateWindDownSessionBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      res.status(400).json({ error: "Enter at least one valid session field." });
      return;
    }

    const [session] = await db
      .update(windDownSessionsTable)
      .set(parsed.data)
      .where(
        and(
          eq(windDownSessionsTable.id, sessionId),
          eq(windDownSessionsTable.userId, userId),
        ),
      )
      .returning();

    if (!session) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }
    res.json(UpdateWindDownSessionResponse.parse(session));
  },
);

router.delete(
  "/wind-down/sessions/:sessionId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.authUserId;
    if (!userId) return;
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }

    const [deleted] = await db
      .delete(windDownSessionsTable)
      .where(
        and(
          eq(windDownSessionsTable.id, sessionId),
          eq(windDownSessionsTable.userId, userId),
        ),
      )
      .returning({ id: windDownSessionsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Wind Down session not found." });
      return;
    }
    res.status(204).end();
  },
);

export default router;
