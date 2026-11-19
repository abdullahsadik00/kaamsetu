# 13 — KaamSetu Deployment, Operations and Release Management

> **Source of truth for:** environments, CI/CD, hosting, monitoring, backups, and how releases are made.
> **Status:** plan. Nothing is deployed. Hosting provider is undecided (Q-09).

## 1. Environments

| Environment | Purpose | Data | When needed |
|---|---|---|---|
| development | Your PC. Local PostgreSQL (or Docker), Expo dev build | Synthetic seed | Phase 3 (PostgreSQL install pending, Q-02) |
| staging | Production-like; test builds for you and pilot testers | Synthetic + test accounts | Before the first technician uses a build (M6) |
| production | Pilot business, then paying tenants | Real | Pilot start (M9) |

## 2. Hosting (proposal, decide in Phase 3: Q-09)

Criteria: Indian or nearby region, managed PostgreSQL with automated backups and point-in-time recovery, low fixed cost for a solo developer, simple deploys.

| Component | Proposal |
|---|---|
| API | One container (Dockerfile) on a managed container platform, or one small VM in Mumbai region |
| Database | Managed PostgreSQL 16+ with daily snapshots + point-in-time recovery |
| Files | S3-compatible private bucket (photos, bill PDFs) |
| Mobile builds | Expo EAS Build; updates through Google Play internal testing track, then production |
| Over-the-air JS updates | EAS Update for bug fixes only; native changes go through Play Store |
| Push | Expo Notifications (FCM underneath) |

Any choice must be recorded in `DECISION_LOG.md` with cost per month.

## 3. CI/CD

Phase 3 foundation (task T3.9). **Implemented 19 Nov 2026** in `.github/workflows/ci.yml` for the push/PR checks below; deploy steps come with staging (T3.10). Mobile lint and type-check are non-blocking until the shell replaces the Expo demo template (T3.6).
- On every push: install, lint, type-check, unit tests for mobile and backend; backend integration tests against a PostgreSQL service container.
- On merge to `main`: build the backend image, run migrations against staging, deploy to staging.
- Production deploy: manual trigger from a tagged release, after staging check.
- Database migrations: Prisma Migrate, forward-only, reviewed SQL, run before the new API version starts; destructive changes split into expand → migrate data → contract releases.

## 4. Monitoring and alerts

- Uptime check on `/health` every minute; alert on 2 failures.
- Error tracking for API and app (Sentry or equivalent).
- Alerts to your phone for: API down, error spike, failed backup, DB storage > 80 %.
- Weekly glance at: sync `NEEDS_ATTENTION` count, failed photo uploads, OTP delivery failures.

## 5. Backup and recovery

- Automated daily database backup + point-in-time recovery, retained ≥ 14 days in pilot, ≥ 30 days at launch.
- Object storage versioning on.
- **Restore test before pilot and every quarter**: restore to a scratch database, run a checksum query, record the time it took.
- Targets for pilot: lose at most 1 hour of server data (RPO), back online within 4 hours (RTO). Field data on phones is not lost in either case because the outbox resends it.

## 6. Release management

- App version: `MAJOR.MINOR.PATCH` (semver) in `app.json`, with an always-increasing Android `versionCode`. API version in the URL (`/api/v1`) changes only for breaking changes.
- Backend must support the **previous app version** at all times, because technicians update late. Breaking API changes need a new endpoint or field, not a changed one.
- Each release: changelog entry, tag `vX.Y.Z`, staging check, real-device smoke test (core loop + offline), then production.
- Minimum supported app version is enforced by the API (`426 Upgrade Required` with a friendly "Please update the app" screen) only when truly necessary.

## 7. Runbook (to write in Phase 6)

How to: deploy, roll back, restore a backup, revoke a lost device, rotate secrets, handle a suspected data breach (who to tell, by when), and answer "my work is not sending".
