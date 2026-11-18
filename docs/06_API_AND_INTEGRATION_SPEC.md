# 06 — KaamSetu API and Integration Specification

## 1. API conventions

- REST API under `/api/v1`.
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

- `GET /organization`
- `PATCH /organization`
- `GET /employees`
- `POST /employees`
- `GET /employees/:id`
- `PATCH /employees/:id`
- `POST /employees/:id/deactivate`

## 4. Teams

- `GET /teams`
- `POST /teams`
- `GET /teams/:id`
- `PATCH /teams/:id`
- `POST /teams/:id/members`
- `DELETE /teams/:id/members/:memberId`

Validate that the selected senior technician and helpers are active members of the same organization.

## 5. Customers and equipment

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
- `PATCH /equipment/:id`

Search should support customer name and phone number.

## 6. Jobs

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

The exact protocol should be implemented only after the offline data model and conflict strategy are designed.

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
