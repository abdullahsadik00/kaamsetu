# KaamSetu — Project Task Tracker

> **Source of truth for:** what is being done, by whom, and its status. Hierarchy: Phase → Milestone → Module → Task → Subtask.
> Status values: Not Started / In Progress / Blocked / In Review / Completed. Priority: Critical / High / Medium / Low.
> Update this file in the same commit as the work. Tasks for later phases are deliberately coarser and get split when their phase starts.

**Last updated:** 19 Nov 2026

## Phase 0 — Foundation (M0)

| ID | Task | Pri | Status | Depends | Deliverable | Acceptance criteria | Docs | Testing |
|---|---|---|---|---|---|---|---|---|
| T0.1 | Scaffold mobile and backend, identity schema, `/health` | High | Completed | — | Commits `3d26084`…`f21fd10` | Backend builds, 1 test passes, app bundles | 04, 11 | `npm test`, `npm run build` |
| T0.2 | Bring docs into the repo | High | Completed | — | `docs/` (commit `10375c0`) | All docs versioned | README | — |
| T0.3 | Documentation audit | High | Completed | T0.2 | `DOCUMENTATION_AUDIT.md` | Lists docs, contradictions, missing docs, open decisions | — | — |
| T0.4 | Update docs; add specs 09–13; plan, roadmap, tracker, logs | High | Completed | T0.3 | Docs commits of 19 Nov 2026 | No contradictions left unrecorded | all | Consistency review |
| T0.5 | Install PostgreSQL 16+ locally (or Docker) | Critical | Completed (PostgreSQL 16.14 was already installed; DB `kaamsetu` + migration `20261119035740_init`, commit `19cdc2e`) | — | Running DB, `DATABASE_URL` set | `/health` reports `database: up`; first migration applies | README, 13 | `npx prisma migrate dev` |
| T0.6 | Private remote repository + push | High | Completed (private repo github.com/abdullahsadik00/kaamsetu, `main` tracks `origin/main`) | — | Remote `origin` | `main` pushed; history intact | 11 | — |
| T0.8 | Local lint: Windows Application Control blocks oxlint's native binary | Low | Worked around (lint runs and passes in CI on every push; local lint still blocked) | — | Lint runs locally or in CI | `npm run lint` passes somewhere on every push | 11 | — |
| T0.7 | Decide the uncommitted formatting change in `backend/src/prisma/prisma.service.ts` | Low | Completed (committed `586e934`) | — | Commit or discard by you | Working tree clean | — | Build passes |

## Phase 1 — Discovery (M1)

| ID | Task | Pri | Status | Depends | Deliverable | Acceptance criteria | Docs | Testing |
|---|---|---|---|---|---|---|---|---|
| T1.1 | Owner interview using `discovery/INTERVIEW_KIT.md` Part A, focused on "Still to ask" in the findings | Critical | In Progress (most answers given by Sadik 19 Nov; Q-14, Q-15, Q-04 details and confirmation remain) | — | Notes in `docs/discovery/` | All guide topics covered; real examples collected | Plan Ph1 | — |
| T1.2 | Senior technician interview + ride-along on one job | Critical | Not Started | — | Notes, photos of current process (no personal data) | Field steps, parts, money, network gaps recorded | Plan Ph1 | — |
| T1.3 | Helper conversation | High | Not Started | — | Notes | Q-01 answerable | 02 §3 | — |
| T1.4 | Collect artefacts (WhatsApp enquiries, bill, price list, GST bill) with data hidden | High | Not Started | T1.1 | Files in `docs/discovery/artefacts/` | No customer names/phones visible | — | — |
| T1.5 | Ask the owner's accountant about GST bill requirements | High | Not Started | T1.1 | Written answer | Q-04 resolved | 01 §12 | — |
| T1.6 | Write discovery findings; resolve Q-01, Q-03, Q-04, Q-06, Q-07, Q-10, Q-11, Q-14, Q-15 | Critical | In Progress (pre-interview answers recorded) | T1.1–T1.5 | `DISCOVERY_FINDINGS.md`; decision log updated | Each question has an answer or a planned test | DECISION_LOG | — |
| T1.7 | Update PRD/UX/DB docs from findings | High | Not Started | T1.6 | Doc commits | No contradiction with findings | 01, 02, 05 | Consistency review |
| T1.9 | Collect 5 anonymised samples of each service-centre ticket format | High | Not Started | T1.1 | `discovery/artefacts/ticket-formats.md` | Every known format covered; no real names/phones | 01 | Used as parser test cases |
| T1.8 | Owner signs off prioritised P0 list | Critical | Not Started | T1.7 | Written OK (WhatsApp fine) | Each P0 item marked must / later / not needed | 01 §7 | — |

