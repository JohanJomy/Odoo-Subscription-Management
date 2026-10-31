# LoopLedger System Design Guide

Oct 31, 2026 · @Johan

The single reference for all four builders: what to build, how the parts connect, and exactly which pieces each person owns.

## 1. Read this first

LoopLedger runs Brightloop's subscription business: catalog, subscriptions, invoices, payments, reports. One Next.js 15 (TypeScript) app serves the pages and the API; Prisma talks to a local SQLite file. Everything below is written so you can build your part without asking, and so the four parts fit together at the first sync.

**Conventions that every person must follow** (agree on them in the first 15 minutes; most merge bugs come from breaking one of these):

| Topic | Rule |
| --- | --- |
| Money | Stored as integers in paise (₹1 = 100). Never floats. Format only at display with `formatMoney(paise)` from `lib/money.ts` |
| Dates | Stored as UTC `DateTime`; billing dates compared as date-only in Asia/Kolkata. JSON uses ISO strings |
| IDs | `cuid()` strings; human numbers (`SUB-0001`, `INV-2026-0001`) in a separate unique `number` column |
| Enums | Stored as `String` in Prisma (SQLite-safe) and validated by zod enums in `lib/constants.ts`; the single source of truth for status names |
| Responses | Success: `{ data, meta? }`. List meta: `{ page, limit, total }`. Error: `{ error: { code, message, fields?: [{ field, message }] } }` |
| Status codes | 200/201 ok, 401 not logged in, 403 wrong role, 404 not found, 409 invalid state change or duplicate, 422 validation failed |
| Pagination | `?page=1&limit=20` (max 100), `?q=` text search, `?status=` filter, `?sort=field:asc` |
| Auth | `session` httpOnly cookie holding a JWT `{ sub, role, customerId }`; route helper `requireRole(['ADMIN','STAFF'])` from `server/auth/guard.ts` |
| Validation | One zod schema per input in `lib/schemas/<area>.ts`, used by the form and by the route. Never validate in only one place |
| Business logic | Lives in `src/server/<area>/`, as plain functions that take a Prisma client. Route files only parse, authorise, call, and return |
| Audit | Every status change, payment and discount use calls `audit(tx, { entity, entityId, action, userId, detail })` |
| Naming | Files `kebab-case`, components `PascalCase`, `Prisma fields camelCase` |
| Currency | INR, display `₹1,23,456.00` with `en-IN` locale |

### Agreed decisions (fixed for the whole build; nobody changes these alone)

1. **Quotation is a subscription status, not a table.** There is no `Quotation` or `QuotationItem` model. A template creates a subscription in DRAFT; moving it to QUOTATION is the quotation step. Not implemented today: a separate quotation document, a quotation number, a quotation PDF, independent quotation history. The audit log is the only history. Add no tables for this.
2. **Pause is `CLOSED` with `closeReason = PAUSED`.** There is no `PAUSED` status anywhere: not in `constants.ts`, zod enums, filters or UI code. `SUBSCRIPTION_STATUSES` has exactly five values: DRAFT, QUOTATION, CONFIRMED, ACTIVE, CLOSED. The UI shows a "Paused" chip derived from the close reason.
3. **One pricing function, one formula.** `priceSubscription()` in `src/server/billing/pricing.ts` (owned by P2) is the only code that calculates amounts. Formula: invoice = plan fee line (plan price, qty 1) + one line per subscription line (qty × (product salesPrice + variant extraPrice)); discount is applied next; tax is calculated per line after discount. Everyone else calls it: the subscription form gets live totals from `POST /subscriptions/price`; invoices store the result; the PDF, reports and portal read stored values. **No one computes totals in React or in a second helper.**
4. **Money is always an integer in paise.** A fixed discount is stored in `fixedAmount` (paise); a percentage discount in `percent` (whole number 1-100). Tax `ratePercent` is a rate, not money, so it stays a Float.
5. **Billing starts manual.** Build the Run billing button and its endpoint first and prove it with acceptance tests 10-12. Only then add the scheduled job (`node-cron`). The scheduler must call the same function as the button.
6. **Security is enforced on the server, never only in React.** Hiding a button or redirecting in the UI protects nothing. A customer changing a URL must never reach another customer's data (rules at the end of section 2).

## 2. Roles and permissions

Three roles. The server is the source of truth; the UI only hides what a role cannot use.

| Capability | Admin | Staff | Customer |
| --- | --- | --- | --- |
| Sign up, log in, reset password | Yes | Yes | Yes |
| Create a staff account | **Yes** | No | No |
| Products, variants, plans: create, edit, delete | **Yes** | View only | View only (active plans) |
| Taxes and discounts: create, edit, delete | **Yes** | View only | No |
| Quotation templates | Yes | Yes | No |
| Customers: create, edit, view all | Yes | Yes | Own record only |
| Subscriptions: create, edit, change status | Yes | Yes | View own; pause and change seats if the plan allows |
| Run billing, preview billing | Yes | Yes | No |
| Invoices: confirm, cancel, send, print | Yes | Yes | View and download own |
| Record payments | Yes | Yes | No |
| Reports and dashboard | Yes | Yes | No |
| Audit log | Yes | No | No |

Rules that must hold in the server code, not only in the UI:

1. Every customer-facing query adds `where: { customerId: session.customerId }`. Test this with a second customer account.
2. Public signup always creates role `CUSTOMER` plus a linked `Customer` row; the role is never taken from the request body.
3. `POST /users/staff` checks `role === 'ADMIN'`. The first admin comes from the seed script.
4. A deactivated user (`active=false`) cannot log in and existing tokens are rejected at `requireRole`.

**Customer data security (not optional).**

- Every route calls `requireRole` first. Every customer-facing query goes through `scopeToCustomer(session)`, which adds `customerId = session.customerId`.
- Detail routes load by id **and** owner: `findFirst({ where: { id, customerId: session.customerId } })`. If nothing is found, return 404 (not 403), so another customer's record is not even confirmed to exist.
- This covers every route that returns customer data: `/invoices/:id`, `/invoices/:id/pdf`, `/invoices/:id/payments`, `/subscriptions/:id`, `/payments`, `/me/*` and any export.
- Never read `customerId`, `role` or `status` from a customer's request body; take them from the session.
- `middleware.ts` redirects are only for convenience. The API checks authorisation on its own, as if the UI did not exist.
- Test (automated, written by P1 and P4): log in as customer A, request customer B's invoice, invoice PDF, subscription and payment by id; every call returns 404. Reviewers check each new route against this rule before approving.
- Webhook and job routes verify their signature or secret header and reject anything else.

## 3. Database

P1 commits this schema to `prisma/schema.prisma` in the first 30 minutes and freezes it at the first sync (1:15). After the freeze, schema changes go through P1 in the group chat, so migrations never collide. Comments show the allowed string values; zod enforces them.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         String    // ADMIN | STAFF | CUSTOMER
  active       Boolean   @default(true)
  customerId   String?   @unique
  customer     Customer? @relation(fields: [customerId], references: [id])
  resets       PasswordReset[]
  createdAt    DateTime  @default(now())
}

