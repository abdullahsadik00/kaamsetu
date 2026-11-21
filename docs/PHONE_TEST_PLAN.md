# KaamSetu — Phone Test Plan

Every check to run on a real phone: what is built and waiting for a test, and what comes later. Sadik runs the tests; Claude records the results, fixes failures and adds steps when a new feature ships.

## How to use

1. Do the tests **in order**. Later tests reuse the team, customer and job made earlier.
2. After each test, reply with the ID and the result, for example:
   - `TP-06 pass`
   - `TP-13 fail: Save job did nothing` (a screenshot helps)
   - `TP-26 blocked: no second phone`
3. **Expected** lists what you should see. If anything differs, it is a fail, even a small one.
4. Claude updates the status table below. If a test fails, Claude fixes it, sends a new APK if needed, and asks you to run that test again.

## Setup

- **APK** (install over the old app; you stay logged in): https://expo.dev/artifacts/eas/GZv8P4b9YxcHdOgQTe_-h0lwwg89d-niWexoMkA-1n0.apk
- **Server:** staging on Render's free plan. After 15 minutes with no use it sleeps, so the first screen can take about 50 seconds to load. That is not a fail.
- **Google accounts:** three accounts that are test users on the Google consent screen: **owner**, **senior** and **helper**.
- **One phone:** switch between people with **More › Log out** (owner) or **Profile › Log out** (senior/helper).

### Test data

| What | Value |
|---|---|
| Senior | Test Senior, 9000003001, Senior technician |
| Helper | Test Helper, 9000003002, Helper |
| Team | Team 1 (Test Senior leads, Test Helper) |
| Customer 1 | Rohan Kulkarni, 9000004001, Home; Flat 12, Shanti Apartments, Kothrud |
| Customer 2 | Shreeji Clinic, 9000004002, Business; Shop 3, FC Road, Shivajinagar |
| ACs | Rohan: Split, Voltas, 1.5 ton, Bedroom; Window, LG, 1 ton, Hall |

## Status

Statuses: **Passed**, **Pending** (built, run it), **Failed**, **Blocked**, **Not built yet**.

| ID | Test | Feature | Status | Date | Notes |
|---|---|---|---|---|---|
| TP-01 | Owner signs in with Google | T3.11 | Passed | 21 Nov 2026 | Step 1 in chat |
| TP-02 | Set up a new business | T4.1 | Passed | 21 Nov 2026 | Step 2 in chat |
| TP-03 | Change language | T3.6 | Passed | 21 Nov 2026 | Step 3 in chat |
| TP-04 | Add employees | T4.1 | Passed | 21 Nov 2026 | Step 4 in chat |
| TP-05 | Log out and pick another Google account | T3.11 | Pending | | New APK (logout fix) |
| TP-06 | Senior joins with the invite code | T3.11 | Pending | | |
| TP-07 | Helper joins with the invite code | T3.11 | Pending | | |
| TP-08 | Wrong mobile number on Join | T3.13 | Pending | | |
| TP-09 | Make a team | T4.2 | Pending | | |
| TP-10 | Add a customer, duplicate warning, search | T4.3 | Pending | | |
| TP-11 | Second address, edit, archive | T4.3 | Pending | | |
| TP-12 | Add and remove ACs | T4.4 | Pending | | |
| TP-13 | Owner creates a job | T4.6 | Pending | | |
| TP-14 | Give to a team, change team, change day | T4.6 | Pending | | |
| TP-15 | Cancel a job | T4.6 | Pending | | |
| TP-16 | Senior sees the job; Call and Directions | T4.7 | Pending | | |
| TP-17 | Start work | T4.7 | Pending | | |
| TP-18 | Put on hold (customer side and our side) | T4.7 | Pending | | |
| TP-19 | Finish page | T4.8 | Pending | | |
| TP-20 | Finish a job with no internet | T3.8, T4.7 | Pending | | |
| TP-21 | Owner sees the work report and money | T4.8 | Pending | | |
| TP-22 | "Need to come again" and a new visit | T4.6, T4.8 | Pending | | |
| TP-23 | Helper's Today's work | T4.7 (D-022) | Pending | | |
| TP-24 | App closed while offline still sends later | T3.8 | Pending | | |
| TP-25 | Reset login and remove an employee | T4.1 | Pending | | Run last: removes people |
| TP-26 | Join by scanning the QR | T3.12 | Blocked | | Needs a second phone |
| TP-30 | Enquiries | T4.5 | Not built yet | | |
| TP-31 | Paste a service-centre ticket | T4.5a | Not built yet | | Needs ticket samples |
| TP-32 | Job photos | T4.8 | Not built yet | | Needs a storage bucket (D-026) |
| TP-33 | Three days offline | T4.9 | Not built yet | | |
| TP-34 | Quotations and bills | T4.10 | Not built yet | | GST waits for Q-04 |
| TP-35 | Payments | T4.11 | Not built yet | | |
| TP-36 | Home dashboard | T4.12 | Not built yet | | |
| TP-37 | Hindi and Marathi wording review | T3.14 | Pending | | Needs a Hindi and a Marathi speaker |
| TP-38 | Usability test with real users | T5.6 | Not built yet | | After TP-36 |

