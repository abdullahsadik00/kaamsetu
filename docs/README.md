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

## Documentation index

| File | Purpose |
|---|---|
| `01_PRODUCT_REQUIREMENTS.md` | Product vision, users, scope, workflows and requirements |
| `02_UX_UI_DESIGN_SPEC.md` | UX principles, navigation, screen inventory, wireframe descriptions and design system |
| `03_SAAS_BUSINESS_MODEL.md` | Multi-tenant SaaS structure, subscriptions, onboarding and tenant isolation |
| `04_TECHNICAL_ARCHITECTURE.md` | Recommended stack, application architecture, offline approach and security |
| `05_DATABASE_AND_DOMAIN_MODEL.md` | Domain entities, relationships, fields and data rules |
| `06_API_AND_INTEGRATION_SPEC.md` | REST API outline, permissions, sync and integrations |
| `07_ROADMAP_AND_DELIVERY_PLAN.md` | UI/UX-first roadmap, phases, deliverables and acceptance criteria |
| `08_BRAND_AND_CONTENT_GUIDE.md` | Name, positioning, tone, language and interface copy |

## Recommended sequence

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
