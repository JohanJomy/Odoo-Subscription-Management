# LoopLedger UI Design System

Oct 31, 2026 · @Johan

One visual language for every page, plus ready-to-paste prompts for Google Stitch so all screens come out matching.

## 1. Principles and the look

**The look in one paragraph:** a calm, modern business-finance tool. White cards on a very light grey-blue page, one indigo accent used for the main action on each screen, dark slate text, generous whitespace, thin 1 px borders instead of heavy shadows, and colour reserved for status (green paid, amber warning, red overdue). Numbers are the heroes: large, bold, aligned, in tabular figures. It should feel closer to a polished SaaS dashboard than to a spreadsheet.

Six rules that keep 17 pages looking like one product:

1. **One accent.** Indigo is for the primary button, active menu item, links and focus rings only. Never use it for status.
2. **Colour means status.** Green, amber, red and blue appear only in chips, alerts and chart series that carry meaning.
3. **One page template.** Every page is: page header, optional filter bar, content card(s). No page invents its own structure.
4. **One primary action per screen**, top right of the header. Secondary actions are outline or ghost buttons.
5. **Same component, same look.** A status chip, money value, table or form field looks identical wherever it appears.
6. **Spacing from the scale only** (4, 8, 12, 16, 24, 32, 48). No other values.

Words on screen: sentence case ("Add product", not "Add Product"), verbs on buttons ("Record payment"), plain language, amounts as `₹12,500.00` in Indian grouping (`₹1,23,456.00`).

## 2. Design tokens

These values are the single source of truth. Give them to Stitch, to Figma and to the Tailwind config unchanged.

### 2.1 Colour

| Token | Hex | Used for |
| --- | --- | --- |
| `primary` | #4F46E5 | Primary button, active nav item, links, focus ring, selected tab underline |
| `primary-hover` | #4338CA | Hover and pressed state of primary |
| `primary-soft` | #EEF2FF | Active nav item background, selected row, subtle highlights |
| `bg` | #F8FAFC | Page background |
| `surface` | #FFFFFF | Cards, tables, dialogs, sidebar, top bar |
| `border` | #E2E8F0 | Card and input borders, table dividers |
| `border-strong` | #CBD5E1 | Input hover, secondary button border |
| `text` | #0F172A | Headings, table body, values |
| `text-muted` | #64748B | Labels, helper text, table headers, placeholders |
| `text-on-primary` | #FFFFFF | Text on primary button |
| `success` | #16A34A | Success icon, positive chart series |
| `warning` | #D97706 | Warning icon, amber chart series |
| `danger` | #DC2626 | Destructive button, error text and border, overdue |
| `info` | #2563EB | Info icon, quotation |

**Status chips** (background / text; all pass 4.5:1 contrast):

| Status | Background | Text | Applies to |
| --- | --- | --- | --- |
| Draft | #F1F5F9 | #334155 | Subscription, invoice |
| Quotation | #DBEAFE | #1E40AF | Subscription |
| Confirmed | #E0E7FF | #3730A3 | Subscription, invoice |
| Active | #DCFCE7 | #166534 | Subscription |
| Paid | #DCFCE7 | #166534 | Invoice |
| Overdue | #FEE2E2 | #991B1B | Invoice (computed) |
| Closed | #F1F5F9 | #334155 | Subscription |
| Paused | #FEF3C7 | #92400E | Subscription (closed with reason paused) |
| Cancelled | #F1F5F9 | #64748B, strikethrough | Invoice |

Health dot (customer list): green #16A34A, amber #D97706, red #DC2626, 10 px circle with a text label beside it so colour is never the only signal.

**Chart colours:** primary series #4F46E5, second #0EA5E9, third #94A3B8; meaning-based charts use success, warning, danger. Gridlines #E2E8F0, axis text #64748B 12 px.

### 2.2 Typography

Font: **Inter** (fallback system-ui). Numbers use `font-variant-numeric: tabular-nums` so columns align.

