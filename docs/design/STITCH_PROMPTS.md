# KaamSetu — Google Stitch Prompt Pack

> Ready-to-paste prompts for every screen, in build order. Companion to [STITCH_DESIGN_BRIEF.md](STITCH_DESIGN_BRIEF.md) (the brief explains *why*; this file is *what to paste*).
> Text in the prompts comes from the brief §8, the prototype and the app strings. Nothing new is added. Where a decision is still open, the prompt shows a visible placeholder in square brackets, e.g. `[Text to be decided]`. Leave it in.
> Sample names, numbers and addresses are made-up examples.

---

## How to use

1. In Stitch, create **one project**, choose **Mobile**.
2. **First message:** paste the **Base prompt** (§0) and then prompt **01** in the same message.
3. **Every next message:** paste only the next numbered prompt. Each starts with a line like `Screen 14 · same KaamSetu project…`. That line tells Stitch to reuse everything made before.
4. Optional but strongly recommended: open `docs/design/KaamSetu Prototype.html` in a browser, screenshot the same screen and attach it with the prompt.
5. If a screen comes out wrong, fix it with a short edit prompt (§11), one change at a time. If colours or fonts drift, paste the **Base prompt** again with the words "Re-apply this style to the current screen."
6. Do the prompts in order. Later screens reuse components from earlier ones.
7. Tick each screen in the checklist (§12) when it matches.
8. When the screens are done, link them into a clickable prototype with [STITCH_PROTOTYPE_PROMPTS.md](STITCH_PROTOTYPE_PROMPTS.md).

Screen size for all prompts: **390 × 844, portrait, Android**.

---

## 0. Base prompt (paste once, at the very start)

```
You are designing ONE mobile app called KaamSetu. It is an Android app for small AC service businesses in India. Three kinds of users share the same app: the Owner, the Senior technician and the Helper. I will send one screen per message, numbered "Screen 01", "Screen 02" and so on. Every screen must look like part of the same app as the screens made before it: same header, same bottom navigation, same cards, buttons, chips, badges, icons, spacing and colours. Reuse components; never restyle them.

STRICT RULES
- Design ONLY what I list. Do not add features, sections, buttons, menu items, tabs, charts, graphs, illustrations, photos, avatars with faces, banners, promotions, search bars or text that I did not ask for.
- Use my text EXACTLY as written, word for word. Do not rewrite, shorten, translate or add labels. Text in [square brackets] is a placeholder: show it as written, in grey.
- Light theme only. No dark mode. No gradients. No glassmorphism. No drop shadows on cards.
- Phone screen 390 x 844, portrait. Single column. No desktop or tablet layout.
- Every icon has a text label next to or under it (except back, close and search in headers).
- Never show status by colour alone; always with its text label.
- One main (filled teal) button per screen.

COLOURS (use only these)
- Background (paper): #F7F5F0. Cards, sheets, header bar, bottom nav, inputs: #FFFFFF.
- Primary teal: #0F766E. Pressed: #115E59. Teal tint (light fill): #E6F2EF. Text on teal tint: #0B5F58.
- Main text: #14213D. Secondary text: #4A5468. Muted labels: #5B6576.
- Card border / dividers: #E4E0D6. Input and chip border: #CFCABE. Soft fill (icon tiles, tab track): #EFECE4. Row divider inside lists: #EEEAE1.
- Accent saffron #E8891C: do not use unless I ask.
- Status pairs (text colour on tint background):
  Green (done, paid): #166534 on #E3F3E8, strong #15803D.
  Amber (in progress, money pending): #8A4A06 on #FDEBD3, strong #B45309.
  Red (error, not paid, cancelled): #A61B1B on #FBE4E4, strong #B42318.
  Blue (new, info): #1E4FBF on #E3ECFD.
  Purple (assigned): #5B32B4 on #EDE7FB.
  Grey (on hold, customer side): #3B4556 on #ECEEF2.
  Orange (on hold our side, part needed): #9A3412 on #FFE1CC; light card #FFF1E6 with border #F5C7A3.
  Warm card ("Customer says", money on site): fill #FFF8EE, border #F1D3A7.
- Disabled button: fill #E7E4DC, text #6F7686. Sheet/dialog backdrop: #14213D at 50%.

TYPE
- Font: Noto Sans (Noto Sans Devanagari for Hindi/Marathi). Weights 400, 600, 700 only.
- Big page title 26 bold. Header bar title 19 semibold with a 13 grey subtitle. Section heading 18 semibold. Body 16 (technician and helper screens 17-18). Small grey text 13-15. Group labels 12 bold UPPERCASE, letter spacing 0.06em, colour #5B6576. Buttons 16 semibold (large buttons 18). Badges 12 semibold. Money totals 28-34 bold.

LAYOUT AND COMPONENTS
- Spacing on a 4-point scale (4, 8, 12, 16, 24, 32). Screen side padding 16. Gap between cards 14.
- Big header (main tab screens): on the paper background, small grey date line above a 26 bold title; round white icon buttons (48, 1px border) on the right.
- Header bar (inner screens): 60 tall, white, 1px bottom border, back arrow on the left (X close icon on creation forms), title and optional subtitle, optional text action on the right.
- Card: white, 1px #E4E0D6 border, radius 12, padding 14, NO shadow. Inside, key-value rows: grey label on the left, semibold value on the right.
- List: one white card with rows separated by #EEEAE1 lines. Row: leading round avatar with initials (44, teal tint, teal text) or a square icon tile (40, #EFECE4); title 16 semibold; 13 grey subtitle; chevron or amount or badge on the right.
- Buttons: height 52, radius 12. Primary = teal fill, white text. Secondary = white with 1.5px teal border, teal text. Tonal = teal tint fill, #0B5F58 text (used for Call, WhatsApp, Directions). Danger outline = white, border #E7B4AE, red text. Text button = no fill, teal text. Large technician button = height 60, text 18. "Add" buttons = height 48, 1.5px DASHED grey border #9BA3B1, teal text, plus icon.
- Inputs: height 52, radius 10, 1.5px #CFCABE border, label 15 semibold above, optional small grey hint on the right of the label. Phone input has a "+91" prefix. Amount input has a "₹" prefix in 24 bold.
- Chips (choices): height 44 (technician 48), radius 10, 1.5px #CFCABE border, white. Selected chip: teal tint fill, teal border, #0B5F58 semibold text.
- Badge: pill, height 26, 12 semibold, tint background with matching text colour.
- Toggle switch: 52 x 32, teal when on.
- Sticky footer: white bar at the bottom with a very light top shadow, 12/16 padding, holds the main button(s) full width.
- Bottom sheet: dimmed screen behind, white sheet with top corners radius 20, small grey grab handle, title 20 semibold + grey subtitle + X close on the right, content, sticky footer button.
- Dialog: centred white box radius 16, title 18 bold, grey text, buttons bottom right.
- Toast: dark #14213D rounded bar above the bottom nav, white 15 text.
- Empty state: white box with a 1px DASHED border, teal outline icon, bold title, grey line.
- Offline bar: grey-blue #ECEEF2 rounded bar under the header with a "wifi off" icon and text.
- Icons: simple outline icons, 24 grid, 2px stroke, rounded ends (Lucide style), in teal or text colour.

BOTTOM NAVIGATION (white, 1px top border; icons with labels; active tab = #0B5F58 bold label with a teal-tint pill behind the icon)
- Owner screens: Home · Jobs · Customers · Billing · More (68 tall).
- Senior technician screens: My Work · History · Profile (76 tall, labels 13-14).
- Helper screens: no bottom navigation.

SAMPLE DATA (use these, Indian format)
- Business: Cool Care AC Services, Pune. Owner: Vijay. Money: ₹ with Indian grouping (₹1,400; ₹12,500). Phones: +91 98903 12244. Jobs "#1044", enquiries "E-212", bills "KS-0084". Dates like "Wed, 18 Nov".
- Teams: Team 1 (Imran Shaikh, helper Vikas Gaikwad), Team 3 (Santosh Pawar, helper Akash Shinde), Team 5 (Ganesh More, helper Rahul Jadhav).
- Customers: Meera Joshi (Karve Nagar), Rohan Kulkarni (Kothrud), Shreeji Clinic (Warje), Hotel Annapurna (Deccan), Sunita Rao (Aundh), Fatima Sayyed (NIBM Road), Anil Deshpande (Baner).

Reply to this message by designing Screen 01 below.
```

---

## 1. Design system reference

### 01 · Component sheet
```
Screen 01 · KaamSetu component reference. This is the style guide all later screens must reuse. Show on one tall white-and-paper page, grouped with small uppercase grey labels:
BUTTONS: Primary "Create job & assign"; Large primary "Start Work" with a play icon; Secondary "Save enquiry"; Tonal "Call" with phone icon; Tonal "WhatsApp"; Danger outline "Log out"; Text button "Skip for now"; Dashed add button "+ Add AC"; Disabled "Needs internet to record payment".
INPUTS: "Mobile number" with +91 prefix; "Problem" textarea with hint "Optional" and placeholder "What did the customer say?"; amount input "₹ 1,400"; pill search "Phone or name"; error input with red text "Number should have 10 digits".
CHIPS: Service, Repair (selected), Deep cleaning, Gas filling.
BADGES: New (blue), Assigned (purple), In Progress (amber), On hold · customer (grey), On hold · our side (orange), Completed (green), Cancelled (red), Not billed (blue), ✓ Paid (green), ◐ Partly paid (amber), ○ Not paid (red).
SYNC LABELS (small icon + text): "Saved on phone" (grey, phone icon), "Sending…" (teal, up arrow), "Sent" (green, double tick), "Needs attention" (red, warning).
CARD: a job card with "#1044 · Today, 2:30 PM" and Assigned badge, "Meera Joshi", "Service · Karve Nagar · 2 ACs", "Team 3".
LIST ROW: avatar "MJ", "Meera Joshi", "+91 98903 12244 · Karve Nagar · 2 ACs", chevron.
OFFLINE BAR: "No internet. Keep working. All saved on phone."
TOGGLE: "We give GST bills" on.
EMPTY STATE: icon, "No jobs here", "Try another filter."
TOAST: "Job #1044 created".
Add nothing else.
```

