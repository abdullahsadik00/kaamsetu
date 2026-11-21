# KaamSetu — Changelog

Meaningful product, documentation, architecture and implementation changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). App releases will get version headings once the first build ships.

## 2026-11-20 — Design brief for Google Stitch

### Added
- `docs/design/STITCH_DESIGN_BRIEF.md`: one brief for designing the app in Google Stitch, compiled from docs 01, 02, 08, 09, the decision log, discovery answers, the prototype and the app theme/strings. Covers the design system (colours, type, spacing, radius, shadows, icons), every screen, user flows, components, states, microcopy in three languages and 23 open gaps (G-1 to G-23). Each item is tagged FINAL, PROPOSED, OPEN or OUT. No new decisions.
- `docs/design/STITCH_PROMPTS.md`: a strict base prompt plus 83 numbered, ready-to-paste Stitch prompts (all owner, technician, helper, sign-in, setup and settings screens, sheets, dialogs and offline/empty/error/language variants). Sample data matches the prototype; open decisions appear as visible placeholders.
- `docs/design/STITCH_PROTOTYPE_PROMPTS.md`: prompts that link the Stitch screens into one clickable prototype (base rules, 12 link prompts following flows F1–F17, a check prompt, fix prompts and a full link table for wiring by hand or in Figma). No new screens.

## 2026-11-21 — Technician job workflow (T4.7, early under D-031)

### Added
- Senior technicians see their team's open jobs on My Work: customer, address, problem, ACs and amount to collect, with Call and Directions. Start work, Put on hold (customer side / our side + note) and Finish work (done / need to come again / couldn't do it + note).
- Each step is saved on the phone first (outbox) and sent to `POST /api/v1/sync/operations` when online; the card shows "Saved on phone" until sent and "Needs attention" if the server refuses it. Re-sending is harmless (idempotent by operation id).
- The last job list is kept on the phone, so My Work opens offline.
- Helpers get Today's work: job type, area, time and call buttons for the customer and their senior; nothing to fill (Q-01).
- `GET /api/v1/my/jobs` (team-scoped; helpers get fewer fields).

## 2026-11-21 — Jobs, owner side (T4.6, early under D-030)

