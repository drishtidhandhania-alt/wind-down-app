# Routine completion in session history

The three-step routine still requires all steps to be checked. The page captures its mount time as the routine start; the server records its own completion time as the end. Completion creates one `routine_completed` session with `minutesDelayed` left null because no delay is measured.

For legacy requests that omit `startedAt`, the server uses the completion time as the log timestamp and stores this note: “Actual start time and duration were not recorded. This timestamp is when completion was logged.” The history UI identifies that timestamp as a completion log time, not a measured start.

No database schema change or migration is needed. The API server tests use isolated synthetic users/testers and clean up only those records. Physical iPhone automation behavior was not tested.