---

## 2. Owner — home and jobs

### 02 · Owner Home
```
Screen 02 · same KaamSetu project, same style as Screen 01. Add nothing not listed.
Owner Home. Bottom nav: owner tabs, Home active.
Big header: grey "Wed, 18 Nov", title "Good morning, Vijay". Right: round bell button with a small red count badge "3" (label for accessibility "Updates from teams"), round search button.
Body, top to bottom:
1. Alert row (white card): grey circle with "4", bold "Open enquiries", grey "3 WhatsApp, 1 call · not jobs yet", outlined teal pill "Open".
2. Alert row (blue tint #E3ECFD): blue circle "2" white text, bold "Jobs need a team", "Next: Hotel Annapurna, tomorrow", blue pill "Assign".
3. List card titled "Needs your action · 4" (18 semibold) with grey line "Parts, delays and jobs not yet fixed with the customer". Rows, each with a round tone icon, bold title, grey subtitle and a small tonal button on the right:
   - orange box icon: "Part needed: 1 MCB 16A" / "Sunita Rao · Team 1 · work continues" / "Arrange"
   - orange box icon: "Part needed: 1 Indoor PCB" / "Sunita Rao · Team 5 · work stopped" / "Arrange"
   - grey pause icon: "Customer delay: Customer not at home" / "Fatima Sayyed · asked for Sat, 22 Nov" / "Confirm date"
   - blue calendar icon: "Appointment not fixed yet" / "Shreeji Clinic · Team 3 · today" / "Open"
4. Card: heading "Today · 6 sites" with teal text link "See all". Four stat tiles in a row: teal tint "2 Not started", amber tint "1 Working", orange tint "2 On hold", green tint "2 Done".
5. List card "Latest from teams" (18 semibold), grey "Every status change arrives here by itself", text link "All". Rows: teal calendar icon "Appointment fixed: Today, 2:30 PM" / "Meera Joshi · #1044 · Santosh · 9:12 AM"; orange box icon "Part needed: 1 MCB 16A" / "Sunita Rao · #1046 · Imran · 12:05 PM"; green tick "Work completed" / "Rohan Kulkarni · #1043 · Santosh · 12:20 PM".
6. Alert row (green tint): green circle "1", bold "Work report ready to bill", "Rohan Kulkarni", green pill "View".
7. Card "Money to collect" with teal text "Open": big "₹12,304", grey "from 3 bills · 1 over 15 days"; on the right amber bold "₹1,000" and grey "with teams, to hand over".
8. Grid of 4 square quick-action tiles: first filled teal with plus icon "New enquiry or job"; then white tiles "Add customer", "Create bill", "Record payment" with teal icons.
```

### 03 · Updates from teams
```
Screen 03 · same KaamSetu project, same style as Screens 01–02. Add nothing not listed.
Owner inner screen. Header bar with back arrow, title "Updates from teams". No bottom nav.
Segmented tabs (soft grey track, selected tab white): "All updates" (selected) | "Delays & parts".
One list card with update rows (round tone icon, bold text, grey "customer · job · person · time"). Unseen rows have a very light teal background #F3FAF8:
- green tick "Work completed" / "Rohan Kulkarni · #1043 · Santosh · 12:20 PM" (unseen)
- orange box "Part needed: 1 MCB 16A" / "Sunita Rao · #1046 · Imran · 12:05 PM" (unseen)
- amber play "Started work" / "Sunita Rao · #1046 · Imran · 11:35 AM"
- teal calendar "Appointment fixed: Today, 2:30 PM" / "Meera Joshi · #1044 · Santosh · 9:12 AM"
- grey pause "Customer not ready: Customer not at home" / "Fatima Sayyed · #1053 · Nitin · 1:10 PM"
Centred small grey text below: "Teams send these from their phone. You don't need to call them."
```

### 04 · Search
```
Screen 04 · same KaamSetu project, same style as Screens 01–03. Add nothing not listed.
Owner global search. Header: back arrow, then a pill search field filling the width with search icon and typed text "meera" (placeholder when empty: "Customer name, phone or job no."). No bottom nav.
Results list card: row with avatar "MJ", "Meera Joshi", "+91 98903 12244 · Karve Nagar", chevron. Row with square bag icon, "Job #1044", "Meera Joshi", Assigned badge on the right. Row with bag icon, "Job #1039", "Meera Joshi", Completed badge.
```

### 05 · Jobs tab — Jobs list
```
Screen 05 · same KaamSetu project, same style as Screens 01–04. Add nothing not listed.
Owner Jobs tab. Bottom nav: owner tabs, Jobs active.
Big header title "Jobs", right a small primary button with plus icon "New".
Segmented tabs: "Enquiries · 4" | "Jobs" (selected).
Horizontal scrolling chips (no scrollbar): "All" (selected), "Today · 6", "Needs action · 4", "New · 2", "Not started · 4", "In Progress · 1", "On Hold · 2", "Completed · 4", "Cancelled · 0".
Job cards (whole card tappable), each: small grey "#number · day, time" left and status badge right; customer name 16 semibold; grey "service · area · ACs"; grey team line; last update line with tiny icon in dark text and grey "· person, time":
- "#1053 · Today, 1:00 PM" On hold · customer (grey) / Fatima Sayyed / "Service · NIBM Road · 1 AC" / "Team 4" / pause icon "Customer not ready: Customer not at home · Nitin, 1:10 PM"
- "#1052 · Tomorrow, 3:00 PM" Assigned / Fatima Sayyed / "Repair · NIBM Road · 1 AC" / "Team 3"
- "#1047 · Tomorrow, Morning" New / Hotel Annapurna / "Service · Deccan · 2 ACs" / "No team yet"
- "#1046 · Today, 11:30 AM" In Progress / Sunita Rao / "Repair · Aundh · 1 AC" / "Team 1" / box icon "Part needed: 1 MCB 16A · Imran, 12:05 PM"
- "#1043 · Today, 11:00 AM" Completed / Rohan Kulkarni / "Repair · Kothrud · 1 AC" / "Team 3 · Not billed" (Not billed in bold blue)
```

### 06 · Jobs tab — Enquiries
```
Screen 06 · same KaamSetu project, same style as Screens 01–05. Add nothing not listed.
Same as Screen 05 (Jobs tab, header "Jobs" with "New" button, owner bottom nav with Jobs active) but the "Enquiries · 4" segment is selected.
Chips: "Open" (selected), "Closed".
Enquiry cards: small grey "number · age" left, badge "Open" (soft grey) right; name 16 semibold; grey "service · area · via source"; the customer's words in quotes, 14:
- "E-215 · Today, 10:15 AM" / Rohan Kulkarni / "Repair · Kothrud · via WhatsApp" / "Hall AC makes noise at night"
- "E-214 · Today, 9:40 AM" / Kapil Traders / "Service · Budhwar Peth · via WhatsApp" / "10 cassette ACs. Wants service before Diwali sale."
- "E-213 · Yesterday" / Fatima Sayyed / "AMC visit · NIBM Road · via Call" / "Asked yearly AMC price for 3 ACs"
- "E-212 · 2 days ago" / Anil Deshpande / "Installation · Baner · via WhatsApp" / "New split AC 1.5 ton bought. Wants installation price."
```

### 07 · Enquiry detail
```
Screen 07 · same KaamSetu project, same style as Screens 01–06. Add nothing not listed.
Header bar: back arrow, title "Enquiry E-213", subtitle "Yesterday · via Call". No bottom nav.
Card 1: "Fatima Sayyed" 18 semibold, grey "+91 95450 98712 · A-602, Ganga Florentina, NIBM Road"; row of two tonal buttons "Call" (phone icon) and "WhatsApp".
Card 2: uppercase label "WHAT THEY ASKED"; 17 text in quotes "Asked yearly AMC price for 3 ACs"; key-value rows: Service — AMC visit; ACs — Bedroom, Hall, Kids room; When — Not decided.
Centred small grey text: "Converting copies all of this into a new job. Nothing to type again."
Sticky footer, stacked full-width: primary "Convert to job" (bag icon); secondary "Make quotation" (bill icon); text button "Close enquiry".
```

