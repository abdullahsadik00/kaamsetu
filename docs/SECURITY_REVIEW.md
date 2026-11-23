# Security Review (T5.5)

Review against doc 10 §5 before the pilot (Phase 5). Repeat before launch (Phase 7) and whenever a row below changes.

**Date:** 22 Nov 2026. **Code:** main after `ebe0442`.

## Checklist

| Item (doc 10 §5) | Result | Evidence |
| --- | --- | --- |
| Validation on every endpoint, unknown fields refused | Pass | Every `@Body`/`@Query` goes through a Zod pipe; request schemas are `z.strictObject` (unknown field → 400 `VALIDATION_FAILED`, `app.e2e-spec`). Deliberate exception: the payloads inside `/sync/operations` (`field.ts`) drop unknown keys instead of refusing them, so a phone on an older app version does not get a finished job stuck. Only the parsed values are saved. |
| Rate limiting on login and sync | Pass | Every route: 120 a minute per IP (`app.module.ts`). Login routes: 20 a minute. Creating a business: 10 a minute. Render sets `TRUST_PROXY=1` so limits use the real phone IP. |
| Security headers; CORS closed | Pass | `common/security-headers.ts`: nosniff, frame DENY, no-referrer, CSP `default-src 'none'` (inline styles only, for the public pages), HSTS over HTTPS, no `X-Powered-By`. CORS is not enabled: no `Access-Control-*` headers (`app.e2e-spec`). |
| Dependency audit in CI | Pass, one accepted risk | CI runs `npm audit --omit=dev --audit-level=critical` for backend and mobile. Accepted: see below. |
| Secrets only in env / host store; `.env` not committed | Pass | `.env` is in `.gitignore`; only `.env.example` files are tracked. A search of tracked files for keys and passwords with real values found only CI-only test passwords and examples. Phone tokens are in SecureStore (`token-store.ts`). Logs hold method, path and request id: no headers, bodies or tokens. |
| AuditLog | Pass (for actions that exist) | `AuditLog` table, written in the same transaction as the change (`common/audit.ts`, `audit.e2e-spec`): bill issued or cancelled, payment recorded or voided, cash confirmed or rejected, employee added (role, earlier role), login reset (devices signed out), employee removed. Data export (`DATA_EXPORTED`, with counts). Customer import by the pilot script (`CUSTOMERS_IMPORTED`, in the owner's name, with counts). **Not built yet, log when added:** role change endpoint. |
| Supabase Data API cannot read tables (added 23 Nov 2026, D-040) | Pass in code; dashboard step open | Migration `20261123090000_enable_rls` turns RLS on for every `public` table with no policies; `rls.e2e-spec` checks every table. Open for Sadik: turn the Data API off in Supabase and confirm Advisors › Security is clean. |
| Cross-business access tests in CI; review before pilot | Pass | T5.2 `route-inventory.e2e-spec` (every route: 401 without login, 403 for each role not allowed) plus each module's test with another business's ids (404). This document is the pre-pilot review. |

## Accepted risks

| Risk | Why accepted | Review by |
| --- | --- | --- |
| `effect` ReDoS (GHSA-7589-6fvf-x4pw), high, inside the Prisma CLI (`@prisma/config`) | Runs only at build and `migrate deploy` time, on our own `prisma.config.ts`; it never sees user input. npm's only "fix" is going back to Prisma 6. | Next Prisma 7 update; before launch |
| Mobile: 22 moderate advisories (Expo / React Native tooling) | None are high or critical; mostly build tooling. Updated with the Expo SDK on its schedule. | Next Expo SDK update |

## Not in this review

- Phone hardening (root detection, screenshot blocking): not planned for the MVP.
- Penetration test by an outside party: before launch (Phase 7).