## Phase 2 — UX/UI design (M2)

| ID | Task | Pri | Status | Depends | Deliverable | Acceptance criteria | Docs | Testing |
|---|---|---|---|---|---|---|---|---|
| T2.1 | Update prototype with discovery findings | Critical | In Progress (pre-interview answers applied 19 Nov; Q-14, Q-15, GST details pending) | T1.8 | Updated `design/KaamSetu Prototype.html` | Reflects all resolved questions | 02 | Self-review |
| T2.2 | Usability test: owner (tasks 1–3, 6–7) | Critical | Not Started | T2.1 | Test notes | Times, wrong taps, help needed recorded | 02 §10 | Moderated test |
| T2.3 | Usability test: senior technician (tasks 4–5, with internet off) | Critical | Not Started | T2.1 | Test notes | Completes a job with at most minor help | 02 §10 | Moderated test |
| T2.4 | Usability test: helper | High | Not Started | T2.1 | Test notes; helper login decision | Q-01 closed | 02 §5.7 | Moderated test |
| T2.5 | Fix top usability issues; re-test the worst flow | Critical | Not Started | T2.2–T2.4 | Prototype v2, `USABILITY_TEST_1.md` | Previously failing task now passes | 02 | Re-test |
| T2.6 | Finalise design system: tokens, components, states | High | Not Started | T2.5 | Doc 02 §6 updated; component list with states | Every core screen has empty/loading/offline/error state | 02 | Review |
| T2.7 | Hindi/Marathi and outdoor contrast check on a real Android phone | High | Not Started | T2.5 | Notes, screenshots | No clipped Devanagari; readable in sunlight | 02 §8 | Device check |
| T2.8 | Design approval from owner | Critical | Not Started | T2.5–T2.7 | Written approval | Gate G2 passed | 02 §11 | — |

## Phase 3 — Technical foundation (M3)

