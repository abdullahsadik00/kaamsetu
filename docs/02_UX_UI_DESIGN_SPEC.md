# 02 — KaamSetu UX/UI Design Specification

> **Source of truth for:** screens, navigation, interaction and visual design. The clickable prototype `design/KaamSetu Prototype.html` is the reference for screen layout; this document wins where they disagree.

## 0. Design status (19 Nov 2026)

| Process step (§2) | Status |
|---|---|
| 1. Workflow discovery | **Not done** with the real business. The prototype is based on assumptions |
| 2. Information architecture | Done in the prototype (owner 4 tabs + More; technician My Work / History / Profile; helper Today's Work) |
| 3. Low-fidelity wireframes | Skipped; went straight to a mid/high-fidelity prototype |
| 4. Clickable prototype | **Done**: owner, senior technician and helper roles, online/offline toggle, English/Hindi/Marathi. **Updated 19 Nov 2026** with discovery answers (see below) |
| 5. Usability testing | **Not done.** This is the next gate |
| 6. Visual design system | Tokens defined in the prototype (§6) |
| 7. Design handoff | Not done; follows testing |

What the prototype added beyond the original spec (now reflected in the PRD): enquiry inbox, one-tap field status updates with hold reasons and part requests, appointment fixing, "money from customer" on the finish page and "with teams, to hand over" on the owner home, one-day helper swap, per-AC work recording, GST switch on bills, WhatsApp sharing of bill PDFs, and follow-up jobs linked to the original job.

Prototype update of 19 Nov 2026 (T2.1, from pre-interview answers):
- **Paste ticket from WhatsApp** on New job: reads the two known service-centre ticket formats (made-up samples via "Use a sample ticket"), fills customer, address, job type, ticket number and charges to collect; unreadable text shows an error and keeps manual entry.
- "Came from" adds *Service centre* and *Builder/company*; ticket number field for service-centre jobs; ticket shown on enquiry and job.
- **Closed in brand portal** tick on completed ticket jobs.
- **Quotations**: Make quotation from an enquiry, Billing › Quotations tab, Turn into bill.
- **UPI to owner's QR**: owner confirms with "I see it in my account"; cash keeps "I received this cash".
- **Owner offline**: jobs can be created and assigned offline ("sends when online"); bills, quotations and payments still need internet.
- **Helper view** shows the customer's name with a call button, besides the senior technician.
- Parts: "I ordered it" → "Ordered from service centre" (D-024).
- Fixed: new job number clashed with the last demo job.

## 1. Design objective

Design the user experience before building the application.

KaamSetu is for busy owners and field technicians. Some technicians may have limited experience with business software. The UI must be obvious, forgiving and quick.

**Primary design rule:** Every screen should answer: "What do I need to do next?"

## 2. Design process

Do not start with polished screens immediately.

### Step 1 — Workflow discovery
Observe the owner, senior technician and helper:
- How does a new request arrive?
- What information does the owner write down?
- How is a team selected?
- Who calls the customer?
- Who records the work?
- Who calculates the bill?
- How is payment confirmed?
- What happens when the repair needs another visit?

Record real examples and actual words users use.

### Step 2 — Information architecture
Confirm role-specific navigation and the minimum information on each screen.

### Step 3 — Low-fidelity wireframes
Use grayscale boxes and labels. Focus on layout and task order, not colors.

### Step 4 — Clickable prototype
Connect the main flows:
- Create job.
- Assign team.
- Senior technician completes job.
- Owner creates bill.
- Owner records payment.

### Step 5 — Usability testing
Test with the owner, one senior technician and one helper. Do not explain the screen first. Give them a task and observe.

### Step 6 — Visual design system
Only after flows are understandable, define typography, colors, buttons, cards, spacing and component states.

### Step 7 — Design handoff
Document component behavior, validation, loading, offline, empty and error states.

## 3. Information architecture

### Owner navigation

Bottom navigation:
1. Home.
2. Jobs.
3. Customers.
4. Billing.

More menu:
- Teams.
- Employees.
- AMC.
- Expenses (later).
- Reports (basic).
- Settings.

### Senior technician navigation

Bottom navigation:
1. My Work.
2. Completed.
3. Profile.

The home route should open directly to My Work.

### Helper navigation

Preferred MVP approach:
- If helpers use the app, show a simplified "Today's Work" view with current team job and basic details.
- Do not show full customer management, billing, reports or settings.
- If helpers do not need direct interaction, they can remain associated with the team without requiring an app login.

**Do not assume every helper needs an individual account. Validate this in discovery.**

## 4. Core screen inventory

### Authentication and setup
1. Welcome/login.
2. OTP verification.
3. Business profile setup.
4. Add first team.
5. Add senior technician.
6. Add helper.

### Owner
7. Home dashboard.
8. Job list.
9. Create job.
10. Job details.
11. Assign team.
12. Customer list/search.
13. Add/edit customer.
14. Customer details.
15. Add/edit AC.
16. Team list.
17. Team details.
18. Employee details.
19. Billing list.
20. Create invoice.
21. Invoice details.
22. Record payment.
23. More/settings.

### Senior technician
24. My Work.
25. Job details.
26. Start work.
27. Complete work.
28. Add parts/materials (simple sheet).
29. Add photos.
30. Completion confirmation.
31. Completed jobs.
32. Profile/language.

These are screen templates, not a commitment to build 32 independent routes. Use reusable detail views, bottom sheets and conditional steps.

## 5. Wireframe descriptions

### 5.1 Owner home

Top:
- Business greeting.
- Notification icon.

Summary cards:
- Today's jobs.
- Pending jobs.
- Completed jobs.
- Amount to collect (optional, only if reliable).

Primary actions:
- New Job.
- Add Customer.
- Create Bill.

Today's jobs list:
- Customer.
- Area.
- Service type.
- Assigned team.
- Status.

Avoid charts in the first release.

### 5.2 Create job

Prefer a single short page or a very short guided flow.

Fields:
1. Customer search/add.
2. AC selection/add.
3. Service type.
4. Complaint (optional short text or voice note later).
5. Visit date/time (optional).
6. Team selection.
7. Save Job.

Use saved defaults and customer history. Do not make every optional field mandatory.

### 5.3 Job details — owner

Show:
- Job number and status.
- Customer and call action.
- Address and map action.
- AC type/brand/capacity.
- Complaint.
- Assigned team and senior technician.
- Visit date.
- Service completion summary.
- Create Bill action.

### 5.4 Senior technician — My Work

Each job card:
- Customer name.
- Area.
- Service type.
- Scheduled time.
- Short complaint.
- Status.

One obvious action: Open Job.

No charts, revenue or unrelated navigation.

### 5.5 Senior technician — job detail

Show in this order:
1. Customer name.
2. Call customer button.
3. Address and Navigate action.
4. AC details.
5. Customer complaint.
6. Start Work button.

### 5.6 Complete work

Use a short guided flow:

**Step A — What work was done?**
Selectable chips:
- Cleaning.
- Repair.
- Installation.
- General servicing.
- Gas-related work.
- Other.

**Step B — Parts/materials**
- None used.
- Add part.
- Quantity.
- Optional short note.

**Step C — Outcome**
- Work completed.
- Needs another visit.
- Could not complete.

**Step D — Evidence**
- Add photo when useful/required.
- Customer confirmation if business policy requires it.

Then one large Finish Work button.

Do not force every job through irrelevant technical readings or long checklists. Service-specific optional fields can be revealed only when relevant.

### 5.7 Helper view

If a helper needs the app:
- Show current assigned team/job.
- Customer locality and job type.
- Simple instruction.
- Call/navigation only if permitted.
- Optional photo capture if the senior technician asks.

The senior technician owns the completion report. The helper should not duplicate it.

### 5.8 Invoice

Show:
- Customer.
- Related job.
- Add service/parts line items.
- Quantity and rate.
- Automatically calculated total.
- Discount/tax only when applicable.
- Save and Share Bill.

Use a simple calculator-like line item editor. Do not show ledger/accounting language.

### 5.9 Payment

Show:
- Bill total.
- Already received.
- Remaining.
- Amount received now.
- Method: Cash / UPI / Bank / Other.
- Save Payment.

The backend must support multiple partial payments.

## 6. Design system

### Visual direction
- Friendly and professional.
- High contrast.
- Simple cards.
- Minimal decoration.
- Clear status labels.
- Consistent spacing.
- Comfortable outdoor readability.

### Palette

Tokens used in the prototype (light theme only, by design):

| Token | Value | Use |
|---|---|---|
| teal | `#0F766E` (dark `#115E59`, tint `#E6F2EF`) | Primary actions, brand |
| saffron | `#E8891C` | Accent, used sparingly |
| paper | `#F7F5F0` | App background |
| surface | `#FFFFFF` | Cards |
| ink | `#14213D` | Main text |
| slate / muted | `#4A5468` / `#5B6576` | Secondary text |
| ok | `#15803D` (tint `#E3F3E8`) | Done, paid |
| warn | `#B45309` (tint `#FDEBD3`) | On hold, money pending |
| bad | `#B42318` (tint `#FBE4E4`) | Errors, not paid |
| info / assigned | `#1E4FBF` / `#5B32B4` | Status chips |

Font: Noto Sans + Noto Sans Devanagari. Contrast still has to be checked on real devices outdoors.

Original direction, kept for reference:
- Primary: deep teal or blue-green.
- Secondary: warm saffron accent used sparingly.
- Background: warm off-white.
- Surface: white.
- Text: dark charcoal.
- Success: green.
- Warning: amber.
- Error: red.
- Neutral: slate gray.

Do not use color alone to communicate status. Always include a text label.

### Typography
Use a font family that supports Devanagari and Latin scripts. Test Marathi/Hindi glyphs on actual Android devices.

Suggested sizes:
- Screen title: 22–26sp.
- Section title: 18–20sp.
- Body: 16–18sp.
- Supporting text: 14–16sp.
- Technician buttons: large and high contrast.

### Touch targets
- Minimum 48dp touch target.
- Main technician actions: approximately 56dp high or larger.
- Generous vertical spacing.
- Avoid tiny icon-only actions.

### Components
Create reusable components:
- PrimaryButton.
- SecondaryButton.
- JobCard.
- CustomerCard.
- StatusChip.
- SearchField.
- PhoneField.
- SelectableOption.
- FormSection.
- EmptyState.
- ErrorState.
- OfflineBanner.
- SaveStatus.
- ConfirmationSheet.
- InvoiceLineItem.
- PaymentSummary.

## 7. Interaction rules

- Ask for confirmation before destructive actions.
- Autosave drafts where safe.
- Preserve entered data when validation fails.
- Avoid keyboard opening unnecessarily.
- Use phone keypad for phone numbers and numeric keypad for amounts.
- Search customers by phone/name.
- Use sensible defaults.
- Use bottom sheets for quick selection.
- Avoid nested menus.
- Use plain-language errors.
- Never silently discard offline changes.

## 8. Language and localization

Initial language options should be:
- English.
- Marathi.
- Hindi.

Allow each user to choose their own interface language. The business data itself should not be forcibly translated.

Use translation keys, not hardcoded UI strings.

Example labels:
- My Work / माझे काम / मेरा काम.
- Start Work / काम सुरू करा / काम शुरू करें.
- Finish Work / काम पूर्ण करा / काम पूरा करें.
- Call Customer / ग्राहकाला कॉल करा / ग्राहक को कॉल करें.

Test language choice with actual technicians. Do not assume their preferred language from their location.

## 9. Accessibility and low-literacy design

- Use icon plus text, not icon alone.
- Keep sentences short.
- Use familiar vocabulary.
- Avoid abbreviations.
- Use large readable text.
- Use consistent button positions.
- Show one primary action at a time.
- Provide clear feedback after saving.
- Do not require users to understand sync or network concepts.
- Avoid relying on color perception.
- Consider optional voice notes in a later phase.

## 10. Prototype test tasks

Ready-to-run session script, task cards in English/Hindi/Marathi and observation sheet: [discovery/USABILITY_TEST_KIT.md](discovery/USABILITY_TEST_KIT.md) (tasks updated for enquiries, ticket paste, partial payment, cash with teams and offline finish). Results go in [discovery/USABILITY_TEST_1.md](discovery/USABILITY_TEST_1.md).

Give users these tasks without coaching:

Owner:
1. Find an existing customer.
2. Create a service job.
3. Assign Team A.
4. Find a completed job.
5. Create and share a bill.
6. Record a partial payment.

Senior technician:
1. Find today's job.
2. Call the customer.
3. Start work.
4. Mark the service performed.
5. Add a photo.
6. Finish work.
7. Repeat with internet disabled.

Helper:
1. Find the current team job.
2. Understand where to go and what assistance is needed.
3. Use the minimum supported action, if any.

Record:
- Time taken.
- Wrong taps.
- Help requested.
- Confusing words.
- Steps users tried to skip.
- Whether users understood the result.

## 11. Design completion criteria

These criteria are the **design gate** (milestone M2 in `PROJECT_ROADMAP.md`). Feature development (Phase 4) does not start until they are met.

Do not begin full implementation until:
- Main flows are clickable.
- Owner can create/assign a job in the prototype.
- Senior technician can complete a job in the prototype.
- Invoice/payment flow is understandable.
- At least one senior technician has tested the workflow.
- Helper account necessity is decided.
- Navigation and screen content are approved.
- Empty, loading, offline and error states are designed.