### 08 · New enquiry or job (empty form)
```
Screen 08 · same KaamSetu project, same style as Screens 01–07. Add nothing not listed.
Creation form. Header bar: X close icon on the left, title "New enquiry or job", small grey "Draft saved" on the right. No bottom nav. Gap 22 between fields.
1. Dashed add button full width with inbox icon: "Paste ticket from WhatsApp".
2. Label "Customer" with grey hint "Search by phone or name"; below, an input-looking button with search icon and grey text "Phone or name".
3. Label "Service"; chips: Service, Repair, Deep cleaning, Gas filling, Installation, Uninstall, AMC visit, Inspection, Commercial, Other (none selected).
4. Label "Problem" with hint "Optional"; textarea placeholder "What did the customer say?"; small chips "+ Not cooling", "+ Water leak", "+ Noise", "+ Bad smell".
5. Label "When" with hint "Customer's preferred time"; chips "Today", "Tomorrow" (selected), "Pick date"; second row "Morning" (selected), "Afternoon", "Evening".
6. Label "Came from"; chips with icons: "WhatsApp" (selected, WhatsApp icon), "Call" (phone icon), "Service centre" (inbox icon), "Builder/company" (shop icon), "Other".
Sticky footer, one row: secondary "Save enquiry" and wider primary "Create job & assign".
```

### 09 · New job — customer chosen, from a ticket
```
Screen 09 · same KaamSetu project, same style as Screens 01–08. Add nothing not listed.
Same form as Screen 08, filled in:
- Under the paste button, a teal-tint info box with tick icon: "Filled from ticket 24110012345678 · collect ₹2,499 on site. Check before saving."
- Customer: selected card with 1.5px teal border: "Rahul Desai" 17 semibold with teal text "Change" on the right; grey "+91 98765 01234"; map-pin icon and "Kothrud · Home".
- New field "Which AC?" with hint "Tick all that need work": grey text "No ACs saved at this address yet. The technician can add them on site." and dashed button "+ Add AC".
- Service: "Installation" selected.
- When: Tomorrow + Morning selected.
- Came from: "Service centre" selected.
- New field "Ticket number" with hint "From the brand's message": input showing "24110012345678".
Footer same as Screen 08.
```

### 10 · Sheet — Paste ticket
```
Screen 10 · same KaamSetu project, same style as Screens 01–09. Add nothing not listed.
Bottom sheet over the dimmed Screen 08. Sheet title "Paste ticket", subtitle "Copy the ticket message from WhatsApp and paste it here", X close.
Large textarea (about 140 tall) with placeholder "Ticket no / phone / charges / area / name".
Red error text below it: "Could not read this ticket. Check the text, or close this and fill the job by hand."
Sheet footer: primary "Fill the job".
```

### 11 · Sheet — Find customer
```
Screen 11 · same KaamSetu project, same style as Screens 01–10. Add nothing not listed.
Bottom sheet over the dimmed Screen 08. Title "Find customer", subtitle "Phone or name", X close.
Pill search input with search icon, typed "ro".
List card: avatar "RK" "Rohan Kulkarni" "+91 98220 45117 · Kothrud"; avatar "SR" "Sunita Rao" "+91 96044 77120 · Aundh".
Sheet footer: secondary button with plus icon: Add new customer “ro”
```

### 12 · Sheet — Assign team
```
Screen 12 · same KaamSetu project, same style as Screens 01–11. Add nothing not listed.
Bottom sheet over a dimmed job screen. Title "Assign team", subtitle "Service · 2 AC · Deccan", X close.
Label "Day and time": chips "Today", "Tomorrow" (selected), "20 Nov"; second row "Morning" (selected), "Afternoon", "Evening", "11:30 AM". Small grey "Customer asked for: tomorrow morning".
Label "Team" with small grey hint "fewest jobs that day first". Team option cards (radio on the left, radius 12, 1.5px border):
- Team 6 — badge "0 jobs" (soft grey) — "Sameer Patil · senior" / "Kiran Bhosale · helper"
- Team 4 — SELECTED (teal border, very light teal #F3FAF8 fill, filled radio) — badge "1 job" — "Nitin Kale · senior" / "Rohit Lonkar · helper" / teal semibold text link "Change helper for this day"
- Team 3 — badge "2 jobs" (soft grey) — "Santosh Pawar · senior" / "Akash Shinde · helper"
- Team 2 — disabled look (soft grey fill, grey text) — badge "On leave" (grey) — "Prakash Deshmukh · senior" / "Sunil More · helper"
Sheet footer: primary "Assign Team 4 · Tomorrow morning".
```

### 13 · Job detail — New (no team)
```
Screen 13 · same KaamSetu project, same style as Screens 01–12. Add nothing not listed.
Header bar: back arrow, title "Job #1047", right text button with dots icon "More". No bottom nav.
Badge row: "New" (blue).
Card: "Hotel Annapurna" 18 semibold; grey "+91 98223 00456 · FC Road, Deccan"; row of three tonal buttons "Call", "WhatsApp", "Customer".
Card with uppercase label "JOB" and key-value rows:
Service — Service
AC — Party room · Voltas 2 ton (new line) Office · Voltas 1.5 ton
Problem — Party room and office ACs, routine service
Team — "No team yet" in blue
Appointment — "Not fixed yet" in blue, small grey second line "Customer asked: Tomorrow Morning"
To collect on site — Nothing
Came from — Call
Sticky footer: primary "Assign team" with people icon.
```

### 14 · Job detail — Assigned, appointment fixed, with updates
```
Screen 14 · same KaamSetu project, same style as Screens 01–13. Add nothing not listed.
Same layout as Screen 13 for "Job #1044" (Meera Joshi, +91 98903 12244 · B-12, Shivtirth Nagar, Karve Nagar).
Badge row: teal-tint badge with calendar icon "2:30 PM".
JOB card rows: Service — Service; AC — Hall · Daikin 1.5 ton / Bedroom · Blue Star 1 ton; Problem — Both ACs smell bad. Hall AC makes noise at night.; Team — Team 3 · Santosh Pawar, small grey "Helper: Akash Shinde"; Appointment — Today, 2:30 PM, small grey "fixed by Santosh at 9:12 AM"; To collect on site — ₹1,400; Came from — Call.
List card "Updates" (17 semibold) with grey "From the team, newest first": teal calendar row "Appointment fixed: Today, 2:30 PM" / "Santosh · 9:12 AM".
Sticky footer row: secondary "Change team or time" and tonal "Call team" with phone icon.
```

### 15 · Job detail — On hold, our side, part requested
```
Screen 15 · same KaamSetu project, same style as Screens 01–14. Add nothing not listed.
Same layout for "Job #1049", Sunita Rao, Aundh.
Badge row: "On hold · our side" (orange).
Orange light card (#FFF1E6, border #F5C7A3): uppercase orange label "ON HOLD · OUR SIDE"; 17 bold "Part needed: Indoor PCB"; grey "The team needs something from you before work can continue."
Card with uppercase label "PARTS ASKED BY TEAM": "1 × Indoor PCB" 16 bold with orange badge "Waiting for you"; small text "Carrier 1.5 ton, model CAI18EK3"; grey "Asked by Ganesh · 17 Nov, 4:30 PM · work stopped"; row of two small buttons: secondary "Ordered from service centre", primary "Part is ready".
Then the customer card and JOB card as in Screen 14 (Team 5 · Ganesh More, Helper: Rahul Jadhav; Problem — Indoor PCB faulty).
Sticky footer row: primary "Reschedule" with calendar icon, tonal "Call team".
```

### 16 · Job detail — Completed, not billed
```
Screen 16 · same KaamSetu project, same style as Screens 01–15. Add nothing not listed.
Same layout for "Job #1043", Rohan Kulkarni, Kothrud. Header has no "More".
Badge row: "Completed" (green) and "Not billed" (blue).
Customer card and JOB card (Service — Repair; AC — Bedroom 1 · Voltas 1.5 ton; Problem — Not cooling, water dripping inside; Team — Team 3 · Santosh Pawar; Appointment — Today · 11:05 AM – 12:20 PM; To collect on site — ₹1,000; Came from — Service centre; Ticket — 24110012345678).
Card "WORK REPORT" with green sync label "Sent" on the right: grey "Found: Low gas · Drain blocked"; bold 14 "Bedroom 1" with soft grey tags "Gas top-up", "Drain pipe cleared", "Filter cleaned"; divider; rows "Gas R32 — 1 kg", "Drain pipe — 2 m"; row of 4 grey photo placeholders labelled "Before", "Before", "After", "After"; soft grey quote box "Outdoor unit stand rusted. Customer may need new stand soon."
Warm card (#FFF8EE, border #F1D3A7): amber uppercase "COLLECTED ON SITE" and bold "₹1,000 · Cash"; grey "With Santosh Pawar · not handed over yet"; small outlined amber button "I received this cash".
Tick-box card: empty square box, bold "Closed in brand portal", grey "Ticket 24110012345678 · tick after closing it in the brand's app".
Dashed add button "+ Book a follow-up visit".
Sticky footer: primary "Create bill" with bill icon.
```

### 17 · Sheet — Job "More" menu
```
Screen 17 · same KaamSetu project, same style as Screens 01–16. Add nothing not listed.
Bottom sheet over the dimmed Screen 14. Title "Job #1044", X close. A list card with four rows, text only:
"Change team or time"
"Put on hold"
"Set amount to collect on site"
"Cancel job" (red text)
```

### 18 · Dialog — Cancel job
```
Screen 18 · same KaamSetu project, same style as Screens 01–17. Add nothing not listed.
Centred dialog over the dimmed Screen 14. Title "Cancel job #1044?". Text: "The team will no longer see it. It stays in history. You can't undo this." Buttons bottom right: text button "Keep job", red filled button "Cancel job".
```

---

## 3. Senior technician

