# 05 — KaamSetu Database and Domain Model

This is the logical data model. Final Prisma syntax and field types should be generated after the workflow and UI decisions are validated.

> **Source of truth for:** entities, relationships and data rules. `backend/prisma/schema.prisma` implements it and must not contradict it.
> **Implemented so far:** `Organization`, `User`, `OrganizationMember` (schema only; no migration has run).

**Global conventions (D-012, D-013):**
- Primary keys are UUIDs. Records created offline get their UUID on the phone so the outbox can reference them before the server has seen them.
- Money is stored as integer **paise** (`BigInt`/`Int`), currency `INR`. No floats anywhere in money code.
- Every business table has `organizationId`, `createdAt`, `updatedAt`; mutable records that phones edit also have `version`.
- Human-friendly numbers (job `#1048`, enquiry `E-213`, bill `KS-0085`) are per-organization sequences, assigned by the server. A phone shows "New job" until the number arrives.

## 1. Organization and identity

### Organization
- id
- name
- phone
- email (optional)
- address fields
- logo key (optional)
- GSTIN (optional)
- currency code
- timezone
- createdAt
- updatedAt
- status

### User
- id
- phone
- name
- email (optional)
- preferredLanguage
- createdAt
- updatedAt
- status

### OrganizationMember
- id
- organizationId
- userId
- role: OWNER | SENIOR_TECHNICIAN | HELPER
- status
- joinedAt
- deactivatedAt (optional)

Unique constraint: organizationId + userId.

## 2. Teams

### Team
- id
- organizationId
- name
- active
- createdAt
- updatedAt

### TeamMember
- id
- organizationId
- teamId
- organizationMemberId
- teamPosition: SENIOR_TECHNICIAN | HELPER
- isPrimary
- active
- joinedAt
- leftAt (optional)

Business rule:
- A team should normally have one primary senior technician.
- A team may have one or more helpers.
- The product should support temporary substitution.
- Enforce active membership and primary senior rules at the application/database level as appropriate.
- Do not hard-code a maximum of 6–8 teams.

A user may be associated with more than one team if the business requires it, although the initial operating model may use one primary team per employee.

## 3. Customers and sites

### Customer
- id
- organizationId
- customerType: INDIVIDUAL | BUSINESS
- name
- phone
- alternatePhone (optional)
- email (optional)
- notes (optional)
- createdAt
- updatedAt
- archivedAt (optional)

### Site
- id
- organizationId
- customerId
- name (optional)
- addressLine1
- addressLine2 (optional)
- locality
- city
- state
- postalCode
- landmark (optional)
- isDefault
- createdAt
- updatedAt

For simple residential customers, create a default site automatically or allow the address to serve as the default location.

## 4. Equipment

### Equipment
- id
- organizationId
- customerId
- siteId
- equipmentType
- brand
- model (optional)
- capacity (optional)
- serialNumber (optional)
- locationLabel (e.g. Bedroom 1)
- installedAt (optional)
- warrantyExpiresAt (optional)
- refrigerantType (optional)
- status
- createdAt
- updatedAt

### ACUnitDetails
Optional extension:
- equipmentId
- indoorUnitDetails (optional)
- outdoorUnitDetails (optional)
- additionalTechnicalDetails (optional JSON only if justified)

Avoid storing every possible technical reading as a fixed field on the equipment record.

## 5. Service requests and jobs

