# KaamSetu — Phone Test Plan

Every check to run on a real phone, grouped **by role**: first everything the **owner** does, then the **senior technician**, then the **helper**, then the owner checks what the teams sent. Sadik runs the tests; Claude records the results, fixes failures and adds steps when a new feature ships.

## How to use

1. Do the rounds **in order**: Round 1 Owner → Round 2 Senior technician → Round 3 Helper → Round 4 Owner checks. Stay logged in as one person for a whole round; you only switch accounts between rounds (and in the few steps marked **Switch**).
2. Inside a round, do the tests in order. Later tests reuse the team, customer and jobs made earlier.
3. After each test, reply with the ID and the result, for example:
   - `TP-06 pass`
   - `TP-13 fail: Save job did nothing` (a screenshot helps)
   - `TP-26 blocked: no second phone`
4. **Expected** lists what you should see. If anything differs, it is a fail, even a small one.
5. Claude updates the status table below. A failure gets a bug ID in `BUG_LOG.md` and its fix goes on the branch `fix/phone-test-bugs`. There is one new APK at the end of the pass, built from that branch; then the failed tests are run again.

## Setup

- **APK** (install over the old app; you stay logged in): https://expo.dev/artifacts/eas/vtqzn3ptkRuJJyEfU1uUti0iQzBOynIjDMJ0dg3WWTw.apk (build a8c190dc, 22 Nov 2026: includes enquiries, offline sync, billing, dashboard, updates feed and helper swap).
- **Server:** staging on Render's free plan. After 15 minutes with no use it sleeps, so the first screen can take about 50 seconds to load. That is not a fail. Staging must have the latest `main` (push first) for TP-30 and TP-33 to TP-40.
- **Google accounts:** four accounts that are test users on the Google consent screen: **owner**, **senior**, **helper** and one **spare** (for TP-08 and TP-40).
- **One phone:** switch between people with **More › Log out** (owner) or **Profile › Log out** (senior/helper).

### Test data

| What | Value |
|---|---|
| Senior | Test Senior, 9000003001, Senior technician |
| Helper | Test Helper, 9000003002, Helper |
| Extra | Test Extra, 9000003009, Helper (TP-08, TP-25) |
| Senior 2 | Test Senior 2, 9000003005, Senior technician (TP-40) |
| Teams | Team 1 (Test Senior leads, Test Helper); Team 2 (Test Senior 2) |
| Customer 1 | Rohan Kulkarni, 9000004001, Home; Flat 12, Shanti Apartments, Kothrud |
| Customer 2 | Shreeji Clinic, 9000004002, Business; Shop 3, FC Road, Shivajinagar |
| ACs | Rohan: Split, Voltas, 1.5 ton, Bedroom; Window, LG, 1 ton, Hall |

## Status

Statuses: **Passed**, **Pending** (built, run it), **Failed**, **Blocked**, **Not built yet**.

