# KaamSetu — Google Stitch Prototype Prompts

> Use this **after** all screens from [STITCH_PROMPTS.md](STITCH_PROMPTS.md) are made (at least 01–74). These prompts do not design anything new. They only connect the screens you already have, so you can tap through the app like a real phone.
> The links follow the user flows in [STITCH_DESIGN_BRIEF.md](STITCH_DESIGN_BRIEF.md) §4 (F1–F17). Nothing is added.

---

## How to use

1. **Name every screen first.** In Stitch, rename each screen to its number and name, exactly as in the prompt pack: `01 Component sheet`, `02 Owner Home`, `13 Job detail — New` … `74 Dialog — Log out`. The prompts below refer to screens by these names, so this step matters.
2. In the same Stitch project, paste the **Prototype base prompt** (§0) in one message.
3. Then paste **one link prompt per message**, in order: P1, P2, … P12.
4. After each one, press **Play / Preview** and tap through. If a link is wrong, use a fix prompt (§14).
5. Last, paste the **Check prompt** (§13). Stitch lists every link it made. Compare it with the link table (§15).

**If your Stitch version can't make links from a prompt:** use the link table (§15) to connect screens by hand in Stitch. Or export to Figma and connect them in Figma's Prototype tab. The table is the same either way.

---

## 0. Prototype base prompt (paste once)

```
We are now turning the KaamSetu screens in this project into ONE clickable prototype. Do NOT design anything.

STRICT RULES
- Do NOT create new screens. Do NOT change any screen's layout, text, colours, components or sample data.
- Only add tap links (interactions) between screens that already exist, exactly as I list them.
- Screens are named by number, e.g. "13 Job detail — New". When I say "Screen 13", I mean that screen.
- If a button I name is not on the screen, or the target screen does not exist, skip that link and tell me. Do not add the button. Do not make the screen.
- Do not link anything I did not list. A button I do not mention stays without a link.

HOW SCREENS OPEN
- Normal screens open full-screen and slide in from the right. The back arrow in a header returns to the screen that opened it.
- These screens are BOTTOM SHEETS: 10, 11, 12, 17, 22, 23, 24, 25, 26, 27, 29, 36, 37, 39, 40, 49. Open them as an overlay that slides up over the screen that opened them. The X button and the dimmed backdrop close the sheet and go back to that screen.
- These screens are DIALOGS: 18, 66, 74. Open them as a centred overlay. Their cancel button ("No", "Keep", "Cancel" or similar) closes the dialog.
- Bottom navigation tabs switch instantly, with no animation.

START SCREEN
- The prototype starts at Screen 51 (Splash / welcome).

Reply only with "Ready for links." Do not change anything yet.
```

---

## P1 · Bottom navigation and headers (do this first)

```
Prototype links, part P1. Only add these links. Change nothing else.

OWNER BOTTOM NAVIGATION — on EVERY screen that shows the owner bottom bar (Home · Jobs · Customers · Billing · More):
- Home → Screen 02 Owner Home
- Jobs → Screen 05 Jobs tab — Jobs list
- Customers → Screen 43 Customers tab
- Billing → Screen 33 Billing tab
- More → Screen 59 More tab

SENIOR TECHNICIAN BOTTOM NAVIGATION — on EVERY screen that shows My Work · History · Profile:
- My Work → Screen 19 My Work
- History → Screen 31 History
- Profile → Screen 32 Profile

OWNER HOME HEADER (Screen 02):
- Updates / bell icon button → Screen 03 Updates from teams
- Search icon button → Screen 04 Search

JOBS TAB (Screens 05 and 06):
- "Enquiries" tab on Screen 05 → Screen 06
- "Jobs" tab on Screen 06 → Screen 05

BACK ARROWS AND X CLOSE ICONS on every inner screen: go back to the previous screen.
```

---

## P2 · First run and owner setup (flow F1)

```
Prototype links, part P2 (first run). Only add these links. Change nothing else.

- Screen 51 "Get started" → Screen 52 Intro slides (first frame)
- Screen 51 "I already use KaamSetu" → Screen 53 Log in
- Screen 52: "Next" goes to the next intro frame. On the last frame, the main button → Screen 53. "Skip" on any frame → Screen 53
- Screen 53 "Continue with Google" → Screen 56 Setup step 1 — Your business
- Screen 56 main button → Screen 57 Setup step 2 — First team
- Screen 57 main button → Screen 58 Setup step 3 — All set
- Screen 57 "Skip for now" → Screen 58
- Screen 58 "Go to Home" → Screen 02 Owner Home
```

---

## P3 · Staff joins a business (flow F2)

