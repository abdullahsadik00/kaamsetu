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
| T2.2 | Usability test: owner (tasks 1–3, 6–7) | Critical | Not Started (kit ready: `discovery/USABILITY_TEST_KIT.md`, results in `USABILITY_TEST_1.md`) | T2.1 | Test notes | Times, wrong taps, help needed recorded | 02 §10 | Moderated test |
| T2.3 | Usability test: senior technician (tasks 4–5, with internet off) | Critical | Not Started (kit ready: `discovery/USABILITY_TEST_KIT.md`, results in `USABILITY_TEST_1.md`) | T2.1 | Test notes | Completes a job with at most minor help | 02 §10 | Moderated test |
| T2.4 | Usability test: helper | High | Not Started (kit ready: `discovery/USABILITY_TEST_KIT.md`, results in `USABILITY_TEST_1.md`) | T2.1 | Test notes; helper login decision | Q-01 closed | 02 §5.7 | Moderated test |
| T2.5 | Fix top usability issues; re-test the worst flow | Critical | Not Started | T2.2–T2.4 | Prototype v2, `USABILITY_TEST_1.md` | Previously failing task now passes | 02 | Re-test |
| T2.6 | Finalise design system: tokens, components, states | High | Not Started | T2.5 | Doc 02 §6 updated; component list with states | Every core screen has empty/loading/offline/error state | 02 | Review |
| T2.7 | Hindi/Marathi and outdoor contrast check on a real Android phone | High | Not Started | T2.5 | Notes, screenshots | No clipped Devanagari; readable in sunlight | 02 §8 | Device check |
| T2.8 | Design approval from owner | Critical | Not Started | T2.5–T2.7 | Written approval | Gate G2 passed | 02 §11 | — |

## Phase 3 — Technical foundation (M3)

