import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authSessionsTable = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const windDownTestersTable = pgTable("wind_down_testers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  tokenHash: text("token_hash").notNull().unique(),
  bedtime: text("bedtime").notNull().default("22:30"),
  morningEnd: text("morning_end").notNull().default("07:00"),
  timezone: text("timezone").notNull(),
  testMode: boolean("test_mode").notNull().default(false),
  bypassExpiresAt: timestamp("bypass_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("wind_down_testers_user_id_unique").on(table.userId)]);

export const windDownEventsTable = pgTable("wind_down_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  testerId: uuid("tester_id")
    .notNull()
    .references(() => windDownTestersTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  details: jsonb("details").$type<Record<string, string | string[] | boolean>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const windDownSessionsTable = pgTable("wind_down_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  routineId: text("routine_id"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  outcome: text("outcome"),
  minutesDelayed: integer("minutes_delayed"),
  note: text("note"),
});

export const insertWindDownTesterSchema = createInsertSchema(windDownTestersTable).omit({
  id: true,
  createdAt: true,
});
export const insertWindDownEventSchema = createInsertSchema(windDownEventsTable).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
});
export const insertWindDownSessionSchema = createInsertSchema(
  windDownSessionsTable,
);

export type InsertWindDownTester = z.infer<typeof insertWindDownTesterSchema>;
export type WindDownTester = typeof windDownTestersTable.$inferSelect;
export type InsertWindDownEvent = z.infer<typeof insertWindDownEventSchema>;
export type WindDownEvent = typeof windDownEventsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type AuthSession = typeof authSessionsTable.$inferSelect;
export type WindDownSession = typeof windDownSessionsTable.$inferSelect;
