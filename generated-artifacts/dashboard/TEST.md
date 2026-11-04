# Dashboard calculation test evidence

## Given / When / Then

**Given** three saved sessions with `minutesDelayed` values of 5, 10, and 15

**When** dashboard statistics are computed

**Then** the average minutes delayed is 10.

## Plain-English explanation

The test passes three in-memory session fixtures to the same pure function used by the Dashboard. It checks the average, total session count, and completed-session count without reading or changing any database records. Additional fixtures verify that `null` delay values are excluded, a real value of zero remains part of the average, empty data returns no average rather than `NaN`, and the chart contains seven local-calendar-day buckets.

For this Dashboard, a session is counted as completed when it has an `endedAt` value. The chart groups each signed-in user's sessions by `startedAt` in the browser's local timezone, including today and the preceding six calendar days.

## Red/green run

The unchanged test file was copied byte-for-byte into `/tmp/wind-down-dashboard-isolated/`; its SHA-256 was `475fc1b648e471a6a36f9b7aa3d6900bfbcf7730a4d08c693c1ea5cff23701e6` in both the branch and isolated copy.

The red run changed only the copied implementation's average denominator:

```diff
- delayedMinutesTotal / delayedSessionsCount
+ delayedMinutesTotal / (delayedSessionsCount + 1)
```

The unchanged real test failed: the required 5, 10, 15 fixture produced **7.5 instead of 10**. The null-containing average fixture also failed. The empty-data and seven-day chart tests passed.

The isolated implementation was then restored from the branch source. Running the same unchanged test file again passed all four tests. The deliberate mutation was never applied to the branch source or deployed.

## One real regression that would fail the suite

Dividing the total delayed minutes by `sessions.length` instead of the count of non-null delay values would make the `[5, null, 15]` fixture average to `6.67` instead of `10`.

## Bugs caught and fixed

No pre-existing product bug was found during this work. The red run caught the deliberately introduced off-by-one denominator bug, and restoring the correct denominator made the unchanged test pass. The null/zero/empty fixtures also guard against treating zero as missing, counting null values in the denominator, or producing `NaN` for an empty average.

## Evidence files

- `red-test.log` — raw Node test-runner output from the isolated failing run.
- `red-test.jpg` — captured browser screenshot displaying that raw failing output.
- `green-test.log` — raw Node test-runner output after restoring the isolated implementation.
- `green-test.jpg` — captured browser screenshot displaying that raw passing output.

Re-run the branch test with:

```sh
pnpm --filter @workspace/wind-down run test:dashboard
```
