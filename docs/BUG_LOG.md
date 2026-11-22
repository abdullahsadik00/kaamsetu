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
| BUG-04 | 22 Nov 2026 | TP-13 | Owner | New enquiry or job form (T4.5/T4.6) | Minor | **Create job & assign** wraps to two lines and is left-aligned while **Save enquiry** is one centered line | Code | The two buttons sat side by side at half width, so the longer label wrapped, and Button did not centre its text. Now stacked full width (job on top); Button centres every label; job button says **Save job** until a team is picked, then **Create job & assign** | 4580e55 | fix/phone-test-bugs | Open |
| BUG-05 | 22 Nov 2026 | TP-13 | Owner | Jobs tab and Enquiries tab filter chips | Minor | **Today / Tomorrow / All open / Completed** (and the enquiry chips) look vertically stretched | Code | The chip row is a horizontal ScrollView that grew to fill the leftover screen height. It no longer grows; chips are 36 dp pills with a 48 dp touch area (Jobs, Enquiries, Bills) | c3dcfa7 | fix/phone-test-bugs | Open |
| BUG-06 | 22 Nov 2026 | TP-13 | Owner | New enquiry or job form saving | Minor | While saving, the tapped button's text turns into a loading state and the other button stays active; wanted both disabled and a clear "Creating job…" label | Code | Loading replaced the whole label with a spinner, disabled buttons kept their colours so the other one looked active, and a quick double tap could save twice. Now the label stays with a small spinner (**Creating job…**, **Saving job…**, **Saving enquiry…**), disabled buttons are greyed, and only one save runs at a time | feea41e | fix/phone-test-bugs | Open |
| BUG-07 | 22 Nov 2026 | TP-14 | Owner | Buttons across the app (job page first seen) | Minor | **Change team or time** wraps to two lines; in one group a button has a phone icon and the others none. Every screen should use one consistent primary/secondary button style; secondary buttons get a primary-colour (teal) border | Code | Button had seven looks, no fixed height and labels that could wrap. Now four: primary (solid teal), secondary (white with teal border), destructive, text; fixed 48/56 dp, centred one-line labels; buttons shown together all have icons or none do | f33a42f | fix/phone-test-bugs | Open |
| BUG-08 | 22 Nov 2026 | TP-15 | Owner | Owner job page, More | Minor | **More (⋮)** shows both an icon and the word More for one action | Code | The job page and the bill/quotation page drew the word More next to the ⋮ icon. Both now use one ⋮ icon button (read out as "More") | a2f4d24 | fix/phone-test-bugs | Open |
| BUG-09 | 22 Nov 2026 | TP-15 | Owner | Confirm dialogs and sheets (Cancel job first seen) | Minor | **Keep job** and **Cancel job** are only as wide as their text, leaving white space; two buttons should split the row 50/50 | Code | Dialog buttons were as wide as their text and pushed right. A shared two-button row now splits 50/50, used by all confirm dialogs and sheets and the paired buttons on enquiry, bill, billing, customer and field job pages | a88ad45 | fix/phone-test-bugs | Open |
| BUG-10 | 22 Nov 2026 | TP-15 | Owner | Cancelled job page, contact buttons | Minor | After cancelling, **WhatsApp** and **Customer** wrap onto two lines | Code | Call, WhatsApp and Customer shared one row (~33 dp per label at 360 dp). Now Call and WhatsApp 50/50 with Customer full width below; button side padding 16 → 12 dp | 276aba9 | fix/phone-test-bugs | Open |
| BUG-11 | 22 Nov 2026 | TP-30 | Owner | Enquiries › Closed list, status chip | Minor | The **Job made** chip wraps onto two lines | Code | The chip could shrink when a long text shared its row. Chips now never shrink and stay one line (every badge) | bbfb133 | fix/phone-test-bugs | Open |
| BUG-12 | 22 Nov 2026 | TP-30 | Owner | Converted enquiry page, Job chip | Minor | The **Job** chip is left-aligned and stretched with empty space after the text | Code | The chip shared a row with the long "saved at · via" line and got squeezed. It now sits on its own line at the top like the job page's status badge (cause inferred from the code) | 3f4f207 | fix/phone-test-bugs | Open |

## Summary

| | Count |
|---|---|
| Bugs found | 12 |
| Crash | 1 |
| Blocker | 0 |
| Major | 1 |
| Minor | 10 |
| Verified on a build | 0 |