| ID | Task | Pri | Status | Depends | Deliverable | Acceptance criteria | Docs | Testing |
|---|---|---|---|---|---|---|---|---|
| T3.1 | API conventions: `/api/v1`, validation pipe, error filter/shape, request ID | Critical | Completed 19 Nov 2026 (`src/app.setup.ts`, `src/common/`; e2e tests) | T0.5 | Backend commit | Unknown fields rejected; errors match doc 06 | 06, 11 | Unit + e2e |
| T3.2 | Structured logging with redaction; config validation | High | Completed 19 Nov 2026 (`src/config/env.ts`; JSON logs in staging/production; per-request line without bodies) | T3.1 | Backend commit | No phone/OTP/token in logs; missing config fails startup | 10, 11 | Unit |
| T3.3 | Seed script (synthetic business like the prototype + second org) | High | Not Started | T0.5 | `prisma/seed.ts` | Re-runnable; no real data | 12 | Runs in CI |
| T3.4 | Auth: OTP request/verify (dev stub), JWT, rotating refresh tokens, devices, logout | Critical | Not Started | T3.1 | `auth` module + schema (Device, OtpChallenge, RefreshToken) | Rate limits; token reuse revokes device | 10 | Unit + integration |
| T3.5 | Membership + role guards; organization-scoped data helper; isolation test harness | Critical | Not Started | T3.4 | Guards, helper, test utilities | Cross-org request returns 404 | 03, 10, 12 | Integration |
| T3.6 | Mobile libraries, theme from tokens, i18n (en/hi/mr), API client with refresh | Critical | Not Started | T2.6 | Mobile commit | App runs on device in 3 languages | 04, 02 | Component tests |
| T3.7 | Mobile login + role-based navigation shell (owner / technician / helper) | Critical | Not Started | T3.4, T3.6, T2.8 | Screens | Each role lands on its home | 02 §3 | Component + manual |
| T3.8 | Mobile SQLite schema/migrations + outbox table and sender loop | Critical | Not Started | T3.6 | `src/db`, `src/features/sync` | Outbox survives app kill; retries with backoff | 09 | Unit |
| T3.9 | CI: lint, type-check, tests both apps; Postgres service | High | Completed 19 Nov 2026 (`.github/workflows/ci.yml`; first run green; mobile checks non-blocking until T3.6) | T0.6 | Workflow file | Green on `main` | 13 | CI |
| T3.10 | Hosting decision; staging API + DB + bucket; EAS build profile | High | Not Started | Q-09 | Staging URL, APK | Login works on a phone against staging | 13 | Smoke test |

## Phase 4 — Core MVP modules (M4–M8)

Each module below gets split into subtasks (frontend / backend / DB / tests) when it starts. All modules share the definition of done in the execution plan and the non-negotiable tests in doc 12 §2 (tenant isolation, role scope, money, idempotency, state machine).

### T4.1 Authentication and business onboarding — Critical — Not Started — depends G3
- **Objective:** an owner signs up and sets up the business in minutes.
- **Stories:** As an owner I log in with my phone and OTP. I enter business name, phone, address, GST setting. I can skip optional fields.
- **Frontend:** welcome, phone, OTP, business profile, optional "add first team" prompt.
- **Backend:** `POST /organizations` on first login creates org + OWNER membership + trial subscription row.
- **DB:** Organization (exists), Subscription.
- **Validation:** Indian mobile number (10 digits, starts 6–9); business name required; GSTIN format if given.
- **Errors:** OTP expired/wrong/too many; SMS not delivered (resend after 30 s).
- **Tests:** unit for validation; integration for signup creating exactly one org; isolation.
- **Acceptance:** new owner reaches Home with business details saved; second login lands on Home directly.

### T4.2 Organization, employees and teams — Critical — Not Started — depends T4.1
- **Objective:** owner adds staff and teams; staff log in with no setup.
- **Stories:** add employee with role; create team with one primary senior and helpers; deactivate employee; revoke devices.
- **Frontend:** Teams list/detail, Employee add/edit, invite SMS confirmation.
- **Backend/API:** doc 06 §3–4. **DB:** Team, TeamMember, OrganizationMember status.
- **Validation:** one active primary senior per team; members active and in same org; no hard-coded team limit.
- **Errors:** phone already a member; removing a senior with assigned jobs (warn, require reassignment).
- **Tests:** team rules; deactivated member's token refresh fails; isolation.
- **Acceptance:** owner sets up 6 teams; a technician logs in and sees the technician home.

### T4.3 Customer management — Critical — Not Started — depends T4.1
- **Objective:** find or add a customer in seconds.
- **Stories:** search by phone or name; add with name, phone, address; customer can have several sites; archive.
- **Frontend:** Customers list/search, add/edit, detail with sites. **Backend/API:** doc 06 §5. **DB:** Customer, Site.
- **Validation:** phone format; warn on duplicate phone within org; default site created from address.
- **Errors:** duplicate warning; archived customer search.
- **Tests:** search by partial phone; duplicate detection per org only; isolation.
- **Acceptance:** repeat customer found by last 4 digits of phone in < 5 s.

