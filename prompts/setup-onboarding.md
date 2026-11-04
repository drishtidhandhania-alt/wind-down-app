Fix the first-time device setup onboarding on the Setup page. This addresses GitHub issue #33 in drishtidhandhania-alt/wind-down-app.

Context: during a friend usability test, a new user was confused after signup because the Setup page asks them to "Create a private tester" without explaining how this device setup differs from the account they just created.

1. Create a new branch from the current main (e.g. fix/setup-onboarding-clarity).
2. Make this one focused improvement, on the Setup page only:
   - Change the first-time button text from "Create a private tester" to "Set up this device".
   - Add a plain-language explanation of why device setup follows account creation: the account holds the user's data; device setup connects this iPhone's Shortcut to their account using a private token.
   - After the device is connected (tester created or restored), show a clear next step that links to Tonight (the home page).
   - Preserve the existing authentication, token flow, connection check, and ownership checks. Do not change server routes, database schema, or auth logic. Keep the copy style consistent with the rest of the app.
3. Save this full prompt in prompts/setup-onboarding.md on the branch.
4. Commit and push the branch to origin.
5. Open a pull request from the branch to main titled "Clarify first-time device setup on the Setup page", with a body that includes "Closes #33", a summary of the copy changes, and before/after notes.
6. Verify the app still builds and the dev server runs without errors.

Do not modify PLAN.md, README.md, schema docs, or any user data. Do not apply the old "Fix Signed-In Routine Saving" task card changes.
