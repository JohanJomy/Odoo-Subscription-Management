# LoopLedger — Stitch Hand-off Package: Design Tokens & Specifications

Here is the exact design system configuration, color palette, typography tokens, layout specifications, and prompt instructions to hand off to your engineering agent or teammates in VS Code.

---

## 1. Design Tokens Specification

### Colors
- **Primary / Brand:** `#4F46E5` (Indigo-600)
- **Primary Hover / Active:** `#4338CA` (Indigo-700) / `#3730A3` (Indigo-800)
- **Primary Tint / Badges:** `#EEF2FF` (Indigo-50)
- **Surface / Background:** `#FAF8FF` (Ultra-light lavender tint) or `#F8FAFC` (Slate-50)
- **Card / Container Lowest:** `#FFFFFF` (Pure white)
- **Card / Border:** `#E2E8F0` (Slate-200) / `#CBD5E1` (Slate-300)
- **Text Headings / Emphasized:** `#0F172A` (Slate-900)
- **Text Body:** `#334155` (Slate-700)
- **Text Muted / Subtitles:** `#64748B` (Slate-500)
- **Status & Semantics:**
  - **Success / Healthy:** `#10B981` (Emerald-500), Background: `#ECFDF5` (Emerald-50), Border: `#A7F3D0` (Emerald-200)
  - **Warning / Moderate:** `#F59E0B` (Amber-500), Background: `#FFFBEB` (Amber-50), Border: `#FDE68A` (Amber-200)
  - **Danger / Critical / Overdue:** `#EF4444` (Red-500), Background: `#FEF2F2` (Red-50), Border: `#FECACA` (Red-200)
  - **PWA / Synced indicator:** `#059669` (Emerald-600)

### Typography
- **Font Family:** `Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace (for Numbers, IDs, GSTIN, UPI):** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
- **Scale:**
  - Page Titles: `text-2xl` to `text-3xl` (`font-bold`, tracking tight)
  - Section Headers: `text-lg` to `text-xl` (`font-semibold`)
  - Subheaders / Card Titles: `text-sm` (`font-semibold` or uppercase tracking wider `text-xs text-slate-500`)
  - Body Text: `text-sm` (`font-normal` or `font-medium`)
  - Captions / Meta: `text-xs` to `text-[11px]` (`font-medium text-slate-500`)

### Spacing & Grid System
- **Base Grid:** `8px` spacing rhythm (`p-2`, `p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`)
- **Border Radius:**
  - Cards & Modals: `rounded-xl` (`12px`) or `rounded-2xl` (`16px`)
  - Buttons & Inputs: `rounded-lg` (`8px`)
  - Badges & Chips: `rounded-full` (`9999px`) or `rounded-md` (`6px`)

### Structural Layout Components

#### Left Sidebar (Persistent Web Dashboard)
- **Width:** `240px` (or `w-64`)
- **Background:** `#FFFFFF` with border right `border-slate-200`
- **Brand Header:** Logo (`LoopLedger Billing Cloud v2.4`), tenant selector (`Brightloop Production ● Live`)
- **Navigation Groups:**
  1. *Overview:* Revenue Radar
  2. *Core Operations:* Billing Run, Subscriptions, Invoices, Payments
  3. *Customers:* Customer Directory, Renewal & Dunning Inbox
  4. *Product & Catalog:* Products & Variants, Plans, Templates
  5. *Settings:* Pricing & Taxes, Team & Roles, Audit Trail
- **Bottom Status:** `Online · Synced` with Cloud sync icon, tenant profile indicator (`BL Acme Corp HQ`)

#### Top Navigation Bar
- **Height:** `64px` (`h-16`)
- **Background:** `#FFFFFF` or glassmorphic blur with `border-b border-slate-200`
- **Elements:**
  - Global Search with shortcut badge: `⌘K Search subscriptions, invoices, customers...`
  - Real-time indicator: `● Online · Synced`
  - Role switcher buttons: `Admin`, `Staff`, `Portal ↗`
  - Notification bell with alert badge
  - User avatar (`Alex Mercer - DevOps Admin`)

#### Status Chips & Badges
- **Format:** Inline flex items with small dot indicator:
  - `● Critical (>45d)` → `bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[11px]`
  - `● Moderate (18d)` → `bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[11px]`
  - `● Healthy (Current)` → `bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px]`
  - `● Dexie PWA Synced` → `bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]`

#### Tables & Data Grids
- **Header:** Uppercase `text-xs text-slate-500 font-semibold border-b border-slate-200 py-2.5 px-3`
- **Rows:** `text-xs divide-y divide-slate-100 hover:bg-slate-50/70 transition-colors`
- **Pagination Footer:** Rows per page selector (`10`), item counter (`1–4 of 18 products`), `Previous` / `Next` button controls.

#### Breakpoints & Mobile Behavior
- **Desktop (`lg` / `xl`):** Two-column split layouts (e.g., metric cards on left, surcharge editor or dunning watchlist on right; persistent left sidebar).
- **Mobile (`sm` / `<768px`):** Left sidebar collapses to a slide-out drawer or bottom navigation bar (`Revenue Radar`, `Invoices`, `Portal`, `Profile`); metric cards stack into a single column (`grid-cols-1`).

---

## 2. Copy-Ready Prompt for Integration / LLM Agents

You can paste this exact prompt into your IDE agent, teammate prompt, or implementation issue:

```text
Design System & Layout Directive: LoopLedger (P4 Suite)

Colors:
- Primary: #4F46E5 (Indigo-600)
- Surface: #FAF8FF (Light background) / #FFFFFF (Cards)
- Borders: #E2E8F0 (Slate-200)
- Text Headings: #0F172A (Slate-900)
- Text Muted: #64748B (Slate-500)
- Status Green: #10B981 (Emerald-500) on #ECFDF5
- Status Amber: #F59E0B (Amber-500) on #FFFBEB
- Status Red: #EF4444 (Red-500) on #FEF2F2

Typography:
- Primary: Geist / Inter / Sans-serif
- Monospace: Courier New / SFMono / Consolas (for UPI IDs, Invoice numbers, Currency totals)

Spacing & Radius:
- 8px base rhythm (p-4, p-6, p-8)
- 12px card border-radius (rounded-xl)
- 8px button border-radius (rounded-lg)

Components:
- Sidebar: Fixed 240px left navigation with grouped links (Overview, Operations, Catalog, Settings)
- Top Bar: Search bar (Cmd+K), sync badge, role switch pills, notifications, user avatar
- Tables: Bordered with slate-200, clean dividers, right-aligned monetary values in INR (₹)
- UPI QR Modal: Dynamic base64 QR container, copyable UPI ID button, green verification action
- Mobile: Collapsible bottom tab bar, single-column KPI grid, responsive drawer for filters
```