model PasswordReset {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
}

model Customer {
  id            String   @id @default(cuid())
  name          String
  company       String?
  phone         String?
  address       String?
  gstin         String?
  user          User?
  subscriptions Subscription[]
  createdAt     DateTime @default(now())
}

model Product {
  id         String   @id @default(cuid())
  name       String
  type       String   // SOFTWARE | ADDON | SERVICE
  salesPrice Int      // paise
  costPrice  Int      // paise
  notes      String?
  active     Boolean  @default(true)
  variants   ProductVariant[]
  createdAt  DateTime @default(now())
}

model ProductVariant {
  id         String  @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  attribute  String  // e.g. Brand
  value      String  // e.g. Odoo
  extraPrice Int     // paise, e.g. 56000 for 560.00
  @@unique([productId, attribute, value])
}

model Plan {
  id            String   @id @default(cuid())
  name          String
  price         Int      // paise per billing period
  billingPeriod String   // DAILY | WEEKLY | MONTHLY | YEARLY
  minQty        Int      @default(1)
  startDate     DateTime
  endDate       DateTime?
  autoClose     Boolean  @default(false) // closes itself at endDate
  closable      Boolean  @default(true)  // can be closed early
  pausable      Boolean  @default(false)
  renewable     Boolean  @default(true)
  active        Boolean  @default(true)
  subscriptions Subscription[]
  templates     QuotationTemplate[]
}

model QuotationTemplate {
  id           String @id @default(cuid())
  name         String
  validityDays Int
  planId       String
  plan         Plan   @relation(fields: [planId], references: [id])
  lines        TemplateLine[]
}

model TemplateLine {
  id         String @id @default(cuid())
  templateId String
  template   QuotationTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  productId  String
  variantId  String?
  qty        Int
}

model Tax {
  id          String  @id @default(cuid())
  name        String  // e.g. GST 18%
  ratePercent Float
  active      Boolean @default(true)
}

model Discount {
  id             String   @id @default(cuid())
  name           String
  type           String   // FIXED | PERCENT (decides which of the two fields below is used)
  fixedAmount    Int?     // paise, set when type = FIXED
  percent        Int?     // whole percent 1-100, set when type = PERCENT
  minPurchase    Int      @default(0) // paise
  minQty         Int      @default(0)
  startDate      DateTime
  endDate        DateTime
  usageLimit     Int
  usedCount      Int      @default(0)
  appliesTo      String   // PRODUCT | SUBSCRIPTION
  productId      String?  // when appliesTo = PRODUCT
  subscriptionId String?  // when appliesTo = SUBSCRIPTION
  active         Boolean  @default(true)
}

model Subscription {
  id              String   @id @default(cuid())
  number          String   @unique // SUB-0001
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  planId          String
  plan            Plan     @relation(fields: [planId], references: [id])
  startDate       DateTime
  expiryDate      DateTime
  paymentTerm     String   // IMMEDIATE | NET15 | NET30
  status          String   // DRAFT | QUOTATION | CONFIRMED | ACTIVE | CLOSED
  closeReason     String?  // EXPIRED | CLOSED_EARLY | RENEWED | PAUSED
  nextInvoiceDate DateTime?
  quoteValidUntil DateTime?
  lines           SubscriptionLine[]
  invoices        Invoice[]
  createdAt       DateTime @default(now())
  @@index([status])
  @@index([customerId])
  @@index([nextInvoiceDate])
}

