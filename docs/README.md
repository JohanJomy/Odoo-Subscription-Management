# LoopLedger Engineering Documentation Index

Welcome to the engineering documentation for **LoopLedger**, the subscription management and recurring billing platform built for Brightloop Software.

## Document Index

1. [SYSTEM_DESIGN.md](file:///d:/oodo/docs/SYSTEM_DESIGN.md)
   - Architecture & technology choices (Next.js 15, Prisma, SQLite, Tailwind, shadcn/ui).
   - Core conventions (Money in paise, UTC DateTime, cuid IDs, enums).
   - Role-Based Access Control matrix (`ADMIN`, `STAFF`, `CUSTOMER`) and customer data isolation rules.
   - Complete Prisma Database Schema with all 15 models and relations.
   - Standard API success & error response envelopes and status codes.

2. [BUSINESS_LOGIC.md](file:///d:/oodo/docs/BUSINESS_LOGIC.md)
   - Unified pricing engine formula (`priceSubscription()`): plan fee, variant surcharges, discount distribution, line-level taxes.
   - Discount engine eligibility rules and atomic consumption (`usedCount < usageLimit`).
   - Subscription 5-stage status machine (`DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `CLOSED`) and transition rules.
   - Recurring billing run engine (`runBilling`, `previewBilling`), catch-up loops, and double-billing idempotency.
   - Invoice & payment lifecycle (`DRAFT` $\to$ `CONFIRMED` $\to$ `PAID`), dynamic overdue queries, customer health badges.
   - Financial analytics formulas (MRR, ARR, cash collected, accounts receivable ageing).
   - Renewal & dunning inbox definitions.

3. [API_CONTRACT.md](file:///d:/oodo/docs/API_CONTRACT.md)
   - Full REST API reference for all routes under `/api/v1`.
   - Route paths, methods, RBAC role restrictions, request payloads, and response schemas.
   - Authentication, User Management, Catalog & Plans, Subscriptions, Billing Runs, Invoices, Payments, Customer Portal, Reports, and Audit.

4. [UI_SPEC_AND_PAGES.md](file:///d:/oodo/docs/UI_SPEC_AND_PAGES.md)
   - Visual design system: Indigo primary (`#4F46E5`), slate neutrals, green/amber/red status colors, 8px grid.
   - Shared components: `AppShell`, `StatusChip`, `HealthBadge`, `MoneyText`, `MoneyInput`, `DataTable`, `OfflineBanner`.
   - Screen-by-screen breakdown for Admin, Staff, and Customer Portal.
   - PWA and offline synchronization specification using Serwist and Dexie (IndexedDB).

5. [TESTS_AND_DEMO_SCRIPT.md](file:///d:/oodo/docs/TESTS_AND_DEMO_SCRIPT.md)
   - Standard and large seed data specifications (including test credentials).
   - 22 Acceptance Test Cases mapped to the business brief.
   - Official 5-minute step-by-step Demo Script.
   - Risk mitigations and cut-list priorities.

---

## Quick Reference Constants

- **Test Admin:** `admin@loopledger.test` / `Passw0rd!x`
- **Test Staff:** `staff@loopledger.test` / `Passw0rd!x`
- **Test Customer:** `customer1@loopledger.test` / `Passw0rd!x`
- **Currency:** INR (stored as integer paise; $\text{₹}1 = 100\text{ paise}$)
- **Timezone:** Asia/Kolkata for billing dates; stored as UTC in SQLite
- **Password Regex:** `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`

