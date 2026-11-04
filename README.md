# Wind Down

Wind Down is a mobile-first bedtime interruption app. It pairs with an iPhone Shortcut to check Instagram opens against a tester's wind-down window, offer a pause or a ten-minute bypass, and save completed routines and session history.

**Live app:** [wind-down-i-phone-prototype.replit.app](https://wind-down-i-phone-prototype.replit.app/)

## What it includes

- Email/password sign-up, login, and logout.
- Bedtime, morning end time, timezone, test mode, and private Shortcut-token setup.
- Session history with create, detail, edit, delete, search, sort, and per-session stars.
- A fixed three-step routine: put the phone on its charger, brush teeth, and read for five minutes.
- A dashboard with total sessions, average recorded delay, completed sessions, and a seven-day chart.

The app does not yet provide configurable routine templates. On November 4, 2026, the owner verified the iPhone Personal Automation on a physical iPhone: opening Instagram triggered Wind Down, choosing the 10-minute bypass with a short reason returned to Instagram, and completing the routine saved from the phone. The owner's account has seven genuine sessions: five retrospective entries with user-supplied approximate times (labeled retrospective, with `endedAt` null), plus two live app sessions—a routine completion on November 3 and a bypass with a short reason on November 4. A dashboard screenshot of the real saved data was captured and reviewed.

## Stack and data flow

The web artifact uses React, TypeScript, Vite, Tailwind CSS, React Query, Wouter, and Recharts. The API is Express; PostgreSQL access and schema are defined with Drizzle ORM. Replit Agent was used to build and verify the project in the Replit workspace; the app is hosted through Replit artifacts.

Manual browser forms send requests with the signed-in user's cookie. Express validates requests, resolves the user, and writes through Drizzle to PostgreSQL. The Shortcut instead sends a private tester token; Express resolves its hash and the linked tester/user. Browser history and dashboard reads are scoped to the signed-in user. The dashboard derives totals and chart buckets from those saved sessions. `minutesDelayed` values are averaged only when present; a granted ten-minute bypass is not treated as a measured ten-minute delay.

Total sessions counts every saved session. Completed sessions counts only rows with `endedAt` set. A null delay is excluded from the average; if no delay is recorded, the dashboard shows no average rather than treating it as zero. The chart groups starts over the browser's local seven-calendar-day window. Automated tests create synthetic fixtures for verification and clean them up; the repository does not seed sample history.

The schema source is [`lib/db/src/schema/wind-down.ts`](lib/db/src/schema/wind-down.ts), with a reference in [`schema.md`](schema.md). A tracked Drizzle SQL file and snapshot are also present. The database package defines a schema push script, not a standalone migration-runner script.

## Local setup

The Replit configuration specifies Node.js 24 and PostgreSQL 16. The repository uses pnpm; it does not pin a pnpm version.

1. Install dependencies from the repository root:

   ```sh
   pnpm install
   ```

2. Provision an **empty PostgreSQL database** and set `DATABASE_URL` for the workspace. Do not point setup at production or a database containing records.

3. Apply the current schema to that empty database:

   ```sh
   pnpm --filter @workspace/db run push
   ```

   Review every Drizzle prompt before accepting changes. Never use `push-force` against an existing database.

4. Start the API and web services in separate terminals:

   ```sh
   PORT=8080 pnpm --filter @workspace/api-server run dev
   ```

   ```sh
   PORT=22083 BASE_PATH=/ pnpm --filter @workspace/wind-down run dev
   ```

   The Vite config has no `/api` proxy. Opening Vite directly at port `22083` therefore does not by itself provide a same-origin API. Use a same-origin reverse proxy from `/api` to port `8080` for standalone local browsing. Replit's artifact routing is configured to route `/` to the web service and `/api` to the API service.

## Checks

API route tests insert synthetic records and clean up their own fixtures. Run them only with `DATABASE_URL` pointing at a **dedicated disposable test database**, never production or a database with valuable/shared records:

```sh
pnpm --filter @workspace/api-server run test
```

The web logic tests and workspace checks are:

```sh
pnpm --filter @workspace/wind-down run test:dashboard
pnpm --filter @workspace/wind-down run test:shortcut-check
pnpm run typecheck
pnpm run build
```

## Assignment evidence and remaining verification

- [Plan and post-build reality notes](PLAN.md)
- [Database schema reference](schema.md)
- [PR #4 data-isolation red/green screenshots](generated-artifacts/data-isolation-red.jpg) and [green screenshot](generated-artifacts/data-isolation-green.jpg)
- [PR #19 dashboard red/green report](generated-artifacts/dashboard/TEST.md), including links to its original logs and screenshots

The Shortcut decision and website-side request have automated coverage. Separately, on November 4, 2026, the owner verified the Instagram trigger, 10-minute bypass return, and routine save on a physical iPhone. The seven genuine sessions and reviewed real-data dashboard screenshot are complete; the device flow was user-verified, not automated or server-side verified.