model SubscriptionLine {
  id             String       @id @default(cuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  productId      String
  variantId      String?
  description    String
  qty            Int
  unitPrice      Int          // paise, base + variant extra
  taxId          String?
  amount         Int          // qty * unitPrice, before tax
}

model Invoice {
  id             String       @id @default(cuid())
  number         String       @unique // INV-2026-0001
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  customerId     String
  periodStart    DateTime
  periodEnd      DateTime
  status         String       // DRAFT | CONFIRMED | PAID | CANCELLED
  subtotal       Int
  discountTotal  Int          @default(0)
  taxTotal       Int
  total          Int
  paidTotal      Int          @default(0)
  dueDate        DateTime
  sentAt         DateTime?
  lines          InvoiceLine[]
  payments       Payment[]
  createdAt      DateTime     @default(now())
  @@unique([subscriptionId, periodStart])
  @@index([status, dueDate])
  @@index([customerId])
}

model InvoiceLine {
  id             String  @id @default(cuid())
  invoiceId      String
  invoice        Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description    String
  qty            Int
  unitPrice      Int
  discountAmount Int     @default(0)
  taxAmount      Int     @default(0)
  amount         Int     // after discount, before tax
}

model Payment {
  id           String   @id @default(cuid())
  invoiceId    String
  invoice      Invoice  @relation(fields: [invoiceId], references: [id])
  method       String   // CASH | CARD | UPI | BANK
  amount       Int      // paise, > 0
  paidOn       DateTime
  note         String?
  externalRef  String?  @unique // gateway payment id, makes webhooks idempotent
  recordedById String?
  createdAt    DateTime @default(now())
  @@index([paidOn])
}

model AuditLog {
  id       String   @id @default(cuid())
  entity   String
  entityId String
  action   String
  userId   String?
  detail   String?
  at       DateTime @default(now())
  @@index([entity, entityId])
}

model BillingRun {
  id       String   @id @default(cuid())
  ranAt    DateTime @default(now())
  ranById  String?
  created  Int
  skipped  Int
  failed   Int
  report   String   // JSON array of { subscriptionId, outcome, message }
}
```

The constraints that protect the business rules:

| Rule | Enforced by |
| --- | --- |
| One account per email | `User.email @unique` |
| Nothing billed twice | `Invoice @@unique([subscriptionId, periodStart])` |
| Reset link usable once | `PasswordReset.usedAt` and `tokenHash @unique` |
| Same webhook not recorded twice | `Payment.externalRef @unique` |
| Fast lists with thousands of rows | Indexes on `Subscription.status`, `nextInvoiceDate`, `Invoice(status, dueDate)`, `Payment.paidOn` |

## 4. Business logic

All of this lives in `src/server/`. Functions take a Prisma transaction client `tx` so that callers can compose them atomically.

**Pricing assumption (confirm at kickoff).** An invoice has one *plan fee* line (the plan's `price`, qty 1, taxed with the default tax `DEFAULT_TAX_ID` from `.env`) plus one line per subscription line. A subscription line's `unitPrice` defaults to `product.salesPrice + variant.extraPrice`, so choosing the Odoo brand adds ₹560. `product.costPrice` is shown only on the admin product page.

### 4.1 Subscription status machine (owner: P2)

| From | To | Who | Rule and side effects |
| --- | --- | --- | --- |
| (new) | DRAFT | Admin, Staff | Number `SUB-0001` assigned; lines editable. Qty ≥ `plan.minQty` on every line; `expiryDate` > `startDate` |
| DRAFT | QUOTATION | Admin, Staff | This is the quotation step (there is no separate Quotation record). Sets `quoteValidUntil = today + template.validityDays` (default 15) |
| QUOTATION | CONFIRMED | Admin, Staff, owning Customer | Lines locked. Rejected with 409 if `quoteValidUntil` has passed |
| CONFIRMED | ACTIVE | Auto at `startDate`, or manual Activate | Sets `nextInvoiceDate = startDate` |
| ACTIVE | CLOSED (`CLOSED_EARLY`) | Admin, Staff | Only if `plan.closable`; sets `nextInvoiceDate = null` |
| ACTIVE | CLOSED (`PAUSED`) | Admin, Staff, owning Customer | Only if `plan.pausable`; billing stops |
| CLOSED (`PAUSED`) | ACTIVE | Admin, Staff, owning Customer | Resume; `nextInvoiceDate = today` |
| CLOSED (`EXPIRED`) | ACTIVE | Admin, Staff | Renew; only if `plan.renewable`; body gives new `expiryDate` |
| ACTIVE | CLOSED (`EXPIRED`) | Daily job | When `expiryDate` < today, or `plan.autoClose` and `plan.endDate` < today |
| QUOTATION | CLOSED (`EXPIRED`) | Daily job | When `quoteValidUntil` < today |

Any other move returns 409 `INVALID_TRANSITION`. Each move writes an `AuditLog` row. The UI stepper is Draft, Quotation, Confirmed, Active, Closed, with the current step highlighted and the close reason as a badge.

**Plan-level actions** (`POST /plans/:id/close|pause|renew`, owner P3): *close* sets `active=false` (only if `closable`; no new subscriptions, existing ones keep running); *pause* hides the plan from new quotes until resumed (only if `pausable`); *renew* extends `endDate` (only if `renewable`). A plan with `autoClose=true` is deactivated by the daily job once `endDate` passes.

### 4.2 Billing run (owner: P2)

**Build order (MVP).** First make the manual **Run billing** button work: the endpoint finds due subscriptions, creates invoices, and returns a report. Before billing, it also runs housekeeping (activate CONFIRMED subscriptions whose start date has arrived, close expired subscriptions and quotes) through one function `runHousekeeping(today)`. When acceptance tests 10-12 pass, add the scheduled job that calls the same two functions. If time runs short, the scheduler is the first thing cut.

`previewBilling(today)` and `runBilling(today, userId)` share one function; preview rolls the transaction back.

```ts
// src/server/billing/run.ts
export async function runBilling(prisma: PrismaClient, today: Date, userId: string, dryRun = false) {
  const due = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', nextInvoiceDate: { lte: endOfDay(today) } },
    include: { lines: true, plan: true },
  });
  const report: RunItem[] = [];
  for (const sub of due) {
    try {
      await prisma.$transaction(async (tx) => {
        // may need several periods if the job was missed: loop until caught up
        while (sub.nextInvoiceDate! <= endOfDay(today) && sub.nextInvoiceDate! <= sub.expiryDate) {
          const periodStart = sub.nextInvoiceDate!;
          const periodEnd = addPeriod(periodStart, sub.plan.billingPeriod);
          const exists = await tx.invoice.findUnique({
            where: { subscriptionId_periodStart: { subscriptionId: sub.id, periodStart } },
          });
          if (!exists) {
            const calc = await priceInvoice(tx, sub, periodStart, today); // 4.3
            await tx.invoice.create({ data: buildInvoiceData(sub, periodStart, periodEnd, calc) });
            await consumeDiscount(tx, calc.discount); // 4.4
            report.push({ subscriptionId: sub.id, outcome: 'CREATED' });
          } else {
            report.push({ subscriptionId: sub.id, outcome: 'SKIPPED_EXISTS' });
          }
          sub.nextInvoiceDate = periodEnd;
        }
        const finished = sub.nextInvoiceDate! > sub.expiryDate;
        await tx.subscription.update({
          where: { id: sub.id },
          data: { nextInvoiceDate: finished ? null : sub.nextInvoiceDate,
                  status: finished ? 'CLOSED' : 'ACTIVE',
                  closeReason: finished ? 'EXPIRED' : null },
        });
        if (dryRun) throw new RollbackForPreview(); // caught below, nothing saved
      });
    } catch (e) {
      if (!(e instanceof RollbackForPreview)) report.push({ subscriptionId: sub.id, outcome: 'FAILED', message: String(e) });
    }
  }
  if (!dryRun) await saveBillingRun(prisma, userId, report);
  return summarise(report);
}
```

Notes for the implementer: `addPeriod` uses `date-fns` (`addDays`, `addWeeks`, `addMonths`, `addYears`). For previews, return the computed invoice totals in the report items (collect `calc` before throwing the rollback). Invoice numbers come from `nextNumber(tx, 'INV')`, formatted `INV-<year>-<4 digits>`. A failed subscription is rolled back alone and shown in the run report; the others still bill. Running twice is safe because of the unique key and the `exists` check.

### 4.3 Pricing one invoice (owner: P2)

This is the shared pricing rule from the agreed decisions in section 1. The steps below are implemented once, in `priceSubscription()`, and called by the billing run, by `POST /subscriptions/price` and by nothing else.

1. Build candidate lines: plan fee line, then each subscription line (`description` = product name plus variant, e.g. "CRM Suite (Brand: Odoo)"), each carrying its `productId` and `taxId`.
2. `lineAmount = qty * unitPrice`.
3. Pick the discount (4.4) and spread it over lines.
4. `taxAmount = round((lineAmount - lineDiscount) * ratePercent / 100)` per line, using the line's tax (none means 0).
5. Totals: `subtotal = sum(lineAmount)`, `discountTotal`, `taxTotal`, `total = subtotal - discountTotal + taxTotal`.
6. `dueDate = invoiceDate + days(paymentTerm)` where IMMEDIATE is 0, NET15 is 15, NET30 is 30.

All amounts are integers in paise, rounded with `Math.round` per line, never on the total.

### 4.4 Discounts (owner: P2 engine, P3 CRUD)

A discount is **eligible** for an invoice when all of these hold: `active`; `startDate ≤ today ≤ endDate`; `usedCount < usageLimit`; and its scope matches, either PRODUCT (some candidate line has `productId = discount.productId`) or SUBSCRIPTION (`discount.subscriptionId = sub.id`). Then apply the thresholds on the **applicable base** (the matching lines for PRODUCT, all lines for SUBSCRIPTION): base ≥ `minPurchase` and total qty ≥ `minQty`.

- Saving: PERCENT is `round(base *` `percent / 100); FIXED is min(fixedAmount, base), both integers in paise`.
- If several are eligible, use the one with the largest saving. One discount per invoice.
- Spread across applicable lines in proportion to their amounts; the last line takes the rounding remainder.
- `consumeDiscount` runs `updateMany({ where: { id, usedCount: { lt: usageLimit } }, data: { usedCount: { increment: 1 } } })`. If it updates 0 rows (someone else used the last slot), recompute that invoice without the discount.
- Because discounts are looked up at billing time, the next invoice picks them up automatically and they stop when expired or used up. Show the discount name on the invoice line.

### 4.5 Invoices and payments (owner: P4)

| Action | Allowed when | Result |
| --- | --- | --- |
| Confirm | DRAFT | CONFIRMED; audit row. Bulk confirm accepts an array of ids |
| Cancel | DRAFT or CONFIRMED with no payments | CANCELLED; the subscription's `nextInvoiceDate` is not moved back (finance reissues manually) |
| Send | CONFIRMED | Email with PDF via Nodemailer; sets `sentAt` |
| Print | any except CANCELLED | `GET /invoices/:id/pdf` returns the PDF; browser print dialog |
| Record payment | CONFIRMED | See below |

```ts
// src/server/payments/record.ts
export async function recordPayment(tx, invoiceId, input, userId) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (inv.status !== 'CONFIRMED') throw new HttpError(409, 'INVOICE_NOT_PAYABLE');
  const balance = inv.total - inv.paidTotal;
  if (input.amount > balance) throw new HttpError(422, 'OVERPAYMENT', { field: 'amount' });
  await tx.payment.create({ data: { invoiceId, ...input, recordedById: userId } });
  const paidTotal = inv.paidTotal + input.amount;
  await tx.invoice.update({ where: { id: invoiceId },
    data: { paidTotal, status: paidTotal === inv.total ? 'PAID' : 'CONFIRMED' } });
  await audit(tx, { entity: 'Invoice', entityId: invoiceId, action: 'PAYMENT', userId });
}
```

**Overdue** is computed, never stored: `status = 'CONFIRMED' AND dueDate < today AND paidTotal < total`. **Ageing buckets** by days past due: 1-30, 31-60, 61+.

### 4.6 Report definitions (owner: P4)

| Metric | Definition |
| --- | --- |
| Active subscriptions | Count where status = ACTIVE |
| MRR | Sum over ACTIVE subscriptions of recurring amount before tax, normalised to a month: DAILY × 30, WEEKLY × 52 / 12, MONTHLY × 1, YEARLY ÷ 12 |
| ARR | MRR × 12 |
| Revenue collected (range) | Sum of `Payment.amount` where `paidOn` is in the range |
| Outstanding | Sum of `total - paidTotal` over CONFIRMED invoices |
| Overdue | Outstanding invoices past due, with ageing buckets |
| Customer health | RED if any invoice is over 30 days overdue; AMBER if any is overdue; else GREEN |
| Inbox items | Subscriptions expiring in 7 days; invoices overdue; discounts ending in 7 days or 90% used; quotes expiring in 3 days |

## 5. API reference

Base path `/api/v1`, files at `src/app/api/v1/<area>/route.ts` (and `[id]/route.ts`). Response and error shapes are in section 1. "Role" lists who may call; the route calls `requireRole` first. Money fields are integers in paise. Dates are ISO strings. Field rules are the zod rules; the UI uses the same schema.

### 5.1 Auth and users (owner: P1)

| Method and path | Role | Body | Rules and result |
| --- | --- | --- | --- |
| POST `/auth/signup` | Public | `name`, `email`, `password`, `phone?` | Email valid and unique (409 `EMAIL_TAKEN`); password regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`; creates Customer and User(CUSTOMER); sets cookie; 201 |
| POST `/auth/login` | Public | `email`, `password` | 401 `BAD_CREDENTIALS` with one message for unknown email or wrong password; 403 if `active=false`; sets cookie |
| POST `/auth/logout` | Any | none | Clears cookie |
| GET `/auth/me` | Any | none | `{ id, email, role, customerId, name }` |
| POST `/auth/forgot` | Public | `email` | Always 200 (never reveals whether the email exists); if found, stores a hashed token valid 30 minutes and emails `/reset?token=` |
| POST `/auth/reset` | Public | `token`, `password` | Token must exist, be unexpired and unused (else 410 `TOKEN_INVALID`); password rule as signup; marks token used |
| POST `/users/staff` | Admin | `name`, `email`, `password` | Creates User(STAFF); same email and password rules |
| GET `/users` | Admin | `?role&q&page` | Paged list |
| PATCH `/users/:id` | Admin | `active?`, `role?` | Cannot deactivate yourself |
| GET `/audit` | Admin | `?entity&entityId&page` | Newest first |

