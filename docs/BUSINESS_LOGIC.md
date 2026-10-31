# LoopLedger Business Logic & Core Engines

> **Reference:** Core business rules, calculation engines, status machines, and financial definitions.

---

## 1. Unified Pricing Engine (`src/server/billing/pricing.ts`)

`priceSubscription()` is the **single source of truth** for computing invoice line items and totals. It is invoked when:
1. Previewing pricing in the UI (`POST /api/v1/subscriptions/price`).
2. Generating draft or active invoices during a Billing Run.
3. Rendering stored invoices, PDFs, and customer summaries.

### Pricing Calculation Steps
1. **Candidate Lines Construction**:
   - **Plan Fee Line**: Quantity = 1, unit price = `plan.price` (paise), description = `plan.name + " Plan Fee"`, taxed using `DEFAULT_TAX_ID`.
   - **Subscription Lines**: For each line:
     $$\text{unitPrice} = \text{product.salesPrice} + (\text{variant.extraPrice} \mathbin{\text{or}} 0)$$
     $$\text{lineAmount} = \text{qty} \times \text{unitPrice}$$
     Description formatted as `"{product.name} ({attribute}: {value})"`.
2. **Discount Evaluation & Selection**:
   - Evaluate all eligible discounts (see Section 2).
   - If multiple discounts qualify, pick the **single discount giving the highest monetary saving**.
   - Distribute the discount across qualifying lines proportionally:
     $$\text{lineDiscount} = \text{round}\left(\text{totalDiscount} \times \frac{\text{lineAmount}}{\text{applicableBase}}\right)$$
     The last applicable line receives the remainder to eliminate rounding drift.
3. **Line-Level Tax Calculation**:
   - Calculated **after** discount:
     $$\text{taxableAmount} = \text{lineAmount} - \text{lineDiscount}$$
     $$\text{taxAmount} = \text{round}\left(\text{taxableAmount} \times \frac{\text{ratePercent}}{100}\right)$$
   - *Note*: If no tax rule is associated (`taxId == null`), tax is `0`.
4. **Totals Aggregation**:
   - $\text{subtotal} = \sum \text{lineAmount}$
   - $\text{discountTotal} = \sum \text{lineDiscount}$
   - $\text{taxTotal} = \sum \text{taxAmount}$
   - $\text{total} = \text{subtotal} - \text{discountTotal} + \text{taxTotal}$
5. **Due Date Computation**:
   $$\text{dueDate} = \text{invoiceDate} + \text{days}(\text{paymentTerm})$$
   - `IMMEDIATE`: +0 days
   - `NET15`: +15 days
   - `NET30`: +30 days

> **Precision Rule**: All currency values are integers in **paise**. `Math.round` is applied per line item, never only on the final total.

---

## 2. Discount Engine Rules (`src/server/discounts/`)

### Eligibility Criteria
A discount is eligible if and only if **all** of the following hold true:
1. `discount.active === true`
2. `startDate <= today <= endDate`
3. `usedCount < usageLimit`
4. Scope Match:
   - If `appliesTo === 'PRODUCT'`: At least one candidate line has `productId === discount.productId`. Applicable base is the sum of matching product lines.
   - If `appliesTo === 'SUBSCRIPTION'`: Matches `discount.subscriptionId === sub.id`. Applicable base is the sum of all lines (including the plan fee).
5. Thresholds:
   - $\text{applicableBase} \ge \text{minPurchase}$
   - $\text{applicableQty} \ge \text{minQty}$

### Saving Formula
* **Percentage Discount**:
  $$\text{saving} = \text{round}\left(\text{applicableBase} \times \frac{\text{percent}}{100}\right)$$
* **Fixed Discount**:
  $$\text{saving} = \min(\text{fixedAmount}, \text{applicableBase})$$

### Atomic Consumption
When an invoice is committed:
```typescript
const updated = await tx.discount.updateMany({
  where: { id: discount.id, usedCount: { lt: discount.usageLimit } },
  data: { usedCount: { increment: 1 } },
});
if (updated.count === 0) {
  // Concurrency collision: recompute invoice without this discount
}
```

