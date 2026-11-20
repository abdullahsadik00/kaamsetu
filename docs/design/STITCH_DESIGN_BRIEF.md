# KaamSetu — UI/UX Design Brief for Google Stitch

> **Purpose:** one reference for designing every KaamSetu screen in Google Stitch.
> **Compiled:** 20 Nov 2026 from `docs/01_PRODUCT_REQUIREMENTS.md`, `docs/02_UX_UI_DESIGN_SPEC.md`, `docs/08_BRAND_AND_CONTENT_GUIDE.md`, `docs/09_OFFLINE_AND_SYNC_SPEC.md`, `docs/DECISION_LOG.md` (D-001 … D-025), `docs/discovery/DISCOVERY_FINDINGS.md`, the clickable prototype `docs/design/KaamSetu Prototype.html` (19 Nov 2026) and the app code (`mobile/src/theme`, `mobile/src/localization`).
> **Precedence:** Decision log > doc 02 > this brief > prototype. If this brief disagrees with a decision, the decision wins. Fix this brief.
> **Not a source of truth.** This brief summarises the docs for Stitch; it adds no new decisions.

### How to read the tags

| Tag | Meaning |
|---|---|
| **[FINAL]** | Decided: in the decision log, the docs or the agreed prototype. Design it exactly as written |
| **[PROPOSED]** | Our working assumption. Design it, but expect it to change after the pilot interview or usability test |
| **[OPEN]** | Not decided. Do not invent an answer in Stitch; leave a placeholder or skip. Listed in §10 |
| **[OUT]** | Not in the first release. Do not design it now |

> **Overall status:** the information architecture and the prototype are agreed, but **no usability test has happened yet** (doc 02 §0, gate M2). Everything below can still change after that test.

---

## Contents

1. Project overview
2. Design system
3. Screen inventory
4. User flows
5. Layouts and components
6. Interactions and states
7. Responsive design
8. Content and microcopy
9. Design consistency rules
10. Gaps and open questions
11. Google Stitch working guide

---

## 1. Project overview

### 1.1 What KaamSetu is [FINAL]
KaamSetu (कामसेतु, "work bridge") is a simple **Android-first SaaS app for small AC service and maintenance businesses in India**. It combines service operations (enquiries, jobs, teams, customers, AC units) with lightweight billing (bills, quotations, payments).

**Product promise:** *The owner knows what is happening. The senior technician knows what to do. The helper can assist without struggling with software.*

**Primary design rule:** every screen answers **"What do I need to do next?"**

**Tagline:** काम आसान। हिसाब आसान। कारोबार आसान। (Work made easier. Accounts made easier. Business made easier.)

### 1.2 Target audience [FINAL]
Pilot business: an AC service company in Pune with about 6–8 field teams, 1–5 jobs a day (more in summer), residential and commercial customers, no office manager. Each team has one **senior technician** and one **helper**.

| Persona | Who | Needs | Design implications |
|---|---|---|---|
| **Owner** | Runs the business from a phone. Usually online, sometimes at sites with no network | See today's work and problems, turn WhatsApp/phone enquiries into jobs, assign teams, bill, track who owes money and cash held by teams | Simple dashboard, few primary actions, no accounting jargon, search by name/phone, fast repeat-customer jobs |
| **Senior technician** | Leads the job on site. May have little experience with business apps. Budget Android phone, often offline | See the team's jobs, call/navigate, start work, send status updates, finish the job with little typing, record money collected | Large buttons and text, short labels, **one clear next action**, works offline, no financial reports |
| **Helper** | Assists the senior technician | See today's team job, customer name/phone/address, job type, their senior | The simplest screen. No reports, billing or customer list (D-022) |

Languages: **English, Hindi, Marathi**. Each user picks their own [FINAL].

### 1.3 Problems it solves [FINAL, from discovery pre-answers]
1. Enquiries get lost in WhatsApp chats.
2. The owner doesn't know job status without phoning teams.
3. Money tracking: who paid, who owes, cash still with technicians.
4. Billing takes time.
5. Customer and AC service history is not kept.