```
Prototype links, part P3 (staff join). Only add these links. Change nothing else.

Owner side:
- Screen 59 "Employees" row → Screen 63 Employees
- Screen 63 "Add employee" → Screen 64 Add employee
- Screen 64 main save button → Screen 65 Employee detail — invite QR
- Screen 63 any employee row → Screen 65
- Screen 65 "Reset login" → Screen 66 Dialog — Reset login

Staff side (a second starting point of the prototype, if Stitch allows more than one; otherwise skip this line):
- Make Screen 54 Join your business a second start screen.
- Screen 54 "Scan QR code" → Screen 55 Scan QR
- Tapping the camera area on Screen 55 → Screen 19 My Work
```

---

## P4 · New enquiry or job, paste a ticket (flows F3, F4)

```
Prototype links, part P4 (new job). Only add these links. Change nothing else.

Ways in:
- Screen 02 "New enquiry or job" → Screen 08 New enquiry or job
- Screen 05 "New" → Screen 08
- Screen 06 "New" → Screen 08

On the form:
- Screen 08 Customer field → Screen 11 Sheet — Find customer
- Screen 11 any customer row → Screen 09 New job — customer chosen
- Screen 11 "Add new customer" → Screen 45 Add customer
- Screen 45 main save button → Screen 09
- Screen 08 "Paste ticket from WhatsApp" → Screen 10 Sheet — Paste ticket
- Screen 10 "Fill the job" → Screen 09

Saving:
- Screen 09 "Save enquiry" → Screen 06 Jobs tab — Enquiries
- Screen 09 "Create job & assign" → Screen 12 Sheet — Assign team
```

---

## P5 · Enquiries and assigning a team (flows F5, F6)

```
Prototype links, part P5 (enquiries and assign). Only add these links. Change nothing else.

Enquiries:
- Screen 06 any enquiry card → Screen 07 Enquiry detail
- Screen 07 "Convert to job" → Screen 09 New job — customer chosen
- Screen 07 "Make quotation" → Screen 41 New quotation
- Screen 41 "Save & send quotation" → Screen 42 Quotation detail

Assign team:
- Screen 02 "Assign" (in the "Jobs need a team" row) → Screen 12 Sheet — Assign team
- Screen 13 "Assign team" → Screen 12
- Screen 12 main "Assign Team …" button → Screen 14 Job detail — Assigned
```

---

## P6 · Owner job detail and problems (flows F9, F14)

```
Prototype links, part P6 (owner job detail). Only add these links. Change nothing else.

Opening a job:
- Screen 05: a job card whose number matches Screen 13, 14, 15 or 16 opens that screen. Every other job card opens Screen 14.
- Screen 02 each row under "Needs your action" → the job detail screen with the same job number (13, 14, 15 or 16). If no number matches, → Screen 15 Job detail — On hold.
- Screen 03 any update row → Screen 14
- Screen 04 a job result → Screen 14. A customer result → Screen 44 Customer detail

On a job:
- "More" on Screens 13, 14, 15 and 16 → Screen 17 Sheet — Job "More" menu
- Screen 17 "Change team or time" → Screen 12 Sheet — Assign team
- Screen 17 "Cancel job" → Screen 18 Dialog — Cancel job
- Screen 18 confirm button → Screen 05 Jobs tab — Jobs list
- Screen 15 "Reschedule" → Screen 12
- Screen 16 "Create bill" → Screen 34 New bill
```

---

## P7 · Technician does a job (flows F7, F8)

```
Prototype links, part P7 (technician). Only add these links. Change nothing else.

- Screen 19: a job card that shows "Fix appointment" or no appointment time → Screen 20 Technician job detail — appointment not fixed. Every other job card → Screen 21 Technician job detail — ready to start
- Screen 20 "Fix appointment" → Screen 23 Sheet — Appointment fixed
- Screen 23 "Save" → Screen 21
- Screen 21 "Start Work" → Screen 28 Finish work (this prototype skips the in-progress screen, which is not designed)
- "Update status" on Screens 20 and 21 → Screen 22 Sheet — Update status

Inside Screen 22:
- "Appointment fixed" → Screen 23
- "Part needed" → Screen 24
- "Customer not ready" → Screen 25
- "Can't continue" → Screen 26
- "Note for owner" → Screen 27
- The send/save button on Screens 24, 25, 26 and 27 → back to Screen 21

Finish work:
- Screen 28 "Add part" → Screen 29 Sheet — Add part
- Screen 29 main button → back to Screen 28
- Screen 28 "Finish Work" → Screen 30 Work completed
- Screen 30 "Next job" → Screen 21
- Screen 30 "Back to My Work" → Screen 19

History:
- Screen 31 any job row → Screen 21
```

---

## P8 · Bills, payments and quotations (flows F10, F11, F12)

