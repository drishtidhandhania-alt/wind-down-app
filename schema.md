# Database schema

This reference follows the Drizzle definitions in [`lib/db/src/schema/wind-down.ts`](lib/db/src/schema/wind-down.ts). PostgreSQL types are shown as stored; `timestamptz` means `timestamp with time zone`. Primary keys are non-null. Defaults and foreign-key delete actions are stated explicitly.

## `users`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `text` | not null | Primary key; no database default. |
| `email` | `text` | not null | Unique constraint `users_email_unique`. |
| `password_hash` | `text` | not null | No default. Stores the salted scrypt derivation, not the password. |
| `created_at` | `timestamptz` | not null | `now()`. |

## `auth_sessions`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | not null | Primary key; `gen_random_uuid()`. |
| `user_id` | `text` | not null | Foreign key to `users.id`; `ON DELETE CASCADE`. |
| `token_hash` | `text` | not null | Unique constraint `auth_sessions_token_hash_unique`. |
| `expires_at` | `timestamptz` | not null | No default. |
| `created_at` | `timestamptz` | not null | `now()`. |

## `wind_down_testers`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | not null | Primary key; `gen_random_uuid()`. |
| `user_id` | `text` | nullable | Foreign key to `users.id`; `ON DELETE CASCADE`; unique index `wind_down_testers_user_id_unique`. |
| `token_hash` | `text` | not null | Unique constraint `wind_down_testers_token_hash_unique`. |
| `bedtime` | `text` | not null | `'22:30'`. |
| `morning_end` | `text` | not null | `'07:00'`. |
| `timezone` | `text` | not null | No default. |
| `test_mode` | `boolean` | not null | `false`. |
| `bypass_expires_at` | `timestamptz` | nullable | No default. |
| `created_at` | `timestamptz` | not null | `now()`. |

The unique tester `user_id` index permits multiple `NULL` values under PostgreSQL's normal unique-index behavior; linked users can have at most one tester.

## `wind_down_events`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | not null | Primary key; `gen_random_uuid()`. |
| `tester_id` | `uuid` | not null | Foreign key to `wind_down_testers.id`; `ON DELETE CASCADE`. |
| `event_type` | `text` | not null | No default or database enum constraint. |
| `details` | `jsonb` | not null | `'{}'::jsonb`. |
| `created_at` | `timestamptz` | not null | `now()`. |

## `wind_down_sessions`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `text` | not null | Primary key; no database default. |
| `user_id` | `text` | not null | Foreign key to `users.id`; `ON DELETE CASCADE`. |
| `routine_id` | `text` | nullable | No default and **no foreign key**. |
| `started_at` | `timestamptz` | not null | `now()`. |
| `ended_at` | `timestamptz` | nullable | No default. |
| `outcome` | `text` | nullable | No default or database enum constraint. |
| `minutes_delayed` | `integer` | nullable | No default. |
| `note` | `text` | nullable | No default. |

## `stars`

| Column | PostgreSQL type | Nullability | Default / constraints |
| --- | --- | --- | --- |
| `id` | `uuid` | not null | Primary key; `gen_random_uuid()`. |
| `user_id` | `text` | not null | Foreign key to `users.id`; `ON DELETE CASCADE`. |
| `session_id` | `text` | not null | Foreign key to `wind_down_sessions.id`; `ON DELETE CASCADE`. |
| `created_at` | `timestamptz` | not null | `now()`. |

Unique index `stars_user_id_session_id_unique` on (`user_id`, `session_id`) allows each user to star a given session only once.

## Relationships and differences from the original plan

- A user can have many authentication sessions and many Wind Down sessions. Deleting a user cascades to both, as well as the user's linked tester and stars.
- A user may have one linked tester. Deleting that tester cascades to its `wind_down_events`.
- A tester owns events; a tester is not the session-history owner. Shortcut-created sessions use the linked tester's `user_id`.
- `stars` is the user/session junction. Deleting either the user or the session cascades to its stars.
- The original `PLAN.md` proposed `routines` and `routine_steps`, a session `routine_id` foreign key, and stars on routines. The shipped schema has no `routines` or `routine_steps` tables; the routine is a fixed three-step flow in application code. Stars apply to sessions. The original plan is preserved as written above the post-build note; this section records the actual schema, not a retroactive change to the plan.

## Reproducibility

The Drizzle source schema is the current application definition. The repository also tracks `lib/db/drizzle/0000_add_stars_table.sql` and its snapshot; despite the migration filename, that SQL defines all six tables and their foreign keys and unique indexes. The database package currently exposes `push` and `push-force` scripts, but no migration-runner script. For a new empty PostgreSQL database, use `pnpm --filter @workspace/db run push` and review Drizzle's proposed operations. Do not force schema changes against an existing or production database.
