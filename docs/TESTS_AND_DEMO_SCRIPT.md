# LoopLedger Test Matrix, Seed Data & Demo Script

> **Reference:** Acceptance test specifications, seed requirements, performance targets, and the official 5-minute demo procedure.

---

## 1. Seed Data Specifications

### Standard Seed (`pnpm db:seed`)
Executed during initial setup to provide a fully populated testing environment:
* **Users**:
  - `admin@loopledger.test` (Role: `ADMIN`, Password: `Passw0rd!x`)
  - `staff@loopledger.test` (Role: `STAFF`, Password: `Passw0rd!x`)
  - `customer1@loopledger.test` (Role: `CUSTOMER`, Password: `Passw0rd!x`)
  - 2 additional customer portal logins.
* **Taxes**:
  - GST 18% (`ratePercent = 18.0`)
  - GST 5% (`ratePercent = 5.0`)
* **Products**:
  - 5 products, including **Brightloop CRM** with Brand variants:
    - Odoo: `+₹560` (`extraPrice = 56000`)
    - SAP: `+₹900` (`extraPrice = 90000`)
    - Zoho: `+₹0` (`extraPrice = 0`)
* **Plans**:
  - 4 plans: Monthly, Yearly, Weekly, Daily with varied flag permutations (`closable`, `pausable`, `renewable`, `autoClose`).
* **Quotation Templates**:
  - 2 pre-configured quotation templates with 2–3 default product lines.
* **Discounts**:
  - 10% discount on orders with minimum quantity $\ge 5$.
  - ₹500 fixed discount.
  - 1 expired discount rule to verify eligibility boundary enforcement.
