# 05 — KaamSetu Database and Domain Model

This is the logical data model. Final Prisma syntax and field types should be generated after the workflow and UI decisions are validated.

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
- source: WHATSAPP | PHONE | WALK_IN | OTHER
- complaint
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
- scheduledAt (optional)
- assignedTeamId (optional)
- status
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

### InvoiceItem
- id
- organizationId
- invoiceId
- descriptionSnapshot
- quantity
- unit
- unitRate
- lineTotal

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
