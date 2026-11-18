# KaamSetu — Project Execution Plan

> **Source of truth for:** *how* we get from today to a commercially usable SaaS: phases, what each phase does, its deliverables and its exit gate.
> Order and dependencies: `PROJECT_ROADMAP.md`. Task-level status: `PROJECT_TASK_TRACKER.md`. Decisions: `DECISION_LOG.md`. Risks: `RISK_REGISTER.md`.
> Supersedes `07_ROADMAP_AND_DELIVERY_PLAN.md` (19 Nov 2026).

## Planning assumptions

- One developer (Sadik), part-time-to-full-time, using AI assistance. One pilot business in Pune with ~6–8 teams.
- **No dates are commitments.** Effort ranges below are rough estimates for a solo developer and will be re-estimated at each gate.
- Every phase ends at a **gate**. We do not start the next phase's main work until the gate is passed, except preparation that cannot be wasted (e.g. environment setup).
- Scope is the PRD P0 list. Anything else needs evidence from the pilot (Phase 8).

## Where we are (19 Nov 2026)

| Done | Not done |
|---|---|
| Product docs (01–08), now audited and extended (09–13) | Any conversation with the pilot business recorded as discovery |
| Clickable prototype for owner, technician, helper; offline toggle; English/Hindi/Marathi | Usability test of the prototype with real users |
| Repo with Expo and NestJS scaffolds, Prisma identity schema, `/health` | PostgreSQL, auth, any product feature, CI, hosting |

So: **Phase 0 is nearly complete; Phase 1 is next.**

---

## Phase 0 — Project audit and foundation

**Goal:** one reliable knowledge base and a working repo.

| Activity | Status |
|---|---|
| Existing project assessment, documentation audit (`DOCUMENTATION_AUDIT.md`) | Done |
| Technical feasibility review of the stack (D-001…D-006) | Done; no stack change needed |
| Risk identification (`RISK_REGISTER.md`) | Done |
| Git repository, commit discipline | Done |
| Development environment: Node 24, Git, Expo, NestJS | Done |
| PostgreSQL locally (or Docker) | **Pending your decision (Q-02)** |
| Remote Git hosting (private GitHub) for backup | **Pending (Q-12)** |

**Gate G0:** docs consistent and committed; remote backup of the repo exists. *Estimate: < 1 day remaining.*

## Phase 1 — Product discovery and validation

**Goal:** confirm the real workflow before freezing the design. Do not assume a feature is needed because it is documented.

Activities:
1. **Owner interview (60–90 min)**, ideally at the shop while enquiries arrive. Use the interview guide below.
2. **Senior technician interview + ride-along** for at least one full job (2–3 h).
3. **Helper conversation** (20 min) during the same visit: what they do, whether they use a smartphone, whether they want a login.
4. Collect artefacts with personal data hidden: 5–10 WhatsApp enquiries, a paper bill, a notebook page, the price list, a GST bill if they issue them.
5. Write `docs/discovery/DISCOVERY_FINDINGS.md`: current workflow, pain points ranked, answers to pending questions Q-01…Q-07, Q-10, Q-11.
6. Re-prioritise the MVP with the owner: walk through PRD §7 P0 and mark *must for pilot / later / not needed*.

**Interview guide (minimum questions)**

| Topic | Questions | Resolves |
|---|---|---|
| Enquiries | Walk me through the last 3 enquiries. Where did they come from? What did you write down? Any lost last month? | 8.1, D-007 |
| Scheduling | How do you give a time to a customer? Morning/afternoon or exact time? Who confirms the appointment? | Q-06 |
| Assignment | How do you choose a team? Do helpers swap? How often do teams change? | 8.2 |
| Field work | What does the technician tell you after a job? Parts: who buys, who pays, how recorded? What forces another visit? | 8.3, 8.3a |
| Money | Who collects money on site? Cash or UPI to whose account? When is cash handed over? Any disputes? | **Q-03** |
| Bills | Do you give GST bills? Which customers need them? Who is your accountant? Show me a bill | **Q-04** |
| Helpers | Do helpers have smartphones? Should they see anything? | **Q-01** |
| Devices | Which phones do the technicians use? Android version? Data plan? Where is network bad? | Q-10, Q-11 |
| Owner offline | Are you ever without internet when an enquiry comes in? | Q-07 |
| Language | Which language does each person prefer to read? | 02 §8 |
| Success | What would make you stop using the notebook? What would make you give up on the app? | Success metrics |