| ID | Task | Pri | Status | Depends | Deliverable | Acceptance criteria | Docs | Testing |
|---|---|---|---|---|---|---|---|---|
| T3.1 | API conventions: `/api/v1`, validation pipe, error filter/shape, request ID | Critical | Completed 19 Nov 2026 (`src/app.setup.ts`, `src/common/`; e2e tests) | T0.5 | Backend commit | Unknown fields rejected; errors match doc 06 | 06, 11 | Unit + e2e |
| T3.2 | Structured logging with redaction; config validation | High | Completed 19 Nov 2026 (`src/config/env.ts`; JSON logs in staging/production; per-request line without bodies) | T3.1 | Backend commit | No phone/OTP/token in logs; missing config fails startup | 10, 11 | Unit |
| T3.3 | Seed script (synthetic business like the prototype + second org) | High | Completed 19 Nov 2026 (`prisma/seed.ts`, `npm run db:seed`; identity data only; extend it in every module that adds tables) | T0.5 | `prisma/seed.ts` | Re-runnable; no real data | 12 | Runs in CI |
| T3.4 | Auth: OTP request/verify (dev stub), JWT, rotating refresh tokens, devices, logout | Critical | Completed 19 Nov 2026 (`src/auth/`, migration `auth`; global deny-by-default guard; 13 e2e tests). SMS provider still open (Q-08) | T3.1 | `auth` module + schema (Device, OtpChallenge, RefreshToken) | Rate limits; token reuse revokes device | 10 | Unit + integration |
| T3.5 | Membership + role guards; organization-scoped data helper; isolation test harness | Critical | Completed 19 Nov 2026 (`@Roles()`, `scoped()`/`requireOrg()`, `test/helpers/tenants.ts`; read-only `GET /organization`, `/employees`, `/employees/:id`) | T3.4 | Guards, helper, test utilities | Cross-org request returns 404 | 03, 10, 12 | Integration |
| T3.6 | Mobile libraries, theme from tokens, i18n (en/hi/mr), API client with refresh | Critical | Completed 19 Nov 2026 (`src/theme`, `src/localization` with prototype hi/mr labels, `src/api` client with single-flight refresh, tokens in SecureStore; login/owner hi/mr labels need native-speaker review) | T2.6 | Mobile commit | App runs on device in 3 languages | 04, 02 | Component tests |
| T3.7 | Mobile login + role-based navigation shell (owner / technician / helper) | Critical | Completed 19 Nov 2026 (phone → OTP, `Stack.Protected` per role, placeholder tabs, "Set up your business", language switch on Profile/More) | T3.4, T3.6, T2.8 | Screens | Each role lands on its home | 02 §3 | Component + manual |
| T3.8 | Mobile SQLite schema/migrations + outbox table and sender loop | Critical | Completed 19 Nov 2026 (`src/db` per-user DB, `user_version` migrations; `src/features/sync` outbox + sender with backoff; 11 Jest tests on Node SQLite) | T3.6 | `src/db`, `src/features/sync` | Outbox survives app kill; retries with backoff | 09 | Unit |
| T3.9 | CI: lint, type-check, tests both apps; Postgres service | High | Completed 19 Nov 2026 (`.github/workflows/ci.yml`; first run green; mobile lint, type-check and unit tests blocking since T3.6–T3.8) | T0.6 | Workflow file | Green on `main` | 13 | CI |
| T3.11 | Pilot login (D-025): Google sign-in (owner and staff) + owner QR / 6-digit invite to link staff; reset link from Employees | Critical | Completed 20 Nov 2026 (EAS dev build on a real phone: owner, senior technician and helper each signed in with Google, joined with phone + code and landed on their home; QR scanning not yet tried on a device, needs a second phone) | T3.7 | Backend Google ID-token check, invite table; mobile Google sign-in + QR scan; EAS dev build | Each seeded role logs in with Google and lands on its home; invite single-use and expiring | 10, 05, 06 | Unit + integration + device |
| T3.10 | Hosting decision; staging API + DB + bucket; EAS build profile | High | Completed 20 Nov 2026 (D-026: Render free `kaamsetu-api-staging-0368.onrender.com` + Supabase Mumbai; EAS preview APK; owner signed in with Google and joined on a phone against staging; nightly encrypted backup green; UptimeRobot 5-min ping; rate limits checked behind the proxy) | Q-09 | Staging URL, APK | Login works on a phone against staging | 13 | Smoke test |
| T3.12 | Open point from T3.11: try joining by scanning the owner's invite QR on a real device | High | Not Started (PHONE_TEST_PLAN TP-26, needs a second phone) | T3.11 | Device check notes | Second phone scans the QR and lands on its role's home; a non-KaamSetu QR shows "not an invite" | 10 §2 | Device |
| T3.13 | Open point from T3.11: Join screen says only "This invite does not work" when the mobile number has no open invite; add a hint to check the number | Medium | Completed 20 Nov 2026 (`INVITE_NOT_FOR_THIS_PHONE` with a "check the number" hint in en/hi/mr; e2e test) | T3.11 | Mobile + backend message | A technician who types the wrong number understands what to fix | 08 §7 | Component |
| T3.14 | Open point: native-speaker review of the Hindi/Marathi login, owner, join and employee strings (written by Claude; the prototype has these screens in English only) | Medium | Not Started (PHONE_TEST_PLAN TP-37) | T3.6, T3.11 | Corrected `mobile/src/localization/resources/hi.ts`, `mr.ts` | A Hindi and a Marathi speaker approve the wording | 08 | Review |

## Phase 4 — Core MVP modules (M4–M8)

Each module below gets split into subtasks (frontend / backend / DB / tests) when it starts. All modules share the definition of done in the execution plan and the non-negotiable tests in doc 12 §2 (tenant isolation, role scope, money, idempotency, state machine).

### T4.1 Authentication and business onboarding — Critical — In Progress (built early under D-027: Google sign-in + "Set up a new business" + 30-day trial + "Add employee" + remove employee + business details; backend d14b216/b393f8d, app 484a356/ba07c91; phone test pending, see PHONE_TEST_PLAN TP-05–08, TP-25) — depends G3 (waived for this module by D-027)
- **Objective:** an owner signs up and sets up the business in minutes.
- **Stories:** As an owner I log in with my phone and OTP. I enter business name, phone, address, GST setting. I can skip optional fields.
- **Frontend:** welcome, phone, OTP, business profile, optional "add first team" prompt.
- **Backend:** `POST /organizations` on first login creates org + OWNER membership + trial subscription row.
- **DB:** Organization (exists), Subscription.
- **Validation:** Indian mobile number (10 digits, starts 6–9); business name required; GSTIN format if given.
- **Errors:** OTP expired/wrong/too many; SMS not delivered (resend after 30 s).
- **Tests:** unit for validation; integration for signup creating exactly one org; isolation.
- **Acceptance:** new owner reaches Home with business details saved; second login lands on Home directly.

