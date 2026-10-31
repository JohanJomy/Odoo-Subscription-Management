# LoopLedger: Subscription Management System

Oct 31, 2026 · @Johan

A 4-person, 4.5-hour build plan for Brightloop's subscription platform: one Next.js (TypeScript) app, SQLite, offline-ready.

## Concept and special features

LoopLedger is one TypeScript web app (Next.js) holding the screens, the API and the database access in a single repo, installable on a phone as a PWA for customers. It covers catalog, subscriptions, invoicing, payments and revenue reporting. It is built around one promise from the brief: nothing is billed twice or skipped, and nobody has to remember anything.

The special features below are chosen because each is cheap to build (under 40 minutes) and visibly solves a Brightloop pain point.

| Feature | What it does | Pain point it removes |
| --- | --- | --- |
| Billing run with dry-run preview | Shows every invoice that would be created today, with totals, before you press Run | Wrong invoices going out |
| Idempotent billing | Unique key (subscription, period start) makes a second run a no-op | Double billing, skipped renewals |
| Revenue Radar | MRR, ARR, active count, collected vs outstanding, overdue ageing (0-30, 31-60, 60+ days) in one dashboard | Quarter-end manual reports |
| Renewal and dunning inbox | Auto-generated task list: renewals due in 7 days, invoices overdue, expiring discounts | Renewals missed |
| Customer health badge | Green, amber or red per customer from overdue count and days late (simple rules, no ML) | Not knowing who to chase |
| Self-service portal | Customer pauses, upgrades seats or downloads invoice PDFs without emailing anyone | Support emails |
| Offline mode | Last synced lists cached locally; payments recorded offline are queued and synced later | Dependence on connectivity |
| UPI QR on invoice PDF | Each invoice PDF carries a payment QR with the invoice number as reference | Matching payments by scrolling bank statements |
| Audit trail | Every status change, discount use and payment is logged with user and time | Who changed what |

## Stack and architecture

One language (TypeScript), one repo, one command to run. This is the most common web stack, so AI tools generate it reliably, and the npm ecosystem has an official SDK for almost every integration Brightloop might add (Razorpay, Stripe, email, SMS, Google). No Flutter, and no Docker needed.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | Pages and API route handlers in one project; no separate backend to wire up |
| UI | Tailwind CSS + shadcn/ui, TanStack Table, Recharts | Clean, consistent look fast; tables with search and pagination; dashboard charts |
| Forms and validation | React Hook Form + zod | The same zod schema validates the form in the browser and the API on the server |
| Database | Prisma + SQLite (file `dev.db`) | Local, zero install, real constraints; change one line to use Postgres when deployed |
| Auth | JWT in an httpOnly cookie (`jose`, `bcryptjs`), role in the token, `middleware.ts` | Admin, Staff, Customer enforced in one place |
| Scheduler | `node-cron` started from `instrumentation.ts`, plus a Run button | Billing day without anyone typing |
| Email | Nodemailer to a local MailHog inbox | Password reset and invoice emails work with no internet |
| PDF and QR | `@react-pdf/renderer`, `qrcode` | Invoice PDF with a UPI QR, no external service |
| Integrations (stretch) | Razorpay test mode: payment link on each invoice, webhook records the payment | Shows real integration; payments match invoices automatically |
| Offline | PWA (Serwist) + Dexie (IndexedDB): cached lists and a queue of payments recorded offline | Works without internet, syncs when back |
| Tests | Vitest on the billing engine | The one place a bug costs money |
| Tooling | pnpm, ESLint, Prettier, GitHub | Standard |

Repo layout (monorepo, one `main` branch):

```text
loopledger/
  prisma/            schema.prisma, seed.ts
  src/
    app/(auth)/      login, signup, forgot, reset
    app/(app)/       dashboard, customers, subscriptions, invoices, payments,
                     catalog, pricing, billing, team, audit, inbox
    app/(portal)/    my-subscriptions, my-invoices
    app/api/v1/      route handlers (thin: validate, check role, call server/)
    server/          auth, billing, payments, reports  (business logic, pure and testable)
    components/      ui (shadcn), shell, shared tables and forms
    lib/             db, money, zod schemas, constants
  docs/              contract.md, demo-script.md
```

Use static JSON only for the first 30 minutes of UI work; after that every screen must read from the live local API. Start it with `pnpm i && pnpm prisma migrate dev && pnpm prisma db seed && pnpm dev`.

## Data model

