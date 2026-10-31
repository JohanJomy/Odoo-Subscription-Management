# LoopLedger System Design & Architecture

> **System:** LoopLedger Subscription Management System  
> **Company:** Brightloop Software  
> **Tech Stack:** Next.js 15 (App Router) + TypeScript, Prisma ORM, SQLite (`dev.db`), Tailwind CSS + shadcn/ui, TanStack Table, Recharts, Zod, React Hook Form, date-fns, jose, bcryptjs.

---

## 1. Core Principles & Architecture Decisions

1. **One Repo, One Language**: Monorepo using Next.js 15 (TypeScript) serving both UI pages and `/api/v1` route handlers. No separate backend process.
2. **Database & ORM**: Prisma ORM with SQLite file (`file:./dev.db`). Uses real database constraints (unique compounds, foreign keys). Single line change to Postgres for production.
3. **Money Representation**: 
   - **Always integers in paise** ($\text{₹}1 = 100\text{ paise}$). Never floating point.
   - Formatted only at UI display using `formatMoney(paise)` from `lib/money.ts` (`en-IN` locale, e.g. `₹1,23,456.00`).
4. **Dates & Timezone**:
   - Stored as UTC `DateTime`.
   - Billing calculations and comparisons done as date-only in `Asia/Kolkata`.
   - JSON exchanges use ISO 8601 strings.
5. **Identifiers & Human Numbers**:
   - Primary keys are `cuid()` strings.
   - Human-readable identifiers are stored in separate unique columns (e.g. `SUB-0001`, `INV-2026-0001`).
6. **Enums**:
   - Stored as `String` in Prisma (SQLite safe).
   - Strictly enforced via Zod enums in `lib/constants.ts` (single source of truth).
7. **Quotation is a Subscription Status, Not a Table**:
   - There is NO separate Quotation table.
   - A quotation template instantiates a `Subscription` in `DRAFT`.
   - Progressing to `QUOTATION` is the quotation step.