### 5.2 Catalog and pricing (owner: P3)

| Method and path | Role | Body or query | Rules |
| --- | --- | --- | --- |
| GET, POST `/products` | Read: Admin, Staff. Write: Admin | `name` 2-80, `type`, `salesPrice` ≥ 0, `costPrice` ≥ 0, `notes?` | List supports `?q&type&active` |
| GET, PATCH, DELETE `/products/:id` | Same | partial of above | DELETE sets `active=false` if the product is on any subscription line, else removes |
| POST `/products/:id/variants` | Admin | `attribute`, `value`, `extraPrice` ≥ 0 | Unique per (product, attribute, value) → 409 |
| DELETE `/products/:id/variants/:vid` | Admin | none | Blocked (409) if used on a subscription line |
| GET, POST `/plans` | Read: Admin, Staff, Customer (active only). Write: Admin | `name`, `price` ≥ 0, `billingPeriod`, `minQty` ≥ 1, `startDate`, `endDate?`, `autoClose`, `closable`, `pausable`, `renewable` | `endDate` ≥ `startDate`; `autoClose` requires `endDate` |
| PATCH `/plans/:id` | Admin | partial | Price change affects only future invoices |
| POST `/plans/:id/close`, `/pause`, `/renew` | Admin | renew: `endDate` | 409 if the plan's flag does not allow it |
| GET, POST, PATCH, DELETE `/taxes` | Read: Admin, Staff. Write: Admin | `name`, `ratePercent` 0-100 | In-use tax is deactivated, not deleted |
| GET, POST, PATCH `/discounts` | Read: Admin, Staff. Write: **Admin only** | `name`, `type`, `fixedAmount in paise (> 0) when type is FIXED, or percent as a whole number 1-100 when type is PERCENT; exactly one is set and it must match the type`, `minPurchase` ≥ 0, `minQty` ≥ 0, `startDate`, `endDate`, `usageLimit` ≥ 1, `appliesTo`, `productId` or `subscriptionId` | `endDate` ≥ `startDate`; target must exist and match `appliesTo`; response includes `usedCount` |

### 5.3 Customers, templates, subscriptions (owner: P2; customers also P2)

