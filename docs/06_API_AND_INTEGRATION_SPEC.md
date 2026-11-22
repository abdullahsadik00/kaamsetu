# 06 — KaamSetu API and Integration Specification

## 1. API conventions

- REST API under `/api/v1` (health check stays at `/health`, outside the version prefix, for load balancers).
- JSON request/response.
- HTTPS only.
- Authenticated requests use access tokens.
- Organization context is derived from authenticated membership.
- Validate all input with DTO schemas.
- Return consistent error codes.
- Use pagination for lists.
- Use idempotency keys for offline/retry-sensitive writes.

Example response:

```json
{
  "data": {},
  "meta": {
    "requestId": "server-generated-id"
  }
}
```

Example error:

```json
{
  "error": {
    "code": "JOB_NOT_ACCESSIBLE",
    "message": "This job is not available to your account."
  }
}
```

Do not expose internal stack traces or database details.

## 2. Authentication

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Authentication provider and OTP delivery method should be selected after comparing cost, reliability and Indian phone-number coverage.

## 3. Organization and employees

- `POST /organizations` — **implemented (D-027)**: a signed-in user without a business creates one (`name`, `ownerName`, `phone`, `city?`, `gstBills`, `gstin?`) and becomes OWNER with a 30-day trial; `409 ALREADY_IN_BUSINESS`. The app then calls `/auth/refresh` for the new role.
- `GET /organization` (implemented; includes `gstBills`, `gstin`)
- `PATCH /organization` — **implemented (D-027)**: owner edits `name`, `phone`, `city`, `gstBills`, `gstin` (null clears); empty body refused
- `GET /employees`
- `POST /employees` — **implemented (D-027)**: owner adds `name`, `phone`, `role` (SENIOR_TECHNICIAN/HELPER); `409 EMPLOYEE_EXISTS`, `409 PHONE_IN_OTHER_BUSINESS`. Staff link their Google login with `POST /employees/:id/invite` + `POST /auth/accept-invite` (D-025)
- `GET /employees/:id`
- `PATCH /employees/:id`
- `POST /employees/:id/deactivate` — **implemented (D-027)**: owner removes someone who left; INACTIVE at once (next request 401), phones signed out, open invites cancelled; `400 CANNOT_REMOVE_OWNER`; adding the same mobile again reactivates

## 4. Teams

**Implemented 21 Nov 2026 (D-029), owner only:** all six endpoints below. `POST /teams` takes `name`, `seniorMemberId?`, `helperMemberIds[]`; one primary senior per team; errors `ALREADY_IN_TEAM`, `EMPLOYEE_NOT_ACTIVE`, `OWNER_NOT_IN_TEAM`, `TEAM_NOT_FOUND`.

- `GET /teams`
- `POST /teams`
- `GET /teams/:id`
- `PATCH /teams/:id`
- `POST /teams/:id/members`
- `DELETE /teams/:id/members/:memberId`

Validate that the selected senior technician and helpers are active members of the same organization.

## 5. Customers and equipment