* **Customers & Subscriptions**:
  - 50 Customer accounts.
  - 200 Subscriptions across all statuses (`DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `CLOSED`), including $\approx 60$ `ACTIVE` subscriptions due for billing.
* **Invoices & Payments**:
  - 300 Invoices (`DRAFT`, `CONFIRMED`, `PAID`, `CANCELLED`).
  - 200 Payments allocated across confirmed invoices to exercise ageing and overdue buckets.

### Large Seed (`pnpm db:seed:large`)
Generates 5,000 subscriptions, 15,000 invoices, and 12,000 payments in 500-item batch chunks to validate the **< 2-second performance contract** on list queries and summary dashboards.

---

## 2. Acceptance Test Matrix (22 Checks Mapped to Brief)

| # | Scene / Domain | Test Case / Action | Expected Result |
| :---: | :--- | :--- | :--- |
| **1** | Signup | Submit existing email address | Rejected with `409 EMAIL_TAKEN` and error banner on email field. |
| **2** | Signup | Password regex check with: `Abcdefg!` (8 chars), `abcdefgh1!`, `ABCDEFGH1!`, `Abcdefghi1` | All four rejected; `Abcdefgh1!` accepted. |
| **3** | Signup | Trigger forgot password flow | Email sent to MailHog; single-use token works once, second attempt returns `410`. |
| **4** | RBAC | Staff user invokes `POST /api/v1/users/staff` | Rejected with `403 FORBIDDEN`. |
| **5** | RBAC | Customer 1 requests Customer 2's invoice or subscription ID | Returns `404 NOT FOUND` (never reveals record existence). |
| **6** | Catalog | Add product with Odoo variant (+₹560) to line | Unit price computed as `basePrice + ₹560`. |
| **7** | Plans | Attempt to close subscription early on plan with `closable = false` | Rejected with `409 INVALID_TRANSITION`. |
| **8** | Quotations | Create from template, let `quoteValidUntil` lapse, attempt confirm | Rejected with `409`; daily job moves to `CLOSED` (`EXPIRED`). |
| **9** | Subscriptions | Walk state machine from `Draft` $\to$ `Quotation` $\to$ `Confirmed` $\to$ `Active` $\to$ `Closed` | Each step succeeds in order; out-of-order jumps return `409`. |
| **10** | Billing Run | Execute Billing Run twice consecutively on the same billing day | First run creates due invoices; second run creates **0 invoices** (idempotent skip). |
| **11** | Billing Run | Subscription unbilled for 3 consecutive billing cycles | Generates 3 distinct invoices (one per period), **not** one single bundled invoice. |
| **12** | Billing Run | One subscription in batch has invalid tax ID | Only that subscription fails and logs in run report; other subscriptions bill successfully. |
| **13** | Taxes | Product line of ₹1,000 with GST 18% tax | Computes line tax of exactly ₹180.00 (`18000 paise`). |
| **14** | Discounts | Staff member attempts to create a discount rule | Rejected with `403 FORBIDDEN` (Admin only). |
| **15** | Discounts | 10% discount with min quantity 5; bill with qty 4, then qty 5 | Not applied for qty 4; automatically applied when quantity reaches 5. |
| **16** | Discounts | Discount rule with `usageLimit = 2`; bill 3 eligible subscriptions | First 2 invoices receive discount; 3rd is billed at full price. |
| **17** | Payments | Attempt payment exceeding outstanding balance | Rejected with `422 OVERPAYMENT`. |
| **18** | Payments | Record two partial payments totaling invoice amount | Invoice automatically updates status to `PAID`. |
| **19** | Reports | Query overdue report | Returns confirmed past-due invoices partitioned correctly into 1–30d, 31–60d, 61+d buckets. |
| **20** | Performance | Query dashboard and list endpoints against 5k subs / 15k invoices | All responses return in **under 2 seconds** (< 500ms typical). |
| **21** | Offline Mode | Disconnect network, view invoices, record payment, reconnect | Cached lists display immediately; queued payment replays once without duplicates. |
| **22** | Responsive | Test viewport widths at 375px, 768px, and 1280px | No horizontal scrolling; tables convert cleanly to mobile cards. |

---

## 3. Official 5-Minute Demo Script

1. **User Registration & Validation (0:00 - 0:45)**:
   - Navigate to `/signup`.
   - Demonstrate the real-time password criteria checklist failing on weak input, then succeeding on `Passw0rd!x`.
   - Create account and log in.
2. **Catalog & Plan Setup as Admin (0:45 - 1:30)**:
   - Log in as `admin@loopledger.test`.
   - Create a product **Brightloop Suite** with an **Odoo Brand** variant adding `₹560.00`.
   - Create a **Monthly Plan** with pausing and renewals enabled.
   - Configure a **10% Volume Discount** requiring minimum quantity 5.
3. **Quotation to Subscription (1:30 - 2:15)**:
   - Create a subscription using a quotation template.
   - Adjust line item to include the Odoo variant; demonstrate live price recalculation.
   - Advance the stepper from `Draft` $\to$ `Quotation` $\to$ `Confirmed` $\to$ `Active`.
4. **Billing Run & Idempotency Proof (2:15 - 3:00)**:
   - Navigate to `/billing`.
   - Click **Preview Billing** to inspect upcoming invoices.
   - Click **Run Billing**: invoices are generated.
   - Click **Run Billing** a second time: show that **0 duplicates** are created (`SKIPPED_EXISTS`).
5. **Invoice Management & UPI Payment (3:00 - 3:45)**:
   - Open generated invoice. Review itemized lines, discount deduction, and tax calculation.
   - Click **Print / Download PDF**: demonstrate embedded UPI payment QR code.
   - Record a partial payment, then the remaining balance. Show instant status flip to `PAID`.
6. **Revenue Radar & Reporting (3:45 - 4:15)**:
   - Navigate to `/dashboard`.
   - Review MRR, ARR, cash collected, and overdue ageing distribution.
   - Check the **Renewal & Dunning Inbox** for upcoming expirations.
7. **Customer Portal & Tenancy Verification (4:15 - 4:45)**:
   - Log in as `customer1@loopledger.test`.
   - Verify that only Customer 1's subscriptions and invoices are visible.
   - Pause an active subscription directly from the customer portal.
8. **Offline Resilience (4:45 - 5:00)**:
   - Disable browser network connection.
   - Verify cached invoice list loads with `OfflineBanner`.
   - Submit a payment: queued in offline outbox.
   - Re-enable network: payment syncs automatically to server.

---

## 4. Risk Mitigation & Cut List Priority

If delivery time constraints arise, features should be deferred in strict sequence:
1. `node-cron` background scheduler (rely on manual "Run Billing" button).
2. Razorpay live gateway webhook (rely on manual payment recording).
3. Offline payment write queue (retain offline read cache).
4. System-wide Audit Log UI screen (keep server-side audit logging in DB).
5. Customer Health Badge computation.
6. Dynamic UPI QR code generation on PDF.
7. Portal seat quantity modification.