| Method and path | Role | Body or query | Rules |
| --- | --- | --- | --- |
| GET, POST `/customers` | Admin, Staff | `name`, `company?`, `phone?`, `address?`, `gstin?` | Phone 7-15 digits; GSTIN pattern `^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$` if given |
| GET, PATCH `/customers/:id` | Admin, Staff; Customer own | partial | Includes health badge in GET |
| GET, POST `/quotation-templates` | Admin, Staff | `name`, `validityDays` 1-365, `planId`, `lines[]` of `productId`, `variantId?`, `qty` | At least one line |
| GET `/subscriptions` | Admin, Staff | `?status&customerId&q&page&limit` | Paged; Customer gets own only |
| POST `/subscriptions` | Admin, Staff | `customerId`, `planId`, `startDate`, `expiryDate`, `paymentTerm`, `lines[]` | Rules of 4.1; qty ≥ `plan.minQty`; unit prices filled server side |
| POST `/subscriptions/from-template/:templateId` | Admin, Staff | `customerId`, `startDate`, `expiryDate`, `paymentTerm` | Copies plan and lines; status DRAFT |
| GET, PATCH `/subscriptions/:id` | Admin, Staff; Customer GET own | partial | PATCH only while DRAFT |
| POST `/subscriptions/:id/transition` | Admin, Staff | `to`, `reason?`, `expiryDate?` (renew) | Table in 4.1; 409 on invalid move |
| POST /subscriptions/price | Admin, Staff | planId, lines\[\] of productId, variantId?, qty | Returns per-line amounts, discount, tax and total from priceSubscription(); saves nothing. The only source of totals shown in the form |

### 5.4 Billing (owner: P2)

| Method and path | Role | Body | Result |
| --- | --- | --- | --- |
| GET `/billing/preview` | Admin, Staff | `?date=` (default today) | `{ count, totalAmount, items: [{ subscriptionId, number, customerName, periodStart, total }] }` and nothing is saved |
| POST `/billing/run` | Admin, Staff | `date?` | `{ created, skipped, failed, report }`; saved to `BillingRun` |
| GET `/billing/runs` | Admin, Staff | `?page` | History of runs |
| POST `/jobs/daily` | Internal (secret header); build only after the manual Run billing works | none | Closes expired subscriptions and quotes, activates due CONFIRMED ones, then runs billing; the cron calls this |

### 5.5 Invoices, payments, portal, reports (owner: P4)

| Method and path | Role | Body or query | Rules |
| --- | --- | --- | --- |
| GET `/invoices` | Admin, Staff; Customer own | `?status&overdue=true&customerId&from&to&q&page` | Overdue per section 4.5 |
| GET `/invoices/:id` | Same | none | Includes lines and payments |
| POST `/invoices/:id/confirm`, `/cancel`, `/send` | Admin, Staff | none | 409 if state does not allow |
| POST `/invoices/bulk-confirm` | Admin, Staff | `ids[]` max 500 | Returns per-id result |
| GET `/invoices/:id/pdf` | Same as GET | none | `application/pdf`, with UPI QR |
| POST `/invoices/:id/payments` | Admin, Staff | `method`, `amount` > 0, `paidOn` (not in future), `note?` ≤ 200 | 409 if invoice not CONFIRMED; 422 if amount exceeds balance; an optional Idempotency-Key header is stored as externalRef so offline replays never double-record |
| GET `/payments` | Admin, Staff | `?method&from&to&page` | Includes invoice number and customer |
| POST `/webhooks/razorpay` (stretch) | Signed by gateway | gateway payload | Verifies signature; inserts payment with `externalRef` (duplicate ignored) |
| GET `/me/subscriptions`, `/me/invoices` | Customer | paging | Own data only |
| POST `/me/subscriptions/:id/pause` | Customer | none | Only if `plan.pausable` |
| POST `/me/subscriptions/:id/seats` | Customer | `qty` ≥ `plan.minQty` | Only while ACTIVE; applies from the next invoice; audited |
| GET `/reports/summary` | Admin, Staff | `?from&to` | `{ activeSubscriptions, mrr, arr, collected, outstanding, overdueCount, overdueAmount }` |
| GET /reports/revenue | Admin, Staff | ?from&to&groupBy (day or month) | Series for the chart |
| GET `/reports/overdue` | Admin, Staff | `?page` | Rows plus ageing buckets |
| GET `/reports/inbox` | Admin, Staff | none | Grouped task list from section 4.6 |

Performance contract: every list endpoint uses `take/skip` and a `count`, selects only the columns the table shows, and answers under 500 ms on 5,000 subscriptions and 15,000 invoices. Summary endpoints use `groupBy` or raw `SUM` queries, never loop over rows in JavaScript.

## 6. UI specification

**Look and layout.** Tailwind with shadcn/ui. Indigo primary `#4F46E5`, slate greys, green `#16A34A`, amber `#D97706`, red `#DC2626` reserved for status. Inter font, 8 px spacing steps, 12 px rounded cards. Left sidebar (240 px, collapsible) on screens ≥ 1024 px; bottom tab bar with 4-5 items on phones. Page header = title, breadcrumb, primary action on the right. Content max width 1200 px. Every list page has: search box, filter chips, sortable columns, server pagination, row click to detail, skeleton while loading, empty state with one button, error banner with retry.

**Forms.** React Hook Form + zod resolver, validate on blur and on submit, error text under the field in red, submit button disabled while saving, server 422 `fields` mapped back onto inputs, toast on success. Money inputs show ₹ and accept rupees; convert to paise on submit.

**Status chips** (one component, `StatusChip`): DRAFT grey, QUOTATION blue, CONFIRMED indigo, ACTIVE green, CLOSED slate, PAID green, OVERDUE red, CANCELLED slate with strike. Health badge: green, amber, red dot.

### Pages