---

## Part A — Done

TP-01 to TP-04 passed in chat on 21 Nov 2026: owner Google sign-in, **Set up a new business** with the 30-day trial, language change, and adding **Test Senior** and **Test Helper** in **More › Employees**.

## Part B — Built, waiting for a phone test

### TP-05 Log out and pick another Google account
1. As the owner, open **More** › **Log out**.
2. In the **Log out?** box, tap **Log out**.
3. Tap **Continue with Google**.

**Expected**
- The login page has a teal block at the top and the **Continue with Google** button.
- Google shows the **account picker**. It does not sign you straight back in as the owner.

Tap back in the picker and sign in as the owner again for now.

### TP-06 Senior joins with the invite code
1. As the owner: **More › Employees** › **Test Senior** › **Show invite QR**. Write down the 6-digit code under "Or they type their mobile number and this code".
2. **Log out**, tap **Continue with Google** and pick the **senior** account.
3. On **Join your business**, tap **Enter code instead**.
4. Enter **9000003001** and the code, then tap **Join**.

**Expected**
- The senior lands on **My Work** in the new design. The list may be empty ("No jobs today").
- **Profile** shows the role **Senior technician** and the business name.
- Back as the owner, **Employees** shows Test Senior as **Joined**.

### TP-07 Helper joins with the invite code
Same as TP-06, with **Test Helper**, the helper's Google account and **9000003002**.

**Expected**
- The helper lands on **Today's work**, which has only two tabs: Today's work and Account.
- The helper sees no Customers, Billing or Jobs tabs.

### TP-08 Wrong mobile number on Join
1. As the owner, add **Test Extra** (9000003009, Helper) and note their code.
2. Log out and sign in with any Google account that is not yet in a business.
3. **Enter code instead**: type a wrong number (**9000003999**) and Test Extra's code, then tap **Join**.

**Expected**
- The message reads: "There is no invite for this mobile number. Check the number, or ask the owner for a new code."
- With the right number (9000003009) it joins. You need Test Extra in TP-25.

### TP-09 Make a team
1. As the owner: **More › Teams** › **Add team**.
2. Keep the name **Team 1**, choose **Test Senior** as **Senior technician** and tick **Test Helper** under **Helpers (optional)**.
3. Tap **Save team**.

**Expected**
- Team 1 shows Test Senior with "leads the team" and Test Helper under Members.
- **Team in use** is on.

### TP-10 Add a customer, duplicate warning, search
1. **Customers** › **Add customer**, using Customer 1 from the test data. Fill in the address, then tap **Save customer**.
2. **Add customer** again with the **same mobile number** 9000004001.
3. Go back to **Customers** and type **4001** in the search box.