| ID | Round | Test | Feature | Status | Date | Notes |
|---|---|---|---|---|---|---|
| TP-01 | Owner | Owner signs in with Google | T3.11 | Passed | 21 Nov 2026 | Step 1 in chat |
| TP-02 | Owner | Set up a new business | T4.1 | Passed | 21 Nov 2026 | Step 2 in chat |
| TP-03 | Owner | Change language | T3.6 | Passed | 21 Nov 2026 | Step 3 in chat |
| TP-04 | Owner | Add employees | T4.1 | Passed | 21 Nov 2026 | Step 4 in chat |
| TP-05 | 1 Owner | Log out and pick another Google account | T3.11 | Passed | 22 Nov 2026 | First try picked a non-owner account and showed Join your business, as expected |
| TP-09 | 1 Owner | Make teams | T4.2 | Failed | 22 Nov 2026 | App closed after Save team and on opening the team: swap card read lists an older server doesn't send. BUG-01, fixed in 45f4b7c; run again on the final build |
| TP-10 | 1 Owner | Add a customer, duplicate warning, search | T4.3 | Passed | 22 Nov 2026 | |
| TP-11 | 1 Owner | Second address, edit, archive | T4.3 | Failed | 22 Nov 2026 | Steps 1–2 fine; after archiving, the customer could not be found again. BUG-02: added Show archived customers; recheck step 4 on the final build |
| TP-12 | 1 Owner | Add and remove ACs | T4.4 | Passed | 22 Nov 2026 | BUG-03: sheet overlay animation not smooth; recheck feel on the final build |
| TP-13 | 1 Owner | Owner creates a job | T4.6 | Passed | 22 Nov 2026 | Works; UI bugs BUG-04 to BUG-06 to recheck on the final build |
| TP-14 | 1 Owner | Give to a team, change team, change day | T4.6 | Passed | 22 Nov 2026 | Works; BUG-07 button consistency to recheck on the final build |
| TP-15 | 1 Owner | Cancel a job | T4.6 | Passed | 22 Nov 2026 | Works; BUG-08 to BUG-10 (More icon, dialog buttons, wrapping) to recheck on the final build |
| TP-30 | 1 Owner | Enquiries | T4.5 | Passed | 22 Nov 2026 | Works; BUG-11, BUG-12 (chip layout) to recheck on the final build |
| TP-41 | 1 Owner | Prepare jobs for the field rounds | — | Passed | 22 Nov 2026 | Jobs B–O made; BUG-13, BUG-14 found |
| TP-06 | 2 Senior | Senior joins with the invite code | T3.11 | Passed | 22 Nov 2026 | |
| TP-16 | 2 Senior | Senior sees the job; Call and Directions | T4.7 | Failed | 22 Nov 2026 | BUG-15: tapping a job on My Work does not open it; blocks Round 2 |
| TP-17 | 2 Senior | Start work | T4.7 | Pending | | |
| TP-18 | 2 Senior | Put on hold (customer side and our side) | T4.7 | Pending | | |
| TP-19 | 2 Senior | Finish page | T4.8 | Pending | | |
| TP-39a | 2 Senior | Send appointment, part needed, note | T4.7 (D-037) | Pending | | Owner checks in TP-39b |
| TP-20 | 2 Senior | Finish a job with no internet | T3.8, T4.7 | Pending | | |
| TP-24 | 2 Senior | App closed while offline still sends later | T3.8 | Pending | | |
| TP-22a | 2 Senior | "Need to come again" | T4.8 | Pending | | Owner part in TP-22b |
| TP-36a | 2 Senior | Holds and a follow-up for the dashboard | T4.12 | Pending | | Owner part in TP-36b |
| TP-33 | 2 Senior | Three days offline | T4.9 | Pending | | One owner step; photos later |
| TP-07 | 3 Helper | Helper joins with the invite code | T3.11 | Passed | 22 Nov 2026 | BUG-16: Service and Repair share an icon |
| TP-23 | 3 Helper | Helper's Today's work | T4.7 (D-022) | Failed | 22 Nov 2026 | BUG-17 no address, BUG-18 no Directions, BUG-19 no senior. Helpers have no job page by design (step fixed) |
| TP-40 | 3 Helper | Lent to another team for a day | T4.6 (D-038) | Pending | | Owner lends, helper checks |
| TP-08 | 3 Helper | Wrong mobile number on Join | T3.13 | Pending | | Uses the spare account |
| TP-21 | 4 Owner | Owner sees the work report and money | T4.8 | Pending | | |
| TP-22b | 4 Owner | New visit for the same work | T4.6 | Pending | | |
| TP-42 | 4 Owner | Customer's past jobs and AC history | T4.4 | Pending | | Needs the new APK and backend |
| TP-39b | 4 Owner | Updates from teams, bell, job feed | T4.7 (D-037) | Pending | | |
| TP-36b | 4 Owner | Home dashboard | T4.12 | Pending | | |
| TP-34 | 4 Owner | Quotations and bills | T4.10 | Pending | | GST rates wait for Q-04 |
| TP-35 | 4 Owner | Payments | T4.11 | Pending | | |
| TP-25 | 4 Owner | Reset login and remove an employee | T4.1 | Pending | | Run last: removes people |
| TP-26 | Two phones | Join by scanning the QR | T3.12 | Blocked | | Needs a second phone |
| TP-31 | Later | Paste a service-centre ticket | T4.5a | Not built yet | | Needs ticket samples |
| TP-32 | Later | Job photos | T4.8 | Not built yet | | Needs a storage bucket (D-026) |
| TP-37 | Later | Hindi and Marathi wording review | T3.14 | Pending | | Needs a Hindi and a Marathi speaker |
| TP-38 | Later | Usability test with real users | T5.6 | Not built yet | | After Round 4 |

---

## Done

TP-01 to TP-04 passed in chat on 21 Nov 2026: owner Google sign-in, **Set up a new business** with the 30-day trial, language change, and adding **Test Senior** and **Test Helper** in **More › Employees**.

## Round 1 — Owner

Log in as the **owner** and stay logged in for the whole round.

### TP-05 Log out and pick another Google account
1. **More** › **Log out**. In the **Log out?** box, tap **Log out**.
2. Tap **Continue with Google**.

