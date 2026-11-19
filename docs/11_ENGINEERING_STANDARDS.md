# 11 — KaamSetu Engineering Standards

> **Source of truth for:** repository layout, coding conventions, Git workflow, error handling, logging and configuration.

## 1. Repository

One Git repository (`app/`), branch `main`, no remote yet (Q-12: choose GitHub private repo before CI work).

```text
app/
  docs/        Product and engineering documentation (source of truth)
    design/    Clickable prototype and design canvas (HTML)
  mobile/      Expo React Native app
  backend/     NestJS API + Prisma
  README.md    How to run things
```

No shared package between mobile and backend yet. If API types need sharing, add `packages/contracts` (Zod schemas) at that point, not before (D-005).

## 2. Git workflow

- Commit every meaningful step; one logical change per commit.
- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `build:`, `ci:`. Scope optional: `feat(jobs): assign team`.
- Check `git status` and the diff before committing; stage files by name, never commit unrelated changes or `.env`.
- Work on `main` while solo. Once CI exists, use short-lived branches `feat/<task-id>-short-name` and squash-merge.
- Never force-push or rewrite pushed history.
- Reference the task ID from `PROJECT_TASK_TRACKER.md` in the commit body when there is one.

## 3. Code conventions

| Topic | Rule |
|---|---|
| Language | TypeScript `strict` everywhere. No `any` without a comment saying why |
| Formatting | Prettier (repo config). Lint: oxlint (backend), Expo ESLint (mobile) |
| Files | `kebab-case.ts`; React components `PascalCase` exports in `kebab-case.tsx` files (Expo template convention) |
| Names | Code in English. Domain names match doc 05 (`ServiceJob`, `ServiceRequest`, `CashCollection`); UI words match doc 08 (*Bill*, *My Work*) |
| Backend modules | One NestJS module per domain area (doc 04 §4): controller → service → Prisma. DTOs validated; no Prisma types leak to responses |
| Mobile features | `src/features/<area>/` holds hooks, API calls, local DB access, and components; route files in `src/app/` stay thin |
| UI strings | Never hardcoded; translation keys (`en`, `hi`, `mr`) |
| Money | Integer paise only; one shared formatting helper for ₹ display |
| Dates | Store UTC; display in the organization's timezone (`Asia/Kolkata`) |
| IDs | UUID; phones generate UUIDs for offline-created records (doc 09) |

## 4. API conventions

From doc 06, binding: prefix `/api/v1`; JSON; response `{ data, meta }`; errors `{ error: { code, message, details? } }`; cursor pagination on lists; `Idempotency-Key` header on retry-sensitive writes; `organizationId` never accepted from the client.

Error codes are `UPPER_SNAKE`, stable, and documented next to the endpoint (e.g. `JOB_NOT_ACCESSIBLE`, `INVALID_STATUS_TRANSITION`, `VERSION_CONFLICT`). The mobile app maps codes to translated, plain-language messages (doc 08 §7).

Implementation (19 Nov 2026): `configureApp()` in `backend/src/app.setup.ts` applies the prefix, `HttpExceptionFilter`, `ResponseEnvelopeInterceptor` and the request-ID middleware. Validate input with `ZodValidationPipe` and `z.strictObject` schemas; it returns `VALIDATION_FAILED` with per-field details. (Nest also ships `StandardSchemaValidationPipe`; we use our own small pipe so validation errors keep our documented shape.) Mark endpoints that must not be wrapped with `@RawResponse()`.

Business routes: always add `@Roles(...)` (the guard rejects callers without a business), and build every Prisma `where` on business data with `scoped(auth, …)` from `backend/src/tenancy/tenant.ts`. Never read `organizationId` from the request.

## 5. Error handling

- Backend: throw typed domain errors; one global exception filter maps them to the error shape. Unknown errors → `500 INTERNAL_ERROR` with a `requestId`, never a stack trace.
- Mobile: every screen handles loading, empty, error and offline states (doc 02 §7). Never discard user input on an error.

## 6. Logging

- Structured JSON logs on the backend (NestJS logger or pino), one line per request: `requestId`, route, status, duration, `organizationId`, `memberId`.
- Redact OTPs, tokens, phone numbers, addresses, and bodies (doc 10 §4).
- Mobile: crash and error reporting (Sentry or similar, decided in Phase 3); no personal data in breadcrumbs.

## 7. Configuration

- Backend reads configuration only through `@nestjs/config`, validated at startup; the app refuses to start in `production` with missing values.
- `.env.example` lists every variable with a safe placeholder; real `.env` files are never committed.
- Mobile uses `EXPO_PUBLIC_*` variables only for non-secret values (API URL). No secrets ship in the app.
- Environments: `development` (local), `staging`, `production` (doc 13).

## 8. Definition of done (code)

The project-wide definition of done is in `PROJECT_EXECUTION_PLAN.md`. For each code change additionally: builds, lints, tests pass locally and in CI; docs that describe the behaviour are updated in the same commit or the next one.
