# 10 — KaamSetu Authentication, Authorization and Security

> **Source of truth for:** login, sessions, how role permissions are enforced, tenant isolation mechanics, and data protection.
> The business permission table is in PRD §6; tenancy principles in doc 03. This document says how they are enforced.
> **Status (19 Nov 2026):** §1 login is implemented in `backend/src/auth/` (T3.4): `POST /api/v1/auth/request-otp`, `verify-otp`, `refresh`, `logout`, `GET /auth/me`. Every route needs a token unless marked `@Public()`. Phones are stored in E.164 (`+91…`). OTP delivery: console stub in development, captured in tests, and `503 SMS_NOT_CONFIGURED` in staging/production until Q-08 is decided. Per-IP rate limits via `@nestjs/throttler` (120/min default, 20/min on login routes). Role guards and tenant scoping (§3 steps 2–4) are implemented (T3.5): `@Roles(...)` on every business route (no business → `403 NO_ORGANIZATION`, wrong role → `403 FORBIDDEN_ROLE`), `scoped(auth, where)` adds the token's `organizationId` to every business query, other businesses' records return `404`. Team-level scope for technicians ("their team's jobs") arrives with the jobs module (T4.6–T4.7).

## 1. Authentication

| Item | Decision |
|---|---|
| Login method | **Pilot (D-025): Google sign-in**; staff are linked to their employee record by scanning the owner's QR invite (6-digit fallback). Phone number + SMS OTP (D-015) is implemented but unused until an SMS provider is chosen (Q-08). No passwords |
| OTP | 6 digits, valid 5 minutes, max 5 attempts, max 3 sends per number per 15 minutes, IP rate limit |
| OTP storage | Hashed, never logged, deleted after use or expiry |
| SMS provider | **Open (Q-08).** Must support Indian DLT template registration. Compare cost per SMS, delivery rate, and a WhatsApp-OTP fallback. In `development` a stub prints OTPs to the local console only |
| Access token | JWT, 15 minutes, holds `userId`, `organizationId`, `memberId`, `role`, `deviceId` |
| Refresh token | Opaque random value, stored **hashed** per device, 60-day sliding expiry, rotated on every use; reuse of an old token revokes the device |
| Phone storage | Tokens in Expo SecureStore only |
| Logout | Revokes the device's refresh token and clears local data |
| Lost phone | Owner can revoke an employee's devices from Employees; the next refresh fails |

Field staff must not be logged out mid-job: an expired access token just waits for connectivity to refresh; queued work is never discarded because a token expired.

## 2. Staff onboarding

1. Owner adds an employee with name, phone and role, and puts them in a team.
2. Pilot (D-025): the owner shows the employee a QR invite (single use, 24 h, stored hashed), or sends the 6-digit code on WhatsApp.
3. The employee signs in with Google and scans the QR (or types the code); this links their Google account to the existing membership. The owner can reset the link from Employees (new phone, lost account). With SMS later: the employee gets an SMS with the app link and logs in with phone + OTP.
4. A phone number belongs to one `User`, who may later belong to more than one organization (doc 03). The app shows one active organization at a time.

## 3. Authorization

Enforced on the server, in this order, for every request:

1. **Authenticated?** Valid access token, device not revoked.
2. **Active membership?** `OrganizationMember` active for the token's organization.
3. **Role allowed?** Route-level guard, e.g. `@Roles('OWNER')`.
4. **Record in scope?** Query scoped by `organizationId` **and**, for technicians/helpers, by team assignment.

| Role | Record scope |
|---|---|
| Owner | All records of the organization |
| Senior technician | Jobs currently or previously assigned to their team(s) or to them; the customer, site and ACs of those jobs only; their own cash collections. No bills, payments, reports, or customer lists |
| Helper | Current/next job of their team: locality, job type, things to carry. Customer phone only if the owner allows it (Q-01) |
| Platform support (internal) | No default access. Time-limited, audited access per support case |

Implementation rules:
- `organizationId` comes **only** from the token, never from the request body or URL.
- A shared data-access helper adds `organizationId` to every business Prisma query; tests check every business query is scoped (doc 12).
- Nested IDs in a request (customer, site, AC, team) are checked to belong to the same organization before use.
- Return `404`, not `403`, for records outside the caller's scope, so IDs cannot be probed.
- PostgreSQL row-level security is later defence in depth (Phase 7), not the primary control.

## 4. Data protection

Public privacy notice and terms (20 Nov 2026): `/privacy` and `/terms` on the API host, text in `backend/src/site/pages.ts`; keep them true to what the code collects and which processors it uses.

India's **Digital Personal Data Protection Act, 2023 (DPDP)** applies: customer names, phones and addresses, and employee data are personal data. Roughly, each business decides what it collects about its customers and KaamSetu processes it for them; KaamSetu is directly responsible for its own users' data. Get Indian legal advice before commercial launch (doc 03 §9). Practical rules now:

- Collect only what the workflow needs. No Aadhaar, no ID documents, no location tracking.
- Encrypt in transit (HTTPS only) and at rest (managed database and storage encryption).
- Private object storage; photos and PDFs only via signed URLs that expire in ≤ 15 minutes.
- Logs never contain OTPs, tokens, full phone numbers (mask to last 4 digits), addresses, or request bodies.
- Business data export for the owner (Phase 7) and a documented deletion process on account closure.
- Breach response steps recorded in the operations runbook (doc 13).
- Host data in an Indian region where practical (Q-09).

## 5. Application security checklist

- DTO validation on every endpoint (whitelist, reject unknown fields).
- Rate limiting on auth and sync endpoints.
- Security headers; CORS closed (the mobile app does not need it).
- Dependency audit in CI; update Expo/NestJS/Prisma on a schedule.
- Secrets only in environment variables or the host's secret store; `.env` never committed (already in `.gitignore`).
- `AuditLog` (doc 05) for: role changes, employee deactivation, device revocation, bill issue/cancel, payment record/void, cash collection confirm/reject, data export.
- Cross-tenant access tests in CI from the first business module; security review before pilot (Phase 5) and before launch (Phase 7).
