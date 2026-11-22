# KaamSetu — Bug Log

Every bug found in phone testing (`PHONE_TEST_PLAN.md`), one row each, for counting and analysis. Fixes go on the branch **`fix/phone-test-bugs`**, one commit per bug, with the bug ID in the message (`fix(mobile): BUG-NN …`). The branch is built once at the end of a test pass, retested, then merged into `main`.

- `git log main..fix/phone-test-bugs --oneline` lists the fixes waiting for the confirmation build.
- **Severity:** Crash (app closes), Blocker (can't finish the task), Major (wrong result or a missing way to do it), Minor (looks or wording).
- **Area:** the screen or feature, matching the test plan.
- **Cause type:** Code (logic bug), Gap (step not designed or built), Server mismatch (app and server versions differ), Data, Device.
- **Status:** Open, Fixed (on the branch, waiting for the build), Verified (passed again on the build), Merged.

| ID | Found | Test | Role | Area | Severity | Symptom | Cause type | Cause | Fix commit | Branch | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-01 | 22 Nov 2026 | TP-09 | Owner | Teams › team page (T4.6) | Crash | After **Save team**, and on opening the team again, the app closed ("KaamSetu keeps stopping") | Server mismatch, Code | The **Swaps for the day** card read `borrowed.length` from a staging server that had not been updated yet and sent no swap lists | 45f4b7c | main (fixed before the branch existed) | Fixed |
| BUG-02 | 22 Nov 2026 | TP-11 | Owner | Customers list (T4.3) | Major | After **Archive customer** the customer was gone from the list and could not be opened to **Bring back customer** | Gap | The list only asked for active customers; nothing showed archived ones | def2268 | fix/phone-test-bugs | Fixed |

## Summary

| | Count |
|---|---|
| Bugs found | 2 |
| Crash | 1 |
| Blocker | 0 |
| Major | 1 |
| Minor | 0 |
| Verified on a build | 0 |
