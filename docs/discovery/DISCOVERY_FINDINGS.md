# KaamSetu — Discovery Findings (Phase 1)

> Fill this in after each conversation (T1.6). Write what you saw and heard, not what you hoped. Quote exact words where possible. No customer names or phone numbers.
> When done, I (Claude) will update the PRD, UX spec, data model and decision log from it (T1.7).

## Pre-interview answers from Sadik (19 Nov 2026)

Sadik knows the pilot business well and answered most open questions directly. These count as **medium confidence** until the owner confirms them in the interview; the interview now focuses on what is still unknown (see "Still to ask" below).

| Topic | Answer |
|---|---|
| Job sources | **Brand service-centre tickets** (with the brand's ticket number) and **builders/companies (B2B)**, plus direct WhatsApp/phone enquiries |
| Ticket format | Arrives as a WhatsApp text in a few fixed formats, e.g. `<ticket no> / <phone> / AC INST CHARGES-1500 / STAND-999 / <locality> / <name>` or a tab-separated line with ticket no, name, address, pincode, phone, product ("Premium AC") and job type ("Installation") (examples anonymised) |
| Paste to auto-fill | **Wanted.** Owner pastes the ticket text; the app fills the job and the owner checks it before saving |
| Brand portal | Ticket status is closed **manually** in the brand's own portal; KaamSetu only stores the ticket number |
| Who pays for service-centre jobs | **Unknown, ask the owner** (Q-14) |
| Volume | 1–5 jobs per day, more in summer |
| Top problems (owner) | Not knowing job status without calling teams; money tracking (who paid, who owes, cash with technicians); billing takes time |
| Money on site (Q-03) | Technician collects **cash or UPI**; UPI goes to the **owner's UPI/QR**, cash is handed over later |
| GST (Q-04) | GST-registered; **GST bills for some customers** (companies), plain bills for homes. Rates/SAC/split still to confirm with the accountant |
| Estimates (Q-05) | **Written quotations for big jobs** (installation, AMC, company jobs); needed in the pilot |
| Time slots (Q-06) | Owner gives **morning / afternoon**; the technician calls the customer to fix the exact time |
| Owner offline (Q-07) | Owner normally has internet, but when there is no network these must still work and sync later: view jobs and customers, save enquiries, create and assign jobs, add customers and ACs |
| Helpers (Q-01) | **Simple login**: today's job, customer name/phone/address, job type, and their assigned senior technician. Attendance later |
| Attendance and salary | Wanted, **linked to salary**, but **after the pilot** |
| Parts | Technician tells the owner a part is needed and raises a request; actual ordering happens through the service centre, **outside KaamSetu**. Exception: in a one-team business where the owner is also the technician, the owner buys the part directly, with no request |
| Phones and data (Q-10, Q-11) | Budget Android phones; mobile data is not a problem |

### Still to ask in the interview
1. Q-14: For service-centre and builder jobs, who pays the business: the customer on site, the brand/builder later, or split (base charge from brand, extras from customer)? Is there a monthly claim or statement?
2. Q-04: Accountant questions (Part E of the kit): rates, SAC codes, CGST/SGST vs IGST, numbering.
3. Q-15: Are the charges in a ticket (e.g. installation 1500, stand 999) fixed per brand? Should KaamSetu keep a price list per brand/source?
4. Which brands/service centres, how many ticket formats, and can we get 5 anonymised samples of each (for the paste parser)?
5. Confirm all medium-confidence answers above with the owner and one senior technician.

## Sessions held

| Date | Who (role, not name) | Type | Duration | Language |
|---|---|---|---|---|
| | Owner | Interview | | |
| | Senior technician | Ride-along | | |
| | Helper | Conversation | | |
| | Accountant | Call | | |

## Answers to open decisions

| ID | Question | Answer (with evidence) | Confidence (high/medium/low) |
|---|---|---|---|
| Q-01 | Helper login? What may they see? | Simple login: today's job, customer details, job type, assigned senior (Sadik) | Medium |
| Q-03 | Who collects money on site; how is it handed over? | Technician: cash (handed over later) or UPI to owner's QR (Sadik) | Medium |
| Q-04 | GST bills? Format, rates, SAC codes, tax split? | GST bills for some customers (Sadik); details from accountant pending | Low |
| Q-05 | Estimates/quotations needed before the pilot? | Yes, written for big jobs (Sadik) | Medium |
| Q-06 | Time slots actually given to customers? Who confirms? | Morning/afternoon; technician fixes exact time (Sadik) | Medium |
| Q-07 | Does the owner need to work offline? | Basic actions offline with later sync (Sadik) | Medium |
| Q-10 | Mobile data concerns for photos? | No (Sadik) | Medium |
| Q-11 | Technicians' phones (model, Android version, storage)? | Budget Android (Sadik); exact models at ride-along | Medium |
| Q-14 | Who pays for service-centre / builder jobs? | | |
| Q-15 | Fixed charges per brand/source? | | |

## Current workflow (as it really happens)

1. Enquiry arrives:
2. Owner notes it:
3. Time fixed with customer:
4. Team chosen and told:
5. Team travels and finds the site:
6. Work done; parts:
7. Money collected:
8. Owner told the job is done:
9. Bill made:
10. Payment recorded / followed up:

## Numbers

| Measure | Normal | Peak season |
|---|---|---|
| Enquiries per day | | |
| Jobs per day | | |
| Active teams | | |
| Jobs needing another visit (per week) | | |
| Customers who pay later | | |

## Pain points (ranked by the owner)

| # | Pain point | Who feels it | How often | Their words |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Words they use

| Concept | Owner says | Technician says | Our current UI word |
|---|---|---|---|
| Enquiry | | | Enquiry |
| Job | | | Job |
| Bill | | | Bill |
| Payment pending | | | Remaining |
| Needs another visit | | | Needs another visit |

## Prototype reactions (end of sessions)

| Who | Task | Completed? | Where they hesitated | Comment |
|---|---|---|---|---|
| Owner | New job | | | |
| Technician | Finish today's job | | | |

## Surprises and things we got wrong

-

## MVP priority sign-off (T1.8)

Walk through PRD §7 P0 with the owner; mark each.

| P0 item | Must for pilot / Later / Not needed | Owner's reason |
|---|---|---|
| Authentication and business setup | | |
| Owner dashboard | | |
| Employee and team setup | | |
| Customer records | | |
| Sites/locations | | |
| AC equipment records | | |
| Enquiries | | |
| Job creation and team assignment | | |
| Technician job workflow and status updates | | |
| Service completion record with photos | | |
| Offline for field work | | |
| Bills (with or without GST) | | |
| Payments and balances | | |
| Cash collected by teams | | |
| Customer service history | | |

Owner's OK (date and how, e.g. "WhatsApp, 25 Nov"):