### 19 · My Work
```
Screen 19 · same KaamSetu project, same style as Screens 01–18. Add nothing not listed.
Senior technician home. Bottom nav: technician tabs (My Work · History · Profile, 76 tall), My Work active. Technician screens use bigger text: body 17, cards padding 16, chips 48.
Big header: grey "Wed, 18 Nov · Team 3", title "My Work".
Section heading 18 "Working now". Job card with a 2px amber border: top row "2:30 PM" (20 bold, #0B5F58) and amber badge with tool icon "In Progress"; "Meera Joshi" 19 bold; grey 15 "Karve Nagar · Service · 2 ACs"; large primary button inside the card "Continue · Finish work".
Section heading "Today · 1 more".
Card: "5:00 PM" + purple badge "Appointment not fixed"; "Shreeji Clinic"; "Warje · Gas filling · 1 ACs".
Small grey line: "1 work completed today ·" followed by green "Sent" label.
Collapsed card row: bold "Tomorrow · 2" with a down chevron on the right.
```

### 20 · Technician job detail — appointment not fixed
```
Screen 20 · same KaamSetu project, same style as Screens 01–19. Add nothing not listed.
Technician job page. Header bar: back arrow with text "My Work" on the left; green sync label "Sent" on the right. Bottom nav: technician tabs, My Work active.
Top block: teal 16 bold "Today · 5:00 PM"; "Shreeji Clinic" 26 bold; grey 17 "Gas filling · 1 ACs"; purple badge "Appointment not fixed".
Row of two large tonal buttons (60 tall): "Call" (phone icon), "Directions" (navigate icon).
Card, uppercase label "ADDRESS": 18 text "Shop 4, Mauli Complex, Warje"; grey 15 "Opposite petrol pump".
Warm card (#FFF8EE, border #F1D3A7): amber uppercase "CUSTOMER SAYS"; 18 text in quotes "Cooling low since last week".
Card "ACS · 1": AC icon 28 teal, "Waiting room" 18 bold, grey "Split · Hitachi · 2 ton", grey 14 "Last: Jul".
Sticky footer stacked: large primary (60) "Fix appointment" with calendar icon; secondary (52) "Update status" with refresh icon.
```

### 21 · Technician job detail — ready to start, with money to collect
```
Screen 21 · same KaamSetu project, same style as Screens 01–20. Add nothing not listed.
Same layout as Screen 20 for Meera Joshi: "Today · 2:30 PM", "Meera Joshi", "Service · 2 ACs", teal badge with calendar icon "2:30 PM", small grey "Appointment: Today, 2:30 PM".
Call / Directions buttons. ADDRESS: "B-12, Shivtirth Nagar, Lane 4, Karve Nagar, Pune 411052" / "Near Datta Mandir · Ground floor".
CUSTOMER SAYS: "Both ACs smell bad. Hall AC makes noise at night."
ACS · 2: "Hall" / "Split · Daikin · 1.5 ton" / "Last: Mar 2026 · gas filled"; divider; "Bedroom" / "Window · Blue Star · 1 ton" / "First visit".
Card row: left uppercase "COLLECT FROM CUSTOMER" with grey "Set by owner" under it; right "₹1,400" 24 bold.
Sticky footer: large primary "Start Work" with play icon; secondary "Update status".
```

### 22 · Sheet — Update status (senior)
```
Screen 22 · same KaamSetu project, same style as Screens 01–21. Add nothing not listed.
Bottom sheet over the dimmed Screen 21. Title "Update status", subtitle "Meera Joshi · #1044", X close.
Option rows (64 tall, 1.5px border, radius 12): 44 square tinted icon tile, bold 17 title, grey 14 description, chevron. Grouped under uppercase grey labels:
WORK PROGRESS
- teal calendar "Appointment fixed" / "You spoke to the customer and fixed a time"
- amber play "Started work" / "You are at the site and working"
- green tick "Work completed" / "Fill the short finish page"
PROBLEM
- orange box "Part needed" / "Ask owner to arrange a part"
- grey pause "Customer not ready" / "On hold · customer side"
- orange warning "Can't continue" / "On hold · our side"
OTHER
- blue note "Note for owner" / "Send a remark, no status change"
Centred small grey text with bell icon: "Vijay sees every update straight away".
```

### 23 · Sheet — Appointment fixed
```
Screen 23 · same KaamSetu project, same style as Screens 01–22. Add nothing not listed.
Bottom sheet. Title "Appointment fixed", subtitle "Shreeji Clinic", X close.
Label "Day": chips "Today" (selected), "Tomorrow", "Fri, 20 Nov", "Sat, 21 Nov".
Label "Time": chips "10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM" (selected), "6:00 PM".
Footer: large primary with calendar icon "Save · Today, 4:00 PM".
```

### 24 · Sheet — Part needed
```
Screen 24 · same KaamSetu project, same style as Screens 01–23. Add nothing not listed.
Bottom sheet. Title "Part needed", subtitle "Sunita Rao · Ask owner to arrange a part", X close.
Label "Which part?": chips Capacitor, Indoor PCB, Outdoor PCB, Gas R32, Copper pipe, Fan motor, Remote, "MCB 16A" (selected), Other.
Row: label "How many?" left; stepper right: square "−" button, bold "1", square "+" button (48 each).
Label "Can you continue without it?": two radio rows (60 tall): "Yes, continue" (selected: green tint, green ring), "No, work stopped".
Input with placeholder "Note for owner (optional)".
Footer: large primary with box icon "Ask owner to arrange a part".
```

### 25 · Sheet — Customer not ready
```
Screen 25 · same KaamSetu project, same style as Screens 01–24. Add nothing not listed.
Bottom sheet. Title "Customer not ready", subtitle "Fatima Sayyed · On hold · customer side", X close.
Label "Why?": radio rows (52 tall): "Customer not at home" (selected), "Customer asked to come later", "Customer said no", "Customer not answering", "Payment not ready", "Society did not allow".
Label "New date from customer": chips "Not given", "Tomorrow", "Fri, 20 Nov", "Sat, 22 Nov" (selected).
Footer: large primary with pause icon "Save".
```

### 26 · Sheet — Can't continue
```
Screen 26 · same KaamSetu project, same style as Screens 01–25. Add nothing not listed.
Bottom sheet. Title "Can't continue", subtitle "Sunita Rao · On hold · our side", X close.
Label "Why?": radio rows: "Tool or gas missing", "Need a second person" (selected), "Job bigger than expected", "Ran out of time", "Vehicle problem".
Small grey line: "Part needed?" followed by teal text link "Ask owner to arrange a part".
Footer: large primary with pause icon "Save".
```

### 27 · Sheet — Note for owner
```
Screen 27 · same KaamSetu project, same style as Screens 01–26. Add nothing not listed.
Bottom sheet. Title "Note for owner", subtitle "Meera Joshi", X close.
Textarea with typed text "Outdoor unit on terrace".
Small chips: "+ Reached site", "+ Customer will pay later", "+ Outdoor unit on terrace", "+ Need ladder", "+ Running late, 30 min".
Footer: large primary with send icon "Save".
```

### 28 · Finish work (full page)
```
Screen 28 · same KaamSetu project, same style as Screens 01–27. Add nothing not listed.
Tall scrolling technician form. Header bar: back arrow; title "Finish work" (19 bold) with subtitle "Meera Joshi · 2 ACs"; right grey label with phone icon "Saved on phone". No bottom nav. Gap 26 between steps. Each step heading: small dark navy circle with white number + 18 bold title.
1 "What did you find?" — chips (48 tall): Dirty filter (selected), Bad smell (selected), Noise, Low gas, Water leak, Drain blocked, All OK.
2 "Work done on each AC" — card "Hall · Daikin" with green bold "✓ Done" on the right; chips Service (selected), Wet wash (selected), Gas filled, Drain pipe cleared, Filter cleaned (selected), Fan tightened, PCB repaired, Other. Card "Bedroom · Blue Star" with grey "Not done"; chips Service, Wet wash, Gas filled, Fan cleaned, Other. Text button "+ Customer showed another AC".
3 "Parts used" with small grey "if any" — dashed add button "+ Add part".
4 "Photos" with small grey "owner asks for 2" — 3-column grid: two grey photo tiles labelled "Before" and "After", then a teal-tint tile with camera icon "Add photo"; small green bold "✓ 2 of 2".
5 "Note for owner" with grey "optional" — textarea; small chips "+ Stand rusted", "+ Needs new part", "+ Customer happy".
6 "Money from customer" — card: grey "Collect from customer" and "₹1,400" 22 bold; three equal chips "Cash" (selected), "UPI", "Not paid"; amount input "₹ 1,400" with grey "received".
7 "Result" — radio rows (60 tall): "Work completed" (selected, green), "Needs another visit", "Could not finish".
Sticky footer: large primary with tick icon "Finish Work".
```

### 29 · Sheet — Add part
```
Screen 29 · same KaamSetu project, same style as Screens 01–28. Add nothing not listed.
Bottom sheet over the dimmed Screen 28. Title "Add part", X close. List card, each row bold name, grey unit, teal plus icon on the right:
Gas R32 / kg · Drain pipe / m · Copper pipe / m · Capacitor / pc · Remote / pc · PCB / pc · Stand / pc
```