**Expected**
- After step 1, the customer page opens with the address marked **main**.
- In step 2, as soon as you type the number, you see "This number is already saved for Rohan Kulkarni." with **Open Rohan Kulkarni** and **Add as a new customer anyway**. Tap **Open Rohan Kulkarni**.
- In step 3, Rohan appears in under 5 seconds.
- Add Customer 2 (Shreeji Clinic, **Business**) too. You need it for TP-15.

### TP-11 Second address, edit, archive
1. On Rohan's page: **Add another address**, type **Office**, any address, then **Save address**.
2. **Edit customer**: change the name to **Rohan K**, then **Save changes**. Change it back afterwards.
3. Open **Shreeji Clinic** › **Archive customer**, then **Bring back customer**.

**Expected**
- Rohan shows two addresses; the first is still **main**.
- The name change shows on the page and in the customer list.
- While archived, Shreeji Clinic is marked **Archived**. After you bring it back, it's normal again.

### TP-12 Add and remove ACs
1. On Rohan's main address: **Add AC here**. Choose **Split**, **Voltas**, **1.5** ton, room **Bedroom**, then **Save AC**.
2. Add a second AC: **Window**, **LG**, **1** ton, **Hall**.
3. Add a third AC with any details, then **Remove** it and confirm.

**Expected**
- The address shows "2 ACs" with brand, capacity and room.
- **More details (model, serial, gas)** stays closed unless you open it.
- The removed AC is gone and won't be offered for new jobs.

### TP-13 Owner creates a job
1. **Jobs** › **New job**.
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

### TP-15 Cancel a job
1. Create a second job for **Shreeji Clinic** (Repair, Today, Afternoon, Team 1).
2. On that job: **More** (⋮) › **Cancel job**. Give a reason, then confirm in **Cancel job #…?**.

**Expected**
- Status is **Cancelled** with the reason. The job stays in history and drops out of **Jobs › All open**.
- Later, the senior does **not** see this job (checked in TP-16).

### TP-16 Senior sees the job; Call and Directions
1. Log out, then sign in as the **senior**.
2. Open **My Work** and tap Rohan's job.
3. Tap **Call**, then come back. Tap **Directions**, then come back.

**Expected**
- My Work shows Rohan's job with "2 AC", the address and **Collect from customer** ₹1,500 ("Set by owner").
- The cancelled Shreeji Clinic job is **not** shown.
- **Call** opens the phone dialer with 9000004001. **Directions** opens Google Maps at the address.

### TP-17 Start work
1. On the job: **Update status** › **Started work**.

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
- Each change reaches **Sent**. Log in as the owner once to check that the job shows the latest status, then go back to the senior.

### TP-19 Finish page
1. **Continue · Finish work**.
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

### TP-20 Finish a job with no internet
1. As the owner (with internet), create a new job for Rohan for Today, give it to **Team 1** and collect **800**.
2. Log in as the **senior** and wait until the job shows in **My Work**.
3. Turn on **Airplane mode**.
4. Start the job, then finish it (Cleaned, no parts, ₹800 UPI, **Work done**).
5. While still offline, check that the job is in **History**.
6. Turn Airplane mode **off** and wait up to a minute.

**Expected**
- While offline: the banner "No internet. Keep working. All saved on phone." appears, the job still opens, and everything saves with **Saved on phone**.
- After going back online: **Sending…** then **Sent**, with no **Needs attention**.
- As the owner: the job is **Completed** **once**, with one report, no duplicate money and no error.

### TP-21 Owner sees the work report and money
1. Log in as the **owner** and open Rohan's first job (from TP-19).

**Expected**
- Status **Completed**.
- **Work report** lists Cleaned / Gas filled per AC, the **Parts** Capacitor ×1, the note and **Work done**.
- **Money taken** shows ₹1,500 Cash "with the team" (confirming it comes with payments, T4.11).

### TP-22 "Need to come again" and a new visit
1. Owner: create a job for Shreeji Clinic and give it to Team 1.
2. Senior: start it, then finish with result **Need to come again** and the note "Compressor to be replaced".
3. Owner: open the job, then **New visit for the same work**.