### T4.2 Organization, employees and teams — Critical — In Progress (built early: add/remove employees under D-027, teams under D-029; backend 7cfd43b; phone test pending, see PHONE_TEST_PLAN TP-09; reassignment warning waits for jobs) — depends T4.1
- **Objective:** owner adds staff and teams; staff log in with no setup.
- **Stories:** add employee with role; create team with one primary senior and helpers; deactivate employee; revoke devices.
- **Frontend:** Teams list/detail, Employee add/edit, invite SMS confirmation.
- **Backend/API:** doc 06 §3–4. **DB:** Team, TeamMember, OrganizationMember status.
- **Validation:** one active primary senior per team; members active and in same org; no hard-coded team limit.
- **Errors:** phone already a member; removing a senior with assigned jobs (warn, require reassignment).
- **Tests:** team rules; deactivated member's token refresh fails; isolation.
- **Acceptance:** owner sets up 6 teams; a technician logs in and sees the technician home.

### T4.3 Customer management — Critical — In Progress (built early under D-028: search, add with default site, duplicate warning, addresses, edit, archive; backend 7cf2731; phone test pending, see PHONE_TEST_PLAN TP-10–11) — depends T4.1
- **Objective:** find or add a customer in seconds.
- **Stories:** search by phone or name; add with name, phone, address; customer can have several sites; archive.
- **Frontend:** Customers list/search, add/edit, detail with sites. **Backend/API:** doc 06 §5. **DB:** Customer, Site.
- **Validation:** phone format; warn on duplicate phone within org; default site created from address.
- **Errors:** duplicate warning; archived customer search.
- **Tests:** search by partial phone; duplicate detection per org only; isolation.
- **Acceptance:** repeat customer found by last 4 digits of phone in < 5 s.

### T4.4 AC equipment management — High — Completed 22 Nov 2026 (D-028: add/remove ACs per address; history: `GET /customers/:id/history`, `GET /equipment/:id/history` 0c91022, app AC page and Past jobs card c257d43; e2e and component tests; phone test TP-42 pending) — depends T4.3
- **Objective:** know every AC a customer has and its history.
- **Stories:** add AC with type, brand, capacity, room; optional fields hidden by default; view AC history.
- **DB:** Equipment. **API:** doc 06 §5.
- **Validation:** AC belongs to a site of the same customer. **Tests:** isolation; history query.
- **Acceptance:** AC added in < 30 s; shows past jobs.

### T4.5 Enquiries (service requests) — High — In Progress (built early under D-033: save with source, Open/Closed lists, enquiry page with Call/WhatsApp, close with reason, convert to job in one tap, open count on Home; backend 3c348d5/f1ed1d2, app 9b8f738; phone test pending, see PHONE_TEST_PLAN TP-30) — depends T4.3
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

### T4.6 Job creation and assignment — Critical — In Progress (owner side built early under D-030: create with ACs/type/day/slot/team/amount, assign and change team with history, reschedule with version check, cancel with reason, follow-up; backend 7c86feb; enquiry link done under D-033; one-day helper swap done 22 Nov 2026 under D-038 (phone test TP-40); phone test pending, see PHONE_TEST_PLAN TP-13–15, TP-22) — depends T4.4, T4.5, T4.2
- **Objective:** create and assign a job in about a minute.
- **Stories:** create job with ACs, service type, complaint, day and slot, team, amount to collect; reassign; one-day helper swap; cancel with reason; follow-up job linked.
- **DB:** ServiceJob, JobEquipment, JobAssignment, JobTechnician, JobStatusHistory, job number sequence. **API:** doc 06 §6.
- **Validation:** status state machine; team active; ACs belong to the job's site.
- **Errors:** invalid transition (`INVALID_STATUS_TRANSITION`); stale edit (`VERSION_CONFLICT`).
- **Tests:** state machine exhaustive; assignment history; isolation; technician sees job after assignment.
- **Acceptance:** repeat-customer job created and assigned in ≈ 1 minute by the owner.