### 30 · Work completed (confirmation)
```
Screen 30 · same KaamSetu project, same style as Screens 01–29. Add nothing not listed.
Full-screen technician confirmation, no header, no bottom nav, content centred near the top.
96 round green-tint circle with a big green tick. "Work completed" 28 bold. Grey 18: "Meera Joshi · 2 ACs" and on a new line "₹1,400 Cash received".
White card (padding 18): row with small green-tint circle tick + "Saved on this phone. It is safe." ("Saved on this phone." in bold); row with small grey circle wifi-off icon + grey "Waiting for internet to send to owner". Grey 15 line: "It will send by itself when internet comes back. You don't need to do anything."
Sticky footer: large primary "Next job"; secondary "Back to My Work".
```

### 31 · History
```
Screen 31 · same KaamSetu project, same style as Screens 01–30. Add nothing not listed.
Technician History tab. Bottom nav: technician tabs, History active. Big header title "History".
Cards: top row teal bold date left, sync label right; customer 18 bold; grey 15 "area · service · ACs":
- "Today" / red "Needs attention" with warning icon / "Rohan Kulkarni" / "Kothrud · Repair · 1 ACs" / red filled small button "Try again"
- "14 Nov" / green "Sent" / "Meera Joshi" / "Karve Nagar · Gas filling · 1 ACs"
- "12 Nov" / green "Sent" / "Anil Deshpande" / "Baner · Installation · 0 ACs"
```

### 32 · Profile (technician)
```
Screen 32 · same KaamSetu project, same style as Screens 01–31. Add nothing not listed.
Technician Profile tab. Bottom nav: technician tabs, Profile active. Big header title "Profile".
Card: avatar "SP" (56), "Santosh Pawar" 19 bold, grey "Team 3 · Senior technician".
List card: row with language icon tile "Language" / "English" / chevron; row with phone icon tile "Call owner" / "Vijay" / chevron.
Danger outline button with log-out icon "Log out".
Centred small grey "KaamSetu 1.0 · Cool Care AC Services".
```

---

## 4. Owner — billing

### 33 · Billing tab
```
Screen 33 · same KaamSetu project, same style as Screens 01–32. Add nothing not listed.
Owner Billing tab. Bottom nav: owner tabs, Billing active. Big header title "Billing".
Card in a row: left grey "To collect" and "₹12,304" 28 bold; right amber bold "₹1,000" and grey "cash with teams".
List card titled "Ready to bill · 1" (16 semibold) with grey "Completed jobs with no bill": row "Rohan Kulkarni" / "#1043 · Repair · Today" / small tonal button "Create bill".
List card titled "Cash with teams" with grey "Mark when it is handed to you": row "₹1,000 · Santosh Pawar" / "Rohan Kulkarni · #1043" / chevron.
Segmented tabs: "To collect" (selected) | "All bills" | "Quotations".
List card of bills (name bold, grey "number · date · GST", right side amount bold with badge under it):
- Hotel Annapurna / "KS-0083 · 18 Nov 2026 · GST" / ₹4,248 / ○ Not paid (red)
- Anil Deshpande / "KS-0086 · 12 Nov 2026" / ₹3,100 / ◐ Partly paid (amber)
- Shreeji Clinic / "KS-0085 · 31 Oct 2026 · GST" / ₹4,956 / ○ Not paid
```

### 34 · New bill
```
Screen 34 · same KaamSetu project, same style as Screens 01–33. Add nothing not listed.
Header bar: X close, title "New bill", subtitle "Rohan Kulkarni · Job #1043". No bottom nav.
Teal-tint info box with tick icon: "Filled from the work report and your rate list. Check and change if needed."
List card with header row uppercase "ITEMS" left and "AMOUNT" right. Each item: first line editable item name (16 semibold) and amount bold on the right; second line small quantity input, grey "×", rate input with "₹", a small teal-tint tag, and a red X remove icon:
- "AC repair visit" ₹500 / qty 1 × ₹500 / tag "Rate list"
- "Gas top-up R32" ₹2,200 / qty 1 kg × ₹2,200 / tag "Report"
- "Drain pipe" ₹150 / qty 2 m × ₹75 / tag "Report"
Bottom row of the card: two dashed buttons "+ Add item" and "+ Discount".
Totals card: "Subtotal — ₹2,850"; divider; row bold "GST bill" with grey "Off for Rohan (customer default)" and a toggle (off); grey small "Turn on to add GST per item. GST bills use their own number series."; "Bill total — ₹2,850" 18 bold; green row "Received on site · Cash — − ₹1,000"; "Remaining — ₹1,850" 20 bold amber.
Card row: bold "Bill date" with grey "Number given when saved"; right bold "18 Nov 2026".
Sticky footer: primary with WhatsApp icon "Save & send on WhatsApp"; text button "Save only".
```

### 35 · New bill — GST on (variant)
```
Screen 35 · same KaamSetu project, same style as Screens 01–34. Add nothing not listed.
Same as Screen 34 for "Hotel Annapurna · Job #1050", one item "Deep cleaning, cassette AC" qty 2 × ₹1,800 = ₹3,600 with a soft grey tag "GST 18%" instead of the source tag.
In the totals card the "GST bill" toggle is ON with grey "On for Hotel (customer default)"; below it rows "CGST 9% — ₹324" and "SGST 9% — ₹324"; small grey "Your GSTIN 27ABCDE1234F1Z5 · Customer 27AACHA4410K1Z3"; "Bill total — ₹4,248"; "Remaining — ₹4,248".
Footer same as Screen 34.
```

### 36 · Sheet — Add item
```
Screen 36 · same KaamSetu project, same style as Screens 01–35. Add nothing not listed.
Bottom sheet over the dimmed Screen 34. Title "Add item", X close. List card rows: bold name, grey unit, bold price on the right:
Split AC service / per job / ₹600 · Window AC service / per job / ₹500 · AC repair visit / per job / ₹500 · Deep cleaning, split AC / per job / ₹900 · Gas top-up R32 / per kg / ₹2,200 · Drain pipe / per m / ₹75 · Copper pipe / per m / ₹450 · Installation, split AC / per job / ₹1,800 · Uninstallation / per job / ₹800 · Capacitor / per job / ₹450
Last row in teal with plus icon: "Something else".
```

### 37 · Sheet — Discount
```
Screen 37 · same KaamSetu project, same style as Screens 01–36. Add nothing not listed.
Bottom sheet. Title "Discount", X close. Amount input "₹ 100". Chips "₹50", "₹100", "₹200", "₹500". Footer primary "Apply discount".
```

### 38 · Bill detail
```
Screen 38 · same KaamSetu project, same style as Screens 01–37. Add nothing not listed.
Header bar: back arrow, title "Bill KS-0086", subtitle "12 Nov 2026 · Job #1036", right "More" with dots icon. No bottom nav.
Summary card: "Anil Deshpande" 17 semibold with badge "◐ Partly paid" (amber); grey "Remaining"; "₹3,100" 34 bold; green progress bar (10 tall) about half filled; two columns: grey "Bill total" / "₹6,100" bold, grey "Received" / "₹3,000" bold green; row of two tonal buttons "Send bill" (WhatsApp icon) and "Send reminder".
Card "PAYMENTS · 1": row with green-tint cash icon tile, "Cash", grey "12 Nov · by Owner", "₹3,000" bold right.
Card "ITEMS": "Installation, split AC · 2 × ₹1,800 — ₹3,600"; "Copper pipe · 6 m × ₹450 — ₹2,700"; "Discount — − ₹200"; divider; bold "Bill total — ₹6,100".
Centred small grey: "A saved bill can't be edited. Use More › Cancel bill and make a new one."
Sticky footer: primary with plus icon "Record payment".
```

### 39 · Sheet — Record payment
```
Screen 39 · same KaamSetu project, same style as Screens 01–38. Add nothing not listed.
Bottom sheet over the dimmed Screen 38. Title "Record payment", subtitle "Anil Deshpande · KS-0086", X close.
Paper-coloured box with 3 columns: grey "Bill total" / "₹6,100"; grey "Received" / green "₹3,000"; grey "Remaining" / amber "₹3,100".
Label "Amount received now"; tall amount input "₹ 3,100"; small chips "Full ₹3,100" (selected), "₹1,550", "₹500".
Label "How was it paid?"; 4 tiles in a row, 72 tall, icon above label: "Cash" (selected), "UPI", "Bank", "Other".
Row: bold "Date" left, teal bold "Today, 18 Nov" right.
Input with placeholder "Note (optional)".
Footer primary: "Save payment · ₹3,100 Cash".
```

### 40 · Sheet — Bill "More" + Dialog — Cancel bill
```
Screen 40 · same KaamSetu project, same style as Screens 01–39. Add nothing not listed.
Two frames side by side.
Frame A: bottom sheet over the dimmed Screen 38, title "Bill KS-0086", X close, list rows "Download PDF" and "Cancel bill" (red).
Frame B: centred dialog over the dimmed Screen 38. Title "Cancel bill KS-0086?". Text: "The bill stays in records as Cancelled. Payments already received stay with the customer. You can't undo this." Buttons: text "Keep bill", red filled "Cancel bill".
```

### 41 · New quotation
```
Screen 41 · same KaamSetu project, same style as Screens 01–40. Add nothing not listed.
Same editor as Screen 34 with header title "New quotation", subtitle "Fatima Sayyed".
Teal-tint info box with bill icon: "Price for the customer before the work. It is not a bill; you can turn it into a bill later."
Items: "AMC visit, split AC" qty 3 × ₹2,100 = ₹6,300.
Totals: Subtotal ₹6,300; GST bill toggle off; Bill total ₹6,300. No "Received" or "Remaining" rows.
Sticky footer: one primary with WhatsApp icon "Save & send quotation".
```