### T4.4 AC equipment management — High — Not Started — depends T4.3
- **Objective:** know every AC a customer has and its history.
- **Stories:** add AC with type, brand, capacity, room; optional fields hidden by default; view AC history.
- **DB:** Equipment. **API:** doc 06 §5.
- **Validation:** AC belongs to a site of the same customer. **Tests:** isolation; history query.
- **Acceptance:** AC added in < 30 s; shows past jobs.

### T4.5 Enquiries (service requests) — High — Not Started — depends T4.3
- **Objective:** never lose a WhatsApp/phone enquiry.
- **Stories:** save enquiry with source and complaint; see open enquiries on Home; convert to job; close with reason.
- **DB:** ServiceRequest (+ request number sequence). **API:** doc 06 §5a.
- **Validation:** customer required (or quick-add); complaint short text.
- **Tests:** conversion copies data and links job; numbering per org unique under concurrency.
- **Acceptance:** enquiry → job in one tap with no retyping.

### T4.5a Service-centre ticket paste — High — Not Started — depends T4.5, T1.9
- **Objective:** turn a pasted ticket message into an enquiry/job in seconds (D-019).
- **Work:** parser per known format (pure function, fully unit-tested against T1.9 samples); review screen; ticket number, source partner; duplicate-ticket warning; "Closed in brand portal" tick.
- **Acceptance:** every sample format fills name, phone, address, pincode, job type, ticket number and charges correctly; unknown text falls back to manual entry without losing what was pasted.

### T4.6 Job creation and assignment — Critical — Not Started — depends T4.4, T4.5, T4.2
- **Objective:** create and assign a job in about a minute.
- **Stories:** create job with ACs, service type, complaint, day and slot, team, amount to collect; reassign; one-day helper swap; cancel with reason; follow-up job linked.
- **DB:** ServiceJob, JobEquipment, JobAssignment, JobTechnician, JobStatusHistory, job number sequence. **API:** doc 06 §6.
- **Validation:** status state machine; team active; ACs belong to the job's site.
- **Errors:** invalid transition (`INVALID_STATUS_TRANSITION`); stale edit (`VERSION_CONFLICT`).
- **Tests:** state machine exhaustive; assignment history; isolation; technician sees job after assignment.
- **Acceptance:** repeat-customer job created and assigned in ≈ 1 minute by the owner.