### T4.7 Technician job workflow — Critical — In Progress (built early under D-031: `GET /my/jobs` team-scoped, helpers slimmer (Q-01); Start/Hold/Finish saved in the phone outbox and sent to `POST /sync/operations`, idempotent; My Work and helper Today's work screens with call and directions, last list kept offline; backend b7a5789, app a8d37f4; job updates feed done 22 Nov 2026 under D-037 (Appointment fixed, Part needed, Note for owner; owner Updates from teams, Home bell, job page feed; phone test TP-39); phone test pending, see PHONE_TEST_PLAN TP-16–18, TP-20, TP-23–24) — depends T4.6, T3.8
- **Objective:** technician knows what to do and reports progress.
- **Stories:** My Work (today/tomorrow); job detail; call; directions; appointment fixed; start; part needed; customer not ready; can't continue; note; owner sees "Latest from teams".
- **Frontend:** built on the local SQLite store from day one. **DB:** JobUpdate. **API:** `POST /jobs/:id/updates`, sync pull.
- **Validation:** technician can act only on their team's jobs; reason required for our-side hold.
- **Tests:** role scope (other team's job = 404); update feed ordering.
- **Acceptance:** a technician with no training finds today's job and starts it.

### T4.8 Service reports and photo uploads — Critical — In Progress (finish page built early under D-032: outcome, work per AC, parts, money taken (cash/UPI, with team until owner confirms), note required for "couldn't do it"; saved offline with `job.complete`; owner sees the report; backend 4961d01, app 39cb3e0; **photos waiting for a storage bucket (Cloudflare R2, D-026)**; phone test pending, see PHONE_TEST_PLAN TP-19, TP-21) — depends T4.7
- **Objective:** every completed job has a record.
- **Stories:** finish page: work per AC, parts, note, photos, outcome, money from customer (if Q-03); needs another visit creates a linked follow-up suggestion for the owner.
- **DB:** ServiceReport, JobWorkItem, JobPartUsage, JobReading, Attachment, CashCollection. **API:** doc 06 §7, attachments upload URL.
- **Validation:** outcome required; reason for "could not finish"; photo size limit.
- **Tests:** report preserved on re-submit; signed URL scope; isolation of attachments.
- **Acceptance:** job finished in < 2 minutes on site; owner sees report and photos.

### T4.9 Offline-first field workflow — Critical — In Progress (backend built early under D-035: `GET /sync/bootstrap`, `GET /sync/changes` with removals, conflict codes, operation purge; 5049a60. App side done 22 Nov 2026: SQLite job store, push-then-pull with cursor, bootstrap/reset, removals, single-flight, business-switch wipe, Saved/Sending/Sent/Needs attention with per-code reasons in en/hi/mr. Owner offline reading (D-021) done 22 Nov 2026: loaded screens kept on the phone for 3 days per business and role, loads pause offline (9e2eae4, TP-44). Owner offline saving (D-021) done 22 Nov 2026: customers, ACs, enquiries and jobs saved with phone ids, sent in order, "Waiting to send" card (80032e7, b75f1ea, TP-45); converting an enquiry and changing a team stay online. Open: photo queue (TP-32); phone test TP-33) — depends T4.7, T4.8
- **Objective:** no field work lost without network.
- **Work:** sync bootstrap/changes/operations endpoints; per-record conflict policy; photo queue; retention; *Saved/Sending/Sent/Needs attention* UI.
- **Tests:** all 12 scenarios in doc 09 §10, automated where possible, plus real-phone run.
- **Acceptance:** 3 days offline with 5 jobs and 20 photos syncs with zero loss and zero duplicates.

### T4.10 Invoicing and quotations — Critical — In Progress (backend built early under D-034: bills KS-0001 and quotations Q-001, totals in paise, discount, provisional GST, issue/cancel, bill from job, quotation → bill; 6971f80. App done 22 Nov 2026: Billing tab, bill/quotation forms and pages, draft edit with version check, issue, cancel, PDF via share sheet, Make bill on completed jobs. Rate list (D-039: More › Rate list, picker on bill lines; 137310d, 3d61de8) and bill date chips (174cdd2) done 22 Nov 2026; phone test TP-43. Billing stays online-only in MVP (D-018, D-021; doc 09 §2), so no offline billing; GST rates wait for Q-04; phone test TP-34) — depends T4.8 (and Q-04 for GST)
- **Objective:** bill from a completed job in under 2 minutes.
- **Stories:** create a written quotation for big jobs, share as PDF, convert to bill (D-020); create bill from job (prefilled parts/services and ticket charges); add lines; discount; GST per line if enabled; issue; PDF; share on WhatsApp; cancel with reason.
- **DB:** Invoice, InvoiceItem, numbering. **API:** doc 06 §8.
- **Validation:** server recalculates totals in paise; issued bill immutable; cancellation keeps record.
- **Tests:** money suite (doc 12 §2); numbering under concurrency; PDF contains required fields.
- **Acceptance:** bill PDF shared on WhatsApp from a completed job in < 2 minutes.

### T4.11 Payment tracking — Critical — In Progress (backend built early under D-034: payments with idempotency key, over-pay guard, void, customer outstanding, confirm/reject team cash; 6971f80. App done 22 Nov 2026: Record payment with idempotency key and over-pay prompt, Remove payment, Cash with teams Got it / Not received, customer outstanding; phone test TP-35) — depends T4.10
- **Objective:** always know who owes what.
- **Stories:** record cash/UPI/bank/other payment, partial or full, several per bill; see Paid/Partly paid/Not paid; confirm or reject cash handed over by teams (if Q-03).
- **DB:** Payment, PaymentAllocation, CashCollection status. **API:** doc 06 §8.
- **Validation:** amount > 0; idempotency key; cannot exceed remaining without explicit confirmation.
- **Tests:** balances after any payment sequence; duplicate submission creates one payment; void keeps audit.
- **Acceptance:** outstanding balance per customer matches a hand calculation for 20 mixed cases.

### T4.12 Basic dashboard — High — Completed 22 Nov 2026 (D-036: `GET /dashboard` plus the Home cards; e2e checks counts against the lists, isolation and roles; 4 component tests; "parts needed" shows as Can't continue holds since there is no part-request record; phone test TP-36 pending) — depends T4.6–T4.11
- **Objective:** owner sees the day at a glance (prototype home).
- **Cards:** open enquiries, jobs needing a team, needs-action list (parts, holds, appointment not fixed), today by status, latest from teams, money to collect, cash with teams.
- **Tests:** counts match underlying queries; isolation.
- **Acceptance:** owner answers "what needs my attention now?" from the home screen alone.

## Phase 5–8 (coarse; split when the phase starts)

| ID | Task | Pri | Status | Depends | Acceptance |
|---|---|---|---|---|---|
| T5.1 | Maestro end-to-end core loop | Critical | Not Started | T4.11 | Runs green on emulator |
| T5.2 | Full isolation + role suite review | Critical | Completed 22 Nov 2026 (`test/route-inventory.e2e-spec.ts`: snapshot of all routes with roles; 401 without token and 403 for every excluded role on every route; review found no business route without roles. Isolation: every by-id query taking an id from the URL is preceded by a `scoped()` lookup; each module's e2e tests another business's ids (404). Re-run when routes change) | T4.12 | Every endpoint covered |
| T5.3 | Offline/sync/conflict test campaign on real phones | Critical | Not Started (automated cover checked 22 Nov 2026, doc 09 §10: 1, 2, 6, 8, 9, 10, 11 in `sync.e2e-spec`/`field.e2e-spec`; 3, 4, 7 (lost answer, killed mid-send) in `outbox.test`/`job-sync.test`/`sync-engine.test`; 12 without photos is safe because the outbox sends one operation at a time. 5, 7 and 12 with photos wait for the photo queue. The phone run still has to do all 12) | T4.9 | Doc 09 §10 all pass |
| T5.4 | Performance and device compatibility | High | In Progress (API part done 22 Nov 2026: `npm run test:perf` loads 2 years of one business (2,000 customers, 3,000 ACs, 12,000 jobs, 4,000 bills) and times 15 list endpoints; all p95 ≤ 39 ms on the local database, limit 500 ms. Open: same run against staging; My Work < 2 s and Finish < 1 s on a mid-range phone; minimum device, Q-11) | T4.12 | Doc 12 §6 targets met |
| T5.5 | Security review | Critical | Completed 22 Nov 2026 (`docs/SECURITY_REVIEW.md`: security headers, AuditLog, dependency audit in CI added; one accepted high in Prisma CLI tooling. Repeat before launch) | T4.12 | Doc 10 §5 checklist complete |
| T5.6 | Usability test of built app with owner + technician | High | Not Started | T4.12 | No blocker issues |
| T5.7 | Backup restore test | Critical | Completed 20 Nov 2026 for pilot staging (`restore-test.yml`: newest encrypted backup restored into PostgreSQL 17 in 5 s, migrations and row counts checked; runs monthly). Repeat for production hosting | T3.10 | Restore documented with timing |
| T6.1 | Production environment + monitoring + runbook | Critical | Not Started (runbook for pilot staging written 22 Nov 2026: `docs/RUNBOOK.md`; production choice Q-09 and alerts to phone still open) | G5 | Alerts reach your phone |
| T6.2 | Pilot agreement, data entry, training | Critical | In Progress (22 Nov 2026: customer import `npm run pilot -- import-customers`, `docs/PILOT_GUIDE.md`, draft `docs/PILOT_AGREEMENT.md`; owner sign-off, real data and training sessions still to do) | T6.1 | Teams trained; data loaded |
| T6.3 | Pilot with 1–2 teams, then all teams; weekly review | Critical | Not Started | T6.2 | Gate G6 |
| T7.1 | Plans, 30-day trial, limits, billing provider | High | In Progress (22 Nov 2026: owner sees the trial days left on More, `npm run pilot -- extend-trial`; nothing blocked at the end. Still to decide: what happens after the trial, plans and prices, limits, billing provider) | G6 | Trial expiry handled without data loss |
| T7.2 | Legal: terms, privacy, DPDP review, trademark/domain check | Critical | In Progress (22 Nov 2026: `/privacy` and `/terms` brought up to date with the built features, draft `docs/PILOT_AGREEMENT.md`; lawyer review, DPDP review and trademark/domain check still to do) | — (can start earlier) | Published documents |
| T7.3 | Self-service onboarding, data export, support process, user guide | High | In Progress (data export done 22 Nov 2026: `GET /organization/export`, `npm run pilot -- export`, and More › Download business data in the app (TP-46); help 22 Nov 2026: More / Profile › Help with WhatsApp and email support from the server's settings, privacy policy, terms, app version (TP-47); pilot guide `docs/PILOT_GUIDE.md`. Still to do: self-service onboarding check with an unrelated business, short videos in Hindi/Marathi) | G6 | Unrelated business onboards alone |
| T7.4 | Owner does field work, for one- and two-person businesses (Q-16, D-043) | High | Completed 23 Nov 2026 (backend `c8875e2`, app `aa9bffc`; phone test TP-49 pending a new APK) | D-041 | Owner joins a team; My work tab | An owner in a team starts and finishes that team's jobs, offline too; other teams' jobs stay hidden | 01, 06 | e2e + app tests + TP-49 |
| T7.5 | Rename to KaamSaathi (D-042) | High | Not Started (waiting on IP India, MCA, Play Store and domain checks by Sadik) | T7.2 checks | App name, site, docs, store listing | No "KaamSetu" left in user-facing text; package id unchanged | 08 | Review |
| T7.6 | Business type at sign-up decides the screens (D-044) | High | Completed 23 Nov 2026 (backend `b30d0f0`, app `565e6ef` + `fc96cce` welcome/walkthrough screens 51-52; phone test TP-50 pending a new APK) | T7.4 | Type choice at sign-up; feature gates on server and app; type change in Business details | A solo owner never sees Teams/Employees and the server refuses them; changing type works up and down with clear reasons | 01, 03, 06 | e2e + app tests + TP-50 |
| T8.x | Post-MVP candidates | — | Not Started | G7 | Each needs evidence + decision log entry |
