# Surface Routine Save Errors

## What & Why
Update the Wind Down routine and pause pages to show actionable server error messages instead of hiding them behind generic copy. For routine completion failures that require account linking or sign-in, guide visitors to account creation or sign-in without losing their checked steps.

## Done looks like
- Routine completion displays a non-empty server `error` message when available, and retains the current generic sentence as its fallback.
- A 409 indicating that the private tester must be connected to an account, or a 401 sign-in-required failure, also shows a clear next step linking to `/signup`; the existing auth page lets users switch to sign-in.
- Routine checked steps remain preserved in sessionStorage after failures and while navigating to authentication.
- Pause bypass save failures display a server `error` message when available and retain the existing pause-specific fallback otherwise.
- Regression coverage exercises server-message extraction, missing or malformed error bodies, and account-guidance conditions using the repository's existing test approach without adding a test framework.
- The API test suite, workspace typecheck, and build pass; API tests use only a disposable test database.
- The original user prompt is saved verbatim at `prompts/fix-routine-save-error-message.md`. The scoped changes are committed and pushed to `origin/fix/routine-save-error-message`, with no pull request and no unrelated files in the branch diff.

## Out of scope
- API behavior or 401/403/409 semantics, database schema, or persisted data changes.
- Changes to authentication behavior beyond routing the guidance link to the existing `/signup` page.
- Unrelated changes, including any `.replit` modification that adds `python-base-3.13`.
- Opening a pull request or merging the branch.

## Steps
1. **Prepare the branch and preserve the prompt** — Fetch `origin`, create `fix/routine-save-error-message` from the latest `origin/main`, and save the user's original prompt verbatim to the requested prompt file before implementation. Leave unrelated workspace changes out of the branch.
2. **Surface routine completion errors** — Defensively inspect the generated API client's error object for a non-empty response-body `data.error` string and display it, falling back to the existing routine message. For the specified tester-linking 409 and sign-in-required 401, include clear account guidance with a `/signup` link; preserve sessionStorage progress behavior.
3. **Surface pause bypass errors** — Apply the same defensive server-message extraction to the pause choice mutation failure while keeping its existing fallback copy and behavior.
4. **Add regression coverage and validate** — Add tests using supported existing patterns for extraction, fallback, and the routine account-guidance cases. Run the full API test suite only with `DATABASE_URL` explicitly set to a disposable test database, plus workspace typecheck and workspace build; verify all pass.
5. **Review and publish the branch** — Review the complete diff for scope and ensure the pre-existing `.replit` change is excluded. Commit with a clear message referencing #29, push to the requested origin branch, do not open a PR or merge, and report the branch name, commit hash, tests, and diff summary.

## Relevant files
- `artifacts/wind-down/src/pages/routine.tsx`
- `artifacts/wind-down/src/pages/pause.tsx`
- `artifacts/wind-down/src/pages/auth.tsx`
- `artifacts/wind-down/src/App.tsx`
- `artifacts/wind-down/src/lib/dashboard-stats.test.ts`
- `artifacts/wind-down/src/lib/shortcut-check.test.ts`
- `artifacts/wind-down/package.json`
- `lib/api-client-react/src/custom-fetch.ts`
- `artifacts/api-server/src/routes/wind-down-routine-history.test.ts`
- `package.json`