```
Prototype links, part P8 (billing). Only add these links. Change nothing else.

- Screen 33 any row under "Ready to bill" → Screen 34 New bill
- Screen 33 any bill row → Screen 38 Bill detail
- Screen 33 "Quotations" → Screen 42 Quotation detail + Quotations list
- Screen 02 "Work reports ready to bill" row → Screen 34

Bill editor:
- Screen 34 "Add item" → Screen 36 Sheet — Add item
- Screen 34 "Discount" → Screen 37 Sheet — Discount
- Screen 36 and 37 main button → back to Screen 34
- Screen 34 GST switch → Screen 35 New bill — GST on
- Screen 35 GST switch → Screen 34
- Screen 34 and 35 "Save & send on WhatsApp" → Screen 38 Bill detail

Bill detail:
- Screen 38 "Record payment" → Screen 39 Sheet — Record payment
- Screen 39 "Save payment …" → back to Screen 38
- Screen 38 "More" → Screen 40 Sheet — Bill "More" + Dialog — Cancel bill

Quotations:
- Screen 42 "Turn into bill" → Screen 34
```

---

## P9 · Customers and ACs (flow F13)

```
Prototype links, part P9 (customers). Only add these links. Change nothing else.

- Screen 43 any customer row → Screen 44 Customer detail
- Screen 43 "Add customer" / "New" → Screen 45 Add customer
- Screen 45 main save button → Screen 44
- Screen 44 "New job" → Screen 09 New job — customer chosen
- Screen 44 any AC row → Screen 46 AC detail
- Screen 44 "Add AC" → Screen 47 Add AC
- Screen 47 main save button → Screen 46
- Screen 46 "New job for this AC" → Screen 09
- Screen 44 any row in service history → Screen 16 Job detail — Completed
```

Note: in P4, Screen 45's save goes to Screen 09 (adding a customer from the job form). In P9 it goes to Screen 44. Stitch allows one target per button, so the **later prompt wins** (P9 → 44). If you want the job-form path in your demo, skip that line in P9.

---

## P10 · Helper (flow F15)

```
Prototype links, part P10 (helper). Only add these links. Change nothing else.

- Make Screen 48 Helper — Today's work a third start screen, if Stitch allows; otherwise skip this line.
- Screen 48 "Update status" → Screen 49 Helper — Update status sheet
- Screen 49 send/save button → back to Screen 48
- Screen 48 "Me" (or the profile icon in the header) → Screen 50 Helper — Me
- Screen 50 "Log out" → Screen 74 Dialog — Log out
```

---

## P11 · More, settings, language and log out (flow F16)

```
Prototype links, part P11 (More and settings). Only add these links. Change nothing else.

From Screen 59 More tab:
- "Teams" → Screen 60 Teams
- "Employees" → Screen 63 Employees
- "Rate list" → Screen 67 Rate list
- "Business details" → Screen 68 Business details
- "Bill settings" → Screen 69 Bill settings
- "Photo rules" → Screen 70 Photo rules
- "Language" → Screen 71 Language
- "Plan & payment" → Screen 72 Plan & payment
- "Help" → Screen 73 Help
- "Log out" → Screen 74 Dialog — Log out

Teams:
- Screen 60 any team row → Screen 61 Team detail
- Screen 60 "Add team" → Screen 62 Add team
- Screen 62 main save button → Screen 60

Technician profile:
- Screen 32 "Language" → Screen 71
- Screen 32 "Log out" → Screen 74

Log out:
- Screen 74 confirm "Log out" button → Screen 53 Log in
```

---

## P12 · Leave the state screens unlinked

```
Prototype links, part P12. Do NOT link Screens 01 and 75–83. They are reference screens (component sheet, offline, empty, error, toast and Marathi versions), not steps in the flow. Leave them in the project as they are. Change nothing else.
```

---

## 13. Check prompt (paste last)

```
Do not change anything. List every prototype link in this project as a table with three columns: From screen · What is tapped · To screen. Then list every link I asked for that you skipped, and why.
```

Compare the answer with the link table (§15). Fix any difference with a prompt from §14.

---

## 14. Fix prompts

- `Remove the link from "[button]" on Screen [NN]. Change nothing else.`
- `On Screen [NN], "[button]" should go to Screen [MM], not Screen [XX]. Change nothing else.`
- `Screen [NN] should open as a bottom sheet over the screen behind it, not as a full screen. Change nothing else.`
- `You changed the design of Screen [NN]. Undo that. Only links may change.`
- `Do not create Screen "[name]". Delete it. Leave that button without a link.`

---

## 15. Link table (for checking, or for connecting by hand)