---

## 3. Subscription Status Machine (`src/server/subscriptions/`)

The system enforces **exactly 5 valid statuses**:
`DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `CLOSED`.

```
                  ┌────────────────────────┐
                  ▼                        │
(new) ──> DRAFT ──> QUOTATION ──> CONFIRMED ──> ACTIVE ──> CLOSED
            │                                     ▲   │      ▲
            │                                     └───┴──────┘
            └─────────────────────────────────────────────────
```

### Valid State Transitions

| From | To | Authorized Actors | Conditions & Side Effects |
| :--- | :--- | :--- | :--- |
| *(new)* | `DRAFT` | Admin, Staff | Assigns unique `SUB-XXXX`. Enforces `qty >= plan.minQty` and `expiryDate > startDate`. |
| `DRAFT` | `QUOTATION` | Admin, Staff | Sets `quoteValidUntil = today + template.validityDays` (default 15 days). |
| `QUOTATION` | `CONFIRMED` | Admin, Staff, Owning Customer | Lines are locked. **Rejected with 409** if `quoteValidUntil < today`. |
| `CONFIRMED` | `ACTIVE` | System (Daily Job) or Admin/Staff | Sets `nextInvoiceDate = startDate`. |
| `ACTIVE` | `CLOSED` (`CLOSED_EARLY`) | Admin, Staff | Permitted only if `plan.closable === true`. Clears `nextInvoiceDate = null`. |
| `ACTIVE` | `CLOSED` (`PAUSED`) | Admin, Staff, Owning Customer | Permitted only if `plan.pausable === true`. Billing halts. |
| `CLOSED` (`PAUSED`) | `ACTIVE` | Admin, Staff, Owning Customer | Resumes subscription. Sets `nextInvoiceDate = today`. |
| `CLOSED` (`EXPIRED`) | `ACTIVE` | Admin, Staff | Permitted only if `plan.renewable === true`. Sets new `expiryDate`. |
| `ACTIVE` | `CLOSED` (`EXPIRED`) | System (Daily Job) | Triggered when `expiryDate < today` or (`plan.autoClose && plan.endDate < today`). |
| `QUOTATION` | `CLOSED` (`EXPIRED`) | System (Daily Job) | Triggered when `quoteValidUntil < today`. |

> Any other transition is rejected with `409 INVALID_TRANSITION`. Every valid move records an entry in `AuditLog`.

---

## 4. Recurring Billing Engine (`src/server/billing/run.ts`)

The billing engine executes idempotent, batch invoice creation for due subscriptions.

### Billing Algorithm
For every `Subscription` where `status === 'ACTIVE'` and `nextInvoiceDate <= endOfDay(today)`:
1. **Open a database transaction (`tx`)**:
   - Execute a catch-up loop to handle overdue periods:
     ```typescript
     while (sub.nextInvoiceDate <= endOfDay(today) && sub.nextInvoiceDate <= sub.expiryDate) {
       const periodStart = sub.nextInvoiceDate;
       const periodEnd = addPeriod(periodStart, sub.plan.billingPeriod);
       
       // Idempotency check:
       const exists = await tx.invoice.findUnique({
         where: { subscriptionId_periodStart: { subscriptionId: sub.id, periodStart } }
       });
       
       if (!exists) {
         const pricing = await priceInvoice(tx, sub, periodStart, today);
         await tx.invoice.create({ data: buildInvoiceData(sub, periodStart, periodEnd, pricing) });
         await consumeDiscount(tx, pricing.discount);
         report.push({ subscriptionId: sub.id, outcome: 'CREATED' });
       } else {
         report.push({ subscriptionId: sub.id, outcome: 'SKIPPED_EXISTS' });
       }
       sub.nextInvoiceDate = periodEnd;
     }
     
     // Check for natural expiration:
     const finished = sub.nextInvoiceDate > sub.expiryDate;
     await tx.subscription.update({
       where: { id: sub.id },
       data: {
         nextInvoiceDate: finished ? null : sub.nextInvoiceDate,
         status: finished ? 'CLOSED' : 'ACTIVE',
         closeReason: finished ? 'EXPIRED' : null,
       }
     });
     ```
2. **Dry-Run Rollback**:
   - If `dryRun === true`, gather calculated invoice totals for preview and throw `RollbackForPreview`, rolling back all database writes.
3. **Failure Isolation**:
   - Failures inside one subscription rollback only that subscription, log a failure message in the run report, and allow subsequent subscriptions to process cleanly.
4. **Audit & Log**:
   - Saves a `BillingRun` record containing `{ created, skipped, failed, report }`.

---

## 5. Invoicing & Payment Lifecycle (`src/server/payments/`)

### Invoice Statuses
* `DRAFT`: Initial invoice created by billing run.
* `CONFIRMED`: Approved by staff (individually or in bulk) and ready for payment.
* `PAID`: Automatically achieved when `paidTotal >= total`.
* `CANCELLED`: Permitted only from `DRAFT` or `CONFIRMED` when `paidTotal === 0`.

### Payment Recording
```typescript
export async function recordPayment(tx, invoiceId, input, userId) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (inv.status !== 'CONFIRMED') throw new HttpError(409, 'INVOICE_NOT_PAYABLE');
  
  const balance = inv.total - inv.paidTotal;
  if (input.amount > balance) {
    throw new HttpError(422, 'OVERPAYMENT', { field: 'amount' });
  }
  
  await tx.payment.create({ data: { invoiceId, ...input, recordedById: userId } });
  const paidTotal = inv.paidTotal + input.amount;
  
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidTotal,
      status: paidTotal === inv.total ? 'PAID' : 'CONFIRMED',
    }
  });
  
  await audit(tx, { entity: 'Invoice', entityId: invoiceId, action: 'PAYMENT', userId });
}
```

### Overdue & Customer Health Calculations
* **Overdue Condition**: Dynamically queried:
  $$\text{status} = \text{'CONFIRMED'} \quad \land \quad \text{dueDate} < \text{today} \quad \land \quad \text{paidTotal} < \text{total}$$
* **Ageing Buckets**: 1–30 days past due, 31–60 days past due, 61+ days past due.
* **Customer Health Badge**:
  - 🔴 **RED**: Any invoice is $> 30\text{ days}$ overdue.
  - 🟡 **AMBER**: Any invoice is $1\text{ to }30\text{ days}$ overdue.
  - 🟢 **GREEN**: Zero overdue invoices.

---

## 6. Financial Reporting & Radar Metrics

All dashboard metrics are computed via optimized database aggregate queries (`SUM`, `COUNT`, `groupBy`), avoiding client/JavaScript loops:

* **Active Subscriptions**:
  $$\text{Count}(\text{Subscription where status} = \text{'ACTIVE'})$$
* **Monthly Recurring Revenue (MRR)**:
  Normalized recurring amount (pre-tax) across all `ACTIVE` subscriptions:
  - `DAILY`: $\text{amount} \times 30$
  - `WEEKLY`: $\text{amount} \times \frac{52}{12}$
  - `MONTHLY`: $\text{amount} \times 1$
  - `YEARLY`: $\text{amount} \div 12$
* **Annual Recurring Revenue (ARR)**:
  $$\text{ARR} = \text{MRR} \times 12$$
* **Revenue Collected**:
  $$\sum \text{Payment.amount where paidOn } \in [\text{from}, \text{to}]$$
* **Outstanding AR**:
  $$\sum (\text{total} - \text{paidTotal}) \quad \text{across all CONFIRMED invoices}$$
* **Renewal & Dunning Inbox**:
  - Subscriptions expiring in $\le 7\text{ days}$.
  - Overdue invoices requiring collection.
  - Discounts ending in $\le 7\text{ days}$ or $\ge 90\%$ used.
  - Quotations expiring in $\le 3\text{ days}$.

