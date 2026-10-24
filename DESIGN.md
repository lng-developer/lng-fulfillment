# DESIGN.md — Modern Light Design System for Fulfillment Platform v2

> Standardized visual design system for Fulfillment Platform v2: High-contrast Light Mode (Slate/White) built for logistics warehouse operators. Clean, dense, fast, and legible for extended daily sessions.

---

## 1. Visual Philosophy & Atmosphere

- **Logistics Operator Console**: Pure white card surfaces (`#ffffff`) placed on an ultra-light slate canvas (`#f8fafc`) with delicate hairline borders (`#e2e8f0`).
- **High Information Density**: Compact 40px table rows, crisp dark slate typography (`#0f172a` primary, `#475569` secondary), monospace tracking and SKU codes.
- **Modern Indigo Accent**: `#4f46e5` (indigo-600) for primary CTAs, active tab highlights, and focused inputs.
- **Frictionless 1-Click Operations**: Direct shipping from the orders table with an auto-populated packing modal (SKU, EName, weight, dimensions, EU IOSS), instant carrier tracking generation, and immediate PDF label printing.

---

## 2. Color Tokens & Palette

### Backgrounds & Surfaces
| Token | Hex Value | Tailwind Class / CSS Variable | Purpose |
|---|---|---|---|
| `canvas` | `#f8fafc` | `bg-slate-50` / `var(--bg-page)` | Main page background |
| `surface-1` | `#ffffff` | `bg-white` / `var(--bg-surface)` | Cards, tables, modals, flyouts |
| `surface-2` | `#f1f5f9` | `bg-slate-100` / `var(--bg-surface2)` | Table headers, row hover, input bg |
| `surface-3` | `#e2e8f0` | `bg-slate-200` / `var(--bg-surface3)` | Dividers, chip backgrounds |
| `hairline` | `#e2e8f0` | `border-slate-200` / `var(--border)` | Card borders, table dividers |
| `hairline-strong` | `#cbd5e1` | `border-slate-300` / `var(--border-strong)` | Form inputs, active borders |

### Typography & Ink
| Token | Hex Value | Tailwind Class | Purpose |
|---|---|---|---|
| `ink-primary` | `#0f172a` | `text-slate-900` | Headings, active values, primary text |
| `ink-secondary`| `#475569` | `text-slate-600` | Table body cells, labels, descriptions |
| `ink-muted` | `#64748b` | `text-slate-500` | Timestamps, metadata, unit tags |
| `ink-faint` | `#94a3b8` | `text-slate-400` | Placeholders, inactive icons |

### Interactive & Brand Accent
| Token | Hex Value | Tailwind Class | Purpose |
|---|---|---|---|
| `accent-primary` | `#4f46e5` | `bg-indigo-600 text-white` | Primary buttons, active state |
| `accent-hover` | `#4338ca` | `hover:bg-indigo-700` | Primary button hover |
| `accent-subtle` | `#eef2ff` | `bg-indigo-50 text-indigo-700` | Active navigation pill, active tab |
| `accent-ring` | `#4f46e5` | `ring-indigo-500` | Focus rings |

### Fulfillment Status Badges
| Status | Badge Background | Badge Text | Badge Border |
|---|---|---|---|
| `READY_TO_SHIP` / `FULFILLED` | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| `PENDING` / `IN_PROCESSING` | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| `SHIPPED` / `DELIVERED` | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| `CANCELLED` / `FAILED` | `bg-rose-50` | `text-rose-700` | `border-rose-200` |
| `ON_HOLD` / `DRAFT` | `bg-slate-100` | `text-slate-700` | `border-slate-200` |

---

## 3. Typography & Scale

- **Sans Serif**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace**: `ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace` (strictly for tracking numbers, order IDs, SKUs, and currency amounts).
- **Scale**:
  - `page-title`: `text-xl font-bold tracking-tight text-slate-900`
  - `section-heading`: `text-sm font-semibold tracking-tight text-slate-800`
  - `body`: `text-sm text-slate-600`
  - `body-compact`: `text-[13px] text-slate-600`
  - `caption`: `text-xs text-slate-500`
  - `code`: `font-mono text-xs text-slate-800 font-medium`

---

## 4. Layout & Spacing

- **Sidebar Width**: `240px` (`bg-white border-r border-slate-200`)
- **Topbar Height**: `52px` (`bg-white border-b border-slate-200`)
- **Page Container**: Max width full, horizontal padding `px-6`, vertical `py-5`.
- **Table Density**: 40px row height for maximum scan speed.
- **Card Corners**: `rounded-lg` (8px), hairline border `border border-slate-200`, subtle shadow `shadow-sm`.

---

## 5. Key Operator Flows

1. **Orders Dashboard**:
   - Quick Filter Tabs: `Tất cả` | `Chờ gửi hàng (Ready to ship)` | `Đang giao (In Transit)` | `Đã giao (Delivered)` | `Cảnh báo / Lỗi`
   - Row Actions:
     - If order is unfulfilled: Primary button **"Ship"** $\rightarrow$ opens `ShipOrderModal` (pre-populated packing specs) $\rightarrow$ 1-click confirm triggers carrier API $\rightarrow$ receives tracking code $\rightarrow$ opens label PDF immediately in new tab $\rightarrow$ row shows tracking & green "In nhãn" button.
     - If order is already shipped: Direct button **"In nhãn"** (re-opens PDF) + tracking number with 1-click copy.
     - Multi-select: Checkbox for batch shipping via `BatchShipModal`.
     - Expand row: Embedded view of package dimensions, items, declared value, receiver address.
2. **Shipments Hub**:
   - Dedicated views for carrier monitoring (YunExpress, Viettel Post).
   - Real-time tracking synchronization & Etsy shop tracking sync.
   - Detailed carrier milestone timeline.
3. **Ancillary Consoles**:
   - Order Lookup, Shipping Costs, Settings, Platform Admin — all styled in the cohesive white/slate-50 Light theme.