| Style | Size / line height | Weight | Used for |
| --- | --- | --- | --- |
| Page title | 24 / 32 | 600 | One per page, in the page header |
| Section title | 18 / 28 | 600 | Card titles, dialog titles |
| Subtitle | 16 / 24 | 500 | Sub-sections, stat card labels on large cards |
| Body | 14 / 20 | 400 | Everything by default, table cells, inputs |
| Label | 14 / 20 | 500 | Form labels, table header (muted) |
| Caption | 12 / 16 | 400 | Helper text, chip text (500), timestamps |
| Stat value | 28 / 36 | 700 | Dashboard numbers |
| Money large | 20 / 28 | 600 | Invoice totals |

### 2.3 Spacing, radius, elevation, icons

| Token | Value |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px |
| Page padding | 24 px desktop, 16 px phone |
| Gap between cards | 24 px desktop, 16 px phone |
| Card padding | 24 px desktop, 16 px phone |
| Form field gap | 16 px vertical; label to input 6 px |
| Radius | Buttons and inputs 8 px; cards 12 px; dialogs 16 px; chips fully rounded |
| Card | #FFFFFF, 1 px #E2E8F0 border, shadow `0 1px 2px rgba(15,23,42,0.06)` |
| Dialog | shadow `0 12px 32px rgba(15,23,42,0.18)`, overlay rgba(15,23,42,0.45) |
| Icons | Lucide, 20 px (16 px inside chips and buttons), stroke 1.75, colour `text-muted` unless active |
| Control heights | Button and input 40 px; small button 32 px; table row 48 px; top bar 56 px |
| Focus | 2 px ring #4F46E5 with 2 px offset on every interactive element |
| Motion | 150 ms ease-out for hover, 200 ms for dialogs and toasts; none for data |

## 3. Layout

### 3.1 Breakpoints

| Name | Width | Behaviour |
| --- | --- | --- |
| Phone | under 768 px | Bottom tab bar (4-5 items), no sidebar, single column, tables become stacked cards, dialogs become full-screen sheets |
| Tablet | 768 to 1023 px | Collapsed icon-only sidebar (72 px), two-column grids, tables stay tables |
| Desktop | 1024 px and above | Full sidebar 240 px, content max width 1200 px centred, 12-column grid with 24 px gutters |

### 3.2 App shell (every logged-in page)

```text
+--------------+------------------------------------------------------+
| Logo         |  Top bar 56px:  [page search]        [bell]  [avatar v]  |
| LoopLedger   +------------------------------------------------------+
|              |  Page header: Title                    [Secondary] [Primary]
| Dashboard    |  Breadcrumb / one-line description                       |
| Customers    |                                                          |
| Subscriptions|  Filter bar: [search] [Status v] [Date range] [Clear]    |
| Invoices     |                                                          |
| Payments     |  +----------------------------------------------------+  |
| Catalog  v   |  | Card: table / form / chart                         |  |
| Pricing  v   |  |                                                    |  |
| Billing run  |  +----------------------------------------------------+  |
|              |                                                          |
| ------------ |                                                          |
| Team, Audit  |                                                          |
| (admin only) |                                                          |
+--------------+------------------------------------------------------+
```

**Sidebar** (white, right border 1 px `border`): 240 px wide. Logo block 56 px high with a 28 px indigo rounded square holding a loop glyph and the word LoopLedger in 18 px semibold. Nav items 40 px high, 12 px horizontal padding, icon 20 px + 12 px gap + label 14 px medium. Active item: background `primary-soft`, text and icon `primary`, 3 px left indicator. Hover: background #F1F5F9. Group headings (Catalog, Pricing) are expandable with a chevron and indented children. Admin-only items (Team, Audit) sit in a separate group at the bottom after a divider. The menu is the same for all pages; only the active item changes.

**Top bar** (white, bottom border): global search field 320 px on the left, notification bell with count dot (inbox items), avatar with name and role chip (Admin, Staff) opening a menu with Profile and Log out. On phones the top bar shows the page title and the avatar only.

**Bottom tab bar (phones):** 56 px, white, top border. Staff and admin: Dashboard, Subscriptions, Invoices, Payments, More (opens a sheet with the rest). Customer: My subscriptions, My invoices, Profile. Active tab uses the primary colour and a filled icon.

**Customer portal shell:** no sidebar on desktop; a top navigation bar with logo, two links (My subscriptions, My invoices) and the avatar; content max width 960 px.

