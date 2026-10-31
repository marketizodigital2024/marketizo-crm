# Zeitausgleich balance accounting

The owner chose the saved daily attendance schedule and allowed negative balances after an explicit UI warning. Full time currently uses 510 minutes Monday–Thursday and 420 on Friday from 2026-10-30. Part-time minutes follow the saved monthly weekly-hours history. Weekends, Austrian holidays and dates outside employment do not consume hours.

Approval and one linked adjustment per working day commit in the same state API compare-and-swap write. Adjustments use server Vienna approval date and immutable planned-minute snapshots. Existing absence logic removes the attendance target, so the absence day does not deduct the hours a second time. Gross work logs, productivity counts and annual/gift leave remain untouched.

Deterministic `comp-time:` IDs prevent duplicate debits. Server reconciliation preserves canonical rows even when old serializers omit their metadata. Only an admin may approve or cancel. Cancellation sets `Otkazano`, removes its linked adjustments and appends void audit entries. Past cancelled dates regain their ordinary attendance obligations; missing work can therefore still affect the final balance.

Already approved legacy records with no linked adjustment are not silently backfilled. Overlapping approved absences, invalid schedules/dates and an opening-balance anchor at or after the charge month fail before writing, preventing a debit from disappearing behind an opening-balance override. Advancing that anchor later requires an explicit reconciliation rather than silently swallowing linked deductions.

No live test absence should be created or approved merely to verify this feature. Fixture/API tests exercise approval, retry, failure, cancellation, part-time/calendar logic and the actual admin/employee balance functions. Backups retain the ordinary state JSON, linked adjustments and audit together.