| Route | Role | Owner | What it shows and does |
| --- | --- | --- | --- |
| `/login`, `/signup`, `/forgot`, `/reset` | Public | P1 | Centered card. Signup shows a live password checklist (9+ chars, upper, lower, special). Forgot shows a neutral confirmation. Reset reads `?token` |
| `/dashboard` | Admin, Staff | P4 | Revenue Radar: stat cards (Active subscriptions, MRR, Collected this month, Outstanding, Overdue), revenue-by-month bar chart, overdue ageing chart, recent payments, inbox panel. Date-range filter. Under 2 s |
| `/inbox` | Admin, Staff | P4 | Grouped tasks (renewals due, overdue invoices, ending discounts) with one-click open |
| `/customers`, `/customers/[id]` | Admin, Staff | P2 | List with health badge. Detail: profile, subscriptions, invoices, payments tabs |
| `/subscriptions` | Admin, Staff | P3 | Table (number, customer, plan, status chip, next invoice, expiry). Filters by status |
| `/subscriptions/new` | Admin, Staff | P3 | Pick customer, then plan or template (template prefills lines), dates, payment term, line editor (product, variant, qty, unit price read-only, tax, amount), live totals |
| `/subscriptions/[id]` | Admin, Staff | P2 | Stepper Draft to Closed; action buttons depend on status and plan flags; lines; invoice list; audit timeline |
| `/billing` | Admin, Staff | P2 | Date picker, **Preview** table (customer, period, total, with grand total), **Run billing** button with confirmation dialog, result summary (created, skipped, failed with reasons), run history |
| `/invoices` | Admin, Staff | P4 | Table with status and Overdue filter, bulk select and **Confirm selected** |
| `/invoices/[id]` | Admin, Staff | P4 | Header with number, customer, period, status; lines with discount and tax columns; totals box; buttons Confirm, Cancel, Send, Print/PDF, **Record payment**; payments list |
| `/payments` | Admin, Staff | P4 | Table with method, amount, date, note, invoice link. Filters by method and date |
| `/catalog/products`, `/catalog/plans`, `/catalog/templates` | Admin (write), Staff (read) | P3 | Lists with create dialog or page. Product form has a variants sub-table (attribute, value, extra price). Plan form has the four billing periods as a select and the four flag switches (auto close, closable, pausable, renewable) with help text |
| `/pricing/taxes`, `/pricing/discounts` | Admin (write), Staff (read) | P3 | Tax list. Discount form with type toggle (Fixed or Percent), thresholds, dates, usage limit, scope select that reveals a product or subscription picker; list shows used / limit and a status of Scheduled, Active, Expired, Used up |
| `/team` | Admin | P1 | Staff list, **Add staff** dialog, activate or deactivate |
| `/audit` | Admin | P1 | Filterable log |
| `/my/subscriptions` | Customer | P4 | Cards with plan, status, next billing date, buttons Pause (if allowed) and Change seats; invoice summary |
| `/my/invoices` | Customer | P4 | Own invoices with status, PDF download, UPI QR on unpaid ones |

**Record-payment dialog (P4):** method select (Cash, Card, UPI, Bank), amount prefilled with the balance and capped at it, date defaulting to today and not in the future, note up to 200 characters; on save the invoice chip updates to Paid when the balance reaches zero.

**Responsive rules:** tables turn into stacked cards below 768 px; dialogs become full-screen sheets on phones; touch targets at least 44 px; no horizontal page scroll. Check every page at 375, 768 and 1280 px before the freeze.

## 7. Personal build guides

Each guide lists what you own, in the order to build it, what you need from others, what you hand over, and when you are done. Times are minutes from the start (0:00). Tick items as you go. Sync points are at 1:15, 2:30 and 3:30.

### P1: Platform and security lead

**You own:** `prisma/`, `src/server/auth/`, `src/app/api/v1/{auth,users,audit}/`, `middleware.ts`, `src/components/shell/`, `src/lib/{db,money,constants,schemas/auth}.ts`, pages `/login /signup /forgot /reset /team /audit`.

**You unblock everyone, so do these first:**

- [ ] 0:00 Create the GitHub repo, `pnpm create next-app` with TypeScript, Tailwind, App Router; add shadcn/ui, Prisma, zod, React Hook Form, date-fns, jose, bcryptjs; push `main`; invite all three, set branch protection.
- [ ] 0:15 Commit `schema.prisma` from section 3, run the first migration, push. Everyone pulls.
- [ ] 0:25 Commit `lib/constants.ts` (status and enum lists), `lib/money.ts`, `lib/db.ts`, the error helper `HttpError` and `apiHandler` wrapper that returns the error shape from section 1, and `requireRole`. Everyone uses these.
- [ ] 0:30 Seed script: admin user, 1 staff, 2 taxes (GST 18%, GST 5%), 5 products with variants, 4 plans, 2 templates, 50 customers (3 with logins). Then expand (section 8).
- [ ] 0:45 Auth API: signup, login, logout, me, forgot, reset, with the password regex and 30-minute single-use token; MailHog on port 1025.
- [ ] 1:15 **Sync 1.** Schema frozen. Post the `.env.example`.
- [ ] 1:30 AppShell: sidebar, bottom tab bar, role-based menu from a single `menu.ts` config, top bar with user menu and logout. Auth pages with the live password checklist.
- [ ] 2:00 Staff creation API and `/team`; `PATCH /users/:id`; audit helper and `/audit`.
- [ ] 2:30 Route protection: `middleware.ts` redirects unauthenticated users to `/login` and customers away from admin routes.
- [ ] 3:00 Responsive pass over every page at 375, 768 and 1280 px; fix layout bugs you find and log others as issues.

**Done when:** a new user can sign up, log in, reset a password through MailHog; the admin can add staff; a customer typing an admin URL is redirected; the schema did not change after 1:15.

### P2: Billing engine lead

**You own:** `src/server/{subscriptions,billing,discounts}/`, `src/app/api/v1/{customers,quotation-templates,subscriptions,billing,jobs}/`, pages `/customers /subscriptions/[id] /billing`.

**Needs from others:** schema (P1, 0:15), `requireRole` and `apiHandler` (P1, 0:25), plans, taxes, discounts rows (P3 seed or API).

- [ ] 0:30 Pure functions with unit tests first: `addPeriod`, `priceInvoice`, `pickBestDiscount`, `allocateDiscount`, `calcTax`. Use Vitest. Tests include the ₹560 Odoo variant, a percent discount with minimum quantity, a fixed discount larger than the base, and rounding of three lines.
- [ ] 0:50 Number generator `nextNumber(tx, 'SUB' | 'INV')`.
- [ ] 1:00 Subscription API and `transition` with the table from 4.1; customers API.
- [ ] 1:15 **Sync 1.**
- [ ] 1:30 `runBilling` and `previewBilling` from 4.2, including the catch-up loop and the unique-key skip.
- [ ] 2:00 Test that matters most: run billing twice and assert invoice count is unchanged; expire a discount and assert the next invoice has none; run with one broken subscription and assert the others bill.
- [ ] 2:15 Only after acceptance tests 10-12 pass with the manual **Run billing** button: add `/jobs/daily` and `node-cron` in `instrumentation.ts` (02:00 Asia/Kolkata), protected by `JOB_SECRET`, calling the same functions as the button. Cut this first if late.
- [ ] 2:30 **Sync 2.** `/billing` page: preview table, run dialog, result summary. Subscription detail page with the stepper.
- [ ] 3:15 Expose `pauseSubscription` and `changeSeats` functions for P4's portal routes (needed by 2:30 if possible).
- [ ] 3:30 Seed a demo month: 200 subscriptions in mixed statuses so the billing preview is impressive.

**Done when:** billing twice creates no duplicates; a discount appears on its own next invoice and stops at its limit; tax matches rules; a failed subscription does not stop the run.

### P3: Catalog and admin UI lead