**Auth pages:** page background `bg`; one centred card 420 px wide with the logo above, 32 px padding, a single primary full-width button, and a text link row below.

### 3.3 Page anatomy (identical on every page)

1. **Page header:** title (24 px) on the left with an optional one-line description in muted body text below; actions on the right (max one primary button and one or two secondary). 24 px below it comes the next block. On phones the actions move under the title, full width.
2. **Filter bar** (list pages): a single row inside no card, 12 px gap: search input (flex), up to three select filters, a ghost Clear button. Active filters show as removable chips under the bar.
3. **Content card(s):** white cards, 24 px apart. A list page has exactly one card holding the table and its pagination footer. A detail page has a summary card on top and tabbed or stacked cards below. A form page has one card per group of fields, each with a section title.
4. **Footer actions on forms:** sticky bar at the bottom of the card with Cancel (ghost) on the left of Save (primary), right-aligned.

## 4. Component specifications

Build each once; reuse everywhere. Heights and radii are in section 2.3.

| Component | Specification |
| --- | --- |
| **Primary button** | Fill `primary`, white text 14 px medium, 40 px high, 16 px side padding, radius 8, optional 16 px icon left. Hover `primary-hover`. Disabled: 50% opacity. Loading: spinner replaces icon, label stays |
| **Secondary button** | White fill, 1 px `border-strong`, text `text`; hover background #F8FAFC |
| **Ghost button** | No border, text `text-muted`; hover background #F1F5F9. Used for Cancel and table row actions |
| **Destructive button** | Fill `danger` white text; used only inside confirmation dialogs (Cancel invoice, Close subscription) |
| **Icon button** | 36 px square, radius 8, ghost style, tooltip on hover |
| **Text input** | 40 px, white, 1 px `border`, radius 8, 12 px padding, placeholder `text-muted`; hover `border-strong`; focus 2 px primary ring; error 1 px `danger` border and 12 px red message below with an alert icon; disabled background #F1F5F9 |
| **Field** | Label (14 px medium) above, 6 px gap, input, helper text 12 px muted below; required marked with a red asterisk after the label |
| **Money input** | Text input with a fixed `₹` prefix block on the left, right-aligned tabular numbers |
| **Select** | Same as input with a chevron; menu is a white card with shadow, 36 px options, selected option has a check and `primary-soft` background |
| **Date input** | Input with a calendar icon on the right opening a popover calendar; range pickers show two months |
| **Switch** | 40 x 22 px track; on = `primary`, off = #CBD5E1; label to the right; help text below (used for plan flags) |
| **Checkbox and radio** | 18 px, radius 4 (checkbox) or full (radio), checked fill `primary` |
| **Segmented toggle** | Two or three joined buttons, selected one has white fill and shadow on a #F1F5F9 track (Fixed or Percent, Day or Month) |
| **Status chip** | 24 px high, 8 px side padding, fully rounded, 12 px medium text, colours from 2.1; leading 6 px dot optional on dashboard lists |
| **Stat card** | Card; top row: 14 px muted label + 20 px muted icon in a 36 px #EEF2FF circle; below: 28 px bold value; below: 12 px caption trend (green up arrow or red down arrow with percent versus last period) |
| **Data table** | Header row 44 px, background #F8FAFC, 12 px uppercase-free muted medium text, bottom border; body rows 48 px, 14 px text, bottom border #E2E8F0, hover #F8FAFC, selected `primary-soft`; money and number columns right-aligned with tabular figures; first column is the identifier in medium weight and links to detail; last column holds a ⋯ icon button; sortable headers show a small chevron; sticky header when scrolling |
| **Table footer** | 56 px: left "Showing 1-20 of 1,240", right page-size select and Previous / Next buttons |
| **Bulk bar** | When rows are ticked a bar slides above the table: "3 selected" + primary "Confirm selected" + ghost Clear |
| **Tabs** | Text tabs, 14 px medium, 40 px high, 2 px `primary` underline on the active tab, muted when inactive, 1 px bottom border across the row |
| **Stepper** (subscription status) | Five circles joined by lines: Draft, Quotation, Confirmed, Active, Closed. Done steps are indigo with a check; current step has an indigo ring; future steps are grey. Under Closed a small reason chip if closed |
| **Dialog** | White, radius 16, width 480 px (form dialogs 560), padding 24, title 18 px, close icon top right, footer with Cancel (ghost) and the action (primary or destructive). Phones: full-screen sheet |
| **Toast** | Bottom-right (top on phones), 360 px, white card with 4 px coloured left edge (green success, red error, blue info), icon, message, auto-hide after 4 s |
| **Alert banner** | Full-width inside the page above the card: pale background of the status colour, icon, text, optional action link. Used for offline mode and failed billing items |
| **Empty state** | Centred in the card: 48 px muted icon in a circle, 16 px semibold title, 14 px muted one-line help, one primary button |
| **Loading** | Skeleton rows (grey #E2E8F0 pulsing bars) matching the table row height; spinner only inside buttons |
| **Error state** | Same as empty state with a red icon, message "Couldn't load invoices" and a Retry secondary button. A record the user may not open (for example another customer's invoice) shows the same layout with the message "Not found" and a Back button, never "Access denied" |
| **Chart card** | Card with title and a segmented range toggle top right; chart 280 px high; legend below left in 12 px text; tooltip is a small dark #0F172A card with white 12 px text |
| **Totals box** | Right-aligned 320 px block in invoice and subscription forms: rows Subtotal, Discount, Tax, then a divider and **Total** in 20 px semibold; amounts right-aligned |
| **Avatar** | 32 px circle, indigo-100 background, indigo-700 initials 12 px semibold |
| **Breadcrumb** | 12 px muted with `/` separators; last item in `text` colour |

**Accessibility rules:** every colour pair above meets 4.5:1 for text; status is always shown with a label, not colour alone; focus ring on all interactive elements; touch targets at least 44 px on phones; icon-only buttons have a tooltip and an aria-label.

## 5. Screen layouts

Every screen uses the shell and page anatomy from section 3. "Top to bottom" lists the blocks inside the content area.

| Screen | Primary action | Top to bottom |
| --- | --- | --- |
| Login | Log in | Logo, title "Welcome back", email, password with show toggle, "Forgot password?" link right-aligned, full-width Log in, line "New here? Create an account" |
| Sign up | Create account | Logo, title, name, email, phone (optional), password with live checklist of four rules that turn green as met, full-width Create account, link to log in |
| Forgot and reset | Send reset link, Save password | Logo, short explanation, one or two fields, primary button, back link |
| Dashboard | none (range filter) | Header with date-range select; row of 5 stat cards (Active subscriptions, MRR, Collected, Outstanding, Overdue in red); row with revenue-by-month bar chart (8 columns) and overdue ageing chart (4 columns); row with Recent payments table (7 columns) and Inbox list (5 columns: renewals due, overdue, discounts ending, each with count chip and arrow) |
| Inbox | none | Filter chips (All, Renewals, Overdue, Discounts), grouped list cards each with icon, title, subtitle, due date and an Open button |
| Customers list | Add customer | Filter bar; table: Customer (name and company), Email, Active subscriptions, Outstanding, Health badge, ⋯ |
| Customer detail | Edit | Summary card (avatar, name, contact, health badge, three small stats); tabs Subscriptions, Invoices, Payments each with a table |
| Subscriptions list | New subscription | Filter bar with Status select (five statuses only; Paused is a close reason shown as a chip, not a status); table: Number, Customer, Plan, Status chip, Next invoice, Expiry, Amount per period, ⋯ |
| New subscription | Save as draft | Card 1 Details: customer, plan or template, start date, expiry date, payment terms (two-column grid). Card 2 Lines: editable table (Product, Variant, Qty, Unit price read-only, Tax, Amount) with Add line link; below it the Totals box, filled from the server (POST /subscriptions/price) after each change, with a skeleton while it updates and never calculated in the browser. Sticky footer Cancel and Save as draft |
| Subscription detail | context action (Send quotation, Confirm, Activate, Close) | Header with number and status chip; stepper card; two-column row: Details card and Totals card; Lines table; Invoices table; Activity timeline (audit) on the right or below |
| Billing run | Run billing | Card with date picker and Preview button; after preview: summary strip (invoices to create, total amount) and preview table (Customer, Subscription, Period, Total) with grand total; Run billing opens a confirmation dialog; afterwards a result alert (Created 118, Skipped 2, Failed 1 with a link to reasons) and a Run history table |
| Invoices list | none (bulk Confirm selected appears on selection) | Filter bar (status, Overdue toggle, date range, search); table with checkbox, Number, Customer, Period, Total, Paid, Balance, Due date, Status chip, ⋯ |
| Invoice detail | Record payment | Header with number, status chip and buttons Confirm / Send / Print or PDF / Cancel as secondary; summary card (customer, subscription, period, due date); lines table with Description, Qty, Unit price, Discount, Tax, Amount; Totals box; Payments card listing method, date, amount, note |
| Record payment dialog | Save payment | Method select, Amount (money input, prefilled with balance, helper "Balance ₹4,200.00"), Date, Note textarea |
| Payments | none | Filter bar (method, date range); table: Date, Invoice (link), Customer, Method chip, Amount, Note |
| Products | Add product | Table: Name, Type, Sales price, Cost price, Variants count, Active switch, ⋯. Add and edit open a page with two cards: Product details and Variants (small table: Attribute, Value, Extra price, with Add variant row) |
| Plans | Add plan | Table: Name, Price, Billing period chip, Min qty, Available from to, Flags as small icons, Active. Form: Details card (name, price, billing period segmented control Daily / Weekly / Monthly / Yearly, min quantity, start and end dates) and Behaviour card with four switches and help text (Auto-close at end date, Can be closed early, Can be paused, Can be renewed) |
| Templates | Add template | Table: Name, Plan, Validity days, Lines; form with plan select, validity days and a lines table |
| Taxes | Add tax | Table: Name, Rate, Active switch; add via dialog |
| Discounts | Add discount | Table: Name, Type and value, Applies to, Dates, Used / limit with a thin progress bar, Status chip (Scheduled, Active, Expired, Used up). Form: segmented Fixed or Percent, value (rupees for Fixed, whole number 1-100 for Percent), minimum purchase, minimum quantity, start and end date, usage limit, applies to select (Product or Subscription) revealing a picker |
| Team | Add staff | Table: Name, Email, Role chip, Active switch; Add staff dialog |
| Audit | none | Filter bar; table: Time, User, Action, Entity, Detail |
| My subscriptions (customer) | none | Cards in a one or two column grid: plan name, status chip, quantity, price per period, next billing date; buttons Change seats and Pause (shown only if the plan allows) |
| My invoices (customer) | none | Table or cards: Number, Period, Total, Status chip, Download PDF; unpaid rows expand to show the UPI QR and amount |

## 6. Stitch prompts

I have not checked Stitch's current features, so treat the workflow below as general practice for any prompt-to-UI tool and adjust to what Stitch offers.

**Workflow that keeps screens uniform**

1. Paste the **master style block** below at the start of *every* prompt, unchanged. The tool has no memory of your design system, so repeating it is what keeps colours, fonts and spacing identical.
2. Generate the **Dashboard** first. Fix anything off (sidebar, chips, cards) until it matches this document, because every later screen copies its look.
3. Then generate the other screens one at a time using the per-screen prompts. Keep each prompt to one screen.
4. Reuse the **sample data** below in every prompt so names, amounts and statuses repeat across screens.
5. Generate the phone version of the three most important screens (Dashboard, Invoices, Invoice detail) with the phone block.
6. Compare all screens side by side against the checklist in section 7 before handing them to developers.

### 6.1 Master style block (paste first, every time)

```text
Design a desktop web app screen at 1440x900 for LoopLedger, a subscription billing platform. Light theme, clean modern SaaS look.
Colours: page background #F8FAFC; cards white with 1px #E2E8F0 border and 12px radius, almost no shadow; text #0F172A; muted text #64748B. One accent only: indigo #4F46E5 (hover #4338CA, soft tint #EEF2FF) used for the primary button, active menu item and links. Colour is otherwise used only for status.
Font Inter. Page title 24px semibold, section titles 18px semibold, body 14px, captions 12px. Numbers use tabular figures and are right-aligned in tables. Currency in rupees with Indian grouping, for example ₹1,23,456.00.
Layout: white left sidebar 240px wide with a logo block (small indigo rounded square with a loop icon and the word LoopLedger) and menu items with outline icons: Dashboard, Customers, Subscriptions, Invoices, Payments, Catalog, Pricing, Billing run, then a divider and Team, Audit. Active item has an #EEF2FF background, indigo text and a 3px indigo left edge. White top bar 56px with a search field on the left, a bell icon and an avatar on the right. Content area max width 1200px with 24px padding. Each page has a header: 24px title on the left, one indigo primary button on the right and optional outline secondary buttons.
Components: buttons 40px high with 8px radius; inputs 40px high, 1px #E2E8F0 border, 8px radius, label above in 14px medium; table header row 44px with #F8FAFC background and muted text, body rows 48px with thin dividers; status chips are pills 24px high with 12px medium text: Draft #F1F5F9 on #334155, Quotation #DBEAFE on #1E40AF, Confirmed #E0E7FF on #3730A3, Active and Paid #DCFCE7 on #166534, Overdue #FEE2E2 on #991B1B, Closed #F1F5F9 on #334155. Icons are Lucide-style outline, 20px. Sentence-case labels, verbs on buttons. Plenty of whitespace; no gradients, no illustrations, no decorative shapes.
```

### 6.2 Sample data (reuse in every prompt)

| Item | Values |
| --- | --- |
| Customers | Acme Traders, Nova Retail, Kerala Spice Co, Bluewave Logistics, Meridian Clinics |
| Subscription | SUB-0042, Acme Traders, Business Plan (monthly), Active, next invoice 01 Nov 2026, expiry 31 Oct 2027 |
| Product lines | CRM Suite (Brand: Odoo) qty 10 at ₹2,560.00; Support add-on qty 1 at ₹1,500.00 |
| Invoice | INV-2026-0107, period 01 Oct to 31 Oct 2026, subtotal ₹27,100.00, discount ₹2,710.00, tax (GST 18%) ₹4,390.20, total ₹28,780.20, balance ₹4,200.00, due 15 Nov 2026 |
| Dashboard numbers | Active subscriptions 1,248; MRR ₹18,45,000; Collected this month ₹12,60,500; Outstanding ₹3,82,400; Overdue ₹94,300 across 17 invoices |
| Payments | UPI ₹10,000.00 on 20 Oct; Bank ₹14,580.20 on 28 Oct (together ₹24,580.20 paid, leaving the ₹4,200.00 balance) |

### 6.3 Per-screen prompts (add to the end of the master block)

**Dashboard**

```text
Screen: Dashboard "Revenue Radar". Header with the title and a date range select on the right (This month). Row of five stat cards: Active subscriptions 1,248; MRR ₹18,45,000; Collected this month ₹12,60,500; Outstanding ₹3,82,400; Overdue ₹94,300 in red with "17 invoices". Each card has a label, a small icon in a soft indigo circle, a 28px bold value and a small green or red trend line. Below, two cards: a bar chart of revenue collected per month for 8 months using indigo bars, and a bar chart of overdue ageing buckets 1-30, 31-60, 61+ days in amber, orange and red. Below that, a Recent payments table (date, invoice, customer, method chip, amount) and an Inbox card with grouped items: Renewals due in 7 days (6), Invoices overdue (17), Discounts ending soon (2), each with a count chip and chevron.
```

**Subscriptions list**

```text
Screen: Subscriptions list. Title Subscriptions, primary button "New subscription". Filter bar: search input, Status select, Clear. One table card with columns Number, Customer, Plan, Status chip, Next invoice, Expiry, Amount per period, row menu. Show 8 rows mixing Draft, Quotation, Confirmed, Active and Closed using the sample customers. Footer: Showing 1-20 of 1,248 with page size select and Previous / Next.
```

**New subscription**

```text
Screen: New subscription form. Breadcrumb Subscriptions / New. Card "Details" with a two-column grid: Customer select, Plan select, Template select (optional), Start date, Expiry date, Payment terms select. Card "Lines": editable table with columns Product, Variant, Qty, Unit price (read-only), Tax, Amount, remove icon; a text link "+ Add line"; under the table a right-aligned Totals box with Subtotal, Discount, Tax and bold Total. Sticky footer with Cancel (ghost) and "Save as draft" (primary). Include one inline validation error under Qty: "Minimum quantity for this plan is 5".
```

**Subscription detail**

```text
Screen: Subscription detail for SUB-0042. Header: title SUB-0042 with an Active chip; primary button "Close subscription" styled as outline secondary, plus outline "Pause". A stepper card with five steps Draft, Quotation, Confirmed, Active, Closed with the first four completed and Active current. Two cards side by side: Details (customer, plan, start, expiry, payment terms) and Totals. Lines table, Invoices table with status chips, and an Activity timeline listing status changes with user and time.
```

**Billing run**

```text
Screen: Billing run. Title Billing run, primary button "Run billing". Card with a date picker defaulting to today and an outline button Preview. Below: summary strip with two numbers (120 invoices to create, ₹34,52,800.00 total) and a preview table (Customer, Subscription, Period, Total) with a grand total row. Above the table a light blue info alert "This is a preview. Nothing has been created yet." Below: a Run history table (date, run by, created, skipped, failed). Show the state after a run in a small success alert "118 invoices created, 2 skipped, 0 failed".
```

**Invoices list**

```text
Screen: Invoices list. Title Invoices. Filter bar: search, Status select, an "Overdue only" toggle, date range. Table with a checkbox column, Number, Customer, Period, Total, Paid, Balance, Due date, Status chip, row menu. Show two rows selected so the bulk bar appears above the table with "2 selected" and a primary "Confirm selected" button. Mix Draft, Confirmed, Paid and Overdue rows.
```

**Invoice detail**

```text
Screen: Invoice detail INV-2026-0107. Header: title with a Confirmed chip; primary button "Record payment"; outline buttons Send, Download PDF, Print; a ghost red-text Cancel invoice. Summary card with customer Acme Traders, subscription SUB-0042, period, due date. Lines table with Description, Qty, Unit price, Discount, Tax, Amount using the sample lines. Right-aligned Totals box. Payments card listing two payments (UPI ₹10,000.00 and Bank ₹14,580.20) with method chip, date, amount and note, and a balance of ₹4,200.00 in bold.
```

**Record payment dialog**

```text
Screen: Record payment dialog over the Invoice detail page, dimmed overlay. Dialog 480px wide, title "Record payment", subtitle INV-2026-0107. Fields: Method select (Cash, Card, UPI, Bank), Amount with a ₹ prefix prefilled 4,200.00 and helper text "Balance ₹4,200.00", Date, Note textarea. Footer: Cancel ghost, "Save payment" primary.
```

**Product form**

```text
Screen: Add product page. Card "Product details": name, type select, sales price, cost price (money inputs), notes textarea. Card "Variants": small table with columns Attribute, Value, Extra price and a delete icon; rows: Brand / Odoo / ₹560.00, Brand / SAP / ₹900.00; a text link "+ Add variant". Sticky footer Cancel and Save product.
```

**Plan form**

```text
Screen: Add plan page. Card "Details": name, price, a segmented control for billing period (Daily, Weekly, Monthly selected, Yearly), minimum quantity, available from and to dates. Card "Behaviour": four switch rows each with a title and a grey help line: Auto-close at end date, Can be closed early, Can be paused, Can be renewed. Sticky footer Cancel and Save plan.
```

**Discount form**

```text
Screen: Add discount page, admin only. Card "Rule": name, segmented control Fixed amount or Percentage (Percentage selected), value, minimum purchase, minimum quantity. Card "Validity and limits": start date, end date, usage limit. Card "Applies to": radio cards Product or Whole subscription; when Product is chosen a product select appears. A right-side summary card previews "10% off CRM Suite when buying 5 or more, valid 01 Nov to 31 Dec, 100 uses". Sticky footer Cancel and Save discount.
```

**Login and sign up**

```text
Screen: Login. No sidebar. Page background #F8FAFC, one centred white card 420px wide with the logo above it. Title "Welcome back", email, password with show/hide icon, "Forgot password?" link right-aligned, full-width primary Log in, below it "New here? Create an account".
```

```text
Screen: Sign up. Same card layout as Login. Fields: full name, email, phone (optional), password. Under the password a checklist of four rules (more than 8 characters, one uppercase, one lowercase, one special character) with two ticked green and two grey. Full-width primary Create account and a link to log in.
```

**Customer portal**

```text
Screen: My subscriptions (customer portal). No sidebar. White top navigation bar with the logo, links My subscriptions and My invoices, and an avatar. Content max width 960px. Cards in a two-column grid, each showing plan name, Active chip, quantity, price per month, next billing date, and buttons "Change seats" (outline) and "Pause" (outline). Above the grid a small card with outstanding balance and a link to unpaid invoices.
```

### 6.4 Phone block (replace the first line of the master block)

```text
Design the same screen for a phone at 390x844 using exactly the same colours, fonts and components. No sidebar: a 56px top bar with the page title and avatar, and a 56px bottom tab bar with Dashboard, Subscriptions, Invoices, Payments and More, active tab in indigo. Content padding 16px; tables become stacked cards showing the identifier, customer, status chip and amount; primary actions are full width; dialogs become full-screen sheets.
```

Then add the screen line, for example "Screen: Invoices list" or "Screen: Dashboard with the stat cards in a 2-column grid and charts stacked".

## 7. Handoff to code

### 7.1 CSS variables (paste into `src/app/globals.css`)

These map the tokens in section 2 to the names shadcn/ui components expect, so every shadcn component picks up the design automatically.

```css
:root {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --accent: #EEF2FF;
  --accent-foreground: #4F46E5;
  --destructive: #DC2626;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #4F46E5;
  --radius: 0.5rem;          /* 8px: buttons and inputs; cards use rounded-xl (12px) */

  --success: #16A34A;
  --warning: #D97706;
  --info: #2563EB;
}
body { font-family: Inter, system-ui, sans-serif; font-size: 14px; line-height: 20px; }
.tabular { font-variant-numeric: tabular-nums; }
```

If the project uses a Tailwind version that reads colours from a config file rather than CSS variables, create the same names there. P1 owns this file; nobody else edits colours.

### 7.2 Component ownership

| Component | Built by | File |
| --- | --- | --- |
| AppShell (sidebar, top bar, bottom tabs) | P1 | `components/shell/` |
| StatusChip, MoneyText, MoneyInput, DataTable, FormField, PageHeader, EmptyState, ErrorBanner, StatCard, TotalsBox | P3 | `components/shared/` |
| Stepper, ChartCard, OfflineBanner, PaymentDialog | P2 (Stepper), P4 (the rest) | `components/shared/` |

Everyone imports these; nobody re-styles a component locally. If a page needs a variation, add a prop to the shared component in a small PR.

`StatusChip` takes `status` and looks up the colours from one map keyed by the names in section 2.1, so a status never gets two different looks.

### 7.3 From Stitch to code

1. Treat the Stitch screens as **reference pictures**, not as code to paste. Build with the shared components so that behaviour, validation and responsiveness stay consistent.
2. If Stitch exports HTML or CSS, copy layout ideas (grid proportions, spacing) but keep the tokens in section 2; if Stitch shows a slightly different shade, the token in this document wins.
3. When a Stitch screen disagrees with this document (different button height, radius, chip colour), fix the screen or ignore the difference. Do not change the document to match one screen.
4. Save the final screens in a shared folder `docs/design/` (PNG per screen) and link them from the README so reviewers can compare.

### 7.4 Uniformity checklist (run on every page before merging)

- [ ] Uses the app shell; sidebar item for the page is highlighted.
- [ ] Header has the 24 px title, and exactly one primary button.
- [ ] Page and card spacing follow the scale (24 px page padding, 24 px between cards).
- [ ] Only the listed colours appear; indigo only on primary actions, links and active states.
- [ ] Tables use the shared `DataTable`: 48 px rows, money right-aligned, identifier links to detail, footer with pagination.
- [ ] Status shown with `StatusChip`; money with `MoneyText` or `MoneyInput`.
- [ ] Forms: labels above inputs, errors under fields in red, sticky Cancel and Save footer.
- [ ] Loading skeleton, empty state and error state exist.
- [ ] Looks right at 375, 768 and 1280 px; no horizontal page scroll; touch targets 44 px on phones.
- [ ] Sentence-case text, verbs on buttons, amounts as ₹ with Indian grouping.
- [ ] Contrast and focus ring checked by tabbing through the page once.
