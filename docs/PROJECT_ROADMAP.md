# KaamSetu — Project Roadmap

> **Source of truth for:** milestone order, dependencies, and what "done" means for each milestone. Phase detail: `PROJECT_EXECUTION_PLAN.md`. Tasks: `PROJECT_TASK_TRACKER.md`.

## What we are building, and why

A simple Android app that lets a small AC service business stop losing WhatsApp/phone enquiries, assign jobs to field teams, get a reliable record of every job even without internet, and bill and collect money correctly. First for one business in Pune, then as a multi-tenant SaaS for similar businesses across India.

Why this order: the riskiest unknowns are **whether field technicians will actually use it** and **whether we understood the real workflow**, not whether we can write the code. So we validate with real people first, build a thin but complete loop, prove offline reliability, pilot with one business, and only then sell.

## Milestones in dependency order

```text
M0 Foundation ─► M1 Discovery ─► M2 Design gate ─┐
        │                                         ├─► M4 Business records ─► M5 Jobs & assignment ─► M6 Field workflow ─► M7 Offline ─┐
        └────────────► M3 Technical foundation ───┘                                                                               │
                                                                                     M8 Billing & payments ◄──────────────────────┤
                                                                                                                                   ▼
                                                              M9 QA & pilot readiness ─► M10 Pilot ─► M11 SaaS launch ─► M12 Evolve
```

M3 work that does not depend on design (database, CI, auth backend) can run in parallel with M1–M2. Billing (M8) needs completed jobs from M6 but not offline (M7), so M7 and M8 can overlap.

| ID | Milestone | Depends on | Done when | Status |
|---|---|---|---|---|
| M0 | Foundation | — | Docs audited and consistent; repo committed and backed up remotely; dev environment incl. PostgreSQL ready | **Completed** 19 Nov 2026 (only T0.7, an optional cleanup, remains) |
| M1 | Discovery | M0 | Workflow confirmed by owner + senior technician; Q-01, Q-03, Q-04, Q-06 answered; P0 list signed off | **In progress** (discovery kit ready) |
| M2 | Design gate | M1 | Seven core workflows completed by real users in the prototype; design approved; helper decision made | **In progress** (prototype updated with pre-interview answers; user tests pending) |
| M3 | Technical foundation | M0 (design-independent parts), M2 (mobile shell) | Login on a real phone against staging; isolation tests pass; CI green | **In progress** (started in parallel with M1/M2: T3.1, T3.2 done) |
| M4 | Business records | M2, M3 | Owner can onboard, add teams/staff, customers, sites, ACs (modules 4.1–4.4) | Not started |
| M5 | Enquiries, jobs and assignment | M4 | Enquiry → job → team assignment, with history (4.5–4.6) | Not started |
| M6 | Field workflow (online) | M5 | Technician sees, updates and completes jobs with photos; owner sees results (4.7–4.8) | Not started |
| M7 | Offline-first | M6 | All doc 09 §10 scenarios pass on a real phone (4.9) | Not started |
| M8 | Billing and payments | M6 | Bill from a job, GST if needed, partial payments, balances, cash handover if validated; dashboard (4.10–4.12) | Not started |
| M9 | QA and pilot readiness | M7, M8 | Phase 5 gate: PRD §15 passes on devices; no Critical/High bugs; restore tested | Not started |
| M10 | Pilot | M9 | 4 weeks of real use without duplicate paper records | Not started |
| M11 | SaaS launch | M10 | An unrelated business onboards alone; legal docs live; trial and plans work | Not started |
| M12 | Post-MVP evolution | M11 | Ongoing, evidence-driven | — |

## Rough effort (estimates, not commitments)

Assumes one developer working consistently. Re-estimated at every gate.

| Stretch | Estimate |
|---|---|
| M0 → M2 (finish foundation, discovery, design validation) | 2–4 weeks elapsed |
| M3 | 2–3 weeks |
| M4 → M8 | 8–14 weeks |
| M9 | 2–3 weeks |
| M10 | 6–10 weeks elapsed |
| M11 | 3–5 weeks |

Biggest sources of uncertainty: availability of the pilot business for interviews and testing, offline sync complexity, GST rules, and SMS/DLT setup time (see `RISK_REGISTER.md`).

## What comes next

The next milestone is **M1 Discovery**, starting with task T1.1 (owner interview). Before that, finish M0: install PostgreSQL (or approve Docker) and create a private remote repository.
