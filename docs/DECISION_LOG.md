# KaamSetu — Decision Log

> **Source of truth for:** significant product and technical decisions and why they were made. Never silently change a decision: add a new entry that supersedes the old one and update every affected document.
> Status: **Accepted** (in force), **Proposed** (our working assumption, needs validation), **Superseded**.

## Decisions

| ID | Date | Decision | Context and options considered | Reasoning | Consequences | Status | Docs affected |
|---|---|---|---|---|---|---|---|
| D-001 | Before Nov 2026 | **Android-first, one role-based app** (owner, senior technician, helper) | Separate apps per role; iOS + Android | Pilot staff use Android; one app is cheaper to build and ship | iOS deferred to post-MVP | Accepted | README, 01, 02 |
| D-002 | Before Nov 2026; confirmed 19 Nov 2026 | **React Native + Expo + TypeScript; NestJS; PostgreSQL + Prisma** | Flutter; Firebase/Supabase backend; plain Express | One language end to end; Expo handles builds/updates; NestJS gives module structure; PostgreSQL suits money and tenancy. Audit found no feasibility reason to change | Versions pinned in 04 §2 | Accepted | 04 |
| D-003 | Before Nov 2026; clarified 19 Nov 2026 | **Modular monolith; design validated before feature code** | Microservices; build first, design later | Solo developer; workflow risk is higher than technical risk. The existing generic scaffold is fine; feature code waits for gate G2 | No feature modules until M2, except design-independent foundation | Accepted | 04, plan |
| D-004 | Before Nov 2026 | **Multi-tenant, shared database, `organizationId` on every business row**, enforced in the application; RLS later | Database per tenant; schema per tenant | Simplest to operate at small scale; strong tests make it safe | Isolation tests mandatory per module | Accepted | 03, 10, 12 |
| D-005 | 19 Nov 2026 | **One repository, no shared package yet** | Monorepo tooling (Turborepo/Nx) with shared types | Not needed until API types must be shared | Add `packages/contracts` when first needed | Accepted | 11 |
| D-006 | 19 Nov 2026 | **Hand-written outbox over Expo SQLite** for offline | WatermelonDB; PowerSync/ElectricSQL; RxDB | Field writes are mostly append-only, so a simple outbox covers them with no vendor lock-in. Revisit if sync code grows unmanageable | We own retry, conflict and cursor code | Accepted | 04, 09 |
| D-007 | 19 Nov 2026 | **Enquiry (`ServiceRequest`) is separate from the job**; owner can also create a job directly | Only jobs; enquiry as a job status | Prototype shows enquiries waiting to be booked; keeps job list clean; one request can lead to many visits | New module 4.5; enquiry numbers | Accepted | 01, 05, 06 |
| D-008 | 19 Nov 2026 | **Technician records money collected on site; it becomes a payment only after the owner confirms handover** | Owner-only payments (old PRD); technician records payments directly | Prototype shows cash with teams; direct technician payments would make balances unreliable | `CashCollection` entity; needs validation (Q-03) | Proposed | 01, 05, 06, 09 |
| D-009 | 19 Nov 2026 | **Six visible job statuses; appointment, hold side/reason and part requests stored as fields plus a `JobUpdate` feed** | Add statuses for every situation | Keeps the technician UI simple while giving the owner detail | `JobUpdate` entity, `holdSide`, `timeSlot` | Accepted | 01, 05, 06 |
| D-010 | 19 Nov 2026 | **Estimates moved from P0 to P1** | Keep in P0 | Not in prototype or the MVP module list; reduces scope | Re-add if discovery shows they are needed (Q-05) | Proposed | 01 |
| D-011 | 19 Nov 2026 | **GST optional per organization and per bill, tax rate per line** | No tax in MVP; full GST engine | Prototype includes it; many customers need GST bills; full compliance rules unknown | Fields in 05; no "GST compliant" claim until Q-04 | Proposed | 01, 05 |
| D-012 | 19 Nov 2026 | **UUID primary keys, generated on the phone for offline-created records** | Server integer IDs + temp IDs | Avoids ID remapping in the outbox | Server must handle duplicate/colliding UUIDs | Accepted | 05, 09 |
| D-013 | 19 Nov 2026 | **Money in integer paise** | `Decimal` columns | Exact, simple, same on phone and server | Single formatting helper | Accepted | 04, 05, 11 |
| D-014 | 19 Nov 2026 | **30-day free trial for early-access sign-ups** | 14 days; freemium | Already promised publicly in build-in-public posts | Subscription model must support it | Accepted | 03 |
| D-015 | Before Nov 2026; confirmed 19 Nov 2026 | **Phone number + SMS OTP login** | Passwords; Google sign-in | Field staff may not have email; OTP is familiar | SMS provider and DLT registration needed (Q-08) | Accepted | 06, 10 |
| D-016 | 19 Nov 2026 | **Maestro for mobile end-to-end tests** | Detox; Appium | Simple YAML flows, works with Expo builds | Revisit if flaky | Proposed | 12 |
| D-017 | 19 Nov 2026 | **`app/docs/` is the documentation source of truth**; the old `KaamSetu_Product_Documentation` folder is an outdated copy | Separate docs repo; keep docs outside Git | Docs versioned and reviewed with code | Delete or archive the old folder when you choose | Accepted | README |
| D-018 | 19 Nov 2026 | **Owner's financial writes (bills, payments, handover confirmation) are online-only in MVP** | Full offline for owner | Removes the hardest conflict cases | Owner sees a clear "needs internet" message | Proposed (Q-07) | 09 |

## Pending decisions

| ID | Question | Why it matters | Resolve by | How |
|---|---|---|---|---|
| Q-01 | Do helpers get their own login, and what may they see? | Accounts, permissions, SMS cost, UI scope | G2 | Helper conversation + prototype test |
| Q-02 | Install PostgreSQL natively or use Docker for local development? | Blocks migrations and all backend work | Before Phase 3 | Your choice (you asked to approve software installs) |
| Q-03 | Do technicians collect money on site, and how is it handed over? | D-008, payment model | G1 | Owner + technician interview |
| Q-04 | Does the pilot issue GST bills; what format, SAC code, tax split? | Invoice fields and PDF | G1 (before T4.10 at the latest) | Ask the owner's accountant |
| Q-05 | Are estimates/quotations needed before the pilot? | D-010 | G1 | Owner interview |
| Q-06 | What time slots does the owner actually give customers? | `timeSlot` values, scheduling UI | G1 | Owner interview |
| Q-07 | Does the owner need to work offline (e.g. save enquiries)? | Owner offline scope, D-018 | G1 | Owner interview |
| Q-08 | Which SMS/OTP provider (DLT-registered)? | Login cost and reliability | Before T3.4 goes to staging | Compare 2–3 Indian providers |
| Q-09 | Which hosting provider and region? | Cost, latency, data location | Before T3.10 | Compare against doc 13 §2 criteria |
| Q-10 | Are technicians worried about mobile data use (photos)? | Upload policy | G1 | Technician interview |
| Q-11 | Which phones/Android versions does the team use? | Minimum device target | G1 | Ride-along |
| Q-12 | Which remote Git host (private GitHub suggested)? | Backup, CI | Before T3.9 | Your choice |
| Q-13 | Commercial terms for the pilot business after the pilot | Trust, Phase 7 | Before G6 | Conversation with owner, in writing |
