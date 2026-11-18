# 01 — KaamSetu Product Requirements Document (PRD)

## 1. Product summary

KaamSetu is a simple, Android-first SaaS application for small AC service and maintenance companies in India. It combines essential service operations with lightweight billing.

The product helps an owner keep track of customers, AC units, service requests, teams, completed work, bills and payments. Field staff should be able to understand their tasks with minimal reading and typing.

### Product promise

**The owner knows what is happening. The senior technician knows what to do. The helper can assist without struggling with software.**

## 2. Business context

Initial customer profile:

- AC service company.
- Approximately 6–8 field teams.
- Approximately 1–5 jobs per day.
- Residential and commercial customers.
- Services include split/window/commercial AC servicing, repair, cleaning, installation/uninstallation, gas-related work and AMC visits.
- Enquiries mainly arrive through WhatsApp and phone.
- No dedicated office manager.
- Billing and payment tracking are mostly manual.
- Each field team has a senior/main technician and a helper.

These are the initial pilot assumptions. Validate the actual daily workflow before treating every assumption as universal.

## 3. Product goals

1. Stop losing customer requests in WhatsApp conversations.
2. Make it easy for the owner to create and assign a service job.
3. Give the senior technician a clear view of the team's assigned work.
4. Let helpers participate without requiring complicated data entry.
5. Capture a basic service record for every completed job.
6. Make invoices and payment balances easy to create and understand.
7. Preserve customer and AC service history.
8. Support field work when mobile internet is unavailable.
9. Keep the product simple enough to learn with little training.

## 4. Non-goals for the initial release

Do not build these into the first release unless pilot evidence proves they are essential:

- Full accounting or ERP.
- Payroll and employee attendance.
- GPS/live tracking.
- Route optimization.
- In-app chat.
- Complex inventory/warehouse management.
- Automated WhatsApp Business API.
- AI diagnosis.
- Customer-facing mobile app.
- Separate owner, senior technician and helper apps.
- Complex technician performance scoring.
- Custom workflow builder.
- Microservices.
- iOS launch.
- Advanced analytics.

## 5. User personas

### 5.1 Owner

Needs:
- See today's jobs and pending jobs.
- Create a customer/job quickly from a WhatsApp or phone enquiry.
- Assign a team.
- Know whether work was completed.
- Create a bill and record payment.
- See who owes money.
- Find a customer's previous service history.

Design requirements:
- Simple dashboard.
- Few primary actions.
- No complicated accounting terminology.
- Search by customer name or phone.
- Fast repeat-customer job creation.

### 5.2 Senior / Main Technician

The senior technician is the main technical person on a field team and is responsible for the job on site.

Needs:
- See jobs assigned to their team or to them.
- View customer address and AC complaint.
- Call the customer.
- Start work.
- Record work performed.
- Add a short note or readings when needed.
- Add photos when useful or required.
- Mark complete or request another visit.

Design requirements:
- Large buttons.
- Short labels.
- One clear next action.
- Minimal typing.
- No access to company financial reports.
- Offline-first job completion.

### 5.3 Helper

The helper supports the senior technician. The helper should not be forced to complete a separate administrative workflow.

Possible needs:
- See the current job and address.
- Know the basic task.
- Assist the senior technician.
- Optionally add a photo or simple completion input if the senior asks.

Design requirements:
- Simplest interface.
- No complex service checklist by default.
- No billing or customer administration.
- Access only to the current/assigned team's relevant job information.

**Important:** The pilot must validate whether helpers need their own login. If they do not use the app directly, the senior technician can submit the job report for the team. Do not require an account for every helper merely because they are part of a team.

## 6. Roles and permissions

Use three practical role types:

| Capability | Owner | Senior technician | Helper |
|---|---|---|---|
| View all company jobs | Yes | No | No |
| Create customer | Yes | No | No |
| Create service job | Yes | No | No |
| Assign team | Yes | No | No |
| View assigned team jobs | Yes | Yes | Limited |
| Start/update job | Yes | Yes | Optional limited |
| Submit service report | Review | Yes | No by default |
| View invoice/payment | Yes | No | No |
| Record payment | Yes | No | No |
| Manage employees/teams | Yes | No | No |
| View business reports | Yes | No | No |

A senior technician is the operational lead for the job/team. Do not create a separate manager role in the initial release.

The data model should support a future optional team supervisor role without requiring it now.

## 7. Core modules and priority

### P0 — Required for first usable pilot

1. Authentication and business setup.
2. Owner dashboard.
3. Employee and team setup.
4. Customer records.
5. Sites/locations, kept optional for simple residential customers.
6. AC equipment records.
7. Service request/job creation.
8. Team assignment.
9. Senior technician job workflow.
10. Simple service completion record.
11. Offline storage and sync for field work.
12. Basic estimates/invoices.
13. Payment recording and outstanding balance.
14. Customer service history.

### P1 — After initial pilot

1. Basic AMC contracts and visit tracking.
2. Expense tracking.
3. Basic business reports.
4. Marathi/Hindi localization refinement.
5. Customer reminders.
6. Better PDF invoice customization.
7. Team workload overview.

### P2 — Only when validated

1. Inventory and stock.
2. Advanced AMC automation.
3. WhatsApp Business API integration.
4. Advanced financial reports.
5. Multiple branches.
6. Customer portal.
7. GPS or route features.

## 8. Main workflows

### 8.1 Enquiry to job

