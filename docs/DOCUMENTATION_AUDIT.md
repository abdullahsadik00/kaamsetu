# KaamSetu — Documentation Audit (19 Nov 2026)

This audit covers every project document and the code as it stood on 19 Nov 2026. It records what we found, so later readers can see why the documents changed. Fixes are tracked in [CHANGELOG.md](CHANGELOG.md), decisions in [DECISION_LOG.md](DECISION_LOG.md).

## 1. What exists

### Workspace

| Location | What it is | In Git? |
|---|---|---|
| `D:\Sadik\KaamSetu\app` | Code repository (`mobile/`, `backend/`), branch `main`, no remote | Yes |
| `D:\Sadik\KaamSetu\KaamSetu_Product_Documentation` | Original product docs (8 Markdown files, README, 2 HTML design files) | No |
| `D:\Sadik\KaamSetu\build-in-public` | Marketing plan and first social posts | No |

**Change made:** the product docs were copied unchanged into `app/docs/` (commit `10375c0`). From now on **`app/docs/` is the source of truth**. The original folder was not modified and is now an outdated copy.

### Documents

| Document | Quality before the audit | Verdict |
|---|---|---|
| `README.md` (docs index) | Good summary and index | Update: add the source-of-truth map, governance, and new documents |
| `01_PRODUCT_REQUIREMENTS.md` | Detailed and sensible | Update: add flows the prototype introduced (enquiries, hold reasons, cash collected by teams, appointment fixing, GST) |
| `02_UX_UI_DESIGN_SPEC.md` | Detailed | Update: record that the prototype exists, its real design tokens, and what it still needs (user testing) |
| `03_SAAS_BUSINESS_MODEL.md` | Good principles | Small update: the public "30 days free" promise sets the trial length |
| `04_TECHNICAL_ARCHITECTURE.md` | Good | Update: separate "installed" from "planned", point offline detail to the new sync spec |
| `05_DATABASE_AND_DOMAIN_MODEL.md` | Detailed logical model | Update: fields the prototype needs (time slot, hold reason, per-AC work, cash collection, per-line GST) |
| `06_API_AND_INTEGRATION_SPEC.md` | Good outline | Small update: enquiry endpoints, status-update endpoint, cash handover |
| `07_ROADMAP_AND_DELIVERY_PLAN.md` | Good, but overlaps the new plan | Superseded by `PROJECT_EXECUTION_PLAN.md` and `PROJECT_ROADMAP.md`; turned into a pointer. Its "Definition of done" moved to the execution plan |
| `08_BRAND_AND_CONTENT_GUIDE.md` | Good | Accurate, no change |
| `design/KaamSetu Prototype.html` | Clickable prototype: owner, technician, helper; online/offline; English/Hindi/Marathi | Accurate as a design artefact. **Not yet tested with real users** |
| `design/KaamSetu App Design.html` | Design canvas (12 MB, bundled fonts) | Kept as design reference |
| `build-in-public/*` | Marketing | Out of scope for product docs, left in place. Its public promise "30 days free at launch" is now recorded as a constraint (D-014) |

### Code (actual implementation status)

| Area | Status |
|---|---|
| Mobile | Expo SDK 58 default template (expo-router, TypeScript). **No KaamSetu screens yet.** None of SQLite, TanStack Query, Zustand, i18n, or SecureStore is installed |
| Backend | NestJS 12 scaffold, config module, `GET /health` reporting database up/down. 1 unit test passes, build passes |
| Database | Prisma 7 schema with `Organization`, `User`, `OrganizationMember` only. **No migration has ever run, because PostgreSQL is not installed** |
| Auth, tenancy, roles | Not started |
| CI/CD, hosting, monitoring | Not started |
| API prefix | `/health` is unprefixed; `/api/v1` from doc 06 not yet applied |

**Project stage:** design prototype done but not user-tested; technical scaffold done; no product features. This is the end of Phase 0 / start of Phase 1 in the new execution plan.

## 2. Contradictions and gaps found

