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
| D-008 | 19 Nov 2026; confirmed by Sadik same day (Q-03) | **Technician records money collected on site; it becomes a payment only after the owner confirms handover** | Owner-only payments (old PRD); technician records payments directly | Prototype shows cash with teams; direct technician payments would make balances unreliable | `CashCollection` entity. UPI goes to the owner's QR (owner confirms on seeing the credit); cash on handover | Accepted | 01, 05, 06, 09 |
| D-009 | 19 Nov 2026 | **Six visible job statuses; appointment, hold side/reason and part requests stored as fields plus a `JobUpdate` feed** | Add statuses for every situation | Keeps the technician UI simple while giving the owner detail | `JobUpdate` entity, `holdSide`, `timeSlot` | Accepted | 01, 05, 06 |
| D-010 | 19 Nov 2026 | **Estimates moved from P0 to P1** | Keep in P0 | Not in prototype or the MVP module list; reduces scope | Superseded by D-020 | Superseded | 01 |
| D-011 | 19 Nov 2026 | **GST optional per organization and per bill, tax rate per line** | No tax in MVP; full GST engine | Prototype includes it; many customers need GST bills; full compliance rules unknown | Fields in 05; no "GST compliant" claim until Q-04 | Proposed | 01, 05 |
| D-012 | 19 Nov 2026 | **UUID primary keys, generated on the phone for offline-created records** | Server integer IDs + temp IDs | Avoids ID remapping in the outbox | Server must handle duplicate/colliding UUIDs | Accepted | 05, 09 |
| D-013 | 19 Nov 2026 | **Money in integer paise** | `Decimal` columns | Exact, simple, same on phone and server | Single formatting helper | Accepted | 04, 05, 11 |
| D-014 | 19 Nov 2026 | **30-day free trial for early-access sign-ups** | 14 days; freemium | Already promised publicly in build-in-public posts | Subscription model must support it | Accepted | 03 |
| D-015 | Before Nov 2026; confirmed 19 Nov 2026 | **Phone number + SMS OTP login** | Passwords; Google sign-in | Field staff may not have email; OTP is familiar | SMS provider and DLT registration needed (Q-08) | Accepted | 06, 10 |
| D-016 | 19 Nov 2026 | **Maestro for mobile end-to-end tests** | Detox; Appium | Simple YAML flows, works with Expo builds | Revisit if flaky | Proposed | 12 |
| D-017 | 19 Nov 2026 | **`app/docs/` is the documentation source of truth**; the old `KaamSetu_Product_Documentation` folder is an outdated copy | Separate docs repo; keep docs outside Git | Docs versioned and reviewed with code | Delete or archive the old folder when you choose | Accepted | README |
| D-018 | 19 Nov 2026 | **Owner's financial writes (bills, payments, handover confirmation) are online-only in MVP** | Full offline for owner | Removes the hardest conflict cases | Narrowed by D-021: other owner actions work offline | Accepted (narrowed) | 09 |

| D-019 | 19 Nov 2026 | **Brand service-centre tickets are a job source**: store the external ticket number and source partner; owner can paste a ticket message to auto-fill a job (checked before saving); ticket closure in the brand portal stays manual, with a "closed in brand portal" tick | Manual typing only; integrate with brand portals | Most jobs arrive as structured WhatsApp texts; pasting saves the owner's time; brand portal APIs are unknown and out of scope | Ticket fields on ServiceRequest/ServiceJob; paste parser per known format; sample formats needed | Accepted | 01, 02, 05, 06 |
| D-020 | 19 Nov 2026 | **Written quotations (estimates) are back in P0** for big jobs (installation, AMC, companies); supersedes D-010 | Keep in P1 | Sadik confirms they are needed in the pilot | Estimate module (create, share PDF, convert to bill) joins module 4.10 | Accepted | 01, tracker |
| D-021 | 19 Nov 2026 | **Owner basic offline**: view loaded jobs/customers, save enquiries, create and assign jobs, add customers and ACs offline, synced later. Bills, payments and handover confirmation stay online-only | Owner fully online (D-018) | Owner is sometimes at sites without network | Owner-created jobs get their number and reach the team only after the owner's phone syncs; the app says so | Accepted | 09 |
| D-022 | 19 Nov 2026 | **Helpers get a simple login**: today's team job, customer name/phone/address, job type, assigned senior technician. No report, billing or customer list | No helper login | Sadik's answer to Q-01 | Helper role in auth; small helper home screen | Accepted | 01, 02, 10 |
| D-023 | 19 Nov 2026 | **Attendance linked to salary is wanted, after the pilot (P1)**. Removed from the non-goals list | Keep as non-goal; build in MVP | Real need, but jobs and billing come first | Design the member model so attendance can attach later | Accepted | 01 |
| D-024 | 19 Nov 2026 | **Parts ordering stays outside KaamSetu.** The technician's "Part needed" update is the request to the owner; ordering happens through the service centre. An owner who is also a technician (one-team business) skips the request | Build parts ordering/inventory | Ordering already runs in the service-centre system | No ordering module; an owner can also be a team member | Accepted | 01, 05 |

## Pending decisions

| ID | Question | Why it matters | Resolve by | How |
|---|---|---|---|---|
| Q-01 | ~~Helper login?~~ **Answered 19 Nov 2026 by Sadik (D-022), confirm in interview** | Accounts, permissions, SMS cost, UI scope | G2 | Helper conversation + prototype test |
| Q-02 | ~~Install PostgreSQL natively or use Docker?~~ **Resolved 19 Nov 2026:** native PostgreSQL 16 (already installed) | Blocks migrations and all backend work | Before Phase 3 | Your choice (you asked to approve software installs) |
| Q-03 | ~~Money on site?~~ **Answered (D-008), confirm in interview** | D-008, payment model | G1 | Owner + technician interview |
| Q-04 | Does the pilot issue GST bills; what format, SAC code, tax split? | Invoice fields and PDF | G1 (before T4.10 at the latest) | Ask the owner's accountant |
| Q-05 | ~~Estimates?~~ **Answered: yes, for big jobs (D-020)** | D-010 | G1 | Owner interview |
| Q-06 | ~~Time slots?~~ **Answered: morning/afternoon; technician fixes exact time** | `timeSlot` values, scheduling UI | G1 | Owner interview |
| Q-07 | ~~Owner offline?~~ **Answered: basic offline (D-021)** | Owner offline scope, D-018 | G1 | Owner interview |
| Q-08 | Which SMS/OTP provider (DLT-registered)? | Login cost and reliability | Before T3.4 goes to staging | Compare 2–3 Indian providers |
| Q-09 | Which hosting provider and region? | Cost, latency, data location | Before T3.10 | Compare against doc 13 §2 criteria |
| Q-10 | ~~Mobile data?~~ **Answered: not a problem** | Upload policy | G1 | Technician interview |
| Q-11 | Which phones/Android versions? **Partly answered: budget Android; exact models at ride-along** | Minimum device target | G1 | Ride-along |
| Q-12 | ~~Which remote Git host?~~ **Resolved 19 Nov 2026:** private GitHub repository | Backup, CI | Before T3.9 | Your choice |
| Q-13 | Commercial terms for the pilot business after the pilot | Trust, Phase 7 | Before G6 | Conversation with owner, in writing |
| Q-14 | For service-centre and builder jobs, who pays the business (customer on site, brand/builder later, or split)? | Billing target, money tracking | G1 | Owner interview |
| Q-15 | Are ticket charges fixed per brand/source; do we need a price list per source? | Bill pre-fill, paste parser | G1 | Owner interview |
