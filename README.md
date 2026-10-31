# LoopLedger 🔄

> **Intelligent Subscription Lifecycle, Invoicing & Revenue Operations Management**  
> Built for modern SaaS and recurring-revenue businesses featuring multi-tier pricing, proration engines, GST-compliant invoicing, dunning workflows, and instant UPI / Razorpay collections.

---

## 🌟 Key Features

### 1. 📦 Product & Pricing Catalog
- **Flexible Pricing Models**: Flat-rate recurring, per-seat/license pricing, add-ons, and recurring discount rules.
- **Trial & Add-on Engine**: Configurable trial periods, setup fees, usage add-ons, and automated pause/cancel policies.
- **GST & Multi-Tax Compliance**: Multi-tier tax management, HSN / SAC code tagging, and CGST/SGST/IGST breakdown.

### 2. ⚡ Billing Engine & Invoicing
- **Automated Billing Runs**: Mass subscription invoice generation with dry-run previews, concurrency locks, and idempotency guarantees.
- **Proration Engine**: Accurate second/day prorated upgrades, downgrades, mid-cycle seat adjustments, and cancellations.
- **GST Invoicing**: Instant PDF tax invoice generation with embedded QR codes, tax summaries, SAC codes, and dual-party GSTIN details.

### 3. 💳 Payments & Dunning Automation
- **Payment Gateways**: Instant UPI dynamic QR generation, Razorpay checkout modal, and recorded manual bank/cash reconciliations.
- **Smart Dunning & Collections**: Configurable retry intervals, grace periods, payment reminder templates, and renewal risk scoring.
- **Renewal & Dunning Inbox**: Centralized dashboard to triage expiring contracts, churn risks, and failed transactions.

### 4. 📊 Analytics & Revenue Radar
- **Metrics**: Real-time MRR (Monthly Recurring Revenue), ARR, Net Revenue Retention (NRR), Churn Rate, and ARPU tracking.
- **Revenue Radar**: Predictive churn risk analysis, renewal queues, and account expansion signals.
- **Audit Trail**: Immutable audit logs of every subscription lifecycle transition, status change, and payment transaction.

### 5. 🧑‍💼 Customer Self-Service Portal
- Direct customer portal to manage active plans, adjust license counts, simulate pauses, download tax invoices, and pay outstanding balances securely.

---

## 🛠️ Tech Stack & Dependencies

### Core Framework & UI
- **[Next.js 16 (App Router + Turbopack)](https://nextjs.org/)** — Full-stack React framework with server components and streaming.
- **[React 19 & React DOM 19](https://react.dev/)** — Modern reactive UI layer.
- **[Tailwind CSS v4](https://tailwindcss.com/)** & **`lucide-react`** — Modern styling and icons.
- **[Recharts](https://recharts.org/)** — Composable data visualization for MRR and Revenue analytics.
- **`date-fns`** — Date calculations for billing periods and proration.

### Database & Security
- **[Prisma ORM 6](https://www.prisma.io/)** with SQLite (`prisma/dev.db`) — Database modeling, queries, migrations, and seed scripts.
- **`jose`** — Lightweight JWT session encoding and verification.
- **`bcryptjs`** — Salted password hashing.
- **`zod`** & **`react-hook-form`** — Schema validation and type-safe form management.

### Billing, Payments & PDFs
- **`pdf-lib`** — Dynamic PDF tax invoice generation.
- **`qrcode`** — Generation of UPI QR codes and verification payload links.
- **Razorpay SDK** — Payment order creation and signature verification.
- **`nodemailer`** — Transactional emails and dunning alert delivery.

---

## 🚀 How to Run the Project

### Prerequisites
- **Node.js**: v20 or higher (`node -v`)
- **npm** (or `pnpm` / `yarn`)

### 1. Clone the repository
```bash
git clone https://github.com/JohanJomy/Odoo-Subscription-Management.git
cd loopledger
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment configuration
Ensure you have a `.env` file in the project root:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-super-secret-jwt-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional Razorpay configuration (for live checkout testing)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

### 4. Setup Database & Seed Initial Data
Run the Prisma migrations and database seed script to populate products, plans, customers, subscriptions, and demo credentials:
```bash
npx prisma db push
npm run db:seed
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔐 Demo Credentials for All 3 User Roles

The database is pre-seeded with accounts for all three access roles. **All demo accounts use the same password: `Passw0rd!x`**.

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@loopledger.test` | `Passw0rd!x` | **Full administrative control**: Product catalog, plans, discounts, tax rates, billing runs, analytics, audit log, team & staff management. |
| **Staff** | `staff@loopledger.test`<br>*(or `staff2@loopledger.test`)* | `Passw0rd!x` | **Operational workflow**: Customer accounts, subscription lifecycle operations (pause/resume/close), billing previews, renewal inbox, and invoice PDF generation. |
| **Customer** | `customer1@loopledger.test`<br>*(or `customer2@loopledger.test`, `customer3@loopledger.test`)* | `Passw0rd!x` | **Customer Self-Service Portal**: View active subscriptions, review billing history, download GST invoices, and settle balances via UPI / Razorpay. |

> **Note on Password Requirements**: If you create a new account via the `/signup` page, passwords must be at least **9 characters** long and contain at least **one uppercase letter**, **one lowercase letter**, and **one special character** (e.g. `Passw0rd!x`).

---

## 📂 Project Structure

```
├── prisma/
│   ├── schema.prisma       # Database schema (Customers, Plans, Invoices, Subscriptions, Audit)
│   ├── seed.ts             # Comprehensive demo data seeder (users, catalog, 200 subscriptions)
│   └── dev.db              # SQLite development database
├── src/
│   ├── app/
│   │   ├── (app)/          # Protected workspace routes wrapped with persistent sidebar
│   │   │   ├── dashboard/  # MRR, churn rate, executive KPI dashboards
│   │   │   ├── catalog/    # Products, variants, plans & quotation templates
│   │   │   ├── pricing/    # Taxes, discounts, and pricing policies
│   │   │   ├── subscriptions/ # Subscription list, creation wizard, pause/close/renew
│   │   │   ├── billing/    # Automated billing run engine & batch invoice generator
│   │   │   ├── inbox/      # Renewal and dunning notification triage
│   │   │   ├── reports/    # Revenue Radar, cohort retention, analytics charts
│   │   │   ├── audit/      # Tamper-evident audit trail
│   │   │   └── my/         # Customer portal views (/my/subscriptions, /my/invoices)
│   │   ├── (auth)/         # Authentication routes (/login, /signup, /forgot)
│   │   ├── portal/         # Interactive customer self-service simulation screen
│   │   └── api/v1/         # Secure REST API endpoints (auth, subscriptions, billing, invoices)
│   ├── components/         # Shared UI components, charts, shells, and payment panels
│   ├── lib/                # Reusable utilities (constants, money helpers, Prisma client)
│   └── server/             # Business logic (transitions, guard, billing engine, razorpay)
└── tests/                  # Unit and integration test suite
```

---

## 🧪 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server on port 3000 |
| `npm run build` | Compiles and optimizes the production build |
| `npm run start` | Runs the production build |
| `npm run db:push` | Pushes the Prisma schema to the database without migrations |
| `npm run db:seed` | Resets and seeds the database with demo products, subscriptions, and accounts |
| `npm run test` | Runs the Vitest test suite |
| `npx tsc --noEmit` | Validates TypeScript types across the entire codebase |

---

## 📜 License
Private & Proprietary — Developed for Hackathon & Subscription Management Innovation.
