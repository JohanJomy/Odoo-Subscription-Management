# LoopLedger REST API Contract

> **Base URL:** `/api/v1`  
> **Protocol:** JSON over HTTP, UTF-8  
> **Auth Transport:** Session JWT stored in an `httpOnly` secure cookie (`session`).

---

## Standard Error Response Format
All failing endpoints conform to the following schema:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable summary",
    "fields": [
      { "field": "fieldName", "message": "Specific validation failure" }
    ]
  }
}
```

---

## 1. Authentication & User Management

### `POST /api/v1/auth/signup`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "name": "Acme Corp",
    "email": "owner@acme.test",
    "password": "Password123!",
    "phone": "9876543210"
  }
  ```
* **Validation Rules:**
  - `email`: Valid RFC email format. Unique across `User` table (returns `409 EMAIL_TAKEN` if duplicated).
  - `password`: Regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$` (min 9 chars, upper, lower, special).
* **Behavior:** Automatically creates a `Customer` row and a linked `User` with `role = 'CUSTOMER'`. Sets the session cookie.
* **Response:** `201 Created` with `{ data: { user, customer } }`.

### `POST /api/v1/auth/login`
* **Access:** Public
* **Request Body:** `{ "email": "...", "password": "..." }`
* **Behavior:** Verifies password hash. Returns `401 BAD_CREDENTIALS` (single generic message for nonexistent user or bad password). Returns `403 FORBIDDEN` if `active === false`. Sets session cookie.
* **Response:** `200 OK` with `{ data: { user } }`.

### `POST /api/v1/auth/logout`
* **Access:** Authenticated
* **Behavior:** Clears session cookie.
* **Response:** `200 OK`.

### `GET /api/v1/auth/me`
* **Access:** Authenticated
* **Response:** `200 OK` with `{ data: { id, email, role, customerId, name } }`.

### `POST /api/v1/auth/forgot`
* **Access:** Public
* **Request Body:** `{ "email": "..." }`
* **Behavior:** Always returns `200 OK` (avoids email enumeration). If user exists, generates single-use token valid for 30 minutes, hashes token, and sends password reset email.

### `POST /api/v1/auth/reset`
* **Access:** Public
* **Request Body:** `{ "token": "...", "password": "..." }`
* **Behavior:** Validates token hash, expiration, and unused status (`410 TOKEN_INVALID` if expired/used). Updates password, invalidates token.

### `POST /api/v1/users/staff`
* **Access:** `ADMIN` only
* **Request Body:** `{ "name": "Staff Name", "email": "staff@loopledger.test", "password": "..." }`
* **Behavior:** Creates user with `role = 'STAFF'`.

### `GET /api/v1/users`
* **Access:** `ADMIN` only
* **Query Params:** `?role=STAFF&q=search&page=1&limit=20`

### `PATCH /api/v1/users/:id`
* **Access:** `ADMIN` only
* **Request Body:** `{ "active": false, "role": "STAFF" }`
* **Constraint:** Admin cannot deactivate their own account.

---

## 2. Catalog & Pricing

### `GET, POST /api/v1/products`
* **Access:** Read: `ADMIN`, `STAFF`. Write: `ADMIN`.
* **POST Body:**
  ```json
  {
    "name": "Brightloop CRM",
    "type": "SOFTWARE",
    "salesPrice": 120000,
    "costPrice": 40000,
    "notes": "Base license"
  }
  ```

### `GET, PATCH, DELETE /api/v1/products/:id`
* **Access:** Read: `ADMIN`, `STAFF`. Write: `ADMIN`.
* **DELETE Behavior:** Sets `active = false` if used on existing subscription lines; otherwise deletes record.

### `POST /api/v1/products/:id/variants`
* **Access:** `ADMIN` only
* **Request Body:** `{ "attribute": "Brand", "value": "Odoo", "extraPrice": 56000 }`
* **Constraint:** Unique `[productId, attribute, value]`, returns `409` on duplicate.

### `DELETE /api/v1/products/:id/variants/:vid`
* **Access:** `ADMIN` only
* **Constraint:** Rejected with `409` if referenced in subscription lines.

### `GET, POST /api/v1/plans`
* **Access:** Read: `ADMIN`, `STAFF`, `CUSTOMER` (active only). Write: `ADMIN`.
* **POST Body:**
  ```json
  {
    "name": "Standard Monthly",
    "price": 250000,
    "billingPeriod": "MONTHLY",
    "minQty": 1,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": null,
    "autoClose": false,
    "closable": true,
    "pausable": true,
    "renewable": true
  }
  ```

### `POST /api/v1/plans/:id/close | /pause | /renew`
* **Access:** `ADMIN` only
* **Behavior:** Executes plan lifecycle changes. Returns `409` if plan flag disallows operation.

### `GET, POST, PATCH, DELETE /api/v1/taxes`
* **Access:** Read: `ADMIN`, `STAFF`. Write: `ADMIN`.
* **POST Body:** `{ "name": "GST 18%", "ratePercent": 18.0 }`
* **DELETE Behavior:** Deactivates if referenced in invoices.

### `GET, POST, PATCH /api/v1/discounts`
* **Access:** Read: `ADMIN`, `STAFF`. Write: `ADMIN` only.
* **POST Body:**
  ```json
  {
    "name": "Volume Booster",
    "type": "PERCENT",
    "percent": 10,
    "minPurchase": 0,
    "minQty": 5,
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.000Z",
    "usageLimit": 100,
    "appliesTo": "SUBSCRIPTION"
  }
  ```

---

## 3. Subscriptions & Quotation Templates

### `GET, POST /api/v1/customers`
* **Access:** `ADMIN`, `STAFF`.
* **POST Body:** `{ "name": "...", "company": "...", "phone": "...", "address": "...", "gstin": "..." }`
* **Validation:** Phone 7–15 digits; GSTIN regex: `^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$`.

### `GET, POST /api/v1/quotation-templates`
* **Access:** `ADMIN`, `STAFF`.
* **POST Body:**
  ```json
  {
    "name": "Standard Enterprise Offer",
    "validityDays": 15,
    "planId": "plan_cuid",
    "lines": [
      { "productId": "prod_cuid", "variantId": "var_cuid", "qty": 10 }
    ]
  }
  ```

### `GET /api/v1/subscriptions`
* **Access:** `ADMIN`, `STAFF`. (Customers can only view own).
* **Query Params:** `?status=ACTIVE&customerId=...&q=...&page=1&limit=20`

### `POST /api/v1/subscriptions`
* **Access:** `ADMIN`, `STAFF`.
* **POST Body:**
  ```json
  {
    "customerId": "cust_cuid",
    "planId": "plan_cuid",
    "startDate": "2026-11-01T00:00:00.000Z",
    "expiryDate": "2027-10-31T23:59:59.000Z",
    "paymentTerm": "NET30",
    "lines": [
      { "productId": "prod_cuid", "variantId": "var_cuid", "qty": 5, "taxId": "tax_cuid" }
    ]
  }
  ```

### `POST /api/v1/subscriptions/from-template/:templateId`
* **Access:** `ADMIN`, `STAFF`.
* **Request Body:** `{ "customerId": "...", "startDate": "...", "expiryDate": "...", "paymentTerm": "NET15" }`
* **Behavior:** Clones plan and line items from template, creates Subscription in `DRAFT`.

### `POST /api/v1/subscriptions/:id/transition`
* **Access:** `ADMIN`, `STAFF`, and `CUSTOMER` (for self-pause/resume/accept).
* **Request Body:** `{ "to": "CONFIRMED", "reason": "...", "expiryDate": "..." }`
* **Response:** Returns updated subscription or `409 INVALID_TRANSITION`.

### `POST /api/v1/subscriptions/price`
* **Access:** `ADMIN`, `STAFF`.
* **Request Body:** `{ "planId": "...", "lines": [...] }`
* **Behavior:** Stateless calculation using `priceSubscription()`. Returns computed lines, discount savings, tax breakdown, and total.

---

## 4. Billing Engine

### `GET /api/v1/billing/preview`
* **Access:** `ADMIN`, `STAFF`.
* **Query Params:** `?date=2026-11-01`
* **Behavior:** Dry-run billing run; rolls back transaction and outputs preview report:
  ```json
  {
    "data": {
      "count": 12,
      "totalAmount": 14500000,
      "items": [
        { "subscriptionId": "...", "number": "SUB-0012", "customerName": "...", "periodStart": "...", "total": 125000 }
      ]
    }
  }
  ```

### `POST /api/v1/billing/run`
* **Access:** `ADMIN`, `STAFF`.
* **Request Body:** `{ "date": "2026-11-01" }`
* **Behavior:** Commits invoices, updates `nextInvoiceDate`, consumes discounts, records `BillingRun`.

### `GET /api/v1/billing/runs`
* **Access:** `ADMIN`, `STAFF`. Historical runs with paged details.

### `POST /api/v1/jobs/daily`
* **Access:** System Internal (Header: `x-job-secret: <JOB_SECRET>`).
* **Behavior:** Runs housekeeping (closes expired subs/quotes, activates confirmed subs) then executes billing run.

---

## 5. Invoices & Payments

### `GET /api/v1/invoices`
* **Access:** `ADMIN`, `STAFF`, `CUSTOMER` (scoped).
* **Query Params:** `?status=CONFIRMED&overdue=true&customerId=...&page=1`

### `POST /api/v1/invoices/:id/confirm | /cancel | /send`
* **Access:** `ADMIN`, `STAFF`.
* **`confirm`**: Transitions `DRAFT` $\to$ `CONFIRMED`.
* **`cancel`**: Transitions `DRAFT` or `CONFIRMED` $\to$ `CANCELLED` (only if 0 payments recorded).
* **`send`**: Sends email with invoice PDF and updates `sentAt`.

### `POST /api/v1/invoices/bulk-confirm`
* **Access:** `ADMIN`, `STAFF`.
* **Request Body:** `{ "ids": ["inv_1", "inv_2"] }` (Max 500).

### `GET /api/v1/invoices/:id/pdf`
* **Access:** `ADMIN`, `STAFF`, `CUSTOMER` (own).
* **Behavior:** Streams PDF render with embedded UPI payment QR code (`upi://pay?pa=...`).

