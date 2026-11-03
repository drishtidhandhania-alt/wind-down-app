---
name: Wind Down authentication boundary
description: How browser accounts and the iPhone Shortcut share Wind Down data without sharing authentication.
---

Keep iPhone Shortcut authorization distinct from browser account authorization. The private tester token authorizes Shortcut checks, pause choices, and routine completion. A signed-in account is required for settings and session reads, and tester settings must match the signed-in account.

**Why:** The Shortcut runs outside the browser cookie session, so cookie-only authorization would break Safari pause and routine actions after sign-out. Token-only settings or session reads would weaken account isolation.

**How to apply:** Keep `/wind-down/check` token-based. Scope browser tester tokens by account, and allow the last account's private token without a cookie only for pause/routine actions. Never return settings or sessions from a token-only request.
