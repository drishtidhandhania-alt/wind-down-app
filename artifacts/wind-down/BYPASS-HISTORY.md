# Bypass history

For new `continue_to_instagram` choices, the pause page requires a short reason. The server trims and validates it, then atomically grants the existing ten-minute bypass, records the reason in the choice event, and creates a session owned by the linked tester user. The session records the choice time as both start and end, uses outcome `bypass`, keeps `minutesDelayed` null, and stores the trimmed reason as its note.

Compatibility: the request schema keeps `reason` optional so existing `start_wind_down` requests continue to work without a reason. The server now rejects a `continue_to_instagram` request with a missing or whitespace-only reason. Existing records are not backfilled or altered; only new valid bypass choices create history rows.

A token-only bypass also now requires the tester to be linked to a user account. An unlinked legacy tester receives a conflict response instead of receiving a bypass that cannot be assigned to an owner; link the token through Setup while signed in before using this flow.

Verification note: API tests and the desktop pause-page rendering were checked. This does not verify that the Personal Automation runs or that Instagram reopens from the iPhone; confirm both on a real iPhone. The existing manual Open Instagram fallback remains available.