**Expected**
- The owner sees the outcome **Need to come again** with the note.
- **New visit for the same work** creates a new job with the same customer, address and ACs, linked to the first job.

### TP-23 Helper's Today's work
1. Owner: create a job for Rohan for Today and give it to Team 1.
2. Log in as the **helper**.

**Expected**
- **Today's work** shows the job: customer name, phone, address, job type and Test Senior as the senior.
- The text reads "Your senior fills in the job report. You don't need to fill anything."
- There is no **Finish work**, no money and no bill.
- **Call** and **Directions** work.

### TP-24 App closed while offline still sends later
1. As the senior, with internet, open a job given to Team 1 (use the one from TP-23).
2. Turn on **Airplane mode**, then **Update status** › **Started work**.
3. Swipe the app away from recent apps (force close).
4. Turn Airplane mode **off** and open the app again.

**Expected**
- The start is not lost: within a minute it shows **Sent**, and the owner sees **In progress**.

### TP-25 Reset login and remove an employee (run last)
1. Owner: **More › Employees** › **Test Helper** › **Reset login** and confirm.
2. Log in as the helper.
3. Owner: **Test Helper** › **Show invite QR** (or **Make a new code**). The helper joins again as in TP-07.
4. Owner: **Test Extra** › **Remove from business** and confirm.
5. Log in with Test Extra's Google account.

**Expected**
- After step 1, a message reads "Login reset. Show a new invite QR to join again."
- In step 2, the helper is sent back to **Join your business**.
- After step 3, the helper is back on **Today's work**.
- After step 4, Test Extra moves under **Removed**. In step 5 they can't get into the business (they see **Join your business** or a "not active" message).

## Part C — Needs a second phone

### TP-26 Join by scanning the QR (T3.12)
1. Phone A (owner): **More › Employees** › someone not joined › **Show invite QR**.
2. Phone B: sign in with Google, then **Scan QR code**, allow the camera and point it at phone A.
3. On phone B, scan any other QR (a product or a website).

**Expected**
- Phone B lands on that person's home (My Work or Today's work).
- The other QR shows "This is not a KaamSetu invite code."

## Part D — Not built yet

Claude writes the full steps when each feature ships and changes its status to **Pending**. What each test will check:

- **TP-30 Enquiries (T4.5):** save a WhatsApp or phone enquiry with the source and complaint; see open enquiries on Home; turn one into a job in one tap without typing it again; close one with a reason.
- **TP-31 Service-centre ticket paste (T4.5a):** paste a brand ticket message and get name, phone, address, pincode, job type, ticket number and charges filled in; a duplicate ticket shows a warning; unknown text falls back to manual entry without losing what was pasted.
- **TP-32 Job photos (T4.8):** add photos on the finish page; they upload, also later when you're back online; the owner sees them on the job.
- **TP-33 Three days offline (T4.9):** 5 jobs and 20 photos across 3 days offline; everything arrives with no loss and no duplicates; the **Saved / Sending / Sent / Needs attention** labels are correct.
- **TP-34 Quotations and bills (T4.10):** quotation PDF shared and turned into a bill; a bill from a completed job, prefilled with parts and services, shared on WhatsApp in under 2 minutes; discount; GST per line (after Q-04); cancel with a reason.
- **TP-35 Payments (T4.11):** full and partial cash, UPI and bank payments; **Paid / Partly paid / Not paid**; confirm or reject cash the teams handed over; tapping twice records one payment.
- **TP-36 Home dashboard (T4.12):** open enquiries, jobs needing a team, needs-action list, today by status, latest from teams, money to collect and cash with teams, all matching the real data.
- **TP-37 Hindi and Marathi review (T3.14):** a Hindi speaker and a Marathi speaker go through the login, owner, join, employee and field screens in their language and note wrong or odd wording. This can run now.
- **TP-38 Usability test (T5.6):** the real owner and a real technician use the built app for a normal day with no help (kit: `discovery/USABILITY_TEST_KIT.md`).