### ServiceRequest
Represents the original customer enquiry/complaint.
- id
- organizationId
- customerId
- siteId
- requestNumber (per organization, shown as `E-213`)
- source: WHATSAPP | PHONE | WALK_IN | SERVICE_CENTRE | B2B | OTHER
- sourcePartnerId (optional; brand service centre or builder, see SourcePartner)
- externalTicketNumber (optional; brand's ticket number, unique per organization + partner)
- listedCharges (optional; charges named in the ticket, paise)
- rawTicketText (optional; pasted text kept for audit, deleted after 90 days)
- complaint
- status: OPEN | CONVERTED | CLOSED
- equipment (optional list of known ACs)
- requestedAt
- preferredVisitAt (optional)
- status
- createdByMemberId
- createdAt
- updatedAt

### ServiceJob
Represents one actual visit/work order.
- id
- organizationId
- serviceRequestId (optional for direct jobs)
- customerId
- siteId
- jobNumber
- serviceCategory
- complaintSnapshot
- scheduledDate (optional)
- timeSlot (optional: MORNING | AFTERNOON | EVENING | exact time; final list from discovery, Q-06)
- appointmentConfirmedAt (optional; set when "Appointment fixed")
- assignedTeamId (optional)
- status: NEW | ASSIGNED | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED
- holdSide (optional: CUSTOMER | OURS)
- holdReason (optional short text / code)
- amountToCollect (optional, paise)
- followUpOfJobId (optional; links a follow-up visit to the earlier job)
- externalTicketNumber (optional; copied from the request)
- brandPortalClosedAt (optional; owner ticks "Closed in brand portal")

### SourcePartner (D-019)
- id, organizationId, name (e.g. a brand service centre or builder), type: SERVICE_CENTRE | BUILDER | DEALER | OTHER, ticketFormat (optional parser key), active
- outcome: COMPLETED | NEEDS_FOLLOW_UP | NOT_COMPLETED (optional)
- createdByMemberId
- startedAt (optional)
- completedAt (optional)
- version
- createdAt
- updatedAt

A request can generate multiple jobs. Each follow-up visit should have a new job record.

### JobEquipment
- id
- organizationId
- jobId
- equipmentId

This allows one commercial job to cover multiple AC units.

### JobAssignment
- id
- organizationId
- jobId
- teamId
- assignedByMemberId
- assignedAt
- unassignedAt (optional)

Keep assignment history rather than overwriting the previous team assignment.

### JobTechnician
Optional individual assignment:
- id
- organizationId
- jobId
- organizationMemberId
- assignmentRole: SENIOR_TECHNICIAN | HELPER
- assignedAt
- removedAt (optional)

Normally, the team membership supplies the senior/helper pairing. Store individual assignment only when a job-specific exception or explicit assignment is needed. Avoid duplicating team membership unnecessarily.

### JobUpdate

The field status feed (D-009). One row per update a technician or owner sends.
- id (client-generated)
- organizationId
- jobId
- type: APPOINTMENT_FIXED | STARTED | PART_NEEDED | PART_READY | CUSTOMER_HOLD | OUR_HOLD | NOTE | COMPLETED | RESUMED
- payload (small JSON: part, quantity, canContinue, newDate, text)
- createdByMemberId
- createdAt (phone time) and receivedAt (server time)

`JobStatusHistory` below stays the audit of status changes; a `JobUpdate` may or may not change status.

### JobStatusHistory
- id
- organizationId
- jobId
- fromStatus (optional)
- toStatus
- changedByMemberId
- changedAt
- note (optional)

## 6. Field service records

### JobWorkItem
- id
- organizationId
- jobId
- equipmentId (optional; work is recorded per AC in the prototype)
- workType
- description (optional)
- createdByMemberId

### JobPartUsage
- id
- organizationId
- jobId
- description
- quantity
- unit (optional)
- unitCost (optional)
- billableRate (optional)
- createdByMemberId

Do not require a full inventory module to record a part used.

### JobReading
- id
- organizationId
- jobId
- equipmentId (optional)
- readingType
- value
- unit
- note (optional)
- recordedByMemberId

Only capture readings relevant to the job and equipment. Do not impose universal refrigerant pressure targets.

### Attachment
- id
- organizationId
- entityType
- entityId
- storageKey
- mimeType
- fileSize
- capturedAt (optional)
- uploadedByMemberId
- uploadStatus

### ServiceReport
- id
- organizationId
- jobId
- summary (optional)
- outcome
- submittedByMemberId
- submittedAt
- version

### CustomerConfirmation
- id
- organizationId
- jobId
- confirmationType
- customerName (optional)
- confirmedAt
- evidenceAttachmentId (optional)

Do not require signature/OTP until the business validates the need.

## 7. Billing

### Estimate
- id
- organizationId
- customerId
- jobId (optional)
- estimateNumber
- status
- subtotal
- discountAmount
- taxAmount
- totalAmount
- validUntil (optional)
- createdByMemberId
- createdAt

### EstimateItem
- id
- organizationId
- estimateId
- description
- quantity
- unit
- unitRate
- lineTotal

### Invoice
- id
- organizationId
- customerId
- jobId (optional)
- invoiceNumber
- status
- currencyCode
- issueDate
- dueDate (optional)
- subtotal
- discountAmount
- taxAmount
- totalAmount
- amountReceivedCache (optional derived/cache only)
- notes (optional)
- issuedAt (optional)
- createdByMemberId
- createdAt
- updatedAt

### RateItem (D-039)
- id
- organizationId
- name
- unitPrice (paise)
- gstRate (0, 5, 12, 18, 28)
- active

The business's usual prices. Picking one copies it into an InvoiceItem; changing or turning off a RateItem never changes saved bills. Q-15 may add a source or brand later.

### InvoiceItem
- id
- organizationId
- invoiceId
- descriptionSnapshot
- quantity
- unit
- unitRate
- taxRate (optional, e.g. 18.00; only when the bill is a GST bill)
- sacCode (optional; required only if the accountant confirms it, Q-04)
- lineTotal
- taxAmount

Invoice also gets `isGstInvoice` and a `sellerGstinSnapshot`/`buyerGstin` (optional). Final GST fields are decided after Q-04.

Line item descriptions and rates must be snapshots. Later changes to service catalogue or job data must not change issued invoices.

### Payment
- id
- organizationId
- customerId
- amount
- currencyCode
- method: CASH | UPI | BANK_TRANSFER | OTHER
- reference (optional)
- receivedAt
- recordedByMemberId
- status
- idempotencyKey
- createdAt

### CashCollection (*proposed*, D-008)

Money a technician says they received on site. It is **not** a payment until the owner confirms it.
- id (client-generated)
- organizationId
- jobId
- collectedByMemberId
- amount (paise)
- method: CASH | UPI | OTHER
- collectedAt
- status: PENDING_HANDOVER | CONFIRMED | REJECTED
- confirmedByMemberId (optional)
- confirmedAt (optional)
- paymentId (set when confirmed)
- rejectionReason (optional)

### PaymentAllocation
- id
- organizationId
- paymentId
- invoiceId
- amount

A payment may be allocated across one or more invoices if that becomes necessary. For MVP, the UI may allocate it to one invoice at a time.

Use integer paise or exact decimal storage. Never use floating-point values for money.

## 8. AMC

### AMCContract
- id
- organizationId
- customerId
- siteId
- contractNumber
- startDate
- endDate
- totalVisits
- visitFrequency (optional)
- contractAmount
- status
- coverageNotes
- exclusions (optional)
- createdAt

### AMCContractEquipment
- id
- organizationId
- contractId
- equipmentId

### MaintenanceVisit
- id
- organizationId
- contractId
- plannedAt
- serviceJobId (optional)
- status
- completedAt (optional)

AMC visit should use the normal ServiceJob and field completion workflow.

## 9. Expenses (P1)

### Expense
- id
- organizationId
- category
- amount
- description
- incurredAt
- jobId (optional)
- attachmentId (optional)
- recordedByMemberId

## 10. SaaS and synchronization

### Subscription
> Implemented minimal (D-027, 20 Nov 2026): `plan` is a text name (`TRIAL`) instead of `planId` until plans exist; `status` TRIALING/ACTIVE/PAST_DUE/CANCELLED; one per organization. Organization also has `gstBills` (default for new bills).

- id
- organizationId
- planId
- status
- currentPeriodStart
- currentPeriodEnd
- trialEndsAt (optional)

### Device
- id
- organizationId
- userId
- deviceIdentifier
- platform
- lastSeenAt
- revokedAt (optional)

### SyncOperation
- id
- organizationId
- deviceId
- actorUserId
- entityType
- entityId
- operationType
- idempotencyKey
- payload
- status
- attemptCount
- createdAt
- processedAt (optional)
- errorCode (optional)

### AuditLog
- id
- organizationId
- actorUserId
- action
- entityType
- entityId
- metadata (redacted/safe)
- createdAt

Built 22 Nov 2026 (T5.5). `action` values: EMPLOYEE_ADDED, EMPLOYEE_REMOVED, LOGIN_RESET, BILL_ISSUED, BILL_CANCELLED, PAYMENT_RECORDED, PAYMENT_VOIDED, CASH_CONFIRMED, CASH_REJECTED. Rows are only added. No screen shows them yet.

## 11. Database rules

- Every business-owned record must be tenant-scoped.
- Use foreign keys and indexes for common lookups.
- Index organizationId + status, organizationId + createdAt, customer phone and jobNumber where appropriate.
- Unique invoice/job numbers per organization.
- Use soft archive for customer/employee records where history must remain.
- Preserve status history.
- Preserve issued invoice snapshots.
- Never silently delete payments.
- Enforce idempotency for offline operations.
- Use optimistic versioning for important mutable records.
- Avoid storing unnecessary sensitive personal information.
