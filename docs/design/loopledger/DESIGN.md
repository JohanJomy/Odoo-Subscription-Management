---
name: LoopLedger
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#4e45d5'
  on-secondary: '#ffffff'
  secondary-container: '#6860ef'
  on-secondary-container: '#fffbff'
  tertiary: '#434853'
  on-tertiary: '#ffffff'
  tertiary-container: '#5b606b'
  on-tertiary-container: '#d7dbe8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#100069'
  on-secondary-fixed-variant: '#372abf'
  tertiary-fixed: '#dee2ef'
  tertiary-fixed-dim: '#c2c6d3'
  on-tertiary-fixed: '#171c25'
  on-tertiary-fixed-variant: '#424751'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  stat-display:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-precision, utilitarian aesthetic tailored for modern recurring revenue analytics and subscription lifecycle management. The visual language blends high-density corporate SaaS clarity with refined modern minimalism—prioritizing information hierarchy, instant scannability, and operational confidence. 

### Target Audience & Tone
Built for finance operators, revenue leaders, and founders managing recurring billing, subscription metrics, and receivables. The interface projects reliability, numerical precision, and institutional restraint. It avoids unnecessary decoration, relying instead on structural alignment, disciplined whitespace, and micro-contrast.

### Design Movement: Modern Utilitarian Minimalist
- **Surface Restraint:** Subtle boundaries over saturated fills; surfaces utilize crisp architectural divisions.
- **Data-First Focus:** UI chrome recedes so numerical health indicators, aging buckets, and subscription states dominate the field of view.
- **Intentional Feedback:** Kinetic feedback is snappy and understated (100–150ms transitions), communicating responsiveness without distraction.

## Colors

The palette employs an authoritative indigo core grounded by cool architectural slate neutrals and rigorous semantic signals.

### Core Swatches
- **Primary Indigo (`#4F46E5`):** Reserved for primary calls-to-action, key active navigation nodes, and focused interaction states.
- **Primary Hover (`#4338CA`):** Darkened state for interactive commitment states and button presses.
- **Primary Tint (`#EEF2FF`):** Low-contrast selection states, active tab backgrounds, and selected row highlights.

### Neutrals (Slate Hierarchy)
- **Canvas Base (`#F8FAFC` / slate-50):** The primary view background layer, maintaining crisp contrast against pure white cards.
- **Card / Surface (`#FFFFFF`):** High-clarity elevated workspace surface.
- **Borders & Dividers (`#E2E8F0` / slate-200):** Structural delineation for tables, cards, and input boundaries.
- **Muted Text & Icons (`#475569` / slate-600):** Secondary labels, table headers, metadata, and breadcrumb segments.
- **Body & Headings (`#0F172A` / slate-900):** Primary high-contrast typography ensuring effortless legibility.

### Semantic Status Colors
Semantic hues are strictly functional and never used decoratively:
- **Positive / Paid / Healthy (`#059669` / emerald-600):** Surface tint `#ECFDF5`, border `#A7F3D0`. Denotes active subscriptions, completed reconciliation, and positive growth.
- **Warning / Overdue (`#D97706` / amber-500):** Surface tint `#FFFBEB`, border `#FDE68A`. Denotes upcoming payment failures, renewal alerts, and grace periods.
- **Critical / Risk / 30+ Days (`#E11D48` / rose-600):** Surface tint `#FFF1F2`, border `#FECDD3`. Denotes involuntary churn, payment defaults, and terminal statuses.

## Typography

The type system is built on **Geist**, providing geometric regularity and neutral clarity across ultra-dense screens.

### Numerical & Tabular Data Formatting
- All metric outputs, ledger columns, currency indicators, and timestamps must render with `font-feature-settings: "tnum" 1, "cv01" 1` (tabular figures and contextual alternatives). This prevents column jitter during data streaming or pagination.
- Currency symbols (e.g., `₹`) must share the exact weight and baseline vertical alignment of their numerical values, set without an artificial gap: `₹4,82,500.00`.
- Data table headers leverage `label-xs` in uppercase tracking (`letter-spacing: 0.04em`) styled with slate-600 (`#475569`).

## Layout & Spacing

A strict 8px base rhythm governs layout hierarchy, paired with a 4px sub-grid for internal component alignment, icon-to-label gaps, and table row padding.

### Grid & Breakpoints
- **Desktop (≥1280px):** 12-column responsive fluid grid with a permanent collapsed/expanded sidebar (64px/240px). Gutters set to `1.5rem` (`24px`), outer canvas margin set to `2rem` (`32px`).
- **Tablet (768px – 1279px):** 8-column layout. Drawer navigation replaces permanent sidebar. Gutters adapt to `1rem` (`16px`), outer margins to `1.5rem` (`24px`).
- **Mobile (<768px):** 4-column flow. Stat cards wrap into 1-column stacks or 2-column compact pairs. Canvas margins shrink to `1rem` (`16px`).

### Density Principles
- Keep page-level chrome compact. Page title bars maintain a maximum height of 64px.
- Use explicit visual anchors: align card headers, table action toolbars, and filter rails on identical vertical grid lines.

## Elevation & Depth

This design system eschews expressive drop shadows in favor of **structural line work, subtle surface offsets, and restrained ambient anchoring** to maintain a focused financial workspace.