Fifteen core tables; the constraints in the right column are what make the business rules safe.

| Table | Key fields | Constraint that matters |
| --- | --- | --- |
| users | id, email, password\_hash, role (ADMIN, STAFF, CUSTOMER), customer\_id? | `email` unique |
| customers | id, name, company, phone, address, gstin? | One portal user per customer |
| products | id, name, type, sales\_price, cost\_price, notes, active | cost and sales price ≥ 0 |
| product\_variants | id, product\_id, attribute (e.g. Brand), value (e.g. Odoo), extra\_price (e.g. 560) | Unique (product, attribute, value) |
| plans | id, name, price, billing\_period (DAILY, WEEKLY, MONTHLY, YEARLY), min\_qty, start\_date, end\_date, auto\_close, closable, pausable, renewable | end\_date ≥ start\_date; flags set per plan by admin |
| quotation\_templates | id, name, validity\_days, plan\_id | Has template\_lines |
| template\_lines | template\_id, product\_id, variant\_id?, qty |  |
| subscriptions | id, number (SUB-0001), customer\_id, plan\_id, start\_date, expiry\_date, payment\_term, status, next\_invoice\_date | Number unique; status from fixed set |
| subscription\_lines | subscription\_id, product\_id, variant\_id?, qty, unit\_price, tax\_id?, amount | qty ≥ plan.min\_qty |
| taxes | id, name, rate\_percent, active | 0 ≤ rate ≤ 100 |
| discounts | id, name, type (FIXED, PERCENT), fixed\_amount (paise), percent (whole number), min\_purchase, min\_qty, start\_date, end\_date, usage\_limit, used\_count, applies\_to (PRODUCT, SUBSCRIPTION), target\_id | `used_count` ≤ `usage_limit` |
| invoices | id, number (INV-2026-0001), subscription\_id, period\_start, period\_end, status, subtotal, discount\_total, tax\_total, total, due\_date | **Unique (subscription\_id, period\_start)** stops double billing |
| invoice\_lines | invoice\_id, description, qty, unit\_price, tax\_amount, discount\_amount, amount |  |
| payments | id, invoice\_id, method (CASH, CARD, UPI, BANK), amount, paid\_on, note, recorded\_by | amount > 0; sum ≤ invoice total |
| audit\_log | id, entity, entity\_id, action, user\_id, at, detail | Append-only |

## Business rules

**Signup and access.** Email must be unique and valid. Password must be longer than 8 characters with an uppercase letter, a lowercase letter and a special character: regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`, checked in the form and again in the API. Reset sends a single-use link valid for 30 minutes to the registered email. Only ADMIN can create STAFF users; CUSTOMER sees only rows where `customer_id` matches their own.

**Subscription lifecycle.** Status moves one way except where noted, and every move is written to the audit log.

1. Draft: created, editable
2. Quotation: sent to customer, valid for `validity_days` from the template
3. Confirmed: customer accepted; lines locked
4. Active: start date reached; `next_invoice_date` is set
5. Closed: expired automatically (if the plan has auto\_close) or closed early, paused, or renewed (only if the plan allows it)

The timeline of statuses is shown on the subscription page as a stepper so anyone can see where it stands.

**Billing run (the core engine).** For every Active subscription with `next_invoice_date` ≤ today:

1. Open a transaction.
2. Insert an invoice with `period_start = next_invoice_date`; if the unique key already exists, skip silently (this is what prevents double billing).
3. Copy each line with customer details, price and variant surcharge.
4. Apply tax: `line_amount × rate_percent / 100` using the line's tax rule.
5. Apply the best eligible discount (below).
6. Advance `next_invoice_date` by the plan period; if past `expiry_date`, close the subscription.
7. Commit. A failure rolls back only that subscription and is listed in the run report.

The dry-run endpoint runs steps 2 to 6 without committing and returns the preview.

**Discounts.** Admin-only. A discount is eligible when today is within its dates, `used_count < usage_limit`, the subtotal meets min\_purchase and the quantity meets min\_qty. Fixed amounts subtract the value; percentages take value% of the matching lines (product-level) or of the subtotal (subscription-level). If several are eligible, apply the one giving the largest saving. Increment `used_count` in the same transaction as the invoice, so it appears on the next invoice on its own and stops when it expires or runs out.

**Invoice lifecycle.** Draft, Confirmed, Paid. Staff can confirm, cancel (Draft or Confirmed only), send by email and print. An invoice becomes Paid automatically when payments reach its total.

**Payments.** Each records method, amount, date and note against one invoice. Over-payment is rejected. An invoice is Overdue when it is Confirmed, unpaid and past `due_date`; this is computed in queries, not stored, so it cannot go stale.

**Health badge.** Red if any invoice is more than 30 days overdue, amber if any is overdue, otherwise green.

## API contract

All routes are under `/api/v1`, JSON, with the role check in middleware. Lists accept `?page`, `?limit`, `?status`, `?q` and return in under 2 seconds with indexes on `status`, `customer_id`, `due_date`, `next_invoice_date`.

| Area | Endpoints | Roles |
| --- | --- | --- |
| Auth | POST `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/forgot`, `/auth/reset` | Public |
| Users | POST `/users/staff`, GET `/users`, PATCH `/users/:id` | Admin |
| Products | CRUD `/products`, `/products/:id/variants` | Admin write, Staff read |
| Plans | CRUD `/plans`, POST `/plans/:id/close`, `/pause`, `/renew` | Admin write, Staff read |
| Taxes and discounts | CRUD `/taxes`, `/discounts` | Admin |
| Templates | CRUD `/quotation-templates` | Admin, Staff |
| Subscriptions | GET/POST `/subscriptions`, POST `/subscriptions/from-template/:id`, POST `/subscriptions/:id/transition` | Admin, Staff; Customer GET own |
| Billing | GET `/billing/preview`, POST `/billing/run`, GET `/billing/runs` | Admin, Staff |
| Invoices | GET `/invoices`, POST `/invoices/:id/confirm`, `/cancel`, `/send`, GET `/invoices/:id/pdf` | Admin, Staff; Customer GET own |
| Payments | POST `/invoices/:id/payments`, GET `/payments` | Admin, Staff |
| Portal | GET `/me/subscriptions`, `/me/invoices`, POST `/me/subscriptions/:id/pause`, `/me/subscriptions/:id/seats` | Customer |
| Reports | GET `/reports/summary`, `/reports/revenue?from&to`, `/reports/overdue`, `/reports/inbox` | Admin, Staff |
| Audit | GET `/audit?entity&id` | Admin |

Every write route validates with a zod schema and answers `422` with `{ field, message }` pairs the forms show under each input.

## Screens and navigation

One colour scheme (indigo primary `#4F46E5`, slate neutrals, green, amber and red only for status), one spacing scale (8 px), shadcn/ui components. On wide screens a left sidebar; on phones the same items in a bottom tab bar. Menu items shown depend on role.

| Role | Menu (top to bottom) | Key screens |
| --- | --- | --- |
| Admin | Dashboard, Customers, Subscriptions, Invoices, Payments, Catalog (Products, Plans, Templates), Pricing (Taxes, Discounts), Billing Run, Team, Audit | Revenue Radar, plan editor with flags, discount rule form, staff creation |
| Staff | Dashboard, Customers, Subscriptions, Invoices, Payments, Inbox | Subscription stepper, invoice detail with confirm, send, print, record payment sheet |
| Customer | My Subscriptions, My Invoices, Profile | Subscription card with pause and seat change, invoice list with PDF and pay QR |

Shared pieces to build once in `components/` and `lib/`: `AppShell` (sidebar and bottom bar), `StatusChip`, `MoneyText` (₹ formatting), `DataTable` (TanStack Table with search, filter chips, server pagination), zod schemas shared by forms and API, `ErrorBanner`, `OfflineBanner`. Every list shows a skeleton while loading and an empty state with one action.

## Team split

Split by vertical slice and by layer so no two people edit the same files. Each person owns a folder, so merge conflicts stay rare. The contract (`openapi.yaml`, table list above) is agreed together in the first 30 minutes.