**You own:** `src/server/catalog/`, `src/app/api/v1/{products,plans,taxes,discounts}/`, `src/lib/schemas/{catalog,pricing,subscription}.ts`, pages `/catalog/* /pricing/* /subscriptions /subscriptions/new`, shared `DataTable`, `StatusChip`, `MoneyInput`, `FormField` components.

- [ ] 0:30 Build `DataTable` (TanStack Table, server pagination, search, filter chips, skeleton, empty state) and `MoneyInput` (rupees in, paise out). P2 and P4 reuse them, so push within 45 minutes.
- [ ] 0:45 zod schemas for products, plans, taxes, discounts per section 5.2; commit them before the routes so the forms and API share them.
- [ ] 1:00 Products and variants API and pages.
- [ ] 1:15 **Sync 1.**
- [ ] 1:30 Plans API and page with the four flag switches; plan actions close, pause, renew.
- [ ] 2:00 Taxes and discounts (Admin write only: test with the Staff account that creating returns 403 and the buttons are hidden).
- [ ] 2:15 Quotation templates page.
- [ ] 2:30 **Sync 2.** Subscription list and create page: template prefill, line editor with variant price, live totals fetched from POST /subscriptions/price (never computed in the browser), validation for minimum quantity.
- [ ] 3:15 Validation sweep: try bad input on every form (negative price, end before start, 101% discount, empty line list) and confirm both browser and server reject it.

**Done when:** an admin launches a product with an Odoo +₹560 variant and a monthly plan, builds a template, creates a discount, and creates a subscription from the template with correct totals.

### P4: Money, reporting and portal lead

**You own:** `src/server/{invoices,payments,reports,portal}/`, `src/app/api/v1/{invoices,payments,me,reports,webhooks}/`, `src/lib/pdf/`, `src/lib/offline/`, pages `/dashboard /inbox /invoices /payments /my/*`.