### 1.4 Key features in the first release (P0) [FINAL unless marked]
- Google sign-in for everyone. Staff join a business by scanning the owner's **QR invite** (6-digit code as fallback) (D-025).
- Business setup: business details, GST on/off, first team.
- **Owner home**: things needing action, today's counts, latest updates from teams, money to collect.
- **Enquiries** (not yet booked), kept separate from **jobs**. Convert to a job with one tap (D-007).
- **Paste a service-centre ticket** from WhatsApp to auto-fill a job, with the ticket number on the job and bill and a "Closed in brand portal" tick (D-019).
- Customers with several addresses (sites) and **AC units** per site, plus service history.
- Create a job and **assign a team** (fewest jobs first, one-day helper swap).
- Technician **My Work**, job detail, **one-tap status updates** (appointment fixed, started, part needed, customer not ready, can't continue, note) (D-009).
- **Finish work** page: what was found, work done per AC, parts, photos, note, money from customer, result.
- **Money collected on site** (cash or UPI to the owner's QR) becomes a payment only after the owner confirms it (D-008).
- **Bills** filled from the work report and rate list, optional GST per bill [PROPOSED, D-011], shared as a PDF on WhatsApp via the phone's share sheet.
- **Written quotations** for big jobs, which can be turned into a bill (D-020).
- **Partial and multiple payments** (Cash / UPI / Bank / Other), with Paid / Partly paid / Not paid.
- **Offline**: technicians work fully offline. Owner basic offline: enquiries, jobs, customers and ACs (D-021). Bills, quotations, payments and handover confirmation need internet (D-018).
- Per-user language: English / हिंदी / मराठी.

**[OUT] for the first release:** AMC contracts (P1), attendance linked to salary (P1, D-023), expenses (later), basic reports (P1), customer merge tool (P1), inventory, GPS/route, in-app chat, WhatsApp API, customer app, iOS, dark mode, charts on the home screen.

---

## 2. Design system

### 2.1 Visual direction [FINAL]
Friendly and professional. High contrast. Simple cards. Minimal decoration. Clear status labels. Consistent spacing. **Comfortable outdoor readability.** **Light theme only, on purpose**: outdoor readability comes first. Do not design a dark mode.

### 2.2 Colour palette [FINAL: prototype and `mobile/src/theme/tokens.ts`]

**Brand and surfaces**

| Token | HEX | Use |
|---|---|---|
| `teal` (primary) | `#0F766E` | Primary buttons, active tab, links, focus ring, brand |
| `teal-dark` | `#115E59` | Pressed state of primary buttons |
| `teal-tint` | `#E6F2EF` | Tonal buttons, selected chips, active nav pill, info boxes |
| `teal-ink` | `#0B5F58` | Text on teal-tint, time on job cards |
| `saffron` (accent) | `#E8891C` | Accent, **used sparingly** (e.g. a brand detail). Never a status colour |
| `paper` (background) | `#F7F5F0` | App background (warm off-white) |
| `surface` | `#FFFFFF` | Cards, sheets, header bar, bottom nav, inputs |
| `ink` (text) | `#14213D` | Main text; toast background |
| `slate` | `#4A5468` | Secondary text, inactive nav |
| `muted` | `#5B6576` | Group labels, placeholder text |
| `line` | `#E4E0D6` | Card borders, dividers, header/nav borders |
| `line-2` | `#CFC9BC` (prototype) / `#CFCABE` (app) | Input, chip and option borders |
| `soft` | `#F2F0EA` (prototype) / `#EFECE4` (app) | Icon tiles, segmented-tab track, neutral badges |
| Row divider | `#EEEAE1` | Dividers inside lists and cards |

> `line-2` and `soft` differ slightly between the prototype and the app. Use the **app values** (`#CFCABE`, `#EFECE4`); they are the coded tokens. See §10 G-12.

**Status colours** (always paired with a text label, never colour alone)

| Meaning | Colour | Tint (background) | Ink (text on tint) |
|---|---|---|---|
| OK / done / paid | `#15803D` | `#E3F3E8` | `#166534` |
| Warning / in progress / money pending | `#B45309` | `#FDEBD3` | `#8A4A06` |
| Bad / error / not paid / cancelled | `#B42318` | `#FBE4E4` | `#A61B1B` |
| Info / New | `#1E4FBF` | `#E3ECFD` | `#1E4FBF` |
| Assigned | `#5B32B4` | `#EDE7FB` | `#5B32B4` |
| On hold · customer side (neutral) | `#3B4556` | `#ECEEF2` | `#3B4556` |
| On hold · our side / part needed (orange) | `#9A3412` | `#FFE1CC` | `#9A3412` (light card variant `#FFF1E6`, border `#F5C7A3`) |
| "Customer says" / money card (warm) | border `#F1D3A7` | `#FFF8EE` | `#8A4A06` |

**Other fixed values:** disabled button `#E7E4DC` background with `#6F7686` text; danger-outline border `#E7B4AE`; scrim `rgba(20,33,61,0.5)`; link colour inside the dark toast `#7FD8CB`; photo placeholder `#DCD7CB`.

**Contrast** [OPEN]: still to be checked on real budget phones outdoors (doc 02 §6).

### 2.3 Typography [FINAL]
- **Font:** **Noto Sans** for English and **Noto Sans Devanagari** for Hindi/Marathi (Devanagari also covers Latin letters and digits, so mixed text like "₹ 1,200" stays in one font). Weights 400 / 600 / 700.
- Test Devanagari on real Android phones. Leave room: Hindi/Marathi strings run longer than English.

| Role | Size / weight (owner screens) | Technician & helper screens |
|---|---|---|
| Large page title (tab roots: "Jobs", "My Work") | 26 / 700 | 26 / 700 |
| Header bar title (inner pages) | 19 / 600 (+ 13 / 400 subtitle in slate) | 19 / 700 |
| Section heading | 18 / 600 | 18–19 / 700 |
| Card title / customer name | 16–18 / 600 | 19 (list), 26 / 700 (job page) |
| Body | 16 / 400 | 17–18 / 400 |
| Supporting text | 13–15 / 400 slate | 15 / 400 slate |
| Group label (uppercase, tracking 0.06em) | 12 / 700 muted | 12 / 700 muted |
| Button | 16 / 600 (large: 18 / 600) | 17–18 / 600 |
| Badge / status chip | 12 / 600 | 12 / 600 |
| Big money figure | 28–34 / 700 | 22–24 / 700 |
| Job time on card | 15 / 700 teal-ink | 20 / 700 teal-ink |

Coded scale (sp): title 24 · section 19 · body 17 · support 15 · small 13. Doc 02 range: title 22–26, section 18–20, body 16–18, support 14–16.

### 2.4 Spacing and grid [FINAL]
- **4-point scale:** 4 · 8 · 12 · 16 · 24 · 32.
- Screen side padding **16**. Top 14, bottom 28 above the footer.
- Gap between cards/sections **14** (owner), 12–26 (technician; the finish page uses 26 between steps).
- Card padding **14** (technician cards 16). Gap inside cards 10.
- Grids inside cards: 2-, 3- and 4-column equal grids with an 8 gap (stat tiles, quick actions, photo thumbnails, payment methods).
- Reference frame: **phone 390 × 844** (prototype size). Final device range [OPEN] (Q-11: budget Android).

### 2.5 Corner radius [FINAL]
| Element | Radius |
|---|---|
| Cards, lists, buttons, option rows, alerts | 12 |
| Inputs, chips, stat tiles, info/warn boxes | 10 |
| Badges, nav pill, search field, toggles | full (999) |
| Bottom sheet (top corners) | 20 |
| Dialog | 16 |
| Splash logo tile | 22 |
| Coded tokens | sm 8 · md 12 · lg 16 · xl 22 |

### 2.6 Elevation and shadows [FINAL]
Flat by default: **cards have a 1 px `line` border and no shadow.**
| Element | Shadow |
|---|---|
| Sticky footer action bar | `0 -2px 8px rgba(20,33,61,0.06)` |
| Bottom sheet, dialog | `0 8px 24px rgba(20,33,61,0.16)` |
| Toast | `0 8px 24px rgba(20,33,61,0.25)` |
| Selected segmented tab | `0 1px 2px rgba(20,33,61,0.08)` |

### 2.7 Icons [FINAL]
- Simple **outline icons, 24 × 24 grid, 2 px stroke, round caps and joins** (Lucide-style). 18–24 px in lists and buttons, 28 px on technician AC rows, 34 px in empty states, 52–76 px in hero illustrations.
- **Always icon plus text label**, never an icon alone, except back, close and search in headers, which need an accessible name.
- Icon set used: back, close, chevron, down, plus, search, home, bag (jobs), users (customers), bill, menu/more, clock, user, phone, WhatsApp, navigate, map pin, AC unit, tool, camera, check, play, pause, cash, UPI, bank, dots, mobile (saved on phone), up-arrow (sending), double-check (sent), warning, wifi-off, team, gear, list, shop, language, card, help, inbox, calendar, box (part), note, bell, refresh, drop (carry), log out.

### 2.8 Logo and brand mark
Prototype mark: white rounded tile with a teal **bridge** outline (an arch with three pillars) on a teal background. **Logo not finalised** [OPEN]. The brand guide says: don't finalise a logo before checking readability and trademarks. Use the prototype mark as a placeholder only.

### 2.9 Touch and accessibility [FINAL]
- Minimum touch target **48 dp**. Main technician actions **56 dp or taller** (prototype large buttons are 60).
- Focus ring: 3 px teal outline, 2 px offset.
- Short sentences, familiar words, no abbreviations, consistent button positions, **one primary action per screen**, clear feedback after saving, never rely on colour alone, respect reduced motion.

---

## 3. Screen inventory

Doc 02 §4 calls these screen *templates*, not 32 separate routes. Use reusable detail views, bottom sheets and conditional steps. IDs are for this brief only.

### 3.1 Authentication and setup

| ID | Screen | Purpose | Key components | Status |
|---|---|---|---|---|
| A1 | Splash / welcome | First open | Full teal background, logo tile, "KaamSetu", "कामसेतु", tagline, **Get started** (white button), "I already use KaamSetu" (text button) | [FINAL] layout |
| A2 | Intro (3 slides) | Explain value | Skip (top right), large icon tile (148 px, teal-tint), "1 of 3", title, text, Hindi subtitle, page dots, Back / Next. Slides: *Every enquiry in one place* · *Every team knows its work* · *Bills and payments made easy* | [FINAL] content. Last button label changes, see A3 |
| A3 | Log in | Sign in | **Continue with Google** (primary), hint "Use the Google account on this phone. No password or SMS needed.", language chips (English / हिंदी / मराठी) | [FINAL] per D-025. **Replaces the prototype's phone + OTP screens.** Phone/OTP is development-only; don't design it |
| A4 | Join your business (staff) | Link a Google account to an employee | Title, "Signed in as {email}", instruction "Ask the owner to open More › Employees, tap your name and show the QR code.", **Scan QR code** (primary), "Enter code instead" → mobile number + 6-digit code + **Join** | [FINAL] D-025 |
| A5 | Scan QR | Camera scanner | Camera view, hint "Point the camera at the QR code on the owner's phone.", camera-permission state with "Allow camera" | [FINAL] |
| A6 | Setup step 1 · Your business | Create the business (owner) | "Step 1 of 3", business name, your name, city, **We give GST bills** toggle → GSTIN (optional now), **I also go on jobs** toggle | [FINAL] fields from prototype |
| A7 | Setup step 2 · Add your first team | First team | Info box ("A team is one senior technician and their helper…"), senior technician name, senior's mobile, helper name (optional), **Helper uses the app** toggle, Skip for now / Save team | [FINAL] fields. **Login hint text must follow D-025** (QR invite, not SMS), see G-3 |
| A8 | Setup step 3 · All set | Confirmation | Big green check, "{Business} is ready", next-steps card, **Go to Home** | [FINAL] layout; body text needs D-025 wording (G-3) |

Not in this prototype but listed in doc 02 §4: separate "Add senior technician" and "Add helper" setup screens. They are covered by A7 and Add employee (O22).

### 3.2 Owner screens

| ID | Screen | Purpose | Key components |
|---|---|---|---|
| O1 | **Home** (tab) | What needs me now | Big header (date + "Good morning, {name}"), round Updates bell with count badge, round Search. Offline bar. Alert rows: **Open enquiries**, **Jobs need a team** (blue), **Needs your action** list, **Today · N sites** with 4 stat tiles, **Latest from teams** feed, **Work reports ready to bill** (green), **Money to collect** card (total, number of bills, "N over 15 days", "₹ with teams, to hand over"), quick actions grid (New enquiry or job · Add customer · Create bill · Record payment) |
| O2 | Updates from teams | Full feed | Segmented tabs *All updates / Delays & parts*, update rows (tone icon, text, customer · job · who · time, "not sent yet"), footer note "Teams send these from their phone. You don't need to call them." |
| O3 | Search | Global search | Pill search field in header ("Customer name, phone or job no."), "Type 2 or more letters or digits.", results (customers with avatar, jobs with status badge), empty state with **+ Add new customer** |
| O4 | **Jobs** (tab) | Enquiries and jobs | Big header + **New** button. Segmented tabs *Enquiries · N / Jobs*. Enquiries: chips Open/Closed, enquiry cards. Jobs: scrollable filter chips with counts (All, Today, Needs action, New, Not started, In Progress, On Hold, Completed, Cancelled), job cards |
| O5 | Enquiry detail | Decide on an enquiry | Status note (converted/closed), customer card (Call, WhatsApp), "What they asked" card (quote, service, ACs, when, ticket), footer: **Convert to job** · Make quotation · Close enquiry |
| O6 | New enquiry or job | Capture a request | Header with X and "Draft saved". **Paste ticket from WhatsApp** (dashed). Customer picker / selected customer card (address, site chips). Which AC? (tick list + Add AC). Service chips. Problem (textarea + quick chips). When (Today/Tomorrow/Pick date + slot chips). Came from (WhatsApp, Call, Service centre, Builder/company, Other). Ticket number (service centre only). Footer: **Save enquiry** · **Create job & assign** |
| O7 | Job detail | One job, any state | Header "Job #1044" + More. Status badges, offline-pending warning, hold card, parts card, customer card (Call · WhatsApp · Customer), Job card (service, AC, problem, team + helper, appointment, to collect on site, came from, ticket), Updates list, Work report card, Collected-on-site card, Closed-in-brand-portal tick, linked jobs (follow-up / from enquiry), **Book a follow-up visit**. Footer changes by state (see §5.4) |
| O8 | **Customers** (tab) | Find customers | Big header + **Add**, pill search "Phone or name", list rows (avatar initials, name, phone · area · N ACs, amount owed in warn colour), empty state |
| O9 | Customer detail | Customer 360 | Header + Edit. Top panel: name, phone · since year, GST status, Call · WhatsApp · **New job**, "₹ remaining on N bills" strip. Per-site lists (label, address, landmark, Map, AC rows with last service, **Add AC here**). **Add another address**. Service history list |
| O10 | Add / edit customer | Create customer | Customer type (Home/Business), name, mobile (+91), duplicate-number warning with "Open customer", address, landmark (optional), **Give GST bills** toggle → customer GSTIN, "You can add ACs after saving.", **Save customer** |
| O11 | AC detail | One AC unit | AC icon, brand + type, capacity, model, serial no., gas, warranty ("Not added"), "Added on site by technician. Check details." warning when relevant, visits for this AC, footer **New job for this AC** |
| O12 | Add AC | New AC unit | Room (input + chips Hall/Bedroom/Kitchen/Office/Shop), type chips (Split, Window, Cassette, Tower, Ductable), brand chips (Voltas, LG, Daikin, Blue Star, Samsung, Lloyd, Carrier, Hitachi, Other), capacity chips (1 / 1.5 / 2 / 3 ton, Not sure), "+ More details (model, serial, warranty)", **Save AC** |
| O13 | **Billing** (tab) | Money overview | Big header. To-collect card (total + cash with teams). **Ready to bill · N** list with Create bill. **Cash with teams** list. Segmented tabs *To collect / All bills / Quotations*. Bill rows (customer, number · date · GST, amount, payment badge) |
| O14 | New bill / New quotation | Line-item editor | Header X + customer · job. Info box ("Filled from the work report and your rate list…" / quotation explainer). Items list: editable name, qty × ₹ rate, source tag (Rate list / Report) or GST %, remove. **Add item** · **Discount**. Totals card: subtotal, discount, **GST bill** toggle ("Changed for this bill only"), CGST/SGST lines, GSTINs, **Bill total**, received on site, **Remaining**. Bill date card ("Number given when saved"). Offline warning. Footer: **Save & send on WhatsApp** · Save only (quotation: **Save & send quotation**) |
| O15 | Bill detail | One bill | Header "Bill KS-0084" + More. Summary card: customer, payment badge, Remaining/Fully paid big figure, progress bar, Bill total / Received, Send bill · Send reminder (or Send receipt). Payments list. Items. Note "A saved bill can't be edited. Use More › Cancel bill and make a new one." Footer **Record payment** (or "Needs internet to record payment") |
| O16 | Quotation detail | One quotation | Customer, Sent/Billed badge, total, **Send quotation**, items, footer **Turn into bill** (needs internet) |
| O17 | **More** (tab) | Settings hub | Business card (logo initials, name, "{owner} · Owner · {city}"), rows: Teams, Employees, Rate list, Business details, Bill settings, Photo rules, Language, Plan & payment, Help. **Log out** (danger outline) |
| O18 | Teams | Team list | Header + Add. Team cards: name, "N jobs today" or "On leave today", senior and helper names |
| O19 | Team detail | One team | Members list (senior: "uses the app", Call; helper: "uses the app" / "works on senior's phone"), **On leave today** toggle ("Team is hidden when assigning"), Change members, Today and tomorrow job cards |
| O20 | Add team | New team | Team name, senior technician (pick from staff or + New person), helper (optional), **Save team** |
| O21 | Employees | Staff list | Header + Add. Rows: avatar, name, role · team, login state. Use the app's states: **Joined / Not joined yet** (D-025) |
| O22 | Add employee | New staff member | Name, role chips (Senior technician / Helper), team chips, **Uses the app** toggle (helpers can be off: "works on the senior's phone, still shown on jobs"), mobile number, save → invite |
| O23 | Employee detail + invite | Link staff (D-025) | Employee info, **Show invite QR** → QR card with "Ask {name} to sign in with Google in KaamSetu and scan this code. It works once, until {time}." + "Or they type their mobile number and this code:" + 6-digit code + **Make a new code**. **Reset login** (with confirm dialog) |
| O24 | Rate list | Price list | Info box, rows (item, "per job" / "per kg/m/pc", price), + Add |
| O25 | Business details | View/edit business | Name, phone, city, GSTIN, logo ("Not added"), **Edit details** |
| O26 | Bill settings | GST and numbering | **GST on by default** toggle, GSTIN, GST rate, GST bill numbers, other bill numbers, bill language, terms on bill, note "Check bill numbering with your CA before going live." All values [PROPOSED] (Q-04) |
| O27 | Photo rules | Photo requirement | "Photos to ask for on each job" chips (None, 1, 2, 4), **Helpers can add photos** toggle |
| O28 | Language | Per-user language | Note "Only changes your own app. Customer names and notes stay as typed.", rows English / हिंदी / मराठी with check |
| O29 | Plan & payment | Subscription | Free trial card ("N days left · All features. No card needed now."), plan card with **price placeholder** [OPEN], **Choose plan** |
| O30 | Help | Support | Support card: hours, Call, WhatsApp |

### 3.3 Senior technician screens

| ID | Screen | Purpose | Key components |
|---|---|---|---|
| T1 | **My Work** (tab, home) | Today's team jobs | Big header (date · Team N, "My Work"). Offline bar. **Working now** section (job with orange 2 px border, large **Continue · Finish work**). **Today · N** list (first card has **Open job**). Summary "N done today" with sync state. Collapsible **Tomorrow · N**. Empty state "No jobs today" + Call owner |
| T2 | Job detail (technician) | Everything for the visit | Header: back "My Work" + sync state. Day · time, **customer name 26/700**, service · N ACs, status badge, appointment line. Hold/part cards. **Call** and **Directions** (large tonal, side by side). Address card (18 px). "Customer says" warm card. ACs card (room, type · brand · capacity, last service or "First visit"). "Collect from customer · Set by owner" amount. Footer: one large primary action by state + **Update status** |
| T3 | Finish work | Short completion form | Header: back, "Finish work", customer · N ACs, "Saved on phone". Numbered steps: **1 What did you find?** chips · **2 Work done on each AC** (card per AC, work chips, "✓ Done") + "Customer showed another AC" · **3 Parts used (if any)** with − qty + steppers, Add part · **4 Photos** (thumbnails + Add photo tile, "N of M") · **5 Note for owner (optional)** with quick chips · **6 Money from customer** (only if an amount was set: Cash / UPI / Not paid + amount) · **7 Result** (Work completed / Needs another visit → reason chips / Could not finish → customer-side and our-side reasons). Footer **Finish Work** (large) |
| T4 | Work completed (confirmation) | Reassure and move on | Big green check (or grey pause for "Could not finish"), title, customer · ACs · money received, status card: "**Saved on this phone.** It is safe." + Sent to owner / Sending… / Waiting for internet to send to owner, "It will send by itself when internet comes back…", **Next job** / Back to My Work |
| T5 | History (tab) | Past jobs | Cards: date, sync state, customer, area · service · ACs, **Try again** (red) when sending failed |
| T6 | Profile (tab) | Me | Avatar, name, "Team N · Senior technician", Language row, Call owner row, **Log out**, app version · business name |

Technician sheets: Update status, Appointment fixed, Part needed, Customer not ready, Can't continue, Note for owner, Add part (see §5.6).

### 3.4 Helper screens [FINAL, D-022]

| ID | Screen | Purpose | Key components |
|---|---|---|---|
| H1 | Today's work (only screen, no bottom nav) | Current team job | Big header (date, "Today's work") + **Me** button. Senior card (avatar, "Team N · your senior", name, Call). Current job card (orange border when working): area (22/700), customer name + Call, address + landmark, service · ACs (rooms), "Carry: …", hold/part info, **Update status** (large primary), **Add photo** (large tonal, only if the owner allows). Next job card (time, area, service). Footer note "Your senior fills in the job report. You don't need to fill anything." |
| H2 | Me / Profile | Language and log out | Same as T6 with role "Helper" |

The helper's Update status sheet **has no "Work completed" option**.

### 3.5 Shared overlays (design once, reuse)
Bottom sheets: Paste ticket · Find customer · Assign team (+ Helper for this day) · Record payment · Discount · Add item (rate list) · Job More menu · Bill More menu · Reason pickers · technician status sheets.
Dialogs: Cancel job · Cancel bill · Log out · Log out with unsent work · Reset login.
Toast, offline bar, empty states.

### 3.6 Not to design now [OUT]
AMC contract screens (P1), Expenses (later), Reports (P1), attendance/salary (P1), customer merge (P1), notification centre beyond "Updates from teams", web/desktop admin.

---

## 4. User flows

All [FINAL] unless marked. "→" is a tap or navigation; ◇ is a decision.

### F1. First run and owner setup
Splash (A1) → **Get started** → Intro 1–3 (A2, Skip allowed) → Log in (A3) → **Continue with Google** → ◇ account already in a business? → yes: their home by role. No → owner path: Setup 1 Business (A6) → Setup 2 First team (A7, *Skip for now* allowed) → Setup 3 All set (A8) → **Go to Home** (O1).
"I already use KaamSetu" on A1 → Log in (A3).
◇ Staff (not owners) without a business → Join your business (A4). "Starting your own business in KaamSetu is coming soon." is shown on the join screen [FINAL in app copy].

### F2. Staff joins a business (D-025)
Owner: More → Employees → Add employee (O22) → Employee detail (O23) → **Show invite QR**.
Employee: installs app → Continue with Google → Join your business (A4) → **Scan QR code** (A5) → joined → lands on My Work (senior) or Today's work (helper).
Fallback: "Enter code instead" → mobile number + 6-digit code → **Join**.
Errors: expired / wrong code / too many tries / already linked (see §8.5). Owner can **Reset login** (new phone, lost account).
[OPEN] staff without a usable Google account (G-4).

### F3. Enquiry → job (owner)
Entry: Home "New enquiry or job", Jobs **New**, Customer **New job**, AC **New job for this AC**.
O6 → Customer: search sheet → pick, or **Add new customer "{query}"** → O10 → back with the customer selected → ◇ several sites? choose site chip → tick ACs (or **Add AC**) → Service chip (required) → Problem (optional) → When + slot → Came from.
◇ Customer has **not booked** → **Save enquiry** → toast "Enquiry saved · convert it when the customer books" → shows in Jobs › Enquiries and on Home.
◇ Booked → **Create job & assign** → Assign team sheet → toast "Job #N assigned to Team N · {senior} will see it now".
Validation: no customer → "Choose or add the customer"; no service → "Choose the service". Entered data is kept.

### F4. Paste a service-centre ticket (D-019)
O6 → **Paste ticket from WhatsApp** → sheet: paste text → **Fill the job** → ◇ readable? Yes: form filled (customer, address, job type, ticket number, amount to collect), info box "Filled from ticket {no} · collect ₹X on site. Check before saving.", toast "Ticket {no} read · check and save". No: "Could not read this ticket. Check the text, or close this and fill the job by hand." Manual entry stays available.
After completion: Job detail shows the **Closed in brand portal** tick for ticket jobs.

### F5. Convert or close an enquiry
Jobs › Enquiries → enquiry card → O5 → ◇
- **Convert to job** → O6 prefilled ("New job from E-212"), nothing retyped → Create job & assign.
- **Make quotation** → New quotation (O14) → Save & send quotation.
- **Close enquiry** → reason sheet "Why close this enquiry?" (Not interested, Price too high, Solved on phone, Went to someone else, Other) → toast "Enquiry closed: {reason}" → moves to Closed.

### F6. Assign / reassign a team
From Home "Jobs need a team · Assign", Job detail (New) **Assign team**, or More › **Change team or time**.
Assign sheet: Day chips → time chips → team list **sorted by fewest jobs that day** (on-leave teams greyed and disabled, "busy" from 3 jobs) → selected team shows "Change helper for this day" → reason sheet "Helper for this day · Team stays the same" → **Assign Team N · {day} {slot}** → toast. Offline: button adds "· sends when online", toast "Saved on your phone · {senior} gets it when you are online".

### F7. Technician does a job (works offline)
My Work (T1) → job card → T2 → **Call** / **Directions** as needed → primary action by state:
1. *Assigned* → **Fix appointment** → Appointment sheet (day, time) → Save → job shows the appointment time.
2. *Appointment fixed* → **Start Work** → toast "Start Work ✓ · {time}" → *In Progress*.
3. *In Progress* → **Finish Work** → T3 → fill steps → **Finish Work** → ◇ Work completed / Needs another visit / Could not finish → T4 confirmation → **Next job** or Back to My Work.
4. *On Hold* → **Start again**.
Any time: **Update status** sheet (F8).
Offline: everything saves on the phone; T4 shows "Waiting for internet…"; it sends by itself later.

### F8. Status updates from the field (D-009)
Update status sheet groups:
- **Work progress:** Appointment fixed · Started work · Work completed (seniors only)
- **Problem:** Part needed · Customer not ready · Can't continue
- **Other:** Note for owner
Each sends to the owner's feed; toast "✓ Owner informed" online or "Saved. Owner will see it when internet comes back." offline.
- *Part needed*: which part (chips), how many (stepper), "Can you continue without it?" Yes, continue / No, work stopped, optional note → owner gets "Part needed" in **Needs your action** with **Arrange**.
- *Customer not ready*: why (Customer not at home, Customer asked to come later, Customer said no, Customer not answering, Payment not ready, Society did not allow…), new date from customer (Not given / dates) → On hold · customer side.
- *Can't continue*: why (Tool or gas missing, Need a second person, Job bigger than expected, Ran out of time, Vehicle problem); link to Part needed → On hold · our side.
- *Note for owner*: text + quick chips (Reached site, Customer will pay later, Outdoor unit on terrace, Need ladder, Running late, 30 min). No status change.

### F9. Owner handles problems
Home **Needs your action** rows (each opens the job):
- "Part needed: 1 MCB 16A" · work stopped/continues → **Arrange** → job Parts card → **Ordered from service centre** → **Part is ready** (or straight to Part is ready) → toast "{senior} informed: {part} is ready".
- "Customer delay: …" → **Confirm date** (Confirm {date} with same team) or **Reschedule** (Assign sheet).
- "Team stuck: …" → Open → Reschedule / Call team.
- "Appointment not fixed yet" (assigned today) → Open.
Empty: "Nothing waiting on you · Teams will tell you here when they need something".
Owner can also: More → **Put on hold** (reason sheet), **Set amount to collect on site**, **Cancel job** (dialog, then reason).

### F10. Money collected on site (D-008)
Owner sets **amount to collect** (job More menu, or from the ticket) → technician sees "Collect from customer · Set by owner" → on Finish work selects Cash / UPI / Not paid + amount → owner sees "₹ with teams, to hand over" (Home, Billing) and a "Collected on site" card on the job → owner confirms **I received this cash** (cash) or **I see it in my account** (UPI to owner's QR) → becomes a payment on the bill. A technician cannot edit it after sending; the owner can reject it with a reason [FINAL in PRD; reject UI not in prototype, G-9].

### F11. Bill and payment (online only)
Completed job → **Create bill** (also from Home "Work reports ready to bill", Billing "Ready to bill", Home quick action) → O14 prefilled from report + rate list (on-site payment already listed) → edit items / Add item (rate list sheet or "Something else") / Discount sheet / GST toggle → **Save & send on WhatsApp** (opens the share sheet with the PDF) or Save only → Bill detail (O15).
Record payment: **Record payment** → sheet: Bill total / Received / Remaining, amount (quick chips Full ₹X, half, ₹500), method (Cash/UPI/Bank/Other), date, note → **Save payment · ₹X Cash** → toast "Payment saved · ₹X" with Undo.
Bills can't be edited: More → **Cancel bill** (dialog) → make a new one. More → Download PDF.
Offline: footer buttons disabled with "Needs internet…"; draft kept on the phone.

### F12. Quotation (D-020)
Enquiry → **Make quotation** → New quotation → **Save & send quotation** → Billing › Quotations → Quotation detail → **Turn into bill** (online) → bill editor "Filled from the quotation."

### F13. Repeat customer and history
Customers or Search → Customer detail → see addresses, ACs, last service, service history, money owed → **New job** (customer prefilled) or AC → **New job for this AC** (AC ticked).

### F14. Follow-up visit
Completed job with "Needs another visit" → owner taps **Book a follow-up visit** → new job linked ("Follow-up of #1043 · Visit 1" / "Visit 2 · #N") → toast "Follow-up job #N linked to #M". The first visit's record is never overwritten.

### F15. Helper's day
Today's work (H1) → Call senior / Call customer → **Update status** (no completion) → **Add photo** if allowed → toast "Photo added to the job · {senior} sees it" (or "Owner has turned this off").

### F16. Language, log out
Profile/More → Language → pick → whole UI switches; data stays as typed.
Log out → dialog. ◇ unsent work → "{N} saved changes have not reached the owner yet. If you log out now, they will be lost." (app) / prototype variant "Work not sent yet… Connect to internet first, so nothing is lost."

### F17. Owner offline (D-021)
Offline bar on owner tabs: "**No internet.** Enquiries, jobs and customers save on this phone and send later. Bills and payments need internet." A job created offline shows "**Saved on your phone.** The team gets this job when your phone is back online." When back online: toast "N jobs sent to teams".

---

## 5. Layouts and components

### 5.1 App frame (phone)
```
┌──────────────────────────────┐
│ Header (60 dp, white, border)│  inner pages: back | title + subtitle | right action
│   or Big header (paper bg)   │  tab roots: small date line + 26/700 title + round icon buttons
├──────────────────────────────┤
│ Offline bar (only offline)   │  grey-blue tint, wifi-off icon, 14 px text, 16 margin
│ Scrolling body               │  16 side padding, 14 gap, cards
├──────────────────────────────┤
│ Sticky footer (optional)     │  white, top shadow, 12/16 padding, 1–3 stacked buttons
├──────────────────────────────┤
│ Bottom nav                   │  owner 68 dp · technician 76 dp · helper: none
└──────────────────────────────┘
```

### 5.2 Navigation [FINAL]
| Role | Bottom tabs (icon + label) |
|---|---|
| Owner | **Home** (home) · **Jobs** (bag) · **Customers** (users) · **Billing** (bill) · **More** (menu) |
| Senior technician | **My Work** · **History** · **Profile**. Opens on My Work. Taller bar (76), 13–14 px labels |
| Helper | No tab bar. Single "Today's work" screen + **Me** button |

Active tab: teal-ink label 700 with a teal-tint **pill** behind the icon (3 × 16 padding). Inactive: slate 600. Tab root screens use the big header; inner screens use the header bar with back. Doc 02 §7: avoid nested menus; use bottom sheets for quick choices.

### 5.3 Core components (from the prototype CSS; doc 02 §6 names in brackets)

**Buttons** [PrimaryButton, SecondaryButton]
| Variant | Style | Use |
|---|---|---|
| Primary | teal fill, white text, 52 h, radius 12, 16/600 | The one main action |
| Primary large | 60 h, 18/600 | Technician main actions |
| Secondary | white, 1.5 px teal border, teal text | Second choice |
| Tonal | teal-tint fill, teal-ink text | Call, WhatsApp, Directions, small inline actions |
| Danger outline | white, `#E7B4AE` border, bad text | Log out, Cancel bill/job entry points |
| Danger fill | bad fill, white | Confirm destructive actions, Try again |
| Text | no fill, teal text, 44 h | Skip, Save only, Close enquiry |
| Small | 44 h (36 in rows), 14 px | Inline row actions |
| Dashed add | 48 h, 1.5 px dashed `#9BA3B1`, teal text, + icon | Add AC, Add item, Paste ticket, Book follow-up |
| Disabled | `#E7E4DC` fill, `#6F7686` text | Online-only actions while offline (label explains why) |

**Inputs** [SearchField, PhoneField, FormSection]: 52 h, radius 10, 1.5 px `line-2` border; focus 2 px teal; error 2 px bad + red message 14/600 below. Label 15/600 above, with an optional right-aligned hint (13 slate, e.g. "Optional", "Search by phone or name"). Phone field: "+91" prefix with a divider, numeric keypad, 10 digits. Amount field: "₹" prefix, 24/700, numeric keypad. Search: pill shape with a search icon. Textarea 64 h.

**Chips** [SelectableOption]: 44 h (technician 48, small 36), radius 10, 1.5 px `line-2`; selected: teal-tint fill, teal border, teal-ink 600. Quick-add chips start with "+ " and append text.

**Option rows**: *Radio row* (60 h, label 17/600; selected = green tint + green ring, used for Result and yes/no). *Team/AC card select* (tick box or radio, selected = teal border, `#F3FAF8` fill; disabled = soft fill). *Payment method tile* (72 h, icon + label, 4-column).

**Stepper**: − [qty] + with 48 × 48 buttons.

**Toggle**: 52 × 32, teal when on.

**Cards** [JobCard, CustomerCard]: white, 1 px `line`, radius 12, padding 14. Tappable cards are the whole card. Key-value rows: label slate left, value 600 right.
- *Owner job card*: "#1044 · Today, 2:30 PM" + status badge / customer 16/600 / service · area · ACs / team (+ appointment, "Not billed" in info blue) / last update line (icon + text + who, time).
- *Technician job card*: time 20/700 teal-ink + badge / customer 19/700 / area · service · N ACs / hold reason / sync state / button (first or working-now card only).
- *Enquiry card*: "E-212 · 2 days ago" + badge / name / service · area · via source / "quoted problem".

**Lists**: white container, radius 12, rows 12 × 14 padding with `#EEEAE1` dividers. Row = leading avatar (44, initials, teal-tint) or icon tile (40, soft) + title 16/600 + subtitle 13 slate + trailing chevron/amount/badge.

**Status badge** [StatusChip]: pill, 26 h, 12/600, tint background + ink text, optional 13 px icon (§5.5).

**Alert row** (Home): full width, radius 12, 44 px circle count + title 16/700 + subtitle + action pill (e.g. Open / Assign / View).

**Stat tile**: radius 10, tinted, number 24/700 + label 13/600. Four in a row.

**Quick action tile**: 84 h, icon + 13/600 label; the first one is filled teal.

**Feed row** (update / action): 34 px round tone icon + title 15/600 + meta 13 slate; unseen rows tinted `#F3FAF8`.

**Info / warn / ok / bad boxes**: radius 10, 10 × 12 padding, 14 px; info = teal-tint + icon, warn = warn-tint, ok = ok-tint, bad = bad-tint.

**Offline bar** [OfflineBanner]: hold-tint, wifi-off icon, below the header.

**Sync state** [SaveStatus]: 13/600 icon + label: Saved on phone (mobile icon, hold colour) · Sending… (up arrow, teal-ink) · Sent (double check, ok-ink) · Needs attention (warning, bad).

**Bottom sheet** [ConfirmationSheet]: scrim 50 % ink, white sheet, top radius 20, grab handle 40 × 4, title 20/600 + subtitle 14 slate + close X, scrolling body (16 padding, 14 gap), sticky footer with top divider. Max 88 % height.

**Dialog**: centred, radius 16, padding 20, title 18/700, text 15 slate, right-aligned Text (no) + Primary or Danger (yes).

**Toast**: dark ink pill above the nav (16 from the sides, 88 from the bottom), 15 px white text, optional teal-light **Undo**, disappears after 4 s.

**Empty state** [EmptyState]: white, 1 px **dashed** `line-2`, radius 12, 22 padding, 34 px teal icon, title 16/700, text 14 slate, optional button.

**Error state** [ErrorState]: bad-tint box with message and **Try again** [layout not drawn in prototype; see G-10].

**Money components** [InvoiceLineItem, PaymentSummary]: line item = editable name + amount, then qty × rate inputs + source tag + remove. Payment summary = 3-column Bill total / Received (green) / Remaining (warn). Bill hero = Remaining 34/700 + green progress bar (10 h) + total/received.

**Steps header** (Finish work): 28 px ink circle with number + 18/700 title + optional 14 slate hint.

**Photo grid**: 3-column thumbnails (96 h, "Before/After" label) + teal-tint **Add photo** tile; owner view 4-column 68 h.

### 5.4 Job detail footer by state (owner) [FINAL]
| Status | Footer |
|---|---|
| New | **Assign team** |
| Assigned / appointment fixed | Change team or time · Call team |
| In Progress | Call {senior} |
| On Hold | **Reschedule** · Call team |
| Completed, not billed | **Create bill** |
| Completed, billed | **View bill** |
| Cancelled | none |
Header **More** (shown for New, Assigned, On Hold and In Progress jobs): Change team or time (not on New) · Put on hold (not on New or On Hold) · Set amount to collect on site · Cancel job (red).

### 5.5 Status system

**Job statuses — six visible** [FINAL, D-009]
| Status | Badge |
|---|---|
| New | info blue tint |
| Assigned | purple tint |
| In Progress | warn tint (tool icon on technician side) |
| On Hold | hold grey (customer side) or orange (our side); label "On hold · customer" / "On hold · our side" |
| Completed | green tint |
| Cancelled | red tint |
Extra badges: **Not billed** (info), "Appointment not fixed" (purple, technician), appointment time (teal tint with calendar icon). The prototype also shows a "Scheduled" state = Assigned with appointment fixed, stored as a field, not a seventh status (G-6).
Owner filter "Not started" = Assigned + appointment fixed.

**Enquiry**: Open (soft), Converted · #N (green), closed reason (grey).
**Bill**: ✓ Paid (green) · ◐ Partly paid (warn) · ○ Not paid (red) · Cancelled (red). **Quotation**: Sent (blue) · Billed (green).
**Part request**: Waiting for you (orange) → Ordered (blue) → Ready (green).
**Employee login**: Joined / Not joined yet.
**Sync**: Saved on phone / Sending… / Sent / Needs attention.

### 5.6 Technician sheet layouts
- **Update status**: grouped option rows (64 h, 44 px tone icon tile, title 17/700, description 14 slate, chevron). Groups in uppercase labels. Footer note "🔔 {owner} sees every update straight away".
- **Appointment fixed**: day chips, time chips, large **Save · {day}, {time}**.
- **Part needed**: part chips (Capacitor, Indoor PCB, Outdoor PCB, Gas R32, Copper pipe, Fan motor, Remote, MCB 16A, Other), stepper, two radio rows, note input, large **Ask owner to arrange a part**.
- **Customer not ready / Can't continue**: radio reasons, new-date chips (customer only), large **Save**.
- **Note for owner**: textarea + quick chips + large **Save**.
- **Add part** (finish page): list rows Gas R32 (kg), Drain pipe (m), Copper pipe (m), Capacitor, Remote, PCB, Stand (pc) with +.

---

## 6. Interactions and states

### 6.1 Interaction rules [FINAL, doc 02 §7]
- Confirm destructive actions (dialog, then reason where needed).
- Autosave drafts where safe ("Draft saved" in the New job header; bill drafts kept offline).
- Keep entered data when validation fails.
- Don't open the keyboard unnecessarily (chips first, typing optional).
- Phone keypad for phone numbers, numeric keypad for amounts and quantities.
- Search customers by phone or name (2+ characters).
- Sensible defaults: Tomorrow + Morning on new jobs, customer GST default on bills, rate-list prices.
- Bottom sheets for quick selection. No nested menus.
- Plain-language errors with a recovery action.
- **Never silently discard offline changes.**
- One primary action per screen; consistent button positions (main action bottom, full width).

### 6.2 Tap targets and feedback
- Whole cards and rows are tappable; chevron signals navigation.
- Primary pressed = `teal-dark`. Focus = 3 px teal ring.
- Every save shows a toast (§8.4). Undo on Payment saved and Start Work.
- Phone actions hand off to the system: Call → dialer, WhatsApp → chat, Directions/Map → Google Maps, Send bill/quotation/receipt/reminder → WhatsApp with PDF or text via the share sheet (no WhatsApp API).
- Hover states: none (touch app). [OPEN] if a web version is ever made (G-1).

### 6.3 Transitions [OPEN]
The prototype has no motion spec beyond the toggle slide (150 ms) and respecting *reduced motion*. Platform-default push/back and sheet slide-up are implied; no custom animation decided.

### 6.4 Loading states [OPEN]
Required by the design gate (doc 02 §11), **not drawn yet**. The app has a "Loading…" string. Design a pattern in Stitch and mark it as a proposal (G-10).

### 6.5 Offline and sync states [FINAL]
- Offline bar on every main screen while offline (technician: "**No internet.** Keep working. All saved on phone.").
- Sync state on technician job header, job cards (when not Sent), History and the Finish page ("Saved on phone").
- Never show words like outbox, API, sync, conflict.
- Online-only actions are **disabled with a reason**: "Needs internet to record payment", "Needs internet" (Turn into bill), "**Bills need internet** so bill numbers never repeat. Your draft is kept on this phone."
- Failure: History card shows "Needs attention" + **Try again**; "Needs attention · call owner" for rejected changes; the owner sees it on the dashboard (doc 09 §5).
- Conflict copy: "This job was updated elsewhere. Ask the owner to review it."

### 6.6 Error states [FINAL copy, §8.5]
Field errors under the field in red 14/600 with a red border. Screen errors in a bad box. Network errors: "Internet is unavailable. Your work is saved on this phone." / "Couldn't save. Please try again."

### 6.7 Empty states [FINAL copy]
| Where | Title | Text / action |
|---|---|---|
| Technician My Work | No jobs today | New jobs from the owner appear here. · Call owner |
| Owner Needs your action | Nothing waiting on you | Teams will tell you here when they need something |
| Latest from teams | No updates yet today | — |
| Enquiries (Open / Closed) | No open enquiries / Nothing closed yet | Save an enquiry when a customer asks but has not booked. |
| Jobs filter | No jobs here | Try another filter. |
| Customers / Search | No customer found / No match | Check the spelling, or add them. · + Add as new customer |
| Billing To collect | Nothing to collect | All bills are paid. |
| Quotations | No quotations yet | Make one from an enquiry, for big jobs like installation or AMC. |
| Team jobs | No jobs | This team is free. |
| Bill payments | No payments yet | — |
| Customer history / AC visits | No jobs yet / No visits yet | — |
| Employees | No employees yet. | — |

### 6.8 Success states
Toasts (§8.4); full-screen confirmation only for Finish work (T4) and setup done (A8).

---

## 7. Responsive design

### 7.1 Decided [FINAL]
- **Android phone app first and only for the MVP** (D-001): one role-based app. iOS later.
- Design at **390 × 844** (prototype phone). Portrait.
- Large technician UI regardless of screen size (big buttons, 17–18 px body).
- Layout must survive the phone's own navigation bar (bottom inset) and long Hindi/Marathi words.

### 7.2 Phone adaptation rules (from the prototype)
- Single column, 16 side padding, full-width cards and buttons.
- Horizontal scrolling only for filter chip rows (no visible scrollbar).
- Long names truncate with an ellipsis in header titles; elsewhere text wraps.
- 4-column tiles stay 4-column at 360 wide; check they don't break at small widths [OPEN, device range Q-11].
- Footer buttons stack vertically when there are three (e.g. Enquiry: Convert / Make quotation / Close).

### 7.3 Tablet and desktop [OPEN]
**No decision exists.** KaamSetu is not planned as a web or tablet product for the MVP, and the docs list no desktop screens. Do **not** design desktop/tablet layouts as part of this pass. If Stitch requires a web frame, generate the mobile design only (see G-1).

---

## 8. Content and microcopy

### 8.1 Voice [FINAL]
Helpful, practical, trustworthy, familiar, clear, efficient, not technical. Short sentences. Common words. One instruction at a time. No accounting/engineering jargon, no abbreviations. Errors always say how to recover. Same word for the same thing everywhere.

### 8.2 Vocabulary [FINAL, doc 08 §6]
| Use | Never |
|---|---|
| My Work | Assigned Work Orders |
| Start Work | Initiate Job |
| Finish Work | Submit Service Report |
| Customer | Client |
| AC Details | Equipment Metadata |
| Bill | Invoice / Receivable |
| Received | Payment Allocation |
| Remaining | Outstanding Receivable |
| Needs another visit | Follow-up workflow required |
| Saved / Sending / Sent / Needs attention | Synchronised, outbox, API |
| Enquiry | Lead, ticket (except a brand "Ticket number") |
| Quotation | Estimate (UI word) |

Money: "₹" + Indian grouping (₹1,40,000). Phone: "+91 98220 45117". Job numbers "#1044", enquiries "E-212", bills "KS-0084" (GST series "KS-G-0001" [PROPOSED]), quotations by number. Dates "Wed, 18 Nov", "Today", "Tomorrow".

### 8.3 Key labels by screen (English; Hindi/Marathi in §8.7)
- **Login:** Continue with Google · Use the Google account on this phone. No password or SMS needed. · Language
- **Join:** Join your business · Signed in as {email} · Scan QR code · Enter code instead · Your mobile number · 6-digit code from the owner · Join · Joining…
- **Setup:** Your business · Business name (e.g. Cool Care AC Services) · Your name (Owner name) · City · We give GST bills / You can still turn GST off for any bill · GSTIN *optional now* · I also go on jobs · Add your first team · Senior technician name · Senior's mobile · Helper name *optional* · Helper uses the app / Off: helper works on the senior's phone · Skip for now · Save team · {Business} is ready · Go to Home
- **Home:** Good morning, {name} · Open enquiries · Jobs need a team · Assign · Needs your action · Parts, delays and jobs not yet fixed with the customer · Today · N sites · Not started · Working · On hold · Done · See all · Latest from teams · Every status change arrives here by itself · All · Work report ready to bill · View · Money to collect · from N bills · N over 15 days · with teams, to hand over · New enquiry or job · Add customer · Create bill · Record payment
- **New job:** New enquiry or job · Draft saved · Paste ticket from WhatsApp · Customer *Search by phone or name* · Phone or name · Change · Which AC? *Tick all that need work* · Add AC · Service (Service, Repair, Deep cleaning, Gas filling, Installation, Uninstall, AMC visit, Inspection, Commercial, Other) · Problem *Optional* · What did the customer say? · + Not cooling / Water leak / Noise / Bad smell · When *Customer's preferred time* · Today / Tomorrow / Pick date · Morning / Afternoon / Evening · Came from · Ticket number *From the brand's message* · Save enquiry · Create job & assign
- **Job detail:** Job #N · Call · WhatsApp · Customer · Service · AC · Problem · Team · Helper: · No team yet · Appointment · Not fixed yet · Customer asked: … · fixed by {name} at {time} · To collect on site · Nothing · Came from · Ticket · Updates · From the team, newest first · Work report · Found: · Collected on site · I received this cash · I see it in my account · Closed in brand portal · Book a follow-up visit
- **Customer:** Customers · Add · Phone or name · since {year} · GST bills · Bills without GST · New job · ₹X remaining on N bills · View · Map · Add AC here · Add another address · Service history · N jobs
- **Billing:** Billing · To collect · cash with teams · Ready to bill · Completed jobs with no bill · Create bill · Cash with teams · Mark when it is handed to you · To collect / All bills / Quotations
- **Bill editor:** New bill · Items · Amount · Add item · Discount · Subtotal · GST bill · On for {name} (customer default) · Changed for this bill only · CGST 9% · SGST 9% · Bill total · Received on site · Remaining · Bill date · Number given when saved · Save & send on WhatsApp · Save only · New quotation · Price for the customer before the work. It is not a bill; you can turn it into a bill later.
- **Payment sheet:** Record payment · Bill total · Received · Remaining · Amount received now · Full ₹X · How was it paid? · Cash / UPI / Bank / Other · Date · Today, {date} · Save payment · ₹X {method} · Enter an amount
- **Technician:** My Work · History · Profile · Working now · Today · Tomorrow · Open job · Continue · Finish work · Fix appointment · Start Work · Start again · Finish Work · Update status · Call · Directions · Address · Customer says · ACs · First visit · Last: … · Collect from customer · Set by owner · What did you find? (Dirty filter, Bad smell, Noise, Low gas, Water leak, Drain blocked, All OK) · Work done on each AC (Service, Wet wash, Gas filled, Drain pipe cleared, Filter cleaned, Fan tightened, PCB repaired, Other; window AC: Service, Wet wash, Gas filled, Fan cleaned, Other) · Parts used *if any* · Photos *owner asks for N* · Note for owner *optional* (+ Stand rusted, Needs new part, Customer happy) · Money from customer · Cash / UPI / Not paid · received · Result · Work completed / Needs another visit (Part to bring, Customer asked, Gas leak check) / Could not finish · Call owner · Log out
- **Helper:** Today's work · Me · your senior · Carry · Next job · Your senior fills in the job report. You don't need to fill anything.

### 8.4 Success and info messages (toasts) [FINAL]
Job #N created · Job #N assigned to {team} · {senior} will see it now · Enquiry saved · convert it when the customer books · Enquiry closed: {reason} · Ticket {no} read · check and save · Customer added · AC added · Payment saved · ₹X (Undo) · Bill {no} saved · WhatsApp opens with the PDF · Quotation {no} saved · WhatsApp opens with the PDF · Bill cancelled · Job #N cancelled · Job #N on hold · team informed · Job #N moved to {day} · team informed · Follow-up job #N linked to #M · Cash marked as received · UPI payment confirmed · Marked closed in brand portal · {senior} informed: {part} is ready / is ordered · Team will collect ₹X / Team will not collect money · ✓ Owner informed · Saved. Owner will see it when internet comes back. · Start Work ✓ · {time} · Photo added · N jobs sent to owner / to teams · Welcome to KaamSetu · Welcome back, {name}
Doc 08 short forms: Job saved · Work completed · Bill created · Payment recorded · Photo added.

### 8.5 Error messages [FINAL]
- General: Couldn't save. Please try again. · Something went wrong. Please try again. · No internet. Check your connection and try again. · Internet is unavailable. Your work is saved on this phone. · Payment could not be recorded. Check your connection and try again. · This job was updated elsewhere. Ask the owner to review it. · Please check what you entered.
- Fields: Choose or add the customer · Choose the service · Enter the customer's name · Number should have 10 digits · Enter at least the area · Say where the AC is · Enter your business name · Enter a name · Tap the work you did · The code has 6 digits
- Duplicate: This number belongs to {name}. Open customer
- Ticket: Could not read this ticket. Check the text, or close this and fill the job by hand.
- Sign-in / invite: Google sign-in failed. Please try again. · Google Play services are missing or need an update on this phone. · This invite does not work. Ask the owner for a new one. · This invite has expired. Ask the owner for a new one. · Wrong code. Please check and try again. · Too many wrong codes. Ask the owner for a new invite. · This employee already uses another Google account. Ask the owner to reset the login. · This Google account already belongs to a business. · This account is not active. Contact the business owner. · This is not a KaamSetu invite code. · KaamSetu needs the camera to scan the QR code. · Allow camera

### 8.6 Dialogs [FINAL]
| Dialog | Text | Buttons |
|---|---|---|
| Cancel job | Cancel job #N? The team will no longer see it. It stays in history. You can't undo this. | Keep job · **Cancel job** (danger) → reason: Customer cancelled, Duplicate job, Could not reach customer, Other |
| Cancel bill | Cancel bill KS-N? The bill stays in records as Cancelled. Payments already received stay with the customer. You can't undo this. | Keep bill · **Cancel bill** (danger) |
| Log out | Log out? (unsent: "{N} saved changes have not reached the owner yet. If you log out now, they will be lost.") | Stay/Cancel · **Log out** (danger) |
| Reset login | Reset login? {name} will be logged out on all phones and must join again with a new code. | Cancel · **Reset login** → "Login reset. Show a new invite QR to join again." |

The prototype's log-out text "You will need your mobile number and an SMS code to log in again." is out of date under D-025 (G-3).

### 8.7 Three-language labels [FINAL for technician/helper; owner screens awaiting review]
| English | हिंदी | मराठी |
|---|---|---|
| My Work | मेरा काम | माझे काम |
| History | पुराने काम | जुनी कामे |
| Start Work | काम शुरू करें | काम सुरू करा |
| Finish Work | काम पूरा करें | काम पूर्ण करा |
| Call | कॉल करें | कॉल करा |
| Directions | रास्ता देखें | रस्ता पहा |
| Customer says | ग्राहक ने कहा | ग्राहक म्हणतात |
| Collect from customer | ग्राहक से लेना है | ग्राहकाकडून घ्यायचे |
| Saved on phone | फ़ोन में सेव | फोनमध्ये सेव्ह |
| Sending… | भेज रहे हैं… | पाठवत आहे… |
| Sent | भेज दिया | पाठवले |
| Needs attention | ध्यान दें | लक्ष द्या |
| Work completed | काम पूरा हुआ | काम पूर्ण झाले |
| No internet. Keep working. All saved on phone. | इंटरनेट नहीं है। काम जारी रखें। सब फ़ोन में सेव है। | इंटरनेट नाही. काम चालू ठेवा. सर्व फोनमध्ये सेव्ह आहे. |

Full strings: `mobile/src/localization/resources/{en,hi,mr}.ts` and the prototype's `T` table. Owner-screen Hindi/Marathi is not in the prototype; app translations are awaiting review (G-8). Design every screen in English first, then check one technician screen in Marathi for length.

---

## 9. Design consistency rules

1. **One primary action per screen**, full width at the bottom (sticky footer) or as the single filled button in a card.
2. **Same action = same word, icon and position** everywhere (Call is always a tonal button with the phone icon; Create bill always the bill icon).
3. **Status = colour + text (+ icon on technician screens).** Use the exact colour pairs in §5.5; never introduce another status colour.
4. **Teal is for action and selection only.** Saffron is a rare accent, never a button or status.
5. **Cards are flat** (border, no shadow). Only floating layers (footer, sheet, dialog, toast) have shadows.
6. **Tab roots use the big header; inner pages use the header bar with back.** Creation forms use X (close) instead of back.
7. **Quick choices in bottom sheets**, destructive confirmations in centred dialogs, results in toasts.
8. **Chips before keyboard.** Offer chips for common answers; the text field is optional.
9. **Technician and helper screens scale up**: body 17–18, buttons 56–60, chips 48, card padding 16.
10. **Offline is normal, not an error**: grey-blue bar, reassuring words, disabled-with-reason for online-only actions.
11. **Money**: amounts right-aligned in rows, big bold figure for the key number, "Remaining" in warn colour, "Received" in green.
12. **Lists**: avatar initials for people, icon tiles for things, chevron for navigation, amount/badge on the right.
13. **Spacing from the 4-point scale only**; radius from §2.5 only.
14. **Light theme only.**
15. **Copy from §8**, translation keys in code, no hard-coded words in designs meant for handoff.

---

## 10. Gaps and open questions

Resolve these before treating the designs as final. Do not fill them in Stitch with invented answers.

| # | Gap | Why it matters | Source / owner |
|---|---|---|---|
| G-1 | **Tablet/desktop layouts are not decided.** The product is an Android phone app (D-001); no web or tablet version is planned | Stitch may ask for web frames | Decide only if a web admin is wanted (not in PRD) |
| G-2 | **Usability test not done** (doc 02 §0, gate M2) | Any screen may change | T1 discovery + prototype test |
| G-3 | **Prototype copy predates D-025.** Setup step 2 ("They log in with this number. No password."), step 3 ("We sent an SMS…"), Add staff ("We send them an SMS… OTP") and the log-out dialog mention SMS/OTP | Wrong instructions to users | Rewrite to the QR-invite flow; exact wording not yet agreed |
| G-4 | Staff without a usable Google account have no login path | Some technicians may be locked out | D-025 open point, decide at ride-along (T1.2) |
| G-5 | **Technician tab name:** doc 02 says "Completed", prototype and app say "History" | Label consistency | Pick one (app currently "History") |
| G-6 | **"Scheduled" badge**: the prototype shows Assigned + appointment fixed as "Scheduled" (teal, time). D-009 allows six statuses with the appointment as a field | Badge naming | Confirm it's a display label, not a status |
| G-7 | **Time slots:** Q-06 answer is Morning/Afternoon, prototype also offers Evening and fixed times | Chip options | Confirm with the owner |
| G-8 | Hindi/Marathi for owner screens not reviewed | Owner language choice | Translation review |
| G-9 | Owner **reject cash collection with a reason** (PRD §8.3b) has no screen | Money accuracy | Design needed |
| G-10 | **Loading and generic error-state layouts** are not drawn (required by doc 02 §11) | Design gate | Design and approve |
| G-11 | "More" menu differs: doc 02 lists Teams, Employees, AMC, Expenses (later), Reports (basic), Settings; the prototype has Teams, Staff/Employees, Rate list, Business details, Bill settings, Photo rules, Language, Plan & payment, Help. AMC/Reports are P1 | Menu content | Use the prototype list for the MVP; confirm |
| G-12 | Token mismatch: `line-2` `#CFC9BC` vs `#CFCABE`, `soft` `#F2F0EA` vs `#EFECE4` | Pixel consistency | Use the app values; align the prototype |
| G-13 | **GST** (Q-04): rates, SAC codes, CGST/SGST vs IGST, numbering, mandatory fields. Don't claim "GST compliant" | Bill editor, bill settings, PDF | Accountant |
| G-14 | **Who pays for service-centre / builder jobs** (Q-14) | Who the bill is for; money tracking | Owner interview |
| G-15 | **Price list per brand/source** (Q-15) | Rate list and ticket pre-fill | Owner interview |
| G-16 | **Bill PDF / quotation PDF layout** not designed (logo, terms, GST fields) | Shared with customers | After Q-04 |
| G-17 | Logo and final palette contrast not finalised (doc 08 §9) | Brand | Trademark check + outdoor contrast test |
| G-18 | Plan price "[YOUR PRICE] / month" and plan rules | Plan screen | Business decision (Q-13 for the pilot) |
| G-19 | Technician adds an AC on site is *proposed* ("Customer showed another AC") | Finish page | Confirm |
| G-20 | Exact phone models/screen sizes (Q-11) | Minimum layout width | Ride-along |
| G-21 | Push notifications: not discussed; the bell opens "Updates from teams" in-app | Expectations | Decide later |
| G-22 | Motion/transition spec not defined | Polish | Decide during visual design |
| G-23 | Duplicate customer warning at sync for owner-offline adds (doc 09 §2); merge tool is P1 | Owner offline UI | Design the warning |

---

## 11. Google Stitch working guide

> Ready-to-paste prompts for every screen (83, in build order) are in [STITCH_PROMPTS.md](STITCH_PROMPTS.md). Prompts that link them into a clickable prototype are in [STITCH_PROTOTYPE_PROMPTS.md](STITCH_PROTOTYPE_PROMPTS.md).

### 11.1 Base style prompt (paste first, reuse for every screen)
> Android mobile app, 390×844 portrait, light theme only. Brand "KaamSetu", AC service business app for India. Warm off-white background #F7F5F0, white cards with 1px #E4E0D6 border, 12px radius, no shadows on cards. Primary colour deep teal #0F766E (pressed #115E59, tint #E6F2EF, text on tint #0B5F58). Text #14213D, secondary #4A5468. Status colours with tinted pill badges: green #15803D on #E3F3E8, amber #B45309 on #FDEBD3, red #B42318 on #FBE4E4, blue #1E4FBF on #E3ECFD, purple #5B32B4 on #EDE7FB, grey #3B4556 on #ECEEF2. Saffron #E8891C only as a rare accent. Font Noto Sans (Noto Sans Devanagari for Hindi/Marathi), weights 400/600/700. 16px side padding, 4-point spacing. Buttons 52px tall, 12px radius, full width at the bottom; one primary teal button per screen. Inputs 52px, 10px radius, 1.5px #CFCABE border. Chips 44px, 10px radius. Outline icons, 2px stroke, always with a text label. Simple, high contrast, friendly, minimal decoration, readable outdoors.

### 11.2 Suggested build order
1. Components sheet: buttons, inputs, chips, badges, cards, list rows, sheet, dialog, toast, offline bar, empty state.
2. Owner: Home → Jobs → New enquiry or job → Assign sheet → Job detail (all states).
3. Technician: My Work → Job detail → Update status sheet → Finish work → Work completed.
4. Owner: Bill editor → Bill detail → Record payment sheet; Billing tab; Quotation.
5. Customers, Customer detail, Add customer, AC detail, Add AC.
6. Helper Today's work.
7. Auth (Google, Join, Scan) and setup; More and settings screens.
8. Variants: offline, empty, error, Hindi/Marathi check.

### 11.3 Per-screen prompt pattern
> Using the KaamSetu style: **{screen name}** for the **{role}**. Top: {header}. Body, in order: {sections from §3}. Bottom: {footer/primary action}. Bottom nav: {tabs, active tab}. Use this exact copy: {strings from §8}. State: {online/offline, status}.

Example (technician job detail):
> Using the KaamSetu style: Job detail for the senior technician. Header: back arrow with "My Work" on the left, green "Sent" sync label on the right. Body: "Today · 2:30 PM" in teal 16 bold; customer "Meera Joshi" 26 bold; "Service · 2 ACs" grey; teal pill badge with calendar icon "2:30 PM". Two large tonal teal buttons side by side: "Call" (phone icon) and "Directions" (navigate icon). White card "ADDRESS" with the address in 18px and a landmark line. Warm card (#FFF8EE, border #F1D3A7) "CUSTOMER SAYS" with the quoted problem in 18px. Card "ACS · 2" listing each AC with an AC icon, room name bold 18, "Split · Daikin · 1.5 ton", "Last: Mar 2026 · gas filled". Card "COLLECT FROM CUSTOMER · Set by owner" with ₹1,400 large. Sticky footer: large 60px teal button "Start Work" with a play icon, below it a secondary outline button "Update status" with a refresh icon. Bottom nav, 76px: My Work (active, teal pill), History, Profile.

### 11.4 Stitch guardrails
- Paste copy from §8 exactly; don't let Stitch invent labels, features, charts or colours.
- Reject any chart on Home, dark mode, hamburger drawers, icon-only buttons and extra statuses.
- Keep sample data Indian and realistic (Pune areas, ₹, +91 numbers). Names and numbers are examples only.
- Generate the mobile frame only (G-1).
- After Stitch, check each screen against §9 and record differences in doc 02 and the decision log.