| Person | Role | Owns (server side) | Owns (screens) | Done when |
| --- | --- | --- | --- | --- |
| P1 | Platform and security lead | Repo, Prisma schema and migrations, seed data (50 customers, 200 subscriptions), auth, JWT, `middleware.ts` roles, users, password reset email, audit log, zod error format | `components/shell`, theme, login, signup, forgot and reset pages, Team page | Anyone can sign up, log in, reset a password; menus change by role; schema never blocks others |
| P2 | Billing engine lead | Subscriptions and state machine, quotation templates, billing run and preview, tax calculation, discount engine, invoice generation, cron job, Vitest idempotency test | Billing Run page (preview table, run button, result report), Subscription detail stepper | `POST /billing/run` twice creates invoices once; discount shows on next invoice; tax matches rules |
| P3 | Catalog and admin UI lead | Products, variants, plans (with flags), taxes, discounts CRUD, validation rules | Products, Plans, Templates, Taxes, Discounts pages and forms, Subscription create and list | Admin can launch a product with an Odoo +560 variant and a plan, and build a subscription from a template |
| P4 | Money, reporting and portal lead | Payments, invoice confirm, cancel, send, PDF with UPI QR, reports endpoints (summary, revenue, overdue, inbox), health badge query, Razorpay webhook (stretch) | Dashboard (Revenue Radar), Invoices, Payments and record-payment dialog, Customer portal, PWA and offline queue (Dexie) | Finance lead sees active, revenue, outstanding, overdue on one page; customer sees only own data |

Why this works: P1 unblocks everyone in the first hour, P2 and P4 own the two hardest server pieces, and P3 and P1 carry most of the form-heavy page work. If someone finishes early they pair on testing the area to their left (P1 on P2, P2 on P4, P4 on P3, P3 on P1).

AI use rules for all four: paste your schema and the contract into the prompt first, ask for one file at a time, read and run every generated file before committing, and write a one-line comment in the PR on what you changed from the AI output.

## Timeline (4.5 hours, 3.5 hours spare)

The hard stop is hour 4.5; hours 5 to 8 are buffer for bugs and rehearsal, not planned work.

| Time | Everyone | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- | --- |
| 0:00 to 0:30 | Agree contract, tables, branch names; P1 creates repo and invites all | Repo, Prisma schema, push | Read schema, plan billing code | Page scaffold branch, theme | Report queries on paper |
| 0:30 to 1:15 |  | Auth, RBAC, seed data | Subscriptions, templates, state machine | Products, plans, taxes APIs | Payments API, invoice model |
| 1:15 to 2:30 | **Sync 1 at 1:15**: schema frozen, auth works | App shell, login, signup, reset | Manual billing run, tax, discounts (scheduler only after it works) | Catalog and discount screens | Reports API, PDF and QR, dashboard UI |
| 2:30 to 3:30 | **Sync 2 at 2:30**: merge to main, run end to end | Team screen, audit, role-based menus | Billing screen, stepper, idempotency test | Subscription create and list, validation sweep | Invoices, payments sheet, portal |
| 3:30 to 4:30 | **Sync 3 at 3:30**: feature freeze | Fix auth bugs, responsive check | Seed a full demo month | Empty and error states | Offline queue, performance check |
| 4:30 | Demo rehearsal, tag `v1.0` |  |  |  |  |

Performance check: seed 5,000 subscriptions and 15,000 invoices, hit each list and the dashboard, and add indexes until every call is under 2 seconds.

## Git, validation, demo and cut list

**Git (all four must commit).**

- `main` is protected: merge only by pull request with one review from a teammate.
- Branches: `p1/auth`, `p2/billing-engine`, `p3/catalog-ui`, `p4/reports-portal`, one per feature, merged at least at each sync.
- Commit messages: `feat(billing): add idempotent invoice insert`; commit at least every 30 minutes.
- Rotating reviewer: P1 reviews P2, P2 reviews P4, P4 reviews P3, P3 reviews P1.
- Tag `v1.0` at the end; the commit log should show four authors.

**Validation checklist.**

- Email format and uniqueness; password regex; reset token single-use and expiring.
- Prices, costs, rates and quantities non-negative; rate ≤ 100; end date ≥ start date.
- Quantity ≥ plan minimum; discount dates, limits and one of fixed or percent set.
- Payment amount > 0 and not above the balance; invalid status moves return `409`.
- Same rules in Flutter (instant message) and API (source of truth).

**Demo script (5 minutes).** Sign up a customer, then as admin add a product with the Odoo +560 variant and a plan, build a subscription from a template, apply a discount, press Billing Preview then Run, press Run again to show nothing duplicates, record a UPI payment, open Revenue Radar, switch to the customer portal and show only their data, then turn off Wi-Fi and record a payment offline.

**Cut list if time runs short, in order.** Audit screen, health badge, UPI QR, offline write queue (keep read cache), email send (keep print), pause and seat change in portal.

**Assumptions to confirm.** Currency is INR with GST-style percentage taxes; payment terms are fixed options (Immediate, 15 days, 30 days); "printing" means a PDF through the browser print dialog.