- [ ] 0:30 Report queries as SQL or Prisma `groupBy` against the seed data: summary, revenue by month, overdue with ageing, inbox. Write each as a function with a test.
- [ ] 0:50 Invoice actions (confirm, cancel, bulk confirm, send) and `recordPayment` from 4.5, with a test for over-payment and for the automatic Paid status.
- [ ] 1:15 **Sync 1.**
- [ ] 1:30 `/dashboard` with stat cards and two Recharts charts; connect to the live endpoints, not static JSON.
- [ ] 2:00 Invoice list and detail pages; record-payment dialog.
- [ ] 2:15 Invoice PDF with `@react-pdf/renderer` and a UPI QR (`upi://pay?pa=<VPA>&am=<amount>&tn=<invoice number>`; VPA from `.env`).
- [ ] 2:30 **Sync 2.** Customer portal: subscriptions with Pause and Change seats (call P2's functions), invoices with PDF.
- [ ] 3:00 `/payments` and `/inbox`; health badge in the customer list query.
- [ ] 3:30 PWA with Serwist and a Dexie cache of the last invoice and payment lists; queue payments recorded offline and replay them when `navigator.onLine` returns; show `OfflineBanner`.
- [ ] 4:00 Performance check with 5,000 subscriptions and 15,000 invoices (section 8); add indexes until each endpoint is under 2 s.
- [ ] Stretch: Razorpay test-mode payment link on the invoice page and `/webhooks/razorpay` that verifies the signature and inserts a payment with `externalRef`.

**Done when:** the finance lead sees active, MRR, collected, outstanding and overdue on one page with filters; recording payments flips invoices to Paid; a customer sees only their own invoices; the app loads cached lists offline.

### Hand-offs between people

| From | To | What | By |
| --- | --- | --- | --- |
| P1 | All | Schema, `requireRole`, `apiHandler`, seed, `.env.example` | 0:30 |
| P3 | P2, P4 | `DataTable`, `StatusChip`, `MoneyInput`, zod schemas | 1:00 |
| P3 | P2 | Plans, taxes, discounts available in the DB or API | 1:30 |
| P2 | P4 | Invoices exist after a billing run; `pauseSubscription`, `changeSeats` | 2:30 |
| P4 | P2 | Payment and invoice status fields behave as in 4.5 | 2:30 |
| All | All | Merge to `main`, everyone pulls, run the demo script once | 2:30, 3:30 |

## 8. Seed data, tests, performance and offline

### 8.1 Seed data (P1, then P2 extends)

| Data | Quantity | Notes |
| --- | --- | --- |
| Users | 1 admin, 2 staff, 3 customer logins | `admin@loopledger.test`, `staff@loopledger.test`, `customer1@loopledger.test`; all with password `Passw0rd!x` (meets the rule); print them in the console after seeding |
| Taxes | 2 | GST 18%, GST 5% |
| Products | 5 | One with Brand variants (Odoo +₹560, SAP +₹900, Zoho +₹0) |
| Plans | 4 | Monthly, Yearly, Weekly, Daily; mix of flag settings |
| Templates | 2 | Each with 2-3 lines |
| Discounts | 3 | 10% with min qty 5; ₹500 fixed; one expired for testing |
| Customers | 50 |  |
| Subscriptions | 200 | Mixed statuses; 60 ACTIVE with `nextInvoiceDate` spread across the past month so billing has work |
| Invoices and payments | 300 and 200 | Mixed Paid, Confirmed, overdue at different ages for the ageing chart |

Run with `pnpm db:seed`. A second script `pnpm db:seed:large` generates 5,000 subscriptions, 15,000 invoices and 12,000 payments with `createMany` in batches of 500, for the performance check.

### 8.2 Acceptance tests mapped to the brief

Each row is one manual or automated check. P2 and P4 automate the starred ones with Vitest; everything else is clicked through before the freeze.

| # | Scene | Check | Expected |
| --- | --- | --- | --- |
| 1 | Signup | Same email twice | Second fails with 409 and a field message |
| 2 | Signup | Passwords `Abcdefg!` (8 chars), `abcdefgh1!`, `ABCDEFGH1!`, `Abcdefghi1` | All rejected; `Abcdefgh1!` accepted |
| 3 | Signup | Forgot password | Email appears in MailHog; link works once, then fails |
| 4 | Roles | Staff calls `POST /users/staff` | 403 |
| 5 | Roles | Customer 1 opens customer 2's invoice URL | 404 or 403, never data |
| 6 | Catalog | Product with Odoo variant in a line | Unit price = salesPrice + ₹560 |
| 7 | Plans | Plan with `closable=false`, try to close early | 409 |
| 8 | Quote | Create from template; expire `quoteValidUntil`; confirm | 409; daily job closes it |
| 9 | Subscription | Walk Draft to Closed | Each step allowed once; invalid jumps return 409 \* |
| 10 | Billing | Run billing twice on the same day | Second run creates 0 invoices \* |
| 11 | Billing | Subscription missed for 3 months | 3 invoices, one per period, not one big invoice \* |
| 12 | Billing | One subscription with a bad tax id | Others still billed; failure listed \* |
| 13 | Tax | Line ₹1,000 with GST 18% | Tax ₹180.00 |
| 14 | Discount | Staff tries to create a discount | 403 |
| 15 | Discount | 10% with min qty 5; qty 4 then qty 5 | Not applied, then applied, on its own \* |
| 16 | Discount | Usage limit 2, bill 3 subscriptions | 2 discounted, third full price \* |
| 17 | Payment | Pay more than the balance | 422 on `amount` \* |
| 18 | Payment | Two part payments reaching the total | Invoice flips to PAID \* |
| 19 | Reports | Overdue list | Matches invoices that are CONFIRMED and past due; ageing buckets add up |
| 20 | Performance | Large seed, every list and dashboard | Each under 2 s |
| 21 | Offline | Disconnect, open invoices, record a payment, reconnect | Cached list shows; payment replays once |
| 22 | Responsive | 375, 768, 1280 px | No horizontal scroll; tables become cards on phone |

### 8.3 Performance checklist (P4, with P2)

- Indexes exist as in section 3; check with `EXPLAIN QUERY PLAN` on the three slowest queries.
- Lists use `select` with only displayed columns and `take/skip`; counts use a separate `count` call.
- Dashboard summary is three or four aggregate queries run with `Promise.all`; no per-row loops.
- Billing preview for 500 due subscriptions completes in a few seconds; run in batches of 50 transactions if needed.
- Next.js: cache nothing sensitive; use `loading.tsx` skeletons so pages feel instant.

### 8.4 Offline design (P4)

1. Serwist registers a service worker that precaches the app shell and static assets, so the UI opens with no network.
2. After each successful GET of `/invoices`, `/payments`, `/subscriptions` page 1, store the JSON in Dexie with a `savedAt` time.
3. When a fetch fails with a network error, read the cache, show the data with a banner "Offline: showing data saved at 10:42".
4. Recording a payment while offline writes `{ id: uuid, invoiceId, method, amount, paidOn, note }` to a Dexie `outbox` table and shows it as "Pending sync".
5. On the `online` event, send the outbox items one by one to `POST /invoices/:id/payments` with an `Idempotency-Key` header equal to the uuid; the server stores it as `externalRef` so a retry never double-records.
6. Conflicts (invoice already paid or amount above balance) show in a list with the server's message for the user to resolve; they are never silently dropped.

The database and API run on the same laptop, so "offline" here means the browser lost the server or the internet; everything the demo needs also works with Wi-Fi off.

## 9. Setup, Git workflow and definition of done

### 9.1 Setup (everyone, 10 minutes)

Prerequisites: Node 20+, pnpm, Git, and MailHog (a single binary from its GitHub releases, or `npx maildev` as a no-install alternative on port 1025/1080).

```bash
git clone <repo-url> && cd loopledger
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm db:seed
pnpm dev            # http://localhost:3000
```

`.env.example` (P1 commits this; real `.env` is git-ignored):

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-to-a-long-random-string"
JOB_SECRET="another-long-random-string"
APP_URL="http://localhost:3000"
SMTP_HOST="localhost"
SMTP_PORT="1025"
MAIL_FROM="billing@loopledger.test"
DEFAULT_TAX_ID="<id of GST 18% printed by the seed>"
UPI_VPA="brightloop@upi"
# stretch
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
```

Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `test` (Vitest), `db:seed`, `db:seed:large`, `db:reset` (`prisma migrate reset --force`).

### 9.2 Git workflow

- `main` is protected: no direct pushes, merge by pull request, at least one approval from a teammate.
- One branch per feature, named `<person>/<topic>`: `p1/auth-api`, `p2/billing-run`, `p3/plans-ui`, `p4/dashboard`. Branches live under 90 minutes; merge early and often.
- Commit at least every 30 minutes in the style `type(scope): message` (`feat(billing): skip existing period`, `fix(auth): reject 8-char password`). Types: feat, fix, refactor, test, docs, chore.
- Pull `main` into your branch before opening a PR (`git pull --rebase origin main`). Resolve conflicts yourself; if the conflict is in someone else's folder, ask them.
- Pull request template: what changed, how to test, screenshot for UI. The reviewer actually runs it.
- Reviewer rotation: P1 reviews P2, P2 reviews P4, P4 reviews P3, P3 reviews P1. Review within 10 minutes; a quick review is better than a perfect one.
- Files shared by several people (`package.json`, `schema.prisma`, `menu.ts`, `constants.ts`): change them in a tiny PR of their own and merge at once.
- Never commit `.env`, `dev.db`, or `node_modules`.
- At the end: tag `v1.0`; the history should show commits from all four.

### 9.3 Definition of done (for any task)

1. It works against the live local API and database, not static JSON.
2. Inputs are validated in the form and on the server; the error appears under the right field.
3. Roles are enforced on the server; checked with the wrong role.
4. Loading, empty and error states exist.
5. It looks right at 375, 768 and 1280 px and uses the shared components and colours.
6. Reviewed and merged into `main`; the app still starts from a clean clone.

### 9.4 Demo script (5 minutes, rehearse once at 4:30)

1. Sign up a new customer and show the password rules failing and passing.
2. As admin: add a product with the Odoo +₹560 variant, add a monthly plan, a tax and a 10% discount with a minimum quantity.
3. Create a subscription from a quotation template; walk it Draft to Active.
4. Open Billing: **Preview**, **Run**, then **Run** again to show nothing duplicates. Open an invoice with discount and tax lines.
5. Confirm the invoice, download the PDF with the UPI QR, record a part payment and then the rest; the chip turns Paid.
6. Open the dashboard: active subscriptions, MRR, collected, outstanding, overdue with ageing, and the inbox.
7. Log in as the customer: only their data; pause a subscription.
8. Turn Wi-Fi off: the cached invoice list opens; record a payment; turn Wi-Fi on and watch it sync.
9. Show the Git graph with four contributors.

### 9.5 Risks and what to cut

| Risk | Mitigation |
| --- | --- |
| Schema change after the freeze | Only P1 edits it; changes announced in chat; `pnpm db:reset` fixes local databases |
| Billing bug costing the demo | Vitest cases for billing written before the engine; demo data seeded by script |
| Merge conflicts in shared files | Tiny PRs for shared files; folder ownership in section 7 |
| Next.js dev server slow on large lists | Use `pnpm build && pnpm start` for the performance check and the demo |
| Running late | Cut in this order: node-cron scheduler, Razorpay stretch, offline write queue (keep read cache), audit page, health badge, UPI QR, portal seat change |

### 9.6 Assumptions to confirm at kickoff (2 minutes)

1. Currency INR, GST-style percentage taxes, payment terms Immediate, Net 15, Net 30.
2. Invoice = plan fee line plus product lines (section 4).
3. Paused is stored as Closed with reason Paused, so the five required statuses stay unchanged.
4. Billing run creates invoices in Draft; staff confirm them (single or bulk).
5. "Print" means a PDF opened in the browser print dialog.