### 42 · Quotation detail + Quotations list
```
Screen 42 · same KaamSetu project, same style as Screens 01–41. Add nothing not listed.
Two frames side by side.
Frame A: Billing tab (as Screen 33) with "Quotations" segment selected, list card row: "Fatima Sayyed" / "Q-031 · 18 Nov 2026" / right "₹6,300" with blue badge "Sent".
Frame B: Header bar back arrow, title "Quotation Q-031", subtitle "18 Nov 2026". Card: "Fatima Sayyed" with blue badge "Sent"; "₹6,300" 34 bold; tonal button with WhatsApp icon "Send quotation". Card "ITEMS": "AMC visit, split AC · 3 × ₹2,100 — ₹6,300"; divider; bold "Total — ₹6,300". Sticky footer primary with bill icon "Turn into bill".
```

---

## 5. Owner — customers and ACs

### 43 · Customers tab
```
Screen 43 · same KaamSetu project, same style as Screens 01–42. Add nothing not listed.
Owner Customers tab. Bottom nav: owner tabs, Customers active. Big header "Customers" with small primary button "+ Add".
Pill search input "Phone or name".
List card rows (avatar initials, bold name, grey "phone · area · N ACs", optional amber bold amount on the right):
RK Rohan Kulkarni / +91 98220 45117 · Kothrud · 5 ACs
MJ Meera Joshi / +91 98903 12244 · Karve Nagar · 2 ACs
SC Shreeji Clinic / +91 97630 11890 · Warje · 1 AC / ₹4,956
AD Anil Deshpande / +91 90114 56723 · Baner · 0 ACs / ₹3,100
FS Fatima Sayyed / +91 95450 98712 · NIBM Road · 3 ACs
HA Hotel Annapurna / +91 98223 00456 · Deccan · 4 ACs / ₹4,248
```

### 44 · Customer detail
```
Screen 44 · same KaamSetu project, same style as Screens 01–43. Add nothing not listed.
Header bar: back arrow, title "Customer", right teal text "Edit". No bottom nav.
White top panel (full width, bottom border): "Rohan Kulkarni" 24 bold; grey 15 "+91 98220 45117 · since 2024"; small grey semibold "Bills without GST"; row of three buttons: tonal "Call", tonal "WhatsApp", primary "+ New job".
List card for the first address: uppercase grey "HOME", bold "Flat 304, Karishma Society, Kothrud", grey "Near Karishma Chowk", small tonal "Map" button on the right. AC rows with teal AC icon tile and chevron: "Bedroom 1" / "Split · Voltas 1.5 ton · last 18 Nov"; "Hall" / "Split · LG 2 ton · last 12 Aug". Last row teal with plus icon "Add AC here".
List card "OFFICE": "2nd floor, Pride Icon, Baner"; AC rows "Cabin" / "Split · Daikin 1.5 ton · last Mar"; "Work area 1" / "Cassette · Blue Star 2 ton · last Mar"; "Add AC here".
Dashed button "+ Add another address".
List card header "Service history" (17 semibold) with grey "2 jobs" right. Rows: left column bold "Today" with grey "#1043", middle "Repair · Bedroom 1" with grey "Gas top-up, Drain pipe cleared", right Completed badge; "Tomorrow" "#1051" "Deep cleaning · Hall" "Yearly cleaning" Assigned badge.
```

### 45 · Add customer
```
Screen 45 · same KaamSetu project, same style as Screens 01–44. Add nothing not listed.
Header bar: X close, title "Add customer". No bottom nav.
Label "Customer type": chips "Home" (selected), "Business".
Label "Name": input placeholder "e.g. Rohan Kulkarni".
Label "Mobile number": +91 input with typed "9890312244"; amber warning box below: "This number belongs to Meera Joshi." followed by teal underlined bold link "Open customer".
Label "Address": textarea placeholder "Flat / house, society, area".
Label "Landmark" with hint "Optional": input placeholder "Near…".
Card row: bold "Give GST bills" with grey "Default for this customer. Can change per bill." and a toggle (off).
Small grey: "You can add ACs after saving."
Sticky footer primary "Save customer".
```

### 46 · AC detail
```
Screen 46 · same KaamSetu project, same style as Screens 01–45. Add nothing not listed.
Header bar: back arrow, title "Hall", subtitle "Meera Joshi". No bottom nav.
Card: 56 square AC icon tile, "Daikin Split" 18 bold, grey "1.5 ton"; rows "Model — Not added" (grey), "Serial no. — Not added", "Gas — R32", "Warranty — Not added".
List card "Visits for this AC": "14 Nov · Gas filling" / "Gas filled" / Completed badge; "Today · Service" / "Both ACs smell bad. Hall AC makes noise at night." / Assigned badge.
Sticky footer primary with plus icon "New job for this AC".
```

### 47 · Add AC
```
Screen 47 · same KaamSetu project, same style as Screens 01–46. Add nothing not listed.
Header bar: X close, title "Add AC", subtitle "Meera Joshi · Home". No bottom nav.
Label "Room or place": input placeholder "e.g. Bedroom 2"; small chips "Hall", "Bedroom", "Kitchen", "Office", "Shop".
Label "Type": chips "Split" (selected), "Window", "Cassette", "Tower", "Ductable".
Label "Brand": chips Voltas, LG, Daikin, Blue Star, Samsung, Lloyd, Carrier, Hitachi, Other.
Label "Capacity": chips "1 ton", "1.5 ton" (selected), "2 ton", "3 ton", "Not sure".
Chip-style button: "+ More details (model, serial, warranty)".
Sticky footer primary "Save AC".
```

---

## 6. Helper

### 48 · Helper — Today's work
```
Screen 48 · same KaamSetu project, same style as Screens 01–47. Add nothing not listed.
Helper home. NO bottom navigation. Technician-size text.
Big header: grey "Wed, 18 Nov", title "Today's work"; right a round outlined button with user icon and label "Me".
Card: avatar "SP" (48), grey small "Team 3 · your senior", "Santosh Pawar" 18 bold, tonal small button "Call" on the right.
Current job card with 2px amber border (padding 16): uppercase amber "WORKING NOW" left and amber badge "In Progress" right; "Karve Nagar" 22 bold; row: "Meera Joshi" 17 semibold and small tonal "Call"; 17 text "B-12, Shivtirth Nagar, Lane 4, Karve Nagar, Pune 411052 · Near Datta Mandir · Ground floor"; divider; row with teal AC icon "Service · 2 ACs (Hall, Bedroom)"; row with teal drop icon "Carry: Jet pump, wash cover"; large primary (60) with refresh icon "Update status"; large tonal (60) with camera icon "Add photo".
Card (padding 16): uppercase "NEXT JOB" left and teal bold "5:00 PM" right; "Warje" 19 semibold; grey "Gas filling · 1 ACs".
Centred grey 15: "Your senior fills in the job report. You don't need to fill anything."
```

### 49 · Helper — Update status sheet
```
Screen 49 · same KaamSetu project, same style as Screens 01–48. Add nothing not listed.
Same sheet as Screen 22 over the dimmed Screen 48, but WITHOUT "Work completed" and, because the job is already in progress, without "Appointment fixed" and "Started work". So it shows only:
PROBLEM: Part needed / Customer not ready / Can't continue
OTHER: Note for owner
Same footer note with bell icon: "Vijay sees every update straight away".
```

### 50 · Helper — Me
```
Screen 50 · same KaamSetu project, same style as Screens 01–49. Add nothing not listed.
Same as Screen 32 but with a header bar (back arrow, title "Profile") and no bottom navigation. Card: avatar "AS", "Akash Shinde", grey "Team 3 · Helper". Rows "Language / English" and "Call owner / Vijay". Danger outline "Log out". Grey "KaamSetu 1.0 · Cool Care AC Services".
```

---

## 7. Sign-in and setup

### 51 · Splash / welcome
```
Screen 51 · same KaamSetu project, same style as Screens 01–50. Add nothing not listed.
Full-screen teal #0F766E background, white content centred. 84 white rounded square (radius 22) with a teal outline icon of a simple bridge (an arch with three short pillars). "KaamSetu" 32 bold white. "कामसेतु" 20 semibold white. Two lines 17 white at 90% opacity: "काम आसान। हिसाब आसान।" / "कारोबार आसान।". Below, a white button with teal text "Get started" (220 wide). Under it a text button in white "I already use KaamSetu". Note: this logo is a placeholder, not final.
```

### 52 · Intro slides (3 frames)
```
Screen 52 · same KaamSetu project, same style as Screens 01–51. Add nothing not listed.
Three frames side by side, same layout. Paper background. Top right teal text button "Skip". Centre: 148 square teal-tint tile (radius 40) with a large teal outline icon; small teal semibold "1 of 3"; title 28 bold; grey 17 text (max 320 wide); grey 16 Devanagari line. Bottom: page dots (current dot is a 24-wide teal pill, others small grey dots), then buttons.
Frame 1: inbox icon. "Every enquiry in one place". "Save each WhatsApp message or call as an enquiry. Turn it into a job with one tap. Nothing gets lost in chats." "हर पूछताछ एक जगह". Button: primary "Next".
Frame 2: team icon, "2 of 3". "Every team knows its work". "Give a job to a team. The senior technician sees the address, the problem and the AC, and can work even without internet." "हर टीम को अपना काम पता". Buttons: secondary "Back", primary "Next".
Frame 3: bill icon, "3 of 3". "Bills and payments made easy". "The bill fills itself from the work done. Record cash or UPI and always know who still has to pay." "बिल और पैसे का हिसाब आसान". Buttons: secondary "Back", primary "[Button text to be decided]".
```