| # | Finding | Documents involved | Resolution |
|---|---|---|---|
| C-1 | The prototype lets the senior technician record **money collected from the customer** (cash/UPI) and shows the owner "₹ with teams, to hand over". The PRD says technicians have no payment access. | 01 §6, prototype | Proposed: technician records *money collected*; it becomes a confirmed `Payment` only when the owner accepts the handover. Needs pilot validation (D-008, Q-03) |
| C-2 | The prototype has more job states than the PRD: appointment fixed / not fixed, on hold (customer side / our side), part needed (work continues / stopped). | 01 §10, 05, prototype | Keep the 6 visible statuses. Model the rest as `holdReason`, `appointmentConfirmedAt`, and a `JobUpdate` event log (D-009) |
| C-3 | The prototype has an **Enquiries** inbox (converted to jobs later). PRD workflow 8.1 goes straight from enquiry to job. | 01 §8.1, 05, prototype | Enquiry = `ServiceRequest` in the data model. Owner can save an enquiry or create a job directly (D-007) |
| C-4 | The prototype supports **GST bills** (org toggle, per-line 18 %, GSTIN). The PRD says tax is optional and configured only after validation. The data model has no per-line tax rate or HSN/SAC fields. | 01 §12, 05 §7, prototype | GST is in scope as optional per bill; exact compliance rules (CGST/SGST/IGST split, SAC codes, numbering) need an accountant's confirmation before the pilot issues GST bills (Q-04, R-06) |
| C-5 | The PRD lists "basic estimates/invoices" as P0 and the DB/API define `Estimate`; the prototype and the MVP module list have no estimates. | 01 §7, 05, 06 | Estimates moved to P1 unless discovery shows they are needed (D-010) |
| C-6 | Visit time is `scheduledAt` (a timestamp) in the DB, but the prototype uses a day plus a slot (Morning/Afternoon). | 05, prototype | Add `scheduledDate` + `timeSlot` (D-009) |
| C-7 | The prototype records **work done per AC unit**; `JobWorkItem` has no `equipmentId`. | 05, prototype | Add optional `equipmentId` to `JobWorkItem` |
| C-8 | The prototype lets the owner swap the **helper for one day** without changing the team. The DB only has `JobTechnician` for exceptions. | 05, prototype | Consistent: a day swap is a `JobTechnician` exception record. Documented |
| C-9 | The docs say "design first, then code"; a code scaffold already exists. | 07, code | Acceptable: the scaffold is generic and holds no product decisions. Feature code waits for the design gate (D-003) |
| C-10 | The docs list one roadmap (07) with 12 phases; the new brief asks for a different phase structure. | 07 | 07 superseded by the execution plan and roadmap; no two roadmaps |
| C-11 | Language order differs (English/Marathi/Hindi vs English/Hindi/Marathi). | 02, 08 | Cosmetic; all three are supported. No change |

## 3. Missing documents (created in this audit)

| Missing area | New document |
|---|---|
| Offline and sync (spread across 04 and 06, no conflict rules per record) | `09_OFFLINE_AND_SYNC_SPEC.md` |
| Authentication, permissions, and security/privacy (incl. India DPDP Act) | `10_AUTH_AND_SECURITY_SPEC.md` |
| Repository structure, coding standards, Git workflow, errors, logging, environment config | `11_ENGINEERING_STANDARDS.md` |
| Testing strategy and user acceptance | `12_TESTING_STRATEGY.md` |
| Environments, CI/CD, hosting, monitoring, backup, release management | `13_DEPLOYMENT_AND_OPERATIONS.md` |
| Execution plan, roadmap, task tracker | `PROJECT_EXECUTION_PLAN.md`, `PROJECT_ROADMAP.md`, `PROJECT_TASK_TRACKER.md` |
| Decision log, risk register, changelog | `DECISION_LOG.md`, `RISK_REGISTER.md`, `CHANGELOG.md` |

Deliberately **not** created, to avoid duplication: a separate Product Vision (covered by README + PRD §1–3), a separate Design System doc (02 §6 + prototype tokens), a separate User Acceptance doc (PRD §15 + task acceptance criteria + testing strategy), and a separate Release Management doc (section of 13).

## 4. Important unresolved decisions

The full list, with the phase each one must be settled by, is in [DECISION_LOG.md § Pending decisions](DECISION_LOG.md#pending-decisions). The ones that block design approval or the data model:

1. Do helpers get their own login? (Q-01)
2. Can technicians record money collected from customers? (Q-03)
3. Does the pilot business issue GST bills, and in what format? (Q-04)
4. Which time slots does the owner actually use? (Q-06)
5. What does the owner need offline? (Q-07)
6. Which SMS/OTP provider, and which hosting/region? (Q-08, Q-09)