1. Customer calls or sends WhatsApp message.
2. Owner opens KaamSetu.
3. Owner searches customer by phone.
4. If customer exists, select them; otherwise add name, phone and address.
5. Select existing AC unit or add a basic AC record.
6. Select service type.
7. Enter a short complaint.
8. Select visit date/time if known.
9. Assign a field team.
10. Save job.

Target: a repeat-customer job should be created in about one minute after the owner is familiar with the app.

### 8.2 Team assignment

1. Owner opens a new job.
2. Selects a team.
3. The senior technician receives the assignment.
4. The senior technician sees the job in the team's work list.
5. Helper is associated with the team/job where required.
6. Owner can see the job status.

Avoid requiring the owner to select both senior and helper for every job if team membership already determines the normal pairing. Allow exceptions when staff are unavailable.

### 8.3 Field job completion

1. Senior technician opens the assigned job.
2. Reviews customer, address, AC and complaint.
3. Calls customer or opens map navigation if needed.
4. Taps Start Work.
5. Selects work performed from a short list.
6. Adds parts/materials only if used.
7. Adds a short note or relevant readings if needed.
8. Adds photos where useful/required.
9. Selects outcome:
   - Work completed.
   - Needs another visit.
   - Could not complete.
10. Submits the job.

The helper does not need to duplicate the senior technician's report.

### 8.4 Billing and payment

1. Owner opens completed job.
2. Taps Create Bill.
3. Adds service/parts line items.
4. App calculates totals.
5. Owner saves/shares invoice.
6. Owner records cash, UPI or bank payment.
7. App displays received and remaining amounts.

### 8.5 Repeat customer

1. Search customer by phone.
2. Open customer.
3. See saved AC units and prior jobs.
4. Create a new job using saved information.
5. Avoid re-entering details already known.

### 8.6 AMC visit

1. Owner creates a basic AMC contract.
2. Selects customer and covered AC units.
3. Records contract dates and planned visits.
4. A visit becomes a normal service job.
5. Senior technician completes the normal job workflow.
6. Visit history is updated.

## 9. Service categories

Initial categories:

- AC servicing.
- AC cleaning/deep cleaning.
- Repair/troubleshooting.
- Installation.
- Uninstallation.
- Gas/refrigerant-related work.
- Commercial AC maintenance.
- AMC visit.
- Inspection.
- Other.

Use short, category-specific checklists. Do not show irrelevant checklist items for a job type.

## 10. Job statuses

Keep the visible workflow small:

- New.
- Assigned.
- In Progress.
- On Hold.
- Completed.
- Cancelled.

Use additional internal events for rescheduling, report submission and review rather than exposing too many statuses.

A job needing a follow-up should be marked as requiring another visit and linked to a new job/visit. Do not overwrite the previous completed service record.

## 11. Customer and equipment model

A customer can have one or more service locations. A location can have many AC units. For a simple residential customer, the app can create a default location automatically.

AC fields:
- Type.
- Brand.
- Capacity.
- Model (optional).
- Serial number (optional).
- Room/location label.
- Installation date (optional).
- Warranty date (optional).
- Refrigerant type (optional).
- Photos (optional).

Do not force technicians to fill every technical field during a service visit.

## 12. Billing requirements

Initial billing is a lightweight job-linked bill generator, not a full accounting system.

Invoice line item:
- Description.
- Quantity.
- Unit/rate.
- Line total.

Invoice totals:
- Subtotal.
- Discount (optional).
- Tax (optional and configured only after requirements are validated).
- Grand total.
- Amount received.
- Amount remaining.

Payment methods:
- Cash.
- UPI.
- Bank transfer.
- Other.

Support partial payments and multiple payments per invoice.

The interface should say:
- Bill total.
- Received.
- Remaining.
- Paid / Partly paid / Not paid.

The backend should preserve financial history and prevent silent modification of issued invoices.

## 13. Offline requirements

Senior technicians must be able to:
- Open previously downloaded assigned jobs.
- View relevant customer and AC details.
- Start work.
- Complete job checklist.
- Add notes and readings.
- Capture photos.
- Save completion locally.

When online:
- Upload queued changes.
- Upload photos.
- Retry failed operations.
- Prevent duplicate submissions.
- Detect conflicting updates.

Technicians should see simple states: Saved, Sending, Sent, Needs attention. Never show terms such as outbox, API, sync cursor or conflict resolution in their normal workflow.

## 14. Success metrics

Measure actual usefulness, not feature count:

- Time to create a repeat-customer job.
- Percentage of jobs with a completed service record.
- Percentage of jobs with an assigned team.
- Number of lost/missed requests.
- Time to create/share an invoice.
- Accuracy of outstanding balances.
- Number of duplicate customer records.
- Offline completion success rate.
- Time needed for a new technician to learn the app.
- Weekly active use by owner and field teams.

## 15. MVP acceptance criteria

The first release is ready for pilot when:

- Owner can set up teams with a senior technician and helper.
- Owner can add/search customers.
- Owner can register AC units.
- Owner can create and assign jobs.
- Senior technician can see the assigned job.
- Senior technician can complete a job without a lengthy form.
- Helper is not forced to duplicate data entry.
- Job details and photos survive app restart and offline use.
- Sync retries do not duplicate jobs or reports.
- Owner can create an invoice from a job.
- Owner can record partial/full payments.
- Outstanding balance is correct.
- Tenant data is isolated.
- A real technician can complete the main flow with minimal assistance.