### 53 · Log in (Google)
```
Screen 53 · same KaamSetu project, same style as Screens 01–52. Add nothing not listed.
Header bar title "Log in" (no back). Paper background.
Heading 26 bold "Log in". Primary button full width with a simple "G" letter mark on the left: "Continue with Google". Grey 15 text under it: "Use the Google account on this phone. No password or SMS needed."
Label "Language": chips "English" (selected), "हिंदी", "मराठी".
Do not add phone number fields, email fields, password fields or other sign-in options.
```

### 54 · Join your business (staff)
```
Screen 54 · same KaamSetu project, same style as Screens 01–53. Add nothing not listed.
Two frames side by side.
Frame A: Header bar title "Join your business". Grey "Signed in as santosh.pawar@gmail.com". 17 text: "Ask the owner to open More › Employees, tap your name and show the QR code." Large primary with QR icon "Scan QR code". Text button "Enter code instead". Small grey at the bottom: "Starting your own business in KaamSetu is coming soon."
Frame B (after "Enter code instead"): same header and signed-in line. Label "Your mobile number" with +91 input. Label "6-digit code from the owner": six separate boxes (52 x 60, radius 12) showing 4 8 2 9 1 3, last box with teal border. Sticky footer primary "Join".
```

### 55 · Scan QR
```
Screen 55 · same KaamSetu project, same style as Screens 01–54. Add nothing not listed.
Two frames.
Frame A: Header bar back arrow, title "Scan QR code". Dark camera view filling the body with a rounded square teal viewfinder frame in the middle. White text on a dark strip at the bottom: "Point the camera at the QR code on the owner's phone."
Frame B (no permission): same header, paper background, centred camera icon, text "KaamSetu needs the camera to scan the QR code.", primary button "Allow camera".
```

### 56 · Setup step 1 — Your business
```
Screen 56 · same KaamSetu project, same style as Screens 01–55. Add nothing not listed.
Header bar (no back): title "Your business", subtitle "Step 1 of 3".
Label "Business name": input placeholder "e.g. Cool Care AC Services".
Label "Your name": input placeholder "Owner name".
Label "City": input with "Pune".
Card row: bold "We give GST bills" with grey "You can still turn GST off for any bill" and a toggle (ON).
Label "GSTIN" with hint "optional now": input placeholder "27ABCDE1234F1Z5".
Card row: bold "I also go on jobs" with grey "Adds your own jobs to Home" and a toggle (off).
Sticky footer primary "Next".
```

### 57 · Setup step 2 — First team
```
Screen 57 · same KaamSetu project, same style as Screens 01–56. Add nothing not listed.
Header bar: back arrow, title "Add your first team", subtitle "Step 2 of 3".
Teal-tint info box with team icon: "A team is one senior technician and their helper. Jobs are given to teams. You can add more teams later."
Label "Senior technician name": input placeholder "e.g. Santosh Pawar".
Label "Senior's mobile": +91 input; small grey line under it "[Login hint — wording to be decided]".
Label "Helper name" with hint "optional": input placeholder "e.g. Akash Shinde".
Card row: bold "Helper uses the app" with grey "Off: helper works on the senior's phone" and a toggle (off).
Sticky footer row: text button "Skip for now", primary "Save team".
```

### 58 · Setup step 3 — All set
```
Screen 58 · same KaamSetu project, same style as Screens 01–57. Add nothing not listed.
Header bar (no back): title "All set", subtitle "Step 3 of 3". Content centred, top padding 48.
88 round green-tint circle with a big green tick. "Cool Care AC Services is ready" 26 bold. Grey 16 line: "[Text to be decided]".
Card (left-aligned): uppercase "NEXT"; "1. Add your next enquiry or job when a customer calls."; "2. Add your rate list so bills fill in by themselves."
Sticky footer primary "Go to Home".
```

---

## 8. Owner — More and settings

### 59 · More tab
```
Screen 59 · same KaamSetu project, same style as Screens 01–58. Add nothing not listed.
Owner More tab. Bottom nav: owner tabs, More active. Big header "More".
Card row: avatar "CC" (52), bold 17 "Cool Care AC Services", grey "Vijay · Owner · Pune".
List card, each row: teal icon tile, bold title, grey subtitle, chevron:
Teams / 6 teams · Employees / 12 people · Rate list / 10 items · Business details / Name, address, GSTIN · Bill settings / GST, bill number, terms · Photo rules / Ask for 2 photos per job · Language / English · Plan & payment / Trial · 23 days left · Help / Call or WhatsApp support
Danger outline button with log-out icon "Log out".
```

### 60 · Teams
```
Screen 60 · same KaamSetu project, same style as Screens 01–59. Add nothing not listed.
Header bar: back arrow, title "Teams", right teal "+ Add". No bottom nav.
Team cards: bold 17 name with a badge on the right, then "Name · senior" and "Name · helper" lines (role words in grey):
Team 1 / "2 jobs today" / Imran Shaikh · senior / Vikas Gaikwad · helper
Team 2 (card with soft grey fill) / grey badge "On leave today" / Prakash Deshmukh · senior / Sunil More · helper
Team 3 / "3 jobs today" / Santosh Pawar · senior / Akash Shinde · helper
Team 4 / "1 job today" / Nitin Kale · senior / Rohit Lonkar · helper
```

### 61 · Team detail
```
Screen 61 · same KaamSetu project, same style as Screens 01–60. Add nothing not listed.
Header bar: back arrow, title "Team 3". No bottom nav.
List card: avatar "SP", "Santosh Pawar", grey "Senior technician · uses the app", small tonal "Call"; avatar "AS" (soft grey), "Akash Shinde", grey "Helper · uses the app".
Card row: bold "On leave today" with grey "Team is hidden when assigning" and a toggle (off).
Secondary button "Change members".
Section heading "Today and tomorrow". Owner-style job cards: "#1044 · Today, 2:30 PM" Meera Joshi; "#1045 · Today, 5:00 PM" Shreeji Clinic; "#1051 · Tomorrow, 10:00 AM" Rohan Kulkarni.
```

### 62 · Add team
```
Screen 62 · same KaamSetu project, same style as Screens 01–61. Add nothing not listed.
Header bar: X close, title "Add team".
Label "Team name": input "Team 7".
Label "Senior technician": chips "Imran Shaikh", "Prakash Deshmukh", "Santosh Pawar", "+ New person".
Label "Helper" with hint "Optional": chip "+ New person".
Sticky footer primary "Save team".
```

### 63 · Employees
```
Screen 63 · same KaamSetu project, same style as Screens 01–62. Add nothing not listed.
Header bar: back arrow, title "Employees", right teal "+ Add". No bottom nav.
List card rows: avatar initials (helpers on soft grey), bold name, grey "role · team", right small semibold login state ("Joined" in teal, "Not joined yet" in grey), chevron:
Imran Shaikh / Senior technician · Team 1 / Joined
Vikas Gaikwad / Helper · Team 1 / Not joined yet
Santosh Pawar / Senior technician · Team 3 / Joined
Akash Shinde / Helper · Team 3 / Joined
Nitin Kale / Senior technician · Team 4 / Not joined yet
```

### 64 · Add employee
```
Screen 64 · same KaamSetu project, same style as Screens 01–63. Add nothing not listed.
Header bar: X close, title "Add employee".
Label "Name": input.
Label "Role": chips "Senior technician", "Helper" (selected).
Label "Team": chips Team 1 … Team 6 (Team 3 selected).
Card row: bold "Uses the app" with grey "Off: helper works on the senior's phone, still shown on jobs" and a toggle (ON).
Label "Mobile number": +91 input.
Sticky footer primary "Save".
```

### 65 · Employee detail — invite QR
```
Screen 65 · same KaamSetu project, same style as Screens 01–64. Add nothing not listed.
Header bar: back arrow, title "Akash Shinde", subtitle "Helper · Team 3". No bottom nav.
Card: grey "Not joined yet"; large primary with QR icon "Show invite QR".
Card (the invite, shown after tapping): a large square QR code centred; 15 text "Ask Akash Shinde to sign in with Google in KaamSetu and scan this code. It works once, until 19 Nov, 6:30 PM."; grey "Or they type their mobile number and this code:"; big spaced code "482 913" 28 bold; text button "Make a new code".
Danger outline button "Reset login".
```

### 66 · Dialog — Reset login
```
Screen 66 · same KaamSetu project, same style as Screens 01–65. Add nothing not listed.
Centred dialog over the dimmed Screen 65. Title "Reset login?". Text: "Akash Shinde will be logged out on all phones and must join again with a new code." Buttons: text "Cancel", red filled "Reset login".
```

