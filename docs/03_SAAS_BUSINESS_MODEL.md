# 03 — KaamSetu SaaS Business Model and Multi-Tenancy

## 1. SaaS definition

KaamSetu is a multi-tenant Software-as-a-Service product.

One shared platform serves multiple independent AC service businesses. Each business has its own:
- Employees.
- Teams.
- Customers.
- AC equipment.
- Jobs.
- Invoices.
- Payments.
- AMC records.
- Settings.

One business must never be able to access another business's records.

## 2. Tenant terminology

Use `Organization` in the database and backend to represent a subscribing business.

A user may belong to one or more organizations in the future, but the initial UI can assume one active business at a time.

Every business-owned record must include an organization relationship or be securely reachable through an organization-owned parent.

## 3. Tenant isolation

Mandatory rules:
1. Derive the active organization from the authenticated membership/session.
2. Never trust a client-supplied organization ID by itself.
3. Scope all reads, updates and deletes to the authenticated organization.
4. Validate nested records belong to the same organization.
5. Scope file access and signed URLs.
6. Add organization-aware unique constraints where appropriate.
7. Test cross-tenant access attempts.
8. Include organization ID in audit and sync records.

Consider PostgreSQL row-level security as an additional defense after the application-level authorization model is working. Do not rely on UI hiding for security.

## 4. SaaS roles

Platform roles:
- Platform administrator/support (internal KaamSetu operations).
- Organization owner.
- Organization senior technician.
- Organization helper.

Platform administrator access must be separate from customer business roles and audited. Support access should be limited and controlled.

## 5. Subscription model

Do not over-engineer subscriptions before the first pilot.

Suggested subscription concepts:
- Trial.
- Active.
- Past due.
- Suspended.
- Cancelled.

Potential pricing dimensions to validate:
- Number of active employees.
- Number of teams.
- Monthly or annual billing.
- Storage usage.
- Premium support or integrations.

Avoid pricing per job initially because it may discourage recording every service job.

**Public commitment (D-014):** the build-in-public posts promise early-access businesses **30 days free at launch**. The trial length is therefore 30 days for early-access sign-ups. No prices or tiers have been announced; keep it that way until pricing is validated.

**Pilot business:** uses KaamSetu free during the pilot. Terms after the pilot to be agreed in writing before Phase 7 (Q-13).

A simple future plan structure could be:
- Starter: one small team and core job/billing features.
- Growth: multiple teams and more staff.
- Business: larger team limits, advanced reports and support.

These are product packaging ideas, not finalized prices or commitments.

**Plans in the app (D-045, 23 Nov 2026):** Solo ₹299, Crew ₹499, Business ₹1,499 a month (a year = ten months). Solo allows working alone, Crew adds one employee, Business allows several teams (up to 10). Shown only inside the app; nothing announced publicly (D-014).

**Who the plans must fit (D-041):** a single technician, a two-person crew, and a vendor with several teams. The smallest plan has to make sense for one person who is both owner and technician; the largest for a vendor with many teams. Plan limits by number of teams or staff fit this range better than limits by jobs (see above).

## 6. Subscription enforcement

**Business type first (D-044):** what a business can use is decided today by its business type (SOLO, CREW, VENDOR) through one feature map (`backend/src/organization/features.ts`), checked on the server for every gated route and mirrored in the app. When paid plans arrive, the plan feeds the same map (for example, VENDOR only on a team plan); no screen needs its own check.

The backend should know:
- Plan ID.
- Subscription status.
- Billing period.
- Start/end dates.
- Feature entitlements.
- Seat/team limits.

Do not block technicians from accessing already assigned work solely because a subscription payment is overdue without a carefully designed grace-period and data-export policy.

Never delete customer business data on subscription expiry.

**Built (D-045):** after a trial or paid period: 7 grace days with a reminder, then view-only (see, export, pay; no new work, 402 `PLAN_ENDED`). Technicians can still finish jobs already given out and the owner can record money for past work. Payment is manual (UPI, then `pilot set-plan`) until Razorpay.

## 7. Onboarding

Recommended onboarding:
1. Owner creates account.
2. Verifies phone number.
3. Enters business name and phone.
4. Adds business address.
5. Creates first team.
6. Adds senior technician.
7. Adds helper if needed.
8. Adds first customer.
9. Creates first job.

Avoid a long setup wizard. Allow the owner to skip optional details and complete them later.

## 8. Data lifecycle

- Provide business data export.
- Define retention and deletion policies.
- Support account closure requests.
- Preserve financial audit records according to applicable legal requirements.
- Use backups and restore testing.
- Clearly communicate what happens when a subscription expires.
- Do not use customer data for cross-tenant purposes.

## 9. Privacy and legal readiness

Before commercial launch, obtain appropriate Indian legal advice on:
- Privacy policy.
- Terms of service.
- Data processing and retention.
- Employee/customer personal data.
- Payment provider requirements.
- GST and invoice compliance.
- Data breach handling.
- Consumer/business contractual obligations.

Do not claim tax or statutory compliance until the actual requirements have been validated and implemented.
