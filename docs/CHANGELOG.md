# KaamSetu — Changelog

Meaningful product, documentation, architecture and implementation changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). App releases will get version headings once the first build ships.

## 2026-11-19 — Prototype updated (Phase 2 start)

### Added
- Prototype: paste service-centre ticket, ticket number and brand-portal tick, Service centre / Builder sources, quotations, UPI confirmation, owner offline job creation and assignment, helper sees customer with call button. Test hook `window.__ks` for automated checks.

### Fixed
- Prototype: new job number clashed with the last demo job (#1053).

## 2026-11-19 — Pre-interview discovery answers

### Added
- Discovery findings from Sadik's answers: job sources (brand service-centre tickets, B2B), paste-to-auto-fill tickets, money collection, GST, time slots, helper login, owner offline, parts process, attendance.
- Decisions D-019 to D-024; open questions Q-14 (who pays for service-centre jobs) and Q-15 (charges per source).
- Data model: ticket number, source partner, brand-portal closure; task T4.5a (ticket paste) and T1.9 (ticket samples).

### Changed
- Estimates back in P0 (D-020 supersedes D-010). Owner basic offline (D-021 narrows D-018). Cash collection accepted (D-008). Attendance moved from non-goal to P1 (D-023).

## 2026-11-19 — Phase 1 discovery started

### Added
- `discovery/INTERVIEW_KIT.md`: consent message (EN/HI/MR), owner interview, technician ride-along, helper conversation, artefact list, accountant questions, each tied to open decisions.
- `discovery/DISCOVERY_FINDINGS.md`: template for findings, answers to Q-01…Q-11 and the owner's P0 sign-off.

## 2026-11-19 — Local database

### Added
- Local `kaamsetu` database on PostgreSQL 16 and the first Prisma migration (identity tables). `/health` reports the database up.
- GitHub CLI installed for the private remote (Q-12).
- Private GitHub repository `abdullahsadik00/kaamsetu`; `main` pushed.

## 2026-11-19 — Documentation audit and execution planning

### Added
- `docs/` in the code repository, importing the original product docs and HTML prototypes unchanged (D-017).
- `DOCUMENTATION_AUDIT.md`: inventory, implementation status, contradictions C-1…C-11, missing documents.
- Specs: `09_OFFLINE_AND_SYNC_SPEC.md`, `10_AUTH_AND_SECURITY_SPEC.md`, `11_ENGINEERING_STANDARDS.md`, `12_TESTING_STRATEGY.md`, `13_DEPLOYMENT_AND_OPERATIONS.md`.
- Planning: `PROJECT_EXECUTION_PLAN.md`, `PROJECT_ROADMAP.md`, `PROJECT_TASK_TRACKER.md`.
- Governance: `DECISION_LOG.md` (D-001…D-018, Q-01…Q-13), `RISK_REGISTER.md`, this changelog, source-of-truth map in `README.md`.

### Changed
- PRD (01): enquiries, field status updates and hold reasons, proposed cash collection by teams, GST bills, WhatsApp bill sharing; estimates moved to P1; status header.
- UX spec (02): design status table, prototype design tokens, design gate link.
- SaaS model (03): 30-day trial commitment, pilot terms question.
- Architecture (04): installed-vs-planned stack, links to new specs.
- Data model (05): global conventions (UUIDs, paise, numbering), enquiry fields, job scheduling/hold/collection fields, `JobUpdate`, `CashCollection`, per-AC work items, GST line fields.
- API (06): enquiries, job updates, cash collections; `/health` outside `/api/v1`.

### Superseded
- `07_ROADMAP_AND_DELIVERY_PLAN.md` replaced by a pointer to the execution plan and roadmap.

## 2026-11-18 — Repository and scaffold

### Added
- Git repository with `.gitignore`.
- Expo (SDK 58) mobile app from the default template.
- NestJS 12 backend (strict TypeScript, Vitest), Prisma 7 with PostgreSQL adapter and identity schema (`Organization`, `User`, `OrganizationMember`).
- Config module and `GET /health` reporting database status.
- README with run steps.