**Implemented 20 Nov 2026 (D-028), owner only:** `GET /customers?q=&archived=` (name, any case, or any digits of the mobile), `POST /customers` (with first `site`; `409 CUSTOMER_PHONE_EXISTS` + `details.customerId` unless `allowDuplicatePhone`), `GET`/`PATCH /customers/:id` (incl. `archived`), `POST /customers/:id/sites`, `POST /equipment`, `PATCH /equipment/:id` (incl. `archived`). **History, 22 Nov 2026 (T4.4):** `GET /customers/:id/history` (the customer's jobs, newest day first: number, type, status, day, team name, outcome, report note, parts) and `GET /equipment/:id/history` (`{ equipment, jobs }`, each job also with `work` and `workNote` for this AC); owner only, `CUSTOMER_NOT_FOUND` / `EQUIPMENT_NOT_FOUND` for other businesses. `/customers/:id/outstanding` is in §8 (T4.11).

- `GET /customers?q=`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `GET /customers/:id/history`
- `GET /customers/:id/sites`
- `POST /customers/:id/sites`
- `GET /equipment?customerId=`
- `POST /equipment`
- `GET /equipment/:id`
- `GET /equipment/:id/history`
- `PATCH /equipment/:id`

Search should support customer name and phone number.

## 5a. Enquiries (service requests)

- `GET /enquiries?status=OPEN`
- `POST /enquiries`
- `GET /enquiries/:id`
- `PATCH /enquiries/:id`
- `POST /enquiries/:id/convert` (creates a job, copies customer/site/ACs/type/complaint/preferred day; body may set `scheduledDate`, `timeSlot`, `teamId`, `amountToCollect` and change `equipmentIds`, `type`, `complaint`; returns the job; a second convert gives `INVALID_STATUS_TRANSITION`)
- `POST /enquiries/:id/close` (body `{ reason }`)

`GET /enquiries?status=CLOSED` lists closed and converted enquiries. Numbers are per business from E-201 (D-033).

## 6. Jobs

**Implemented 21 Nov 2026 (D-030), owner only:** `GET /jobs?status=OPEN|NEW|…&date=YYYY-MM-DD&teamId=&customerId=`, `POST /jobs`, `GET /jobs/:id`, `PATCH /jobs/:id` (needs `version`; `409 VERSION_CONFLICT`), `POST /jobs/:id/assign-team`, `POST /jobs/:id/cancel` (`reason`), `POST /jobs/:id/follow-up`. Invalid moves: `409 INVALID_STATUS_TRANSITION` (state machine in `backend/src/jobs/jobs.state.ts`). Technician actions (start, hold, complete, updates) come with T4.7.

- `GET /jobs?status=&date=&teamId=`
- `POST /jobs`
- `GET /jobs/:id`
- `PATCH /jobs/:id`
- `POST /jobs/:id/assign-team`
- `POST /jobs/:id/assign-members`
- `POST /jobs/:id/start`
- `POST /jobs/:id/hold`
- `POST /jobs/:id/complete`
- `POST /jobs/:id/follow-up`
- `GET /jobs/:id/history`
- `POST /jobs/:id/updates` (field status feed: appointment fixed, part needed, hold, note; see doc 05 `JobUpdate`)
- `GET /jobs/updates?since=` (owner's "Latest from teams")

A job completion request should be idempotent and preserve the submitted service report.

## 7. Field service

- `POST /jobs/:id/work-items`
- `POST /jobs/:id/parts`
- `POST /jobs/:id/readings`
- `POST /jobs/:id/attachments`
- `POST /jobs/:id/service-report`
- `POST /jobs/:id/customer-confirmation`

Do not force every category to submit every possible field.

## 8. Billing

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `POST /invoices/:id/issue`
- `POST /invoices/:id/cancel`
- `GET /estimates`
- `POST /estimates`
- `POST /estimates/:id/convert-to-invoice`
- `POST /invoices/:id/payments`
- `GET /payments`
- `GET /customers/:id/outstanding`
- `GET /cash-collections?status=PENDING_HANDOVER` (*proposed*)
- `POST /cash-collections/:id/confirm` (creates the `Payment`)
- `POST /cash-collections/:id/reject`

Technicians create cash collections through the job completion request or the sync API, never through `/payments`.

Invoice totals must be recalculated and validated by the server.

## 9. AMC

- `GET /amc-contracts`
- `POST /amc-contracts`
- `GET /amc-contracts/:id`
- `POST /amc-contracts/:id/visits`
- `POST /maintenance-visits/:id/create-job`

## 10. Sync API

Potential endpoints:
- `GET /sync/bootstrap`
- `GET /sync/changes?cursor=`
- `POST /sync/operations`
- `POST /sync/attachments/complete`

The protocol is specified in `09_OFFLINE_AND_SYNC_SPEC.md`.

Requirements:
- Idempotency.
- Cursor-based changes.
- Per-user/per-device access filtering.
- Version checks.
- Retry-safe uploads.
- Partial success reporting.
- No duplicate jobs or payments.

## 11. Notifications

Initial notifications:
- New job assigned.
- Job rescheduled.
- Job needs attention.
- Job completed.
- Optional AMC reminder.

Do not send excessive notifications. Allow sensible notification preferences.

## 12. WhatsApp

MVP:
- Owner manually captures an enquiry from WhatsApp.
- Provide a share action for invoice PDFs or service summaries.
- Do not automatically read private WhatsApp conversations.
- Defer WhatsApp Business API automation until demand and integration cost are validated.

## 13. Maps and phone actions

Use native phone actions where helpful:
- Call customer.
- Open address in installed map application.

Do not build live GPS tracking or route optimization in the first release.
