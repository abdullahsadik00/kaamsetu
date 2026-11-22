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
| BUG-03 | 22 Nov 2026 | TP-12 | Owner | Bottom sheets, all screens (remove AC first seen) | Minor | When a sheet opens, the black overlay slides up from the bottom together with the sheet instead of fading; the motion is not smooth | Code | The sheet used the Modal's built-in `slide` animation, which moves the whole layer (overlay included) with a plain curve | 9e73bc6 | fix/phone-test-bugs | Fixed |
| BUG-04 | 22 Nov 2026 | TP-13 | Owner | New enquiry or job form (T4.5/T4.6) | Minor | **Create job & assign** wraps to two lines and is left-aligned while **Save enquiry** is one centered line | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-05 | 22 Nov 2026 | TP-13 | Owner | Jobs tab and Enquiries tab filter chips | Minor | **Today / Tomorrow / All open / Completed** (and the enquiry chips) look vertically stretched | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-06 | 22 Nov 2026 | TP-13 | Owner | New enquiry or job form saving | Minor | While saving, the tapped button's text turns into a loading state and the other button stays active; wanted both disabled and a clear "Creating job…" label | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-07 | 22 Nov 2026 | TP-14 | Owner | Buttons across the app (job page first seen) | Minor | **Change team or time** wraps to two lines; in one group a button has a phone icon and the others none. Every screen should use one consistent primary/secondary button style; secondary buttons get a primary-colour (teal) border | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-08 | 22 Nov 2026 | TP-15 | Owner | Owner job page, More | Minor | **More (⋮)** shows both an icon and the word More for one action | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-09 | 22 Nov 2026 | TP-15 | Owner | Confirm dialogs and sheets (Cancel job first seen) | Minor | **Keep job** and **Cancel job** are only as wide as their text, leaving white space; two buttons should split the row 50/50 | Code | Not yet known | — | fix/phone-test-bugs | Open |
| BUG-10 | 22 Nov 2026 | TP-15 | Owner | Cancelled job page, contact buttons | Minor | After cancelling, **WhatsApp** and **Customer** wrap onto two lines | Code | Not yet known | — | fix/phone-test-bugs | Open |

## Summary

| | Count |
|---|---|
| Bugs found | 10 |
| Crash | 1 |
| Blocker | 0 |
| Major | 1 |
| Minor | 8 |
| Verified on a build | 0 |