**Expected**
- The login page has a teal block at the top and the **Continue with Google** button.
- Google shows the **account picker**. It does not sign you straight back in as the owner.

Pick the owner account again.

### TP-09 Make teams
1. **More › Employees** › add **Test Extra** (9000003009, Helper) and **Test Senior 2** (9000003005, Senior technician). You need them in TP-08, TP-25 and TP-40.
2. **More › Teams** › **Add team**. Keep the name **Team 1**, choose **Test Senior** as **Senior technician** and tick **Test Helper** under **Helpers (optional)**. Tap **Save team**.
3. **Add team** again: **Team 2**, **Test Senior 2** as senior, no helpers. **Save team**.

**Expected**
- Team 1 shows Test Senior with "leads the team" and Test Helper under Members. **Team in use** is on.
- Team 2 shows Test Senior 2. On both team pages **Swaps for the day** says "Everyone works with their own team."

### TP-10 Add a customer, duplicate warning, search
1. **Customers** › **Add customer**, using Customer 1 from the test data. Fill in the address, then tap **Save customer**.
2. **Add customer** again with the **same mobile number** 9000004001.
3. Go back to **Customers** and type **4001** in the search box.
4. Add Customer 2 (Shreeji Clinic, **Business**) too.

**Expected**
- After step 1, the customer page opens with the address marked **main**.
- In step 2, as soon as you type the number, you see "This number is already saved for Rohan Kulkarni." with **Open Rohan Kulkarni** and **Add as a new customer anyway**. Tap **Open Rohan Kulkarni**.
- In step 3, Rohan appears in under 5 seconds.

### TP-11 Second address, edit, archive
1. On Rohan's page: **Add another address**, type **Office**, any address, then **Save address**.
2. **Edit customer**: change the name to **Rohan K**, then **Save changes**. Change it back afterwards.
3. Open **Shreeji Clinic** › **Archive customer**. Go back to **Customers**.
4. At the bottom of the list tap **Show archived customers**, open **Shreeji Clinic** › **Bring back customer**, then **Back to all customers**.

**Expected**
- Rohan shows two addresses; the first is still **main**.
- The name change shows on the page and in the customer list.
- After step 3, Shreeji Clinic is no longer in the normal list.
- In step 4, **Archived customers** lists Shreeji Clinic marked **Archived**. After you bring it back, it is in the normal list again.

### TP-12 Add and remove ACs
1. On Rohan's main address: **Add AC here**. Choose **Split**, **Voltas**, **1.5** ton, room **Bedroom**, then **Save AC**.
2. Add a second AC: **Window**, **LG**, **1** ton, **Hall**.
3. Add a third AC with any details, then **Remove** it and confirm.

**Expected**
- The address shows "2 ACs" with brand, capacity and room.
- **More details (model, serial, gas)** stays closed unless you open it.
- The removed AC is gone and won't be offered for new jobs.

### TP-13 Owner creates a job
1. **Jobs** › **New** (+).
2. Customer: **Rohan Kulkarni**. ACs: tick both. Service: **Service**. Problem: tap **Not cooling**.
3. When: **Today**, **Morning**. Team: **leave empty**. Collect from customer: **1500**.
4. Tap **Save job**.