### `POST /api/v1/invoices/:id/payments`
* **Access:** `ADMIN`, `STAFF`.
* **Headers:** `Idempotency-Key` (optional, stored as `externalRef`).
* **Request Body:**
  ```json
  {
    "method": "UPI",
    "amount": 50000,
    "paidOn": "2026-11-01T10:00:00.000Z",
    "note": "Transaction ID 123456"
  }
  ```
* **Validation:** Rejects if invoice is not `CONFIRMED` (`409`). Rejects if `amount > balance` (`422 OVERPAYMENT`). Auto-flips status to `PAID` if balance reaches zero.

---

## 6. Customer Portal

* `GET /api/v1/me/subscriptions`: Scoped list of customer's subscriptions.
* `GET /api/v1/me/invoices`: Scoped list of customer's invoices with payment links/QR.
* `POST /api/v1/me/subscriptions/:id/pause`: Pause active subscription (if plan permits).
* `POST /api/v1/me/subscriptions/:id/seats`: Updates line quantity (`qty >= plan.minQty`). Applied to future invoices.

---

## 7. Reports & Audit

* `GET /api/v1/reports/summary`: `{ activeSubscriptions, mrr, arr, collected, outstanding, overdueCount, overdueAmount }`.
* `GET /api/v1/reports/revenue?from=...&to=...&groupBy=month`: Series for dashboard charts.
* `GET /api/v1/reports/overdue?page=1`: Invoices past due date with ageing breakdown.
* `GET /api/v1/reports/inbox`: Actionable task list (renewals in 7d, overdue invoices, expiring discounts, quotes in 3d).
* `GET /api/v1/audit?entity=...&entityId=...`: Paginated immutable audit trail.