8. **Pause is Closed with Close Reason**:
   - There is NO `PAUSED` status in `SUBSCRIPTION_STATUSES`.
   - Exactly 5 statuses exist: `DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `CLOSED`.
   - Pausing sets `status = 'CLOSED'` with `closeReason = 'PAUSED'`. The UI displays a "Paused" chip derived from `closeReason`.
9. **Single Source of Truth for Pricing**:
   - `priceSubscription()` in `src/server/billing/pricing.ts` is the **only** function that calculates invoice amounts.
   - No frontend or duplicate calculation helpers.
10. **Server-Side Security First**:
    - Never trust the client. Hiding UI elements is purely cosmetic.
    - All queries enforce role checks and customer tenancy isolation.

---

## 2. Roles & Permissions (RBAC)

The system supports three distinct roles: `ADMIN`, `STAFF`, and `CUSTOMER`.

| Capability | Admin | Staff | Customer |
| :--- | :---: | :---: | :---: |
| Sign up, Log in, Reset password | Yes | Yes | Yes |
| Create Staff account (`POST /users/staff`) | **Yes** | No | No |
| Catalog (Products, Variants, Plans): Create/Edit/Delete | **Yes** | View Only | View Only (active plans) |
| Pricing (Taxes, Discounts): Create/Edit/Delete | **Yes** | View Only | No |
| Quotation Templates: CRUD | **Yes** | **Yes** | No |
| Customers: Create, Edit, View all | **Yes** | **Yes** | Own record only |
| Subscriptions: Create, Edit, Change status | **Yes** | **Yes** | View own; Pause & Seat change (if plan allows) |
| Billing Run: Preview & Execute | **Yes** | **Yes** | No |
| Invoices: Confirm, Cancel, Send, Print | **Yes** | **Yes** | View & Download own |
| Record Payments | **Yes** | **Yes** | No |
| Reports & Finance Dashboard (Revenue Radar) | **Yes** | **Yes** | No |
| Audit Log | **Yes** | No | No |

### Customer Data Isolation Rules
- Every customer-facing query must scope to `where: { customerId: session.customerId }`.
- Detail routes fetching single items use `findFirst({ where: { id, customerId: session.customerId } })`.
- If an entity is not found or belongs to another customer, the API **must return 404** (not 403), so other customers' records are not even confirmed to exist.
- Never read `customerId`, `role`, or `status` from request bodies on customer actions. Extract exclusively from verified JWT session.

---

## 3. Complete Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String          @id @default(cuid())
  email        String          @unique
  passwordHash String
  role         String          // ADMIN | STAFF | CUSTOMER
  active       Boolean         @default(true)
  customerId   String?         @unique
  customer     Customer?       @relation(fields: [customerId], references: [id])
  resets       PasswordReset[]
  createdAt    DateTime        @default(now())
}

model PasswordReset {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  tokenHash  String    @unique
  expiresAt  DateTime
  usedAt     DateTime?
}

model Customer {
  id            String         @id @default(cuid())
  name          String
  company       String?
  phone         String?
  address       String?
  gstin         String?
  user          User?
  subscriptions Subscription[]
  createdAt     DateTime       @default(now())
}

model Product {
  id         String           @id @default(cuid())
  name       String
  type       String           // SOFTWARE | ADDON | SERVICE
  salesPrice Int              // paise
  costPrice  Int              // paise
  notes      String?
  active     Boolean          @default(true)
  variants   ProductVariant[]
  createdAt  DateTime         @default(now())
}

model ProductVariant {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  attribute  String   // e.g. "Brand"
  value      String   // e.g. "Odoo"
  extraPrice Int      // paise, e.g. 56000 for 560.00
  @@unique([productId, attribute, value])
}

model Plan {
  id            String              @id @default(cuid())
  name          String
  price         Int                 // paise per billing period
  billingPeriod String              // DAILY | WEEKLY | MONTHLY | YEARLY
  minQty        Int                 @default(1)
  startDate     DateTime
  endDate       DateTime?
  autoClose     Boolean             @default(false) // closes itself at endDate
  closable      Boolean             @default(true)  // can be closed early
  pausable      Boolean             @default(false)
  renewable     Boolean             @default(true)
  active        Boolean             @default(true)
  subscriptions Subscription[]
  templates     QuotationTemplate[]
}

model QuotationTemplate {
  id           String         @id @default(cuid())
  name         String
  validityDays Int
  planId       String
  plan         Plan           @relation(fields: [planId], references: [id])
  lines        TemplateLine[]
}

model TemplateLine {
  id         String            @id @default(cuid())
  templateId String
  template   QuotationTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  productId  String
  variantId  String?
  qty        Int
}

model Tax {
  id          String  @id @default(cuid())
  name        String  // e.g. "GST 18%"
  ratePercent Float
  active      Boolean @default(true)
}

model Discount {
  id             String   @id @default(cuid())
  name           String
  type           String   // FIXED | PERCENT
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
  id               String             @id @default(cuid())
  number           String             @unique // SUB-0001
  customerId       String
  customer         Customer           @relation(fields: [customerId], references: [id])
  planId           String
  plan             Plan               @relation(fields: [planId], references: [id])
  startDate        DateTime
  expiryDate       DateTime
  paymentTerm      String             // IMMEDIATE | NET15 | NET30
  status           String             // DRAFT | QUOTATION | CONFIRMED | ACTIVE | CLOSED
  closeReason      String?            // EXPIRED | CLOSED_EARLY | RENEWED | PAUSED
  nextInvoiceDate  DateTime?
  quoteValidUntil  DateTime?
  lines            SubscriptionLine[]
  invoices         Invoice[]
  createdAt        DateTime           @default(now())

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
  id             String        @id @default(cuid())
  number         String        @unique // INV-2026-0001
  subscriptionId String
  subscription   Subscription  @relation(fields: [subscriptionId], references: [id])
  customerId     String
  periodStart    DateTime
  periodEnd      DateTime
  status         String        // DRAFT | CONFIRMED | PAID | CANCELLED
  subtotal       Int
  discountTotal  Int           @default(0)
  taxTotal       Int
  total          Int
  paidTotal      Int           @default(0)
  dueDate        DateTime
  sentAt         DateTime?
  lines          InvoiceLine[]
  payments       Payment[]
  createdAt      DateTime      @default(now())

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
  externalRef  String?  @unique // gateway payment id / idempotency key
  recordedById String?
  createdAt    DateTime @default(now())

  @@index([paidOn])
}

model AuditLog {
  id        String   @id @default(cuid())
  entity    String
  entityId  String
  action    String
  userId    String?
  detail    String?
  at        DateTime @default(now())

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

---

## 4. API Standard Contract & Envelope

### Success Envelope
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed on 2 fields",
    "fields": [
      { "field": "password", "message": "Password must contain uppercase, lowercase and special character" }
    ]
  }
}
```

### HTTP Status Codes
* `200 OK` / `201 Created`: Successful query or mutation.
* `401 Unauthorized`: Not logged in or invalid token.
* `403 Forbidden`: User role not permitted to perform action.
* `404 Not Found`: Resource does not exist OR belongs to another customer (security mask).
* `409 Conflict`: Business constraint violation (e.g. invalid status transition, duplicate invoice period).
* `422 Unprocessable Entity`: Schema validation error or business rule breach (e.g. overpayment).