### Added
- Owner creates numbered jobs (#1001…) for a customer's address and ACs with job type, problem, day + morning/afternoon, team and amount to collect; gives them to a team or changes team (history kept), changes day or time, cancels with a reason, and creates a follow-up visit. Jobs tab by day and status. "New job" on the customer page.
- Job state machine with an exhaustive test; stale edits refused (`VERSION_CONFLICT`).

## 2026-11-21 — Teams (T4.2, early under D-029)

### Added
- More › Teams: create teams (one lead senior technician and helpers), rename, add/remove members, change the lead, stop using a team. Removing an employee from the business takes them out of their teams.

## 2026-11-21 — Customers, addresses and ACs (T4.3/T4.4, early under D-028)

### Added
- Owner can find customers by name or the last digits of their mobile, add them with their address, edit, archive, add more addresses, and add or remove ACs (type, brand, capacity, room; model/serial/gas optional).
- Adding a number already saved in the business warns and offers "Open <name>" or "Add as a new customer anyway".
- Call and WhatsApp buttons on the customer page.
- Customer, Site, Equipment tables (migration applied on staging at start).

## 2026-11-20 — Error reporting

### Added
- Sentry crash reporting for the app (release builds) and error reporting for the server (HTTP 500 only), both off until a DSN is set, both scrubbed of personal data. Privacy policy lists Sentry.
- Fixed a flaky e2e test (cleanup of parallel test files deleted each other's users).

## 2026-11-20 — Delete my account

### Added
- In-app **Delete my account** (Profile; owners: More) with a clear confirmation; owners are warned the business closes for everyone. `POST /auth/delete-account`.
- Web page `/delete-account` (Google Play requirement) and privacy policy text on deletion.
- `npm run pilot -- purge-closed`: removes businesses closed more than 30 days ago (monthly task, doc 13 §5).

## 2026-11-20 — Offline foundation finished

### Added
- Queued work is sent as soon as the internet comes back (not only on a timer or app resume).
- Offline banner on every screen: "No internet. Keep working. All saved on phone." (en/hi/mr).
- Sent outbox rows older than 7 days are removed from the phone; unsent and "needs attention" work is never removed.
- Needs a new app build (network-status native module).

## 2026-11-20 — Public pages and app tests

### Added
- Homepage, privacy policy and terms served by the API at `/`, `/privacy`, `/terms` (needed to publish Google sign-in and for DPDP). Contact from `SUPPORT_EMAIL`; Google Search Console tag from `GOOGLE_SITE_VERIFICATION`. The privacy text must be updated whenever data collection or processors change (`backend/src/site/pages.ts`). Get Indian legal review before commercial launch (doc 10 §4).
- Mobile component tests (React Native Testing Library) for Join, Your business, Add employee, and API client tests: 29 app tests.

## 2026-11-20 — Business onboarding and adding staff (T4.1, early under D-027)

### Added
- A Google-signed-in user without a business can **set up a new business** (name, owner name, business mobile, city, GST bills on/off + optional GSTIN); it starts a **30-day trial** (D-014). `POST /organizations`.
- Owners can **add employees** (name, mobile, senior technician/helper) in More › Employees and then show the invite QR. `POST /employees`.
- Owner Home shows a "Get started" card; the pilot script's `create-business` also starts the trial.
- Owners can **remove an employee** (signed out on all phones at once; adding the same mobile again brings them back) and **edit business details** (More › Business details). `POST /employees/:id/deactivate`, `PATCH /organization`.
- `Organization.gstBills`, minimal `Subscription` table (migration applied on staging by the start command).

### Notes
- Built before the design gate as a one-module exception (D-027); screens may change after the usability tests (T2.5).

## 2026-11-20 — Usability test kit

### Added
- `discovery/USABILITY_TEST_KIT.md`: session script, consent text, hint ladder, task cards for owner (8), senior technician (7, incl. offline) and helper (3, closes Q-01) in English/Hindi/Marathi, how to open the prototype on a phone, scoring and severity.
- `discovery/USABILITY_TEST_1.md`: results template (per-task outcomes, closing answers, issues with severity, decisions for T2.5).

## 2026-11-20 — Pre-pilot readiness

### Added
- `npm run pilot` (backend/prisma/pilot.ts): create the pilot business and owner (prints the owner invite), add staff, re-issue the owner invite, list members. Dry run unless `--yes`; prints the target database host only.
- Backup restore test (`restore-test.yml`, T5.7): newest staging backup decrypted and restored into PostgreSQL 17 in 5 s, data checked; runs monthly.

### Changed
- Joining with a mistyped mobile now says there is no invite for that number (`INVITE_NOT_FOR_THIS_PHONE`, T3.13).
- Backups dump only the app's `public` schema (Supabase's own schemas need Supabase-only extensions).

## 2026-11-20 — Free pilot staging (T3.10)

### Added
- Staging API on Render free (`https://kaamsetu-api-staging-0368.onrender.com`, Singapore) from `render.yaml`, database on Supabase free (Mumbai, session pooler), demo data seeded. Decision D-026; Q-09 answered for the pilot only.
- `TRUST_PROXY` setting; checked on staging that faked `X-Forwarded-For` values do not bypass the per-IP login limit.
- Nightly encrypted database backup (`.github/workflows/backup-staging.yml`, 14 days); first run green.
- UptimeRobot pings `/health` every 5 minutes (keeps Render and Supabase awake, emails on downtime).
- EAS `preview` profile builds an APK that talks to staging; owner login verified on a phone.

### Notes
- The seed must run with the same `OTP_HASH_SECRET` as the server, or invite codes show "Wrong code"; copy it from Render's Environment page.
- Still to do before the pilot: a backup restore test (T5.7) and a way to create the pilot business itself (business onboarding, T4.1).

## 2026-11-19 — Google sign-in and owner invites (T3.11)

### Added
- Backend: `POST /auth/google` (Google ID token, `GOOGLE_CLIENT_IDS`), `POST /employees/:id/invite` (QR token + 6-digit code, single use, 24 h, hashed), `POST /auth/accept-invite` (QR token or phone + code, 5 tries), `POST /employees/:id/reset-login`; employees list shows `loginLinked`. `User.phone` optional, `User.googleSubject`, `MemberInvite` table. Seed prints a 7-day invite code per demo owner.
- App: "Continue with Google", "Join your business" (scan QR or enter code), owner More › Employees with invite QR and reset login; Android package `com.kaamsetu.app`; needs our own build (not Expo Go). Phone OTP remains a development-only path.

### Verified (20 Nov 2026)
- On a real Android phone (EAS development build, project `@vyapaar-labs-team/kaamsetu`): owner, senior technician and helper each signed in with Google, joined with phone + 6-digit code and landed on their home. Google Cloud needs a **Web** client (its ID goes in `GOOGLE_CLIENT_IDS` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) plus one Android client per signing key (this PC's debug key, EAS key); a missing Web client shows as `DEVELOPER_ERROR`.
- Local Windows builds hit the 260-character path limit; app builds run on EAS.

### Fixed
- Dev build could stay blank: the root layout suspended on translations before i18n was ready.

### Still to try
- Joining by scanning the QR (needs a second phone).

## 2026-11-19 — Pilot login decision

### Changed
- D-025: the free pilot uses Google sign-in, with staff linked by the owner's QR invite (6-digit fallback), instead of SMS OTP (D-015, now superseded for the pilot). Q-08 deferred. New task T3.11. Docs 10 §1–§2 updated.

## 2026-11-19 — Mobile app shell

### Added
- Mobile foundation (T3.6): Expo template replaced by `src/app` thin routes, `src/features`, `src/theme` (doc 02 tokens, Noto Sans / Noto Sans Devanagari by language), `src/localization` (en/hi/mr; technician/helper labels from the prototype, login/owner labels translated and awaiting review), `src/api` client for the `{ data, meta }` / `{ error }` envelope with single-flight token refresh; tokens only in SecureStore.
- Login and navigation (T3.7): phone → 6-digit OTP against the backend; owner → Home/Jobs/Customers/Billing/More, senior technician → My Work/History/Profile, helper → Today's work, no business → "Set up your business" (placeholders). A saved session opens offline; only a 401 on refresh logs out. Language switch on Profile/More.
- On-phone storage (T3.8): one SQLite database per user with versioned migrations, the doc 09 §5 outbox and a sender with backoff (5 s → 10 min), NEEDS_ATTENTION on 4xx/conflict, resend after an app kill. Logout warns about unsent changes and deletes the local database.
- Mobile unit tests (Jest) for the outbox; CI mobile lint, type-check and tests are now blocking.

## 2026-11-19 — Demo seed data

### Added
- `npm run db:seed` (`prisma/seed.ts`, run with `tsx`): two made-up demo businesses with owners, 6 senior technicians and 6 helpers (names from the prototype, fake numbers). Re-runnable; refuses production (T3.3).

## 2026-11-19 — Roles and tenant isolation

### Added
- `@Roles()` checks in the global guard (`NO_ORGANIZATION`, `FORBIDDEN_ROLE`), `scoped()`/`requireOrg()` tenant helpers, and a two-business test harness (T3.5).
- Read-only `GET /api/v1/organization`, `GET /api/v1/employees`, `GET /api/v1/employees/:id` (owner only for employees), used to prove isolation: other businesses' records return 404, smuggled `organizationId` is ignored, deactivated members are rejected at once.

## 2026-11-19 — Login (phone + OTP)

### Added
- Backend auth (T3.4): request/verify OTP, access tokens (15 min) and rotating refresh tokens (60 days, reuse signs the device out), devices, logout, `GET /auth/me`. Deny-by-default guard with `@Public()`. Per-number OTP limits (3 sends / 15 min, 5 attempts, 5-minute expiry), per-IP throttling. Tables `OtpChallenge`, `Device`, `RefreshToken`. New required settings `JWT_ACCESS_SECRET`, `OTP_HASH_SECRET`.

### Fixed
- `npm start` failed because `main.ts` validated settings before loading `backend/.env` (introduced with the API conventions the same day; tests did not cover it).

## 2026-11-19 — Continuous integration

### Added
- GitHub Actions CI on every push and pull request: backend install, migrations against Postgres 16, build, lint, unit and e2e tests (blocking); mobile lint and type-check (non-blocking until T3.6). First run passed.
- Mobile ESLint flat config (`eslint-config-expo`).

## 2026-11-19 — Phase 3 foundation: API conventions and configuration

### Added
- Backend: `/api/v1` prefix (`/health` stays outside), `{ data, meta }` response envelope, `{ error: { code, message, details? } }` error shape, request IDs (`X-Request-Id`), Zod validation pipe rejecting unknown fields, environment validation at startup, JSON logs in staging/production with one redacted line per request. Unit and e2e tests.

### Removed
- Scaffold "Hello World" controller and service.

### Known issue
- `npm run lint` cannot run on this PC: Windows Application Control blocks oxlint's native binary. Lint will run in CI (T0.8, T3.9).

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
