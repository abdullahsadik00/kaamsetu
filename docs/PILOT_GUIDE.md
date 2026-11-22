# Pilot guide

How to set up the pilot business, load its data and train the owner, senior technicians and helpers (T6.2). Use it with `docs/RUNBOOK.md` (what to do when something goes wrong) and `docs/PILOT_AGREEMENT.md` (what the owner agrees to).

Hindi and Marathi copies to hand out: staff handout `docs/pilot/staff-handout.hi.md` / `.mr.md`, pilot agreement `docs/pilot/pilot-agreement.hi.md` / `.mr.md` (drafts by Claude: have a native speaker check them first, T3.14).

Words in **bold** are the app's own labels (English). The app also runs in Hindi and Marathi: set the language on **More** (owner) or **Profile** (staff) during training.

## 1. Before the first day

Do these in order. Tick each one.

| # | Step | How | Done when |
|---|---|---|---|
| 1 | Owner signs the pilot agreement | `docs/PILOT_AGREEMENT.md`, signed copy or WhatsApp "I agree" | You have it in writing |
| 2 | Build and share the APK | `eas build --profile preview --platform android` in `app/mobile`; send the link | Link opens on the owner's phone |
| 3 | Owner creates the business | Owner installs the APK, **Continue with Google** › **Set up a new business** › **Create my business** | Owner sees **Home** |
| 4 | Load the customer list | §2 below | `import-customers` printed "Added …" |
| 4a | Extend the free trial to the pilot's end | `npm run pilot -- extend-trial --business-phone <mobile> --until <pilot end date> --yes` (the app's trial is 30 days; the pilot is longer) | **More** shows the right days left |
| 5 | Owner fills the rate list | **Billing** › **Rate list**: service, gas filling, common parts | At least 5 usual prices |
| 6 | Owner adds staff | **More** › **Employees** › **Add employee** for each senior technician and helper | Everyone listed |
| 7 | Owner makes teams | **More** › **Teams** › **Add team**: one senior technician and their helpers | Each team shows a lead |
| 8 | Staff join | Each person installs the APK, **Continue with Google**, scans the owner's **Show invite QR** (or **Enter code instead**) | **Employees** shows **Joined** for everyone |
| 9 | Phone settings, on every phone | §3 below | Checked on each phone |
| 10 | Practice round | §5 below | One practice job goes all the way to a bill |

Keep a list of who has which phone (name, role, phone model, Android version). You need it when something goes wrong.

## 2. Loading the owner's customers

Most owners have customers in a notebook, an Excel sheet, a phone's contact list or old bills. Entering 300 customers by hand in the app takes days; the import takes minutes.

1. Give the owner (or yourself) the template `docs/pilot/customers-template.csv`. Open it in Excel or Google Sheets. Delete the two sample rows.
2. One row per customer. Columns:

   | Column | Needed | Example | Notes |
   |---|---|---|---|
   | name | yes | Meera Joshi | 2 to 80 letters |
   | phone | yes | 9822012345 | 10-digit mobile; `+91` and spaces are fine |
   | address | yes | Flat 2, Sai Heights | Flat, building, street |
   | locality | no | Kothrud | Shown in lists; fill it if you can |
   | city, landmark, notes | no | Pune · Near temple · Calls after 6 pm | |
   | alternate phone | no | 9822012346 | |
   | gstin | no | 27ABCDE1234F1Z5 | Turns on GST bills for this customer |
   | ac count, ac brand, ac tons | no | 2 · Voltas · 1.5 | Adds that many ACs at the address. Leave empty if not known: the technician adds ACs on site |

   Other spellings work too: "Mobile", "Customer name", "Area", "Brand", "Tons".
3. Save as **CSV UTF-8** (Excel: File › Save As › "CSV UTF-8"; Google Sheets: File › Download › CSV). This keeps Hindi and Marathi names readable.
4. Check the file against staging. Set `DATABASE_URL` as in the runbook, then from `app/backend`:

   ```powershell
   npm run pilot -- import-customers --business-phone <business mobile> --file customers.csv
   ```

   It lists every line to fix ("line 14: phone: Enter a 10-digit Indian mobile number"). Fix them in the sheet, save as CSV again, run again. Nothing is saved until the file is clean **and** you add `--yes`.
5. Save:

   ```powershell
   npm run pilot -- import-customers --business-phone <business mobile> --file customers.csv --yes
   ```

   A phone already saved for a customer, or repeated in the file, is skipped and listed. Running the same file again adds nothing twice, so a half-finished list can be finished later.
6. Ask the owner to open **Customers** and search two or three names they know.
7. **Delete the CSV from your laptop and from WhatsApp/email** once it is loaded. It holds personal data of the owner's customers.

## 3. Phone settings (every phone)

The app keeps working without internet, but Android can stop it from sending when it is in the background.

