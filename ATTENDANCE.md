# Radno vreme i izvoz

`/attendance` provides owner exports and entry for any employee; the employee portal links to `/attendance?portal=employee`, using the employee token and server-enforced self access. Operational administrators can access only their own records through this endpoint. Clients and anonymous sessions cannot access it.

No migrations or backfills are required. Viewing/exporting is read-only. Saving writes only `attendance-v1:<core state ID>:<employee ID>` rows in the existing service-only state table; preview uses a separate namespace. Existing work logs, absence records, hour balances and authentication records are never written. Existing full-system backup captures these additional state rows through its existing stateRows manifest. Each employee document uses revision compare-and-swap; concurrent changes return 409. Each day retains all previous versions and actor/time metadata; no delete endpoint is provided.

Recorded start/end and breaks are local Europe/Vienna times, including next-day shifts. Net minutes use actual UTC elapsed time minus breaks. Ambiguous/nonexistent clock-change times are rejected; overlapping breaks, shifts spanning more than 24 hours and overlaps with neighboring days are rejected. The form requires confirmation of actual times and all breaks. It does not create or modify activity minutes; there is no inferred historic schedule.

Hours exports distinguish gross presence, break minutes, net work, existing activity minutes excluding pause, and legacy activity pause minutes. Existing penalties and balance adjustments are not deducted. Missing records are explicitly labeled; absence days may have no time record. Legacy activity logs cannot prove start/end. Exports are filtered by selected employee and period (up to 367 days), limited to 1000 output rows; use smaller periods for larger teams.

Absence exports include original dates, statuses and working days intersecting the selected range. A separate vacation-balance sheet uses the CRM's existing entitlement semantics, initial usage and monthly overrides, as of min(range end, today). This is not a legal certification of historic balances or a new holiday entitlement policy. Underlying values are untouched. PDF embeds the existing Liberation Sans font; Excel is native OOXML with inline strings (formula-safe), numeric minute columns and frozen headers. No external export service receives employee data.

Tests: `node tests/attendance.cjs && node tests/attendance-api.cjs`; also registered in the normal fixture suite.
