# KaamSetu — Changelog

Meaningful product, documentation, architecture and implementation changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). App releases will get version headings once the first build ships.

## 2026-11-19 — Local database

### Added
- Local `kaamsetu` database on PostgreSQL 16 and the first Prisma migration (identity tables). `/health` reports the database up.
- GitHub CLI installed for the private remote (Q-12).

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
