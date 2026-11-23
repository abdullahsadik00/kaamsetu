# KaamSetu — Risk Register

> **Source of truth for:** known risks and what we do about them. Review at every gate. Likelihood/Impact: Low / Medium / High.

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | Technicians don't use the app (too hard, no habit, owner still calls them) | High | High | Usability tests before building (G2); one primary action per screen; start pilot with 1–2 willing teams; owner asks for updates through the app | Sadik | Open |
| R-02 | Our understanding of the workflow is wrong (prototype built on assumptions) | Medium | High | Discovery phase with interviews and ride-along before design freeze | Sadik | Open |
| R-03 | Offline sync loses or duplicates data | Medium | High | Outbox + idempotency (doc 09); 12 mandatory scenarios; real-phone testing; pilot starts small | Sadik | Open |
| R-04 | Cross-tenant data leak | Low | High | Org from token only; scoped data helper; isolation tests per endpoint; security review | Sadik | Open |
| R-05 | Wrong balances or bills (money bugs) | Medium | High | Integer paise; server-side totals; immutable issued bills; money test suite | Sadik | Open |
| R-06 | GST bill rules misunderstood → non-compliant bills | Medium | Medium | Accountant confirms format (Q-04) before GST bills are issued; no compliance claims | Sadik | Open |
| R-07 | SMS OTP delivery/DLT registration delays login | Medium | Medium | Start DLT registration early in Phase 3; dev stub; WhatsApp OTP fallback option | Sadik | Open |
| R-08 | Solo developer capacity: illness, other work, scope creep | High | Medium | Strict P0 scope; gates; small commits; tracker shows real status | Sadik | Open |
| R-09 | Pilot business unavailable for interviews/tests | Medium | Medium | Book sessions in advance; short sessions; record findings immediately | Sadik | Open |
| R-10 | Low-end phones: slow app, photos fill storage | Medium | Medium | Device check (Q-11); photo compression; retention policy; performance targets (doc 12 §6) | Sadik | Open |
| R-11 | Name "KaamSetu" not available (trademark/domain/Play Store) | Medium | Medium | Check before heavier public promotion (doc 08 §4). 23 Nov 2026 web search: "KAAMSETU Fast Job Private Limited" (recruitment and staffing, Uttar Pradesh startup portal) uses the name; no KaamSetu app found on the stores. Next: IP India trademark search in classes 9, 35, 42; domain and Play Store name check Chosen replacement: KaamSaathi (D-042), checks pending | Sadik | Open |
| R-12 | Public promises ahead of the product (offline, launch date, free trial) | Medium | Medium | Follow build-in-public "say / don't say" table; trial fixed at 30 days (D-014) | Sadik | Open |
| R-13 | Personal data handling falls short of DPDP Act | Low | High | Data minimisation, redacted logs, legal review before launch (doc 10 §4) | Sadik | Open |
| R-14 | Local work lost (laptop failure) before a remote repo exists | Medium | High | Create private remote and push (T0.6) | Sadik | Open |
| R-15 | Dependency churn (Expo SDK, Prisma major versions) breaks builds | Medium | Low | Pin versions; upgrade deliberately once per quarter; CI | Sadik | Open |
