# 04 — KaamSetu Technical Architecture

## 1. Architecture goals

- Simple to build and operate as a solo developer.
- Reliable offline field workflows.
- Strong tenant isolation.
- Clear role permissions.
- Correct financial records.
- Easy to extend without premature complexity.

> **Source of truth for:** system structure and technology choices. Offline detail is in `09_OFFLINE_AND_SYNC_SPEC.md`, security in `10_AUTH_AND_SECURITY_SPEC.md`, operations in `13_DEPLOYMENT_AND_OPERATIONS.md`.

## 2. Recommended stack

**Installed today (19 Nov 2026):** Expo SDK 58 (React Native 0.88, React 19.3, TypeScript 6, Expo Router); NestJS 12 (ESM, Vitest, oxlint); Prisma 7.10 with `@prisma/adapter-pg`. Everything else below is **planned** and gets added in the task that first needs it.

### Mobile
- React Native.
- Expo.
- TypeScript.
- Expo Router.
- TanStack Query for server state.
- Zustand for small client/UI state.
- React Hook Form.
- Zod.
- Expo SQLite.
- Expo SecureStore.
- Expo FileSystem.
- Expo Image Picker / Camera.
- Expo Notifications or FCM integration.

### Backend
- Node.js.
- NestJS modular monolith.
- REST API.
- Prisma ORM.
- PostgreSQL.

### Supporting services
- S3-compatible private object storage for photos and PDFs.
- Push notifications.
- Error monitoring.
- Structured server logs.
- Automated database backups.

## 3. High-level architecture

```text
Android Application
  ├── Owner experience
  ├── Senior technician experience
  ├── Helper experience (optional/simple)
  ├── TanStack Query
  ├── SQLite local store
  ├── Local file storage
  └── Transactional outbox
          |
          | HTTPS REST API
          v
NestJS Modular Monolith
  ├── Auth
  ├── Organizations
  ├── Employees
  ├── Teams
  ├── Customers
  ├── Equipment
  ├── Jobs
  ├── Field Service
  ├── Billing
  ├── Payments
  ├── AMC
  ├── Sync
  └── Notifications
          |
          +---- PostgreSQL
          |
          +---- Private Object Storage
```

## 4. Backend module boundaries

```text
src/
  auth/
  organizations/
  memberships/
  employees/
  teams/
  customers/
  sites/
  equipment/
  service-requests/
  jobs/
  assignments/
  field-service/
  billing/
  payments/
  amc/
  expenses/
  attachments/
  notifications/
  sync/
  reports/
  common/
```

Start as one deployable backend. Use module boundaries and service interfaces. Do not introduce microservices, Kafka or distributed event infrastructure for the initial product.

## 5. Mobile application structure

```text
app/
  (auth)/
  (owner)/
    home/
    jobs/
    customers/
    billing/
    more/
  (field)/
    my-work/
    completed/
    profile/
  job/
  customer/
  invoice/

src/
  components/
  features/
    auth/
    jobs/
    customers/
    teams/
    equipment/
    billing/
    payments/
    field-service/
    sync/
  db/
  api/
  hooks/
  navigation/
  localization/
  validation/
  theme/
  utils/
```

The exact route structure can change after wireframes. Keep feature logic separate from screen components.

## 6. Offline-first strategy

Summary only. The detailed, binding rules (per-record conflict policy, ID generation, sync protocol, retention) are in `09_OFFLINE_AND_SYNC_SPEC.md`.

### Local data
Cache only the data required by the logged-in role:
- Senior technician: assigned team/job records and relevant customer/equipment details.
- Helper: only current/relevant team job details if the helper uses the app.
- Owner: recent business data required for basic continuity; live financial reports require server confirmation.

### Local write flow
1. User performs an action.
2. Validate input locally.
3. Save the local record.
4. Insert an outbox operation in the same SQLite transaction.
5. Display Saved.
6. Attempt synchronization when online.
7. Mark Sent after server confirmation.

### Outbox fields
- operation ID.
- organization ID.
- actor user ID.
- entity type.
- entity ID.
- operation type.
- payload.
- idempotency key.
- created timestamp.
- attempt count.
- last error category.
- state.

### Conflict handling
- Use record version numbers.
- Avoid last-write-wins for financial records.
- Preserve submitted service reports.
- Do not silently overwrite job completion.
- Allow owner/team lead review for important operational conflicts.
- Keep user-facing error messages simple.

### Photo handling
- Save photo locally first.
- Queue upload.
- Upload using a signed URL or controlled upload endpoint.
- Confirm server object key.
- Only then allow local cleanup according to retention rules.

Background sync is best-effort. Always support sync on app open/resume and connectivity restoration.

## 7. Security

- HTTPS only.
- Secure token storage.
- Short-lived access tokens and refresh strategy.
- Server-side role checks.
- Tenant checks on every query/mutation.
- Rate limiting on authentication endpoints.
- Validate all DTOs.
- Avoid logging OTPs, tokens or sensitive customer information.
- Private object storage.
- Signed file URLs with short expiry.
- Audit financial and permission changes.

## 8. Financial correctness

- Store money using integer minor units (paise) or an exact decimal strategy. Do not use floating-point arithmetic for financial calculations.
- Store currency code, initially INR.
- Validate calculations server-side.
- Preserve issued invoice snapshots.
- Use payment allocations for partial payments.
- Prevent duplicate payments with idempotency.
- Keep an audit trail for corrections.
- Use explicit invoice cancellation/correction flows.

## 9. Reliability and operations

Before pilot:
- Automated database backups.
- Restore test.
- Error monitoring.
- API request logging with sensitive data redacted.
- Health check endpoint.
- Migration process.
- Staging environment.
- Production environment.
- Basic uptime and error alerts.

## 10. Testing

- Unit tests for calculations and permissions.
- Integration tests for tenant isolation.
- API tests for job and billing workflows.
- Mobile component tests for critical flows.
- Offline/online transition tests.
- Duplicate sync tests.
- Photo upload retry tests.
- Real Android device testing.
- Low-connectivity testing.
- Accessibility and language testing.