**Expected**
- A job page opens with a number (Job #…), status **New**, "No team yet" and **To collect on site** ₹1,500.
- **Home** shows "1 job needs a team" with an **Assign** button.
- **Jobs › Today** lists the job.

### TP-14 Give to a team, change team, change day
1. On the job: **Assign team**, choose **Team 1** and confirm.
2. **Change team or time**: move it to **Tomorrow**, **Afternoon**, save, then back to **Today**, **Morning**.

**Expected**
- Status becomes **Assigned**, showing the team name, Test Senior and "Helper: Test Helper".
- The "needs a team" card is gone from Home.
- The day and time changes show on the job page and in the Jobs list.

This is **job A** (Rohan, Team 1, today, ₹1,500), used in Round 2.

### TP-15 Cancel a job
1. Create a job for **Shreeji Clinic** (Repair, Today, Afternoon, Team 1).
2. On that job: **More** (⋮) › **Cancel job**. Give a reason, then confirm in **Cancel job #…?**.

**Expected**
- Status is **Cancelled** with the reason. The job stays in history and drops out of **Jobs › All open**.
- Later, the senior does **not** see this job (checked in TP-16).

### TP-30 Enquiries (T4.5)
1. **Jobs** › **New** (+). The page is called **New enquiry or job**.
2. Choose **Rohan Kulkarni**, tick the **Hall** AC, Service **Repair**, Problem "Hall AC makes noise at night", When **Tomorrow**, **Evening**, Came from **WhatsApp**.
3. Tap **Save enquiry**.
4. Go to **Home**, then tap the "1 open enquiry" card.
5. Open the enquiry. Tap **Convert to job**, choose team **Team 1**, then **Create job & assign**.
6. Make a second enquiry (any customer, Came from **Call**) and on its page tap **Close enquiry**, try to close with an empty reason, then type "Customer found someone else".
7. **Jobs** › **Enquiries** › **Closed**.
8. Make two more enquiries and **leave them open**: one from **WhatsApp**, one from **Call** (TP-36b counts them).

**Expected**
- After step 3 the enquiry page opens: "Enquiry E-…", "via WhatsApp", what they asked, Service Repair, ACs Hall, When Tomorrow, Evening.
- Home shows "1 open enquiry" with "Newest: Rohan Kulkarni"; the card opens **Jobs** on **Enquiries · 1**.
- In step 5 the form is already filled (Hall AC, Repair, the problem, tomorrow evening) and has only **Create job & assign**. The job opens as **Assigned** to Team 1 with "From enquiry E-…".
- In step 6 the close button stays disabled until a reason is typed.
- **Closed** lists both: the first as "Job made" (its page has **Open job #…**) and the second as "Closed" with the reason.

### TP-41 Prepare jobs for the field rounds
Not a feature test: it makes the jobs Rounds 2 and 3 need. Make each with **Jobs** › **New** (+) › **Create job & assign**. Write down the job numbers.

| Job | Customer | Type | Team | Day | Collect | Used in |
|---|---|---|---|---|---|---|
| B | Rohan | Service | Team 1 | Today | ₹800 | TP-20 |
| C | Shreeji Clinic | Repair | Team 1 | Today | — | TP-22a |
| D | Rohan | Service | Team 1 | Today | — | TP-24, TP-23 |
| E, F, G | Rohan, Shreeji, Rohan | Any | Team 1 | Today | G: ₹1,000 | TP-36a |
| H | Rohan | Service | **no team, no day** | — | — | TP-36b |
| I | Shreeji Clinic | Service | Team 1 | Today | — | TP-39a |
| J | Shreeji Clinic | Service | **Team 2** | Today | — | TP-40 |
| K–O | 5 jobs for TP-33 | Any | Team 1 | 2 today, 2 tomorrow, 1 day after | ₹800 on one today job | TP-33 |

**Expected**
- Each job opens as **Assigned** (H as **New**). **Jobs › Today** lists the Today ones.
- Home shows "1 job needs a team" (job H).

Note the invite codes now: **More › Employees** › **Test Senior** / **Test Helper** / **Test Extra** › **Show invite QR** shows the 6-digit code under "Or they type their mobile number and this code".

## Round 2 — Senior technician

### TP-06 Senior joins with the invite code
1. **Log out**, tap **Continue with Google** and pick the **senior** account.
2. On **Join your business**, tap **Enter code instead**.
3. Enter **9000003001** and Test Senior's code, then tap **Join**.

**Expected**
- The senior lands on **My Work** in the new design.
- **Profile** shows the role **Senior technician** and the business name.
- (Checked in Round 4: the owner's **Employees** shows Test Senior as **Joined**.)

### TP-16 Senior sees the job; Call and Directions
1. Open **My Work** and tap job A (Rohan).
2. Tap **Call**, then come back. Tap **Directions**, then come back.

**Expected**
- My Work shows Rohan's job with "2 AC", the address and **Collect from customer** ₹1,500 ("Set by owner").
- The cancelled Shreeji Clinic job from TP-15 is **not** shown. Job J (Team 2) is not shown.
- **Call** opens the phone dialer with 9000004001. **Directions** opens Google Maps at the address.

### TP-17 Start work
1. On job A: **Update status** › **Started work**.

**Expected**
- The job shows **In progress**, and **My Work** has a **Working now** card with **Continue · Finish work**.
- A small sync label goes **Saved on phone** → **Sending…** → **Sent**.

### TP-18 Put on hold (customer side and our side)
1. **Update status** › **Customer not ready** › pick **Customer asked to come later** and save.
2. Start it again (**Start again**).
3. **Update status** › **Can't continue** › pick **Tool or gas missing** and save.
4. **Start again**.

**Expected**
- After 1 and 3, the job shows **On hold** with the reason.
- After 2 and 4, it's back to **In progress**.
- Each change reaches **Sent**.

### TP-19 Finish page
1. On job A: **Continue · Finish work**.
2. **Work done on each AC**: Bedroom split **Cleaned**, Hall window **Gas filled**.
3. **Parts used**: **Add part**, then **Other part**, typing **Capacitor**, qty **1**.
4. **Note for owner**: "Hall AC gas was low".
5. **Money from customer**: **1500**, **Cash**.
6. **Result**: first tap **Couldn't do it** and try to save with an empty note.
7. Change the result to **Work done**, then **Save and finish**.

**Expected**
- Steps are numbered in this order: work, parts, note, money, result.
- In step 6 you see "Please write why the work couldn't be done." and nothing is saved.
- After saving, a confirmation reads "Saved on this phone. It is safe." with **Back to My Work**, and the money received is shown.
- The job leaves My Work, shows in **History**, and the "Work completed today" count goes up.

### TP-39a Send appointment, part needed and note (T4.7)
1. Open job I › **Update status** › under **Other**, **Appointment fixed** › **Tomorrow**, **Afternoon** › **Save**.
2. **Update status** › **Part needed** › **Capacitor**, tap **+** once (2), **No, work stopped**, note "Customer has no stabiliser" › **Ask owner to arrange a part**.
3. **Update status** › **Note for owner** › tap **Need ladder** › **Save**.
4. Turn on **Airplane mode**, add one more **Note for owner** ("Running late, 30 min"), then turn Airplane mode **off** and wait up to a minute.

**Expected**
- Each saves at once; the job page lists them under **Your updates**, each with **Saved on phone** → **Sent** (the offline one sends when the internet is back).
- The job status does not change. After step 1 the job shows tomorrow, afternoon (it moves to **Coming up** on My Work).
- The senior sees no bell and no "Updates from teams" screen.

### TP-20 Finish a job with no internet
1. Wait until job B shows in **My Work** (pull down once).
2. Turn on **Airplane mode**.
3. Start job B, then finish it (Cleaned, no parts, ₹800 **UPI**, **Work done**).
4. While still offline, check that the job is in **History**.
5. Turn Airplane mode **off** and wait up to a minute.

**Expected**
- While offline: the banner "No internet. Keep working. All saved on phone." appears, the job still opens, and everything saves with **Saved on phone**.
- After going back online: **Sending…** then **Sent**, with no **Needs attention**.
- (Checked in Round 4: the owner sees job B **Completed** once, one report, no duplicate money.)

### TP-24 App closed while offline still sends later
1. With internet, open job D.
2. Turn on **Airplane mode**, then **Update status** › **Started work**.
3. Swipe the app away from recent apps (force close).
4. Turn Airplane mode **off** and open the app again.

**Expected**
- The start is not lost: within a minute it shows **Sent**.

### TP-22a "Need to come again"
1. Job C (Shreeji Clinic): **Start work**, then **Finish work** with result **Need to come again** and the note "Compressor to be replaced". **Save and finish**.

**Expected**
- The confirmation shows "Need to come again"; the job leaves My Work.

### TP-36a Holds and a follow-up for the dashboard
1. Job E: **Update status** › **Can't continue** › **Tool or gas missing** › **Save**.
2. Job F: **Update status** › **Customer not ready** › **Customer not at home** › **Save**.
3. Job G: **Start work**, then finish with **Need to come again**, a note, and ₹1,000 **Cash** in **Money from customer**.

**Expected**
- Each change reaches **Sent**. E and F show **On hold** with the reason; G leaves My Work.

### TP-33 Three days offline (T4.9) — without photos for now
Uses jobs K–O.
1. Wait until all 5 show in **My Work** (Today and **Coming up**), then pull down once.
2. Turn on **Airplane mode**, force close the app and open it again.
3. Offline: first Today job › **Start work**, then **Finish work**: Cleaned, no parts, ₹800 **Cash**, **Work done**, **Save and finish**, **Back to My Work**.
4. Offline: second Today job › **Update status** › **Customer not ready** › **Customer not at home** › **Save**.
5. Offline: one Tomorrow job › **Start work**.
6. **Owner step, needs a second phone** signed in as the owner: open the other Tomorrow job and **Cancel job** with reason "Customer cancelled". Without a second phone, skip steps 6, 7 and 10 and say so in your reply.
7. Senior, still offline: open that cancelled job › **Start work**, then **Finish work** › **Work done** › **Save and finish**.
8. Force close the app, turn Airplane mode **off**, open the app.
9. Pull down on **My Work**.
10. Open the cancelled job and tap **OK, got it**.
11. **Profile** › **Log out**, then log in again as the senior.

**Expected**
- Step 1: all 5 jobs listed (first time may show "Getting your jobs…").
- Step 2: banner "No internet. Keep working. All saved on phone."; all 5 jobs still there with customer, address, ACs and ₹800.
- Steps 3–7: each change saves at once and the card shows **Saved on phone**; "Work completed today" goes up by 1.
- Step 8: nothing lost; within a minute cards go **Sending…** then **Sent**.
- The cancelled job shows **Needs attention**; its page says "Needs attention · Please call the owner" and "The owner cancelled this job. What you saved is kept for the owner.", with no **Start work** or **Finish work**.
- Step 10: back on **My Work**, the cancelled job is gone.
- Step 11: jobs download fresh and nothing old is left.
- (Checked in Round 4: TP-39b shows "Couldn't apply: job was cancelled" for the refused work.)

## Round 3 — Helper

### TP-07 Helper joins with the invite code
1. **Profile** › **Log out**, **Continue with Google**, pick the **helper** account.
2. **Enter code instead**: **9000003002** and Test Helper's code › **Join**.

**Expected**
- The helper lands on **Today's work**, which has only two tabs: Today's work and Account.
- The helper sees no Customers, Billing or Jobs tabs, and no bell.

### TP-23 Helper's Today's work
1. Look at **Today's work** (helpers have no job page; everything is on the card).

**Expected**
- **Today's work** shows Team 1's jobs for today: customer name, phone, address, job type and Test Senior as the senior. Job J (Team 2) is not there.
- The text reads "Your senior fills in the job report. You don't need to fill anything."
- There is no **Finish work**, no money and no bill.
- **Call** and **Directions** work.

### TP-40 Lent to another team for a day (T4.6)
1. **Switch** to the owner: **More › Teams** › **Team 2** › **Swaps for the day** › **Lend a helper for a day** › **Test Helper** › **Today** › **Lend for the day**.
2. Still owner: **Lend a helper for a day** again with **Test Helper**, **Today**.
3. Owner: open **Team 1** and look at **Swaps for the day** for **Today**.
4. **Switch** to the helper: pull down on **Today's work**.
5. **Switch** to the owner: Team 2 › tap Test Helper › **Undo** › confirm. Then lend Test Helper to Team 2 for **Tomorrow**.
6. **Switch** to the helper: pull down on **Today's work**.

**Expected**
- Step 1: Team 2 shows Test Helper "lent from Team 1"; Team 1's members list is unchanged.
- Step 2: "This helper already works with another team that day. Undo that first." or "This helper is already in that team."; nothing changes.
- Step 3: Team 1 shows Test Helper "with Team 2 for the day".
- Step 4: Today's work shows **job J** (Team 2) and **not** Team 1's jobs.
- Step 5: after **Undo this swap?** › **Undo**, Team 2 for Today says "Everyone works with their own team." again; Tomorrow shows the new swap.
- Step 6: Today's work shows Team 1's jobs again (the swap is only for tomorrow).

### TP-08 Wrong mobile number on Join
1. Log out and sign in with the **spare** Google account (not in a business yet).
2. **Enter code instead**: type a wrong number (**9000003999**) and Test Extra's code, then tap **Join**.
3. Now type the right number **9000003009** with the same code and **Join**.

**Expected**
- Step 2: "There is no invite for this mobile number. Check the number, or ask the owner for a new code."
- Step 3: it joins and lands on **Today's work** (Test Extra is a helper). You need Test Extra in TP-25.

## Round 4 — Owner checks

Log out and log in as the **owner** for the rest.

### TP-21 Owner sees the work report and money
1. **Employees**: check Test Senior, Test Helper and Test Extra show as **Joined** (TP-06, TP-07, TP-08).
2. Open job A (from TP-19), then job B (from TP-20), then job D (TP-24).

**Expected**
- Job A: status **Completed**. **Work report** lists Cleaned / Gas filled per AC, the **Parts** Capacitor ×1, the note and **Work done**. **Money taken** shows ₹1,500 Cash "with the team".
- Job B: **Completed** **once**, one report, ₹800 UPI once, no error.
- Job D: **In progress**.

### TP-22b New visit for the same work
1. Open job C (Shreeji Clinic), then **New visit for the same work**.

**Expected**
- The owner sees the outcome **Need to come again** with the note "Compressor to be replaced".
- **New visit for the same work** creates a new job with the same customer, address and ACs, linked to the first job.

### TP-39b Updates from teams, bell and job feed (T4.7)
1. Open **Home** and pull down.
2. Tap the **bell**, then the **Delays & parts** tab, then back to **All updates**. Scroll to the bottom; tap **Show older** if it is there.
3. Tap the "Part needed" row (job I).
4. Back on **Home**, pull down again.

**Expected**
- Step 1: the bell shows a red count. **Needs your action** has "Part needed: 2 × Capacitor · Customer has no stabiliser" first. **Latest from teams** shows the newest rows with customer, job number, Test Senior and time.
- Step 2: **Updates from teams** lists, newest first and new rows tinted: "Appointment fixed: Tomorrow, Afternoon", "Part needed: 2 Capacitor · work stopped", "Note: Need ladder", "Note: Running late, 30 min", plus the starts, holds and finishes from Round 2, and (if you did TP-33 steps 6–7) "Couldn't apply: job was cancelled" with "What was saved: Work completed · …". **Delays & parts** shows only parts, holds and refused work. The footer reads "Teams send these from their phone. You don't need to call them."
- Step 3: job I opens; its **Updates from team** card lists the same updates for that job, and the job shows tomorrow, afternoon.
- Step 4: the bell count is gone.

### TP-36b Home dashboard (T4.12)
1. Open **Home** and pull down.
2. Tap each card and come back: the enquiries card, the "jobs need a team" card and **Assign**, each row in **Needs your action**, **See all** on Today, a row in **Latest from teams**, and **Money to collect**.
3. Open job G, make the follow-up job (**New visit for the same work**), then go back to **Home**.
4. Turn on airplane mode and pull down on **Home**. Turn it off again.

**Expected**
- The enquiries card reads "2 open enquiries" with "1 WhatsApp, 1 call · not jobs yet" (numbers follow your data) and opens **Jobs** on **Enquiries**.
- The blue card reads "1 job needs a team" with "Next: Rohan Kulkarni…" (job H); the card opens **Jobs** on **Open**, **Assign** opens that job.
- **Needs your action · N** lists "Part needed: …" (job I) first, then "Can't continue: Tool or gas missing" (E), "Customer not ready: Customer not at home" (F), "Needs another visit: <note>" (G, and C until TP-22b made its visit), then "Appointment not fixed yet" (H). Each row opens its job.
- **Today** shows counts per status that match **Jobs** › **Today**.
- "Finished jobs ready to bill" appears; **Money to collect** shows the cash with teams to hand over (₹1,500 + ₹1,000 + TP-33's ₹800).
- After step 3, job G's "Needs another visit" row is gone.
- In step 4 the error card shows **Try again**.
- Staff phones never show this screen (seen in Rounds 2–3).

### TP-34 Quotations and bills (T4.10)
1. **Customers** › **Rohan Kulkarni**; under "To collect from this customer" tap **New quotation**.
2. **Add item**: "AMC visit, split AC", Qty **3**, Rate **2100**, **Save item**. **Discount** › **₹100** › **Apply discount**. **Save quotation**.
3. On **Quotation Q-001** tap **Send quotation** and pick WhatsApp.
4. Back in the app tap **Turn into bill**.
5. Open job A (Jobs › Done) › **Make bill**. Tap a part line, set its **Rate**, **Save item**, then **Save draft**.
6. **Edit draft**, change a rate, **Save changes**, then **Save bill**.
7. **Send bill**, pick WhatsApp, send to your own number. Time steps 5–7.
8. Open job A again and tap **Make bill**.
9. If the business makes GST bills: **Billing** › **New bill**, a GST customer, turn on **GST bill**, add "Deep cleaning, cassette AC", Qty **2**, Rate **1800**, GST **18%**, **Save draft**, **Save bill**.
10. On any saved bill: **More** › **Cancel bill**; try an empty reason, then "Wrong customer" › **Cancel bill**.

**Expected**
- Step 2: total ₹6,200 (₹6,300 − ₹100) and "Number given when saved".
- Step 3: PDF says QUOTATION, Q-001 and "This is a price quotation, not a bill."; in **Billing** › **Quotations** it shows **Sent**.
- Step 4: a draft bill opens with the same lines and discount; the quotation shows **Made into bill**.
- Step 5: "Filled from the work report…" with the service line and parts, and the ₹1,500 cash taken on site.
- Step 6: change kept; after **Save bill** it shows **Not paid** (or **Partly paid**) and can no longer be edited.
- Step 7: PDF has business name, KS number, customer, lines and balance; all in under 2 minutes.
- Step 8: "This job already has a bill." with **Open bill**.
- Step 9: CGST 9% ₹324 and SGST 9% ₹324, Bill total ₹4,248, GSTIN shown (rates provisional until Q-04).
- Step 10: button disabled until a reason is typed; bill shows **Cancelled** with the reason and leaves **To collect**.

### TP-35 Payments (T4.11)
1. **Billing**, note **To collect**, open a **Not paid** bill (e.g. the ₹6,100 one from TP-34 step 4).
2. **Record payment** › **₹3,050** (half) › **Cash** › **Today** › **Save payment · ₹3,050 Cash** — tap it twice quickly.
3. **Record payment** again, keep the full amount, **UPI**, save.
4. On another bill, **Record payment**, type **99999**, **Bank**, save; close without **Save anyway**.
5. On the first bill, **Remove payment** under the UPI payment, reason "Entered twice".
6. **Billing** › **Cash with teams**: job A's ₹1,500 › **Got it**.
7. Job G's ₹1,000: **Not received**, reason "Santosh still has it".
8. Open the first bill's customer.

**Expected**
- Step 2: exactly one cash payment; **Partly paid**, Remaining ₹3,050; To collect drops by ₹3,050.
- Step 3: **Paid**, Remaining ₹0; bill moves to **Paid**.
- Step 4: "This is more than what is left (₹…)" with **Save anyway**; nothing saved.
- Step 5: UPI line struck through with "Removed: Entered twice"; back to **Partly paid**.
- Step 6: entry leaves **Cash with teams**; job A's bill gets a Cash payment from the team.
- Step 7: entry leaves the list and is not added to any bill.
- Step 8: "To collect from this customer" ₹3,050, "Billed ₹6,100 · Received ₹3,050".

### TP-42 Customer's past jobs and AC history (T4.4)
1. **Customers** › **Rohan Kulkarni**. Scroll to **Past jobs**.
2. Under the Home address, tap the **Bedroom** AC (Split, Voltas, 1.5 ton).
3. Tap any job row.
4. Go back twice and tap the **Hall** AC.

**Expected**
- Step 1: **Past jobs** lists Rohan's jobs, newest day first. Each row shows the day, job type, status, job number, team and, for finished jobs, the outcome (e.g. "Work done"), parts used and the senior's note.
- Step 2: the AC page shows Bedroom, Split · Voltas · 1.5 ton, and **AC history** lists only the jobs that included this AC, with the work done on it (e.g. "Cleaned, Gas filled").
- Step 3: the job page opens.
- Step 4: an AC that was never on a job says "This AC has not been in a job yet."

### TP-25 Reset login and remove an employee (run last)
1. **More › Employees** › **Test Helper** › **Reset login** and confirm.
2. **Switch**: log in as the helper.
3. **Switch** to the owner: **Test Helper** › **Show invite QR** (or **Make a new code**). The helper joins again as in TP-07.
4. Owner: **Test Extra** › **Remove from business** and confirm.
5. Log in with the spare Google account (Test Extra).

**Expected**
- After step 1, a message reads "Login reset. Show a new invite QR to join again."
- In step 2, the helper is sent back to **Join your business**.
- After step 3, the helper is back on **Today's work**.
- After step 4, Test Extra moves under **Removed**. In step 5 they can't get into the business (they see **Join your business** or a "not active" message).

## Two phones

### TP-26 Join by scanning the QR (T3.12)
1. Phone A (owner): **More › Employees** › someone not joined › **Show invite QR**.
2. Phone B: sign in with Google, then **Scan QR code**, allow the camera and point it at phone A.
3. On phone B, scan any other QR (a product or a website).

**Expected**
- Phone B lands on that person's home (My Work or Today's work).
- The other QR shows "This is not a KaamSetu invite code."

Optional with two phones (TP-33): a job given to Team 1 while the senior is offline appears once back online; a job moved to **Team 2** disappears (or shows **Needs attention** "This job was given to another team…" if work was saved on it).

## Later — not built yet, or needs other people

Claude writes the full steps when each feature ships and changes its status to **Pending**. What each test will check:

- **TP-31 Service-centre ticket paste (T4.5a):** paste a brand ticket message and get name, phone, address, pincode, job type, ticket number and charges filled in; a duplicate ticket shows a warning; unknown text falls back to manual entry without losing what was pasted.
- **TP-32 Job photos (T4.8):** add photos on the finish page; they upload, also later when you're back online; the owner sees them on the job.
- **TP-37 Hindi and Marathi review (T3.14):** a Hindi speaker and a Marathi speaker go through the login, owner, join, employee and field screens in their language and note wrong or odd wording. This can run now.
- **TP-38 Usability test (T5.6):** the real owner and a real technician use the built app for a normal day with no help (kit: `discovery/USABILITY_TEST_KIT.md`).
