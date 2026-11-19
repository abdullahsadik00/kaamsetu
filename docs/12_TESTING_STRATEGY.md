# 12 — KaamSetu Testing Strategy

> **Source of truth for:** what we test, how, and what must pass before pilot and launch.

## 1. Test levels

| Level | Tool | What | When |
|---|---|---|---|
| Unit (backend) | Vitest | Money calculations, status state machine, permission rules, numbering, idempotency logic | Every commit |
| Integration (backend) | Vitest + real PostgreSQL (Docker or local; test DB reset per run) | Each endpoint with real Prisma: validation, role guards, **tenant isolation**, version conflicts | Every commit once a DB exists in CI |
| Unit/component (mobile) | Jest + React Native Testing Library (Expo default) | Outbox logic, local DB repositories, form validation, key components (JobCard, finish page) | Every commit |
| Sync tests | Vitest (backend) + mobile unit tests | The 12 scenarios in doc 09 §10, scripted where possible | Before M7 exit |
| End-to-end (mobile) | Maestro flows on an Android emulator (D-016, revisit if it fails us) | Core loop: create job → assign → technician completes → bill → payment | Before pilot; then nightly or per release |
| Manual device tests | Real low/mid-range Android phones | Offline in basement, low battery, Hindi/Marathi text, outdoor readability | Each release candidate |
| Usability tests | Prototype, then the app | Doc 02 §10 task list with real owner/technician/helper | Phase 2, and in Phase 5 with the built app |

## 2. Non-negotiable test suites

1. **Tenant isolation:** for every business endpoint, a test with a second organization proves records of org A are invisible and unchangeable from org B (`404`). Added with each module, not at the end.
2. **Role scope:** technician cannot see other teams' jobs, bills, payments, or customer lists; helper sees only the current job summary.
3. **Money:** invoice totals with discount, GST per line, rounding to paise; partial and multiple payments; balance never negative without an explicit credit; issued bill immutable.
4. **Idempotency:** the same operation or payment sent twice creates one record.
5. **State machine:** every allowed and forbidden job status transition.

**How to write isolation tests (from T3.5):** use `TenantFactory` in `backend/test/helpers/tenants.ts` to create two synthetic businesses with an owner, senior technician and helper each, already logged in (`tenant.tokens.OWNER`, …). For every new endpoint, assert that business A gets `404` for business B's record IDs, that disallowed roles get `403 FORBIDDEN_ROLE`, and that an `organizationId` sent by the client is ignored. See `backend/test/tenancy.e2e-spec.ts`.

## 3. Test data

- Seed script with a synthetic business that mirrors the prototype (6 teams, Pune localities, sample ACs). **No real customer data in tests or seeds.**
- A second synthetic organization for isolation tests.

## 4. Coverage targets

Measure, don't chase: ≥ 80 % lines on backend domain services (money, status, permissions, sync); no target on controllers/UI. Every bug fix gets a regression test.

## 5. User acceptance

A module is accepted when its acceptance criteria in `PROJECT_TASK_TRACKER.md` pass **and** the PRD §15 criteria it touches are demonstrated on a real Android phone. Pilot readiness = all PRD §15 criteria pass (milestone M8 in the roadmap).

## 6. Performance and devices (pilot targets, adjust after measurement)

- My Work opens in < 2 s on a mid-range Android phone with 50 cached jobs.
- Finish Work saves locally in < 1 s, with or without network.
- API p95 < 500 ms for list endpoints at pilot scale.
- Minimum device: Android 10, 3 GB RAM (confirm against the pilot team's actual phones, Q-11).
