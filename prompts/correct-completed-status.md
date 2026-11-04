Work on the Wind Down app on a new branch docs/correct-completed-status created from the latest origin/main. This implements GitHub issue #31.

Documentation-only task. README.md and PLAN.md contain stale claims that are now false:
1. README.md says installing/running the iPhone Personal Automation and confirming Safari can reopen Instagram "still require a real iPhone test", and that five genuine history entries and a real-data screenshot are "still outstanding".
2. PLAN.md section 4 says five genuine entries plus a real-data screenshot "remain Backlogged".
3. PLAN.md section 7's Plan vs. Reality table marks "iPhone Shortcut and Instagram pause" and "Five genuine sessions and a real-data screenshot" as Backlogged, and its text calls device behavior the highest remaining risk.

Correct them to this verified state:
- The owner completed physical iPhone verification on November 4, 2026: opening Instagram triggers Wind Down, choosing the 10-minute bypass with a short reason returns to Instagram, and the routine saves from the phone. Describe these as user-verified on a physical iPhone, not as automated or server-side verification.
- The owner's account holds seven genuine sessions: five retrospective entries with user-supplied approximate times (labeled retrospective, endedAt null) plus two live app sessions (a routine completion on November 3 and a bypass with a short reason on November 4). A dashboard screenshot of the real saved data was captured and reviewed.
- Mark those two Plan vs. Reality rows Done and update the remaining-risk sentence so it no longer lists physical device verification as outstanding.

Constraints: change only completion-status wording in README.md and PLAN.md. Keep the post-build disclosure note and all historical content byte-identical. No schema, code, or data changes; do not add or modify any session, tester, or event records; do not publish. Save this prompt in prompts/correct-completed-status.md on the same branch. Commit and push the branch; do not open a pull request. Summarize exactly which sentences changed.