| Flow | From | Tap | To |
|---|---|---|---|
| Nav | All owner tab screens | Home / Jobs / Customers / Billing / More | 02 / 05 / 43 / 33 / 59 |
| Nav | All technician tab screens | My Work / History / Profile | 19 / 31 / 32 |
| Nav | 02 | Updates · Search | 03 · 04 |
| Nav | 05 ↔ 06 | Jobs / Enquiries tabs | 05 / 06 |
| F1 | 51 | Get started · I already use KaamSetu | 52 · 53 |
| F1 | 52 | Next (last frame) · Skip | 53 |
| F1 | 53 | Continue with Google | 56 |
| F1 | 56 → 57 → 58 | main button (57 also "Skip for now") | next step |
| F1 | 58 | Go to Home | 02 |
| F2 | 59 → 63 → 64 → 65 | Employees · Add employee · Save | next screen |
| F2 | 63 | employee row | 65 |
| F2 | 65 | Reset login | 66 |
| F2 | 54 → 55 → 19 | Scan QR code · camera area | next screen |
| F3 | 02 / 05 / 06 | New enquiry or job · New | 08 |
| F3 | 08 | Customer field | 11 |
| F3 | 11 | customer row · Add new customer | 09 · 45 |
| F4 | 08 | Paste ticket from WhatsApp | 10 |
| F4 | 10 | Fill the job | 09 |
| F3 | 09 | Save enquiry · Create job & assign | 06 · 12 |
| F5 | 06 | enquiry card | 07 |
| F5 | 07 | Convert to job · Make quotation | 09 · 41 |
| F12 | 41 | Save & send quotation | 42 |
| F6 | 02 / 13 / 17 / 15 | Assign · Assign team · Change team or time · Reschedule | 12 |
| F6 | 12 | Assign Team … | 14 |
| F9 | 05 / 02 / 03 / 04 | job card · action row · update · job result | 13–16 by job number (else 14; action rows else 15) |
| F13 | 04 | customer result | 44 |
| F9 | 13–16 | More | 17 |
| F9 | 17 | Cancel job | 18 |
| F9 | 18 | confirm | 05 |
| F11 | 16 | Create bill | 34 |
| F7 | 19 | job card | 20 (no appointment) / 21 |
| F7 | 20 | Fix appointment | 23 |
| F7 | 23 | Save | 21 |
| F7 | 21 | Start Work | 28 |
| F8 | 20 / 21 | Update status | 22 |
| F8 | 22 | Appointment fixed · Part needed · Customer not ready · Can't continue · Note for owner | 23 · 24 · 25 · 26 · 27 |
| F8 | 24–27 | send / save | 21 |
| F7 | 28 | Add part · Finish Work | 29 · 30 |
| F7 | 29 | main button | 28 |
| F7 | 30 | Next job · Back to My Work | 21 · 19 |
| F7 | 31 | job row | 21 |
| F11 | 33 | Ready to bill row · bill row · Quotations | 34 · 38 · 42 |
| F11 | 02 | Work reports ready to bill | 34 |
| F11 | 34 | Add item · Discount · GST switch · Save & send | 36 · 37 · 35 · 38 |
| F11 | 35 | GST switch · Save & send | 34 · 38 |
| F11 | 36 / 37 | main button | 34 |
| F11 | 38 | Record payment · More | 39 · 40 |
| F11 | 39 | Save payment | 38 |
| F12 | 42 | Turn into bill | 34 |
| F13 | 43 | customer row · Add customer | 44 · 45 |
| F13 | 45 | Save | 44 (or 09 for the job-form path, see P9 note) |
| F13 | 44 | New job · AC row · Add AC · history row | 09 · 46 · 47 · 16 |
| F13 | 46 | New job for this AC | 09 |
| F13 | 47 | Save | 46 |
| F15 | 48 | Update status · Me | 49 · 50 |
| F15 | 49 | send | 48 |
| F16 | 59 | Teams · Employees · Rate list · Business details · Bill settings · Photo rules · Language · Plan & payment · Help · Log out | 60 · 63 · 67 · 68 · 69 · 70 · 71 · 72 · 73 · 74 |
| F16 | 60 | team row · Add team | 61 · 62 |
| F16 | 62 | Save | 60 |
| F16 | 32 | Language · Log out | 71 · 74 |
| F16 | 50 | Log out | 74 |
| F16 | 74 | Log out | 53 |

### Not linked on purpose (no screen exists yet, see brief §10)

- These stay as buttons without links. Don't let Stitch make them.
  - "Close enquiry" reason sheet (F5)
  - helper-for-the-day reason sheet (F6)
  - owner "Put on hold" and "Set amount to collect" sheets (F9, F10)
  - owner rejecting on-site cash (G-9)
  - "Book a follow-up visit" result (F14)
  - "Enter code instead" form (F2)
  - the technician's "in progress" job state
  - success toasts
- One tap can't show a branch (for example, "account already in a business?" after Google sign-in). The prototype follows the owner path. Staff and helper paths start from their own start screens (54 and 48).