- **Mobile data:** Settings › Apps › KaamSetu › Mobile data › allow background data.
- **Battery:** Settings › Apps › KaamSetu › Battery › **Unrestricted** (wording differs by brand: "No restrictions", "Don't optimise"). On Xiaomi/Redmi also turn on **Autostart**.
- **Camera:** allow it the first time the app asks (needed to scan the invite QR).
- **Updates:** turn off auto-delete of unused apps (Settings › Apps › KaamSetu › "Pause app activity if unused" off).
- **Storage:** at least 500 MB free.
- Write the phone in your phone list (§1).

## 4. Training

Train each person on their own phone, with their own login, in the language they read best. Keep it short and let them tap; do not tap for them. Use the practice customer from §5, never a real one.

### Owner (about 45 minutes)

1. **Home:** what **Needs your action** means (jobs on hold, needing another visit, no day fixed), **Latest from teams**, **Money to collect**.
2. **New enquiry** when a customer calls but is not ready to book; **Convert to job** later. Nothing is typed twice.
3. **New job:** **Which customer?** (search by name or last 4 digits), **Which ACs?**, **Job type**, **Day**, **Time**, **Team**, **Save job**. Then **Give to a team**, **Change day or time**, **Cancel job**.
4. **Jobs** › **Today** / **Tomorrow** / **All open** / **Completed**: open a job, read the **Work report** and **Updates from team**.
5. **Customers:** **Add customer**, **Add AC**, **Add another address**, the duplicate-number warning.
6. **Billing:** **Ready to bill** › **Make bill** (filled from the work report: check and change), **Send bill** on WhatsApp, **Share PDF**, **Record payment**, **Cash with teams** › **Got it** / **Not received**. **New quotation** for a price before the work.
7. **More:** **Employees** (**Show invite QR**, **Reset login** for a lost phone, **Remove from business**), **Teams**, **Download business data**.
8. Offline: turn on airplane mode, add a customer and a job, turn it off. Point out the "saved on phone" line and that it sends by itself.

### Senior technician (about 30 minutes)

1. **My Work:** today's jobs, newest information at the top. **Call**, **Directions**, **Customer says**, **Collect**.
2. **Start work**. If the customer is not ready or a part is missing: **Put on hold**, pick **Customer side** or **Our side**, add a note.
3. Updates without changing the job: **Appointment fixed**, **Part needed**, **Note for owner**.
4. **Finish work:** **How did it go?** (**Work done**, **Need to come again**, **Couldn't do it**), what was done on each AC, **+ Add part used**, **Money taken from customer** (**Cash** / **UPI**), **Save and finish**.
5. Add an AC on site that the owner did not know about.
6. **No internet, keep working:** turn on airplane mode, finish a practice job, show **Saved on phone**; turn it off and watch **Sending…** then **Sent**. Say clearly: never uninstall the app or clear its data while work shows as waiting.
7. **Needs attention**: what it means when the owner cancelled or moved a job while they were offline (**OK, got it**; the owner still sees what was saved).
8. **History:** past jobs. **Profile:** language, **Log out** (warns if work has not been sent).

### Helper (about 10 minutes)

1. **Today's work** shows the team's jobs and who the senior is.
2. They do not fill anything: "Your senior fills in the job report."
3. Language on **Profile**.

After training, ask each person to do one task alone while you watch, without help. Write down where they hesitate (it feeds T5.6 and the weekly review).

## 5. Practice round

Do it once with everyone together, before real jobs.

1. Owner adds customer **"Practice Customer"** with their own second number, one AC.
2. Owner makes a job for tomorrow, gives it to Team 1.
3. Senior technician: **Start work** › **Put on hold** (Customer side) › **Start again** › **Finish work** with one part and ₹500 cash.
4. Owner: sees the update on **Home**, opens the **Work report**, marks the cash **Got it**, **Make bill**, **Send bill** to their own WhatsApp.
5. Repeat step 3 with airplane mode on, then off.
6. Clean up: **Cancel bill**, **Archive customer** on "Practice Customer". (Jobs stay in history marked as practice; tell the owner.)

## 6. First two weeks

Start with **one team** for the first week (doc 07, Phase 6), then all teams.

**Every day (5 minutes):**
- Open `/health` and Sentry: any new errors?
- Ask the owner on WhatsApp: "Anything that did not work or was slow today?"
- Anything waiting to send for more than a day on any phone? (RUNBOOK §7)

**Every week (30 minutes with the owner):**
- How many jobs were made in KaamSetu, and how many still went on paper or WhatsApp only? Why?
- Did any bill have a wrong amount? Any money missed?
- What did the technicians complain about?
- One thing to fix next week. Record bugs in `docs/BUG_LOG.md` and decisions in `docs/DECISION_LOG.md`.

**Stop and call the owner the same day if:** a job report is lost, money shows wrongly, someone sees another business's data, or the app stops opening. Then follow `docs/RUNBOOK.md`.

## 7. End of the pilot

- Ask the owner whether to continue (gate G6, doc 07). Write down the answer and why.
- If they stop: **More** › **Download business data** gives them everything. Closing the business deletes it after 30 days (RUNBOOK, monthly tasks).