### 67 · Rate list
```
Screen 67 · same KaamSetu project, same style as Screens 01–66. Add nothing not listed.
Header bar: back arrow, title "Rate list", right teal "+ Add".
Teal-tint info box with bill icon: "Bills fill these prices in for you. You can still change a price on any bill."
List card rows (bold name, grey unit, bold price right): Split AC service / per job / ₹600 · Window AC service / per job / ₹500 · AC repair visit / per job / ₹500 · Deep cleaning, split AC / per job / ₹900 · Gas top-up R32 / per kg / ₹2,200 · Drain pipe / per m / ₹75 · Copper pipe / per m / ₹450 · Installation, split AC / per job / ₹1,800 · Uninstallation / per job / ₹800 · Capacitor / per job / ₹450
```

### 68 · Business details
```
Screen 68 · same KaamSetu project, same style as Screens 01–67. Add nothing not listed.
Header bar: back arrow, title "Business details".
Card rows: Name — Cool Care AC Services; Phone — +91 98900 11223; City — Pune; GSTIN — 27ABCDE1234F1Z5; Logo — Not added (grey).
Secondary button "Edit details".
```

### 69 · Bill settings
```
Screen 69 · same KaamSetu project, same style as Screens 01–68. Add nothing not listed.
Header bar: back arrow, title "Bill settings".
Card row: bold "GST on by default" with grey "For new customers. Each customer and bill can differ." and a toggle (off).
Card rows: Your GSTIN — 27ABCDE1234F1Z5; GST rate — 18% (CGST 9% + SGST 9%); GST bill numbers — KS-G-0001…; Other bill numbers — KS-0001…; Bill language — English; Terms on bill — Service warranty 30 days.
Small grey: "Check bill numbering with your CA before going live."
```

### 70 · Photo rules
```
Screen 70 · same KaamSetu project, same style as Screens 01–69. Add nothing not listed.
Header bar: back arrow, title "Photo rules".
Card: label "Photos to ask for on each job"; chips "None", "1 photos", "2 photos" (selected), "4 photos"; grey "The technician can still finish without them, but you will see \"Photos missing\"."
Card row: bold "Helpers can add photos" with grey "Only helpers who use the app" and a toggle (ON).
```

### 71 · Language
```
Screen 71 · same KaamSetu project, same style as Screens 01–70. Add nothing not listed.
Header bar: back arrow, title "Language".
Grey text: "Only changes your own app. Customer names and notes stay as typed."
List card rows: "English" 18 bold / grey "English" / teal tick on the right; "हिंदी" / "Hindi"; "मराठी" / "Marathi".
```

### 72 · Plan & payment
```
Screen 72 · same KaamSetu project, same style as Screens 01–71. Add nothing not listed.
Header bar: back arrow, title "Plan & payment".
Card: uppercase "FREE TRIAL"; "23 days left" 24 bold; grey "All features. No card needed now."
Card: bold 17 "Business plan"; grey "Up to 10 teams · unlimited jobs and bills"; 22 bold "[YOUR PRICE] / month"; small grey "Pay by UPI or card. Your data stays safe if you stop; the app becomes view-only."
Sticky footer primary "Choose plan".
```

### 73 · Help
```
Screen 73 · same KaamSetu project, same style as Screens 01–72. Add nothing not listed.
Header bar: back arrow, title "Help".
Card: bold 17 "KaamSetu support"; grey "Mon–Sat, 9 AM – 7 PM"; row of tonal buttons "Call" (phone icon) and "WhatsApp".
```

### 74 · Dialog — Log out
```
Screen 74 · same KaamSetu project, same style as Screens 01–73. Add nothing not listed.
Two frames, centred dialogs over a dimmed Profile screen (Screen 32).
Frame A: title "Log out?"; text "[Text to be decided]"; buttons text "Stay", red filled "Log out".
Frame B (unsent work): title "Log out?"; text "3 saved changes have not reached the owner yet. If you log out now, they will be lost."; buttons text "Cancel", red filled "Log out".
```

---

## 9. State variants (do after the main screens)

### 75 · Owner Home — offline
```
Screen 75 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 02 exactly and add, directly under the header, the offline bar (grey-blue #ECEEF2, wifi-off icon): "No internet. Enquiries, jobs and customers save on this phone and send later. Bills and payments need internet." ("No internet." in bold). Change nothing else.
```

### 76 · Job detail — created offline
```
Screen 76 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 13 with the offline bar under the header, and an amber warning box above the customer card with a phone icon: "Saved on your phone. The team gets this job when your phone is back online." ("Saved on your phone." in bold). Header title shows "Job [number given when online]". Change nothing else.
```

### 77 · New bill — offline
```
Screen 77 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 34. Add the offline bar under the header. Above the footer add an amber box: "Bills need internet so bill numbers never repeat. Your draft is kept on this phone." ("Bills need internet" in bold). Both footer buttons are in the disabled style.
```

### 78 · Bill detail — offline
```
Screen 78 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 38 with the offline bar. Footer button disabled style with text "Needs internet to record payment".
```

### 79 · My Work — offline, with unsent work
```
Screen 79 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 19. Add the offline bar under the header: "No internet. Keep working. All saved on phone." ("No internet." bold). On the working-now card add the grey sync label with phone icon "Saved on phone". Change nothing else.
```

### 80 · Empty states (6 frames)
```
Screen 80 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Six small frames, each the named screen with its list replaced by the dashed empty-state box (teal icon, bold title, grey line, optional button):
1. My Work (Screen 19): "No jobs today" / "New jobs from the owner appear here." / tonal button with phone icon "Call owner".
2. Jobs list (Screen 05): "No jobs here" / "Try another filter."
3. Enquiries (Screen 06): "No open enquiries" / "Save an enquiry when a customer asks but has not booked."
4. Customers (Screen 43) with search "xyz": "No customer found" / "Check the spelling, or add them." / primary small "+ Add as new customer".
5. Billing To collect (Screen 33): "Nothing to collect" / "All bills are paid."
6. Quotations (Screen 42A): "No quotations yet" / "Make one from an enquiry, for big jobs like installation or AMC."
```

### 81 · Form errors
```
Screen 81 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 08 after tapping "Create job & assign" with nothing filled: the Customer field has a 2px red border and red text "Choose or add the customer"; the Service chips have red text below "Choose the service". Everything else unchanged.
```

### 82 · Toasts
```
Screen 82 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Three frames showing the dark toast above the bottom nav:
1. Over Screen 05: "Job #1054 assigned to Team 4 · Nitin will see it now".
2. Over Screen 38: "Payment saved · ₹3,100" with teal-light "Undo" on the right.
3. Over Screen 21 (technician): "Saved. Owner will see it when internet comes back."
```

### 83 · Language check — technician in Marathi
```
Screen 83 · same KaamSetu project, same style as all screens before. Add nothing not listed.
Copy Screen 21 and switch all interface labels to Marathi using Noto Sans Devanagari, keeping customer data in English. Use exactly: "काम सुरू करा" (Start Work), "कॉल करा" (Call), "रस्ता पहा" (Directions), "पत्ता" (Address), "ग्राहक म्हणतात" (Customer says), "एसी" (ACs), "ग्राहकाकडून घ्यायचे" (Collect from customer), "मालकाने ठरवले" (Set by owner), bottom nav "माझे काम", "जुनी कामे", "प्रोफाइल". Make sure nothing is cut off.
```

---

## 10. Do not make in Stitch (decisions still open or not in the first release)

Don't prompt for these. If Stitch offers them, say no.
- Desktop / tablet / web versions.
- AMC contracts, Expenses, Reports, Attendance/salary, Customer merge.
- Dark mode, charts on Home, notification centre, chat.
- Bill/quotation PDF layout (waits for GST answers).
- Loading-state and full-screen error designs: not decided yet. If you want to explore them, label them "proposal" in Stitch.
- Owner "reject cash collection" screen: not designed yet.
- Phone + SMS code login screens (D-025 replaced them).

---

## 11. If Stitch adds things anyway

Use these edit prompts as replies:
- `Remove everything I did not list in my prompt. Keep only the listed sections, in the same order.`
- `Use my text exactly as I wrote it. Do not rename or add labels.`
- `Re-apply the KaamSetu base style: cards white with 1px #E4E0D6 border and no shadow, primary teal #0F766E, background #F7F5F0, Noto Sans.`
- `Make this screen match Screen 05 exactly: same header, cards, badges and bottom nav.`
- `Remove the chart/illustration/image. Use only the listed cards.`
- `There must be only one filled teal button on this screen: "<label>". Make the others secondary or tonal.`
- `Bottom nav must be exactly: Home · Jobs · Customers · Billing · More, with "<tab>" active.`
- `Technician screens: make body text 17–18, main buttons 60 tall, chips 48 tall.`

---

## 12. Checklist

| # | Screen | Done |
|---|---|---|
| 01 | Component sheet | ☐ |
| 02–18 | Owner home, updates, search, jobs, enquiries, new job, sheets, job detail states, cancel | ☐ |
| 19–32 | Technician: My Work, job detail, status sheets, finish, confirmation, history, profile | ☐ |
| 33–42 | Billing, bill editor, item/discount sheets, bill detail, payment, cancel, quotations | ☐ |
| 43–47 | Customers, customer detail, add customer, AC detail, add AC | ☐ |
| 48–50 | Helper | ☐ |
| 51–58 | Splash, intro, login, join, scan, setup 1–3 | ☐ |
| 59–74 | More, teams, employees, invite, settings, plan, help, dialogs | ☐ |
| 75–83 | Offline, empty, error, toast and Marathi variants | ☐ |

After each screen, check it against the brief's §9 consistency rules. Record any differences in doc 02.