Deliverables: discovery findings, updated PRD and decision log, prioritised P0 list signed off by the owner.
**Gate G1:** owner and one senior technician agree the documented workflow is how they actually work; Q-01, Q-03, Q-04, Q-06 answered. *Estimate: 1–2 weeks elapsed (depends on the business's availability), ~3 days of effort.*

## Phase 2 — UX/UI design

**Goal:** prove with real users that the core loop is understandable before building it.

The prototype already exists (doc 02 §0), so this phase is **update → test → fix → approve**, not design from scratch:

1. Update the prototype with discovery findings (time slots, money collection, GST, helper decision).
2. Confirm information architecture and navigation per role (doc 02 §3).
3. Usability test the seven core workflows with the owner, one senior technician and one helper, without coaching (doc 02 §10):
   1. Owner creates a customer.
   2. Owner creates a service job.
   3. Owner assigns a technician team.
   4. Technician receives the assigned job.
   5. Technician completes the work (also with internet off).
   6. Owner generates an invoice.
   7. Owner records payment.
4. Record time taken, wrong taps, help requested, confusing words. Fix and re-test the worst problems.
5. Finalise the design system: tokens (doc 02 §6), component list, empty/loading/offline/error states for every core screen.
6. Hindi/Marathi rendering and outdoor contrast check on a real Android phone.
7. Design approval by the owner (written OK on WhatsApp is enough).

Deliverables: updated prototype, usability findings (`docs/discovery/USABILITY_TEST_1.md`), approved screen list, component spec.
**Gate G2 (design gate, doc 02 §11):** all seven workflows completed by real users with at most minor help; helper account decision made; owner approval. *Estimate: 1–2 weeks.*

## Phase 3 — Technical foundation

**Goal:** a secure, testable skeleton every feature can be built on. Parts that do not depend on design (database, CI, auth backend) may start during Phase 2.

| Area | Work | Docs |
|---|---|---|
| Repository | Remote, branch rules, `docs/` README, `.env.example` complete | 11 |
| Database | PostgreSQL locally + first migration; seed script with synthetic data | 05, 12 |
| Backend | `/api/v1` prefix, global validation pipe, error filter and error shape, request ID, structured redacted logging, config validation | 06, 11 |
| Auth | OTP request/verify with dev stub, JWT access + rotating refresh tokens, devices, logout | 10 |
| Tenancy and roles | Membership guard, role guard, organization-scoped data helper, isolation test harness | 03, 10, 12 |
| Mobile | Install planned libraries (TanStack Query, Zustand, React Hook Form, Zod, SQLite, SecureStore, i18n); theme from design tokens; role-based navigation shell; login screens; API client with token refresh | 04 |
| Offline base | SQLite schema + migrations on the phone; outbox table and sender loop (no business operations yet) | 09 |
| CI | Lint, type-check, tests for both apps on every push; Postgres service for integration tests | 13 |
| Staging | Hosting decision (Q-09), staging API + DB, EAS build profile | 13 |

**Gate G3:** a user can log in on a real Android phone against staging; a second organization's data is provably invisible; CI is green. *Estimate: 2–3 weeks.*

## Phase 4 — Core MVP development

**Goal:** the P0 product, built as independently testable modules in dependency order. Each module ends with a demo on a real phone and a commit.

For every module the task tracker holds: business objective, user stories, frontend tasks, backend tasks, database changes, API, validation rules, error scenarios, unit tests, integration tests, acceptance criteria, dependencies. Summary:

| # | Module | Objective | Depends on | Key acceptance |
|---|---|---|---|---|
| 4.1 | Authentication and business onboarding | Owner signs up and sets up the business in minutes | G3 | New owner reaches the home screen with business name, address, GST setting |
| 4.2 | Organization, employees and teams | Owner adds staff and teams; staff log in | 4.1 | Team with 1 senior + helper(s); employee logs in via OTP; deactivated employee loses access |
| 4.3 | Customer management | Find or add a customer in seconds | 4.1 | Search by phone/name; duplicate phone warning; default site auto-created |
| 4.4 | AC equipment management | Know every AC a customer has | 4.3 | Add/edit ACs per site; AC service history visible |
| 4.5 | Enquiries (service requests) | Never lose a WhatsApp/phone enquiry | 4.3 | Save enquiry; open list on home; convert to job without retyping |
| 4.6 | Job creation and assignment | Create and assign a job in about a minute | 4.4, 4.5, 4.2 | Job with ACs, service type, day/slot, team; reassignment keeps history; one-day helper swap |
| 4.7 | Technician job workflow (online) | Technician knows what to do and reports progress | 4.6 | My Work list; call/directions; status updates incl. part needed and holds; owner feed |
| 4.8 | Service reports and photo uploads | Every completed job has a record | 4.7 | Finish page per AC; parts; outcome; photos; follow-up job linked |
| 4.9 | Offline-first field workflow | No field work lost without network | 4.7, 4.8 | All doc 09 §10 scenarios pass on a real phone |
| 4.10 | Invoicing | Bill from a completed job in under 2 minutes | 4.8 | Line items, discount, optional GST per line, server totals, numbering, PDF, WhatsApp share, issued bill immutable |
| 4.11 | Payment tracking | Always know who owes what | 4.10 | Multiple partial payments; Paid/Partly paid/Not paid; cash collection handover if Q-03 says yes |
| 4.12 | Basic dashboard | Owner sees the day at a glance | 4.6–4.11 | Home cards: enquiries, jobs needing a team, needs-action list, today's jobs by status, money to collect |

Offline (4.9) is listed where it gets *finished*; the technician screens in 4.7–4.8 are built on the local database from the start so offline is not a rewrite.

**Gate G4:** PRD §15 criteria demonstrable on staging with synthetic data. *Estimate: 8–14 weeks; re-estimate after module 4.3.*

## Phase 5 — Integration and quality assurance

Activities (details in doc 12): end-to-end core loop (Maestro); role and permission tests; multi-tenant isolation suite; offline and sync scenarios; duplicate submission; conflict handling (owner cancels while technician completes offline); performance on a mid-range phone; security review (doc 10 §5); device compatibility on the team's actual phones; usability test of the built app with the owner and a technician; restore test.

**Gate G5 (pilot readiness):** all PRD §15 criteria pass on real devices; no open Critical/High bugs; backup restore tested. *Estimate: 2–3 weeks.*

## Phase 6 — Pilot deployment (controlled)

1. Production environment, monitoring and alerts live (doc 13).
2. Pilot agreement with the owner: free during pilot, data stays theirs, what happens after (Q-13).
3. Initial data entry: teams, employees, top customers and ACs (help the owner or import from a sheet).
4. Training: 30 minutes with the owner; 15 minutes per team on site, in their language.
5. **Start with 1–2 teams for 2 weeks**, then expand to all teams once they use it reliably.
6. Weekly check-in: what is used, what is skipped, parallel paper/WhatsApp tracking, bugs.
7. Measure PRD §14 metrics; triage feedback into *bug / usability / new need*; fix bugs and usability first.

**Gate G6:** the business runs its jobs and billing in KaamSetu for 4 consecutive weeks without keeping a duplicate notebook record for the same jobs; offline failures recovered without data loss. *Estimate: 6–10 weeks elapsed.*

## Phase 7 — SaaS launch preparation

Subscription plans and the 30-day trial (D-014); billing provider decision (manual UPI invoices first is acceptable); self-service onboarding; plan limits enforcement; terms, privacy policy, DPDP review with a lawyer; trademark/domain/Play Store name check for "KaamSetu"; data export; row-level security as defence in depth; production security review; support process (WhatsApp support number, response times); user guide (short videos in Hindi/Marathi); release process (doc 13 §6); launch checklist.

**Gate G7:** a second, unrelated business can sign up, onboard and use KaamSetu without your help; legal documents published. *Estimate: 3–5 weeks.*

## Phase 8 — Post-MVP evolution

Prioritise only with evidence from pilot and early customers (usage data + repeated requests from more than one business). Candidates: AMC management, estimates, expenses, WhatsApp Business API messages, advanced reports, customer booking page, inventory, GPS, advanced scheduling, more languages, iOS. Each candidate gets a short problem statement and a decision log entry before work starts.

---

## Definition of done

Moved here from the old doc 07, unchanged in meaning. A feature is done only when:
- User flow is clear and matches doc 02.
- UI handles loading, empty, error and offline states.
- Input validation works on phone and server.
- Backend authorization works and **tenant isolation is tested**.
- Offline behaviour is defined (doc 09) and tested if applicable.
- Audit/history is preserved where required.
- Real-device testing is complete for field features.
- User-facing language is understandable in English, Hindi and Marathi.
- Documentation is updated and the change is committed.

## How this plan stays current

At every gate: update the task tracker statuses, re-estimate the next phase, log decisions, update risks, add a changelog entry, commit. If a discovery changes a decision, follow the change process in `docs/README.md`.
