# 07 — KaamSetu Roadmap and Delivery Plan

## 1. Delivery strategy

The project should begin with UI/UX, not backend coding.

The first deliverable is a tested clickable prototype. The prototype should prove that the owner and field team can complete their tasks without confusion.

Do not treat the roadmap as a fixed calendar promise. A solo developer's actual pace depends on available hours, learning and pilot feedback.

## 2. Phase 0 — Field discovery

### Activities
- Observe the owner handling a real enquiry.
- Observe a senior technician completing a real job.
- Observe how the helper participates.
- Understand how the team is selected.
- Understand how bills are calculated.
- Understand how payments are recorded.
- Collect examples of current WhatsApp messages, paper bills and job notes with personal data removed where possible.

### Deliverables
- Current-state workflow.
- Pain-point list.
- Confirmed user roles.
- List of required job fields.
- Confirmed language needs.
- Decision on whether helpers need individual app accounts.
- Examples of real invoice format.

### Exit criteria
Owner and at least one senior technician agree that the proposed workflow reflects real operations.

## 3. Phase 1 — Product definition and information architecture

### Activities
- Finalize personas.
- Finalize role permissions.
- Prioritize P0/P1/P2 features.
- Create navigation map.
- Map primary workflows.
- Define job statuses.
- Define customer and AC data requirements.

### Deliverables
- PRD.
- Sitemap.
- User-flow diagrams.
- Screen inventory.
- MVP acceptance criteria.

### Exit criteria
No major ambiguity remains in the owner-to-job-to-technician-to-bill workflow.

## 4. Phase 2 — Low-fidelity UI/UX

### Design owner flows
1. Login/setup.
2. Home.
3. Customer search/add.
4. Create job.
5. Assign team.
6. View job progress.
7. Create invoice.
8. Record payment.

### Design senior technician flows
1. My Work.
2. Job details.
3. Call/navigate.
4. Start work.
5. Select work performed.
6. Add parts/notes/photos.
7. Finish work.
8. Needs another visit.

### Design helper flow
- Current team job.
- Basic location/task information.
- Optional minimal contribution.

### Deliverables
- Grayscale wireframes.
- Clickable low-fidelity prototype.
- Interaction notes.
- Empty/loading/error/offline states.

### Exit criteria
Users can complete the main tasks in the prototype without coaching.

## 5. Phase 3 — Visual design and usability testing

### Activities
- Define typography and color tokens.
- Create reusable components.
- Create high-fidelity screens.
- Test English/Marathi/Hindi font rendering.
- Test contrast and touch targets.
- Conduct usability tests with owner, senior technician and helper.

### Deliverables
- High-fidelity clickable prototype.
- Component library.
- Design tokens.
- Screen specifications.
- Usability findings and fixes.

### Exit criteria
- Users understand the primary action on each screen.
- Senior technician can complete a sample job.
- Owner can create a job and bill.
- Helper workflow is either validated or removed from direct app use.

## 6. Phase 4 — Technical foundation

### Activities
- Create repository structure.
- Configure Expo and TypeScript.
- Configure NestJS.
- Configure PostgreSQL and Prisma.
- Build authentication.
- Build organization and membership.
- Implement tenant isolation.
- Implement role guards.
- Set up staging and production environments.

### Deliverables
- Working mobile shell.
- Working backend.
- Initial database migrations.
- Authentication.
- Organization-scoped authorization tests.

### Exit criteria
Users can log in and cannot access another organization's data.

## 7. Phase 5 — Business setup and records

### Activities
- Business profile.
- Employee setup.
- Team setup.
- Customer management.
- Sites.
- AC equipment.

### Deliverables
- Owner can create teams.
- Owner can add senior technician/helper.
- Owner can create/search customers.
- Owner can add AC units.

### Exit criteria
A returning customer and their AC can be found without re-entering known details.

## 8. Phase 6 — Service workflow

### Activities
- Create request/job.
- Assign team.
- Senior technician job list.
- Job details.
- Start work.
- Work performed.
- Parts/notes/photos.
- Complete or follow-up.
- Status history.

### Deliverables
A full online job lifecycle.

### Exit criteria
Owner can create and assign a job; senior technician can complete it; owner sees the result.

## 9. Phase 7 — Offline capability

### Activities
- SQLite schema.
- Local cache.
- Transactional outbox.
- Idempotency.
- Attachment queue.
- Retry handling.
- Version/conflict handling.
- App restart recovery.

### Test scenarios
- Start job offline.
- Complete job offline.
- Kill/reopen app.
- Restore network.
- Upload photos.
- Repeat same sync request.
- Lose connection mid-upload.
- Update same record from two devices.

### Exit criteria
No work is lost and duplicate submissions do not create duplicate records.

## 10. Phase 8 — Billing

### Activities
- Estimate/invoice creation.
- Invoice numbering.
- Line items.
- Total calculation.
- PDF generation.
- Share action.
- Payment recording.
- Partial payments.
- Outstanding balances.

### Exit criteria
Owner can create a bill from a completed job and record a partial/full payment accurately.

## 11. Phase 9 — Pilot

### Pilot scope
- One business.
- Actual owner.
- One or two field teams initially.
- Real customer jobs.
- Real service completion.
- Real bills and payments.

Expand to all 6–8 teams only after the first teams use the app reliably.

### Observe
- Do technicians open the app?
- Do they understand the instructions?
- Are jobs completed without help?
- Are owners still relying on parallel paper/WhatsApp tracking?
- Are reports complete?
- Are payment balances correct?
- Are offline failures recoverable?

### Exit criteria
The business can run the chosen pilot workflow without maintaining duplicate records for the same job.

## 12. Phase 10 — Commercial SaaS readiness

Before onboarding unrelated businesses:
- Tenant isolation audit.
- Subscription and plan model.
- Terms and privacy policy.
- Data export.
- Backups and restore tests.
- Error monitoring.
- Support process.
- Onboarding flow.
- Usage limits.
- Billing provider decision.
- Production deployment checklist.

## 13. Phase 11 — Expansion

Only based on evidence:
- AMC automation.
- Expense tracking.
- Better reports.
- WhatsApp Business integration.
- Inventory.
- Additional languages.
- Multi-branch support.
- iOS.

## 14. Suggested solo-developer work sequence

Work in small deliverable increments:

1. User flows.
2. Wireframes.
3. Clickable prototype.
4. Usability fixes.
5. Design system.
6. Mobile shell.
7. Backend/database foundation.
8. Authentication and tenancy.
9. Teams and employees.
10. Customers and equipment.
11. Jobs and assignment.
12. Technician workflow.
13. Offline persistence.
14. Sync and photo uploads.
15. Invoices.
16. Payments.
17. Pilot hardening.

Do not build all backend modules before validating the screens and workflows.

## 15. Definition of done

A feature is done only when:
- User flow is clear.
- UI handles loading/empty/error states.
- Input validation works.
- Backend authorization works.
- Tenant isolation is tested.
- Offline behavior is defined if applicable.
- Audit/history is preserved where required.
- Real-device testing is complete for field features.
- User-facing language is understandable.