### Elevation Hierarchy
- **Level 0 (Canvas):** Background set to `#F8FAFC` (slate-50). Flat plane.
- **Level 1 (Cards, Tables, Panels):** Pure white (`#FFFFFF`) surface enclosed by a 1px solid border in `#E2E8F0` (slate-200). Supplemented by an ambient edge shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Level 2 (Popovers, Select Menus, Dropdowns):** Pure white (`#FFFFFF`) surface with 1px solid `#E2E8F0` and focused shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals, Slide-over Sheets):** Floating overlay with border `#E2E8F0` and deep anchor shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`. Paired with a backdrop dimming layer of `#0F172A` at 30% opacity.

## Shapes

The interface embraces a **Soft (Level 1)** geometric standard, delivering an engineered, surgical finish.

- **Base Radius (`0.25rem` / 4px):** Form inputs, action buttons, dropdown items, table row hover highlights, and internal metric pills.
- **Card & Container Radius (`0.5rem` / 8px):** Primary content cards, data tables, filter toolbars, modal windows, and dialog viewports.
- **Segmented Control Track (`0.375rem` / 6px):** Outer tracks containing segmented selector pills.
- **Full Radius (`9999px`):** Status indicator dots, user profile avatars, and semantic badges.

## Components

### Buttons
- **Primary:** Background `#4F46E5`, text `#FFFFFF`, font weight 500 (`label-md`). Hover: `#4338CA`. Active: `#3730A3`. Focus: 2px ring `#4F46E5` with 2px white offset. Height 36px (compact desktop) or 40px (default).
- **Secondary / Outline:** Background `#FFFFFF`, border 1px solid `#E2E8F0`, text `#0F172A`. Hover: `#F8FAFC`, border `#CBD5E1`.
- **Ghost:** Background transparent, text `#475569`. Hover: background `#F1F5F9`, text `#0F172A`.
- **Destructive:** Background `#FFF1F2`, border 1px solid `#FECDD3`, text `#E11D48`. Hover: `#FFE4E6`.

### Stat Cards
- **Structure:** Pure white `#FFFFFF` surface, 1px border `#E2E8F0`, border-radius 8px, padding 16px or 20px.
- **Header:** Upper label using `label-sm` in slate-600 `#475569`, accompanied by an optional right-aligned metadata badge or icon.
- **Value:** Dominant numerical display using `stat-display` (`28px`/600) with tabular numeric layout.
- **Footer:** Secondary delta indicator displaying percentage shift over period, featuring green text (`#059669`) for positive or red text (`#E11D48`) for negative, alongside baseline contextual text ("vs last month").

### Data Tables (shadcn/ui Inspired)
- **Container:** Wrapped in a border-radius 8px shell with a 1px border `#E2E8F0` and overflow hidden.
- **Header Row:** Height 40px, background `#F8FAFC`, border-bottom 1px solid `#E2E8F0`. Text formatted in `label-xs` uppercase slate-600.
- **Body Rows:** Height 48px, background `#FFFFFF`, border-bottom 1px solid `#F1F5F9`. Hover state shifts surface to `#F8FAFC`. Selected row uses background `#EEF2FF`.
- **Alignment:** Alphanumeric fields and customer profiles align left; dates, statuses, and tags align center/left; currency metrics, amounts, and numeric counts strictly align right with tabular figures.

### Status Chips & Badges
- **Token Format:** Inline-flex, height 22px, padding 2px 8px, radius 9999px, font size 12px, weight 500.
- **Active / Paid:** Background `#ECFDF5`, text `#059669`, border 1px solid `#A7F3D0`. Includes a 6px solid emerald dot before text.
- **Overdue / Warning:** Background `#FFFBEB`, text `#D97706`, border 1px solid `#FDE68A`. Includes a 6px solid amber dot.
- **Past 30 Days / Risk:** Background `#FFF1F2`, text `#E11D48`, border 1px solid `#FECDD3`. Includes a 6px solid rose dot.
- **Draft / Inactive:** Background `#F1F5F9`, text `#475569`, border 1px solid `#E2E8F0`.

### Segmented Controls
- Track container height 36px, background `#F1F5F9`, border-radius 6px, padding 2px.
- Segment button height 32px, text `#475569` (`label-sm`).
- Selected segment features background `#FFFFFF`, text `#0F172A`, font weight 500, border-radius 4px, subtle ambient shadow `0 1px 2px rgba(15, 23, 42, 0.06)`.

### Form Inputs & Selects
- Height 36px, radius 4px, border 1px solid `#E2E8F0`, background `#FFFFFF`, padding 0 12px.
- Text uses `body-md` in slate-900 `#0F172A`, placeholder in `#94A3B8`.
- Focus state applies border `#4F46E5` with an outer outline ring of `2px solid rgba(79, 70, 229, 0.2)`.

### Checkboxes
- Size 16px × 16px, radius 4px, border 1px solid `#CBD5E1`.
- Checked state: background `#4F46E5`, border `#4F46E5`, glyph white with 1.5px stroke width.

### Breadcrumbs
- Height 24px, display inline-flex, gap 8px, font size 13px (`body-sm`).
- Ancestor nodes set in slate-600 (`#475569`), hover color slate-900 (`#0F172A`).
- Separator rendered as an angled slash (`/`) in slate-400 (`#94A3B8`). Current page terminates with slate-900 (`#0F172A`) weight 500.