# KaamSetu — Product Documentation

**Working product name:** KaamSetu (कामसेतु)  
**Product category:** SaaS for small AC service and maintenance businesses in India  
**Positioning:** Simple AC service operations and billing for owners and field teams.

> Working tagline: **काम आसान। हिसाब आसान। कारोबार आसान।**  
> English: Work made easier. Accounts made easier. Business made easier.

## What is KaamSetu?

KaamSetu helps AC service businesses manage customer enquiries, AC equipment, service jobs, field teams, basic invoices, payments and AMC visits from one simple mobile-first application.

It is not intended to be a full ERP or accounting suite. The product should reduce coordination and paperwork, not create more administration.

## Important product decisions

- Android-first mobile application.
- One role-based application, not separate apps for owners and technicians.
- SaaS multi-tenancy: multiple independent service businesses use the same platform with isolated data.
- Initial customer: an AC service company in Pune, India.
- Initial business has approximately 6–8 field teams and 1–5 jobs per day.
- Each field team consists of:
  - **Senior Technician / Main Technician:** responsible for technical work and leading the job on site.
  - **Helper:** assists the senior technician and records only what is necessary.
- Business owner directly manages the company; there is no dedicated office manager.
- Team leaders are not assumed to be a separate managerial layer. The senior technician is the operational lead for the assigned team/job.
- Current customer enquiries arrive mainly through WhatsApp and phone calls.
- Billing is currently mostly manual.
- Offline field work is a core requirement.
- The first design activity should be UI/UX discovery and prototyping before full application development.

## Current status (19 Nov 2026)

Clickable prototype done (not yet user-tested); code scaffold done (no product features); discovery with the pilot business is next. Details: [DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md), [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

This folder (`app/docs/`) is the documentation source of truth (D-017). The older `KaamSetu_Product_Documentation` folder next to `app/` is an outdated copy.

## Documentation index

| File | Purpose |
|---|---|
| `01_PRODUCT_REQUIREMENTS.md` | Product vision, users, scope, workflows and requirements |
| `02_UX_UI_DESIGN_SPEC.md` | UX principles, navigation, screen inventory, design status and design system |
| `03_SAAS_BUSINESS_MODEL.md` | Multi-tenant SaaS structure, subscriptions, onboarding and tenant isolation |
| `04_TECHNICAL_ARCHITECTURE.md` | Stack, application architecture, module boundaries |
| `05_DATABASE_AND_DOMAIN_MODEL.md` | Domain entities, relationships, fields and data rules |
| `06_API_AND_INTEGRATION_SPEC.md` | REST API outline, permissions and integrations |
| `07_ROADMAP_AND_DELIVERY_PLAN.md` | Superseded; points to the execution plan and roadmap |
| `08_BRAND_AND_CONTENT_GUIDE.md` | Name, positioning, tone, language and interface copy |
| `09_OFFLINE_AND_SYNC_SPEC.md` | Offline scope per role, outbox, sync protocol, conflict policy |
| `10_AUTH_AND_SECURITY_SPEC.md` | OTP login, tokens, permission enforcement, data protection |
| `11_ENGINEERING_STANDARDS.md` | Repository, Git workflow, code, API, errors, logging, config |
| `12_TESTING_STRATEGY.md` | Test levels, mandatory suites, acceptance, performance targets |
| `13_DEPLOYMENT_AND_OPERATIONS.md` | Environments, hosting, CI/CD, monitoring, backups, releases |
| `PROJECT_EXECUTION_PLAN.md` | Phases 0–8 with activities, deliverables, gates, definition of done |
| `PROJECT_ROADMAP.md` | Milestones in dependency order |
| `PROJECT_TASK_TRACKER.md` | Tasks with priority, status, dependencies and acceptance criteria |
| `PHONE_TEST_PLAN.md` | Step-by-step phone tests (TP IDs) for built and upcoming features, with results |
| `DECISION_LOG.md` | Decisions and pending questions |
| `RISK_REGISTER.md` | Risks and mitigations |
| `CHANGELOG.md` | Meaningful changes over time |
| `DOCUMENTATION_AUDIT.md` | Audit of 19 Nov 2026 |
| `design/` | Clickable prototype and design canvas (open in a browser); `STITCH_DESIGN_BRIEF.md` collects the agreed design decisions for building screens in Google Stitch (a summary, not a source of truth); `STITCH_PROMPTS.md` and `STITCH_PROTOTYPE_PROMPTS.md` are the ready-to-paste screen and prototype-linking prompts |

## Source of truth

Each kind of information has exactly one owner document. Others link to it instead of copying it.

| Information | Owner document |
|---|---|
| Product requirements, scope, roles (business view) | 01 PRD |
| Screen behaviour, navigation, visual design | 02 UX/UI (prototype as layout reference) |
| Subscriptions, tenancy principles | 03 SaaS |
| Architecture and stack | 04 Architecture |
| Data model | 05 Database (Prisma schema implements it) |
| API contracts | 06 API |
| Offline and sync rules | 09 Offline and sync |
| Authentication, permission enforcement, privacy | 10 Auth and security |
| Engineering conventions | 11 Engineering standards |
| Testing | 12 Testing strategy |
| Environments, releases, operations | 13 Deployment and operations |
| Phase plan and definition of done | Execution plan |
| Sequencing | Roadmap |
| Execution status | Task tracker |
| Decisions and open questions | Decision log |
| UI wording | 08 Brand and content |

## How documentation changes

When a feature, decision or design changes:
1. Find the affected documents using the table above.
2. Update the owner document first, then the documents that depend on it.
3. Check for contradictions (search for the old term or value).
4. Record a significant decision in `DECISION_LOG.md`; never edit an accepted decision silently. Supersede it with a new entry.
5. Add a line to `CHANGELOG.md` and update the task tracker.
6. Commit the related changes together (`docs: …`), separately from unrelated work.

## Recommended sequence (original, now detailed in the execution plan)

1. Validate the real workflow with the business owner, one senior technician and one helper.
2. Create user flows and low-fidelity wireframes.
3. Create a clickable UI prototype.
4. Test the prototype with actual users.
5. Refine the design and freeze the MVP scope.
6. Build the database and API foundations.
7. Implement one complete service-to-payment vertical slice.
8. Pilot with the initial business.
9. Improve from observed usage before expanding features.

## Naming note

KaamSetu is a working name, not a confirmed legally available brand. Before public launch, check Indian trademark availability, domain availability, app-store naming conflicts and relevant company-name usage.