### T4.7 Technician job workflow — Critical — Not Started — depends T4.6, T3.8
- **Objective:** technician knows what to do and reports progress.
- **Stories:** My Work (today/tomorrow); job detail; call; directions; appointment fixed; start; part needed; customer not ready; can't continue; note; owner sees "Latest from teams".
- **Frontend:** built on the local SQLite store from day one. **DB:** JobUpdate. **API:** `POST /jobs/:id/updates`, sync pull.
- **Validation:** technician can act only on their team's jobs; reason required for our-side hold.
- **Tests:** role scope (other team's job = 404); update feed ordering.
- **Acceptance:** a technician with no training finds today's job and starts it.

### T4.8 Service reports and photo uploads — Critical — Not Started — depends T4.7
- **Objective:** every completed job has a record.
- **Stories:** finish page: work per AC, parts, note, photos, outcome, money from customer (if Q-03); needs another visit creates a linked follow-up suggestion for the owner.
- **DB:** ServiceReport, JobWorkItem, JobPartUsage, JobReading, Attachment, CashCollection. **API:** doc 06 §7, attachments upload URL.
- **Validation:** outcome required; reason for "could not finish"; photo size limit.
- **Tests:** report preserved on re-submit; signed URL scope; isolation of attachments.
- **Acceptance:** job finished in < 2 minutes on site; owner sees report and photos.

### T4.9 Offline-first field workflow — Critical — Not Started — depends T4.7, T4.8
- **Objective:** no field work lost without network.
- **Work:** sync bootstrap/changes/operations endpoints; per-record conflict policy; photo queue; retention; *Saved/Sending/Sent/Needs attention* UI.
- **Tests:** all 12 scenarios in doc 09 §10, automated where possible, plus real-phone run.
- **Acceptance:** 3 days offline with 5 jobs and 20 photos syncs with zero loss and zero duplicates.

### T4.10 Invoicing and quotations — Critical — Not Started — depends T4.8 (and Q-04 for GST)
- **Objective:** bill from a completed job in under 2 minutes.
- **Stories:** create a written quotation for big jobs, share as PDF, convert to bill (D-020); create bill from job (prefilled parts/services and ticket charges); add lines; discount; GST per line if enabled; issue; PDF; share on WhatsApp; cancel with reason.
- **DB:** Invoice, InvoiceItem, numbering. **API:** doc 06 §8.
- **Validation:** server recalculates totals in paise; issued bill immutable; cancellation keeps record.
- **Tests:** money suite (doc 12 §2); numbering under concurrency; PDF contains required fields.
- **Acceptance:** bill PDF shared on WhatsApp from a completed job in < 2 minutes.

### T4.11 Payment tracking — Critical — Not Started — depends T4.10
- **Objective:** always know who owes what.
- **Stories:** record cash/UPI/bank/other payment, partial or full, several per bill; see Paid/Partly paid/Not paid; confirm or reject cash handed over by teams (if Q-03).
- **DB:** Payment, PaymentAllocation, CashCollection status. **API:** doc 06 §8.
- **Validation:** amount > 0; idempotency key; cannot exceed remaining without explicit confirmation.
- **Tests:** balances after any payment sequence; duplicate submission creates one payment; void keeps audit.
- **Acceptance:** outstanding balance per customer matches a hand calculation for 20 mixed cases.

### T4.12 Basic dashboard — High — Not Started — depends T4.6–T4.11
- **Objective:** owner sees the day at a glance (prototype home).
- **Cards:** open enquiries, jobs needing a team, needs-action list (parts, holds, appointment not fixed), today by status, latest from teams, money to collect, cash with teams.
- **Tests:** counts match underlying queries; isolation.
- **Acceptance:** owner answers "what needs my attention now?" from the home screen alone.

## Phase 5–8 (coarse; split when the phase starts)

| ID | Task | Pri | Status | Depends | Acceptance |
|---|---|---|---|---|---|
| T5.1 | Maestro end-to-end core loop | Critical | Not Started | T4.11 | Runs green on emulator |
| T5.2 | Full isolation + role suite review | Critical | Not Started | T4.12 | Every endpoint covered |
| T5.3 | Offline/sync/conflict test campaign on real phones | Critical | Not Started | T4.9 | Doc 09 §10 all pass |
| T5.4 | Performance and device compatibility | High | Not Started | T4.12 | Doc 12 §6 targets met |
| T5.5 | Security review | Critical | Not Started | T4.12 | Doc 10 §5 checklist complete |
| T5.6 | Usability test of built app with owner + technician | High | Not Started | T4.12 | No blocker issues |
| T5.7 | Backup restore test | Critical | Not Started | T3.10 | Restore documented with timing |
| T6.1 | Production environment + monitoring + runbook | Critical | Not Started | G5 | Alerts reach your phone |
| T6.2 | Pilot agreement, data entry, training | Critical | Not Started | T6.1 | Teams trained; data loaded |
| T6.3 | Pilot with 1–2 teams, then all teams; weekly review | Critical | Not Started | T6.2 | Gate G6 |
| T7.1 | Plans, 30-day trial, limits, billing provider | High | Not Started | G6 | Trial expiry handled without data loss |
| T7.2 | Legal: terms, privacy, DPDP review, trademark/domain check | Critical | Not Started | — (can start earlier) | Published documents |
| T7.3 | Self-service onboarding, data export, support process, user guide | High | Not Started | G6 | Unrelated business onboards alone |
| T8.x | Post-MVP candidates | — | Not Started | G7 | Each needs evidence + decision log entry |
