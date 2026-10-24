# Fulfillment Platform UI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely replace the legacy v1 presentation layer with the modern Light Mode Fulfillment UI v2 based on `DESIGN.md` (`getdesign.md`), delivering a 1-click packing and label printing flow for warehouse operators.

**Architecture:** Build a unified Light Mode theme system (slate-50 canvas, white card surfaces, hairline borders, dark slate typography, indigo accent), rewrite core UI primitives, create a streamlined application shell, and overhaul the Orders and Shipments workspaces to provide seamless inline shipping, tracking, and label printing.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-fulfillment-ui-v2-design.md` and `DESIGN.md`

## Global Constraints

- Never modify backend database schemas, Prisma migrations, or carrier adapter core logic.
- Route handlers must remain thin (request parsing, auth/tenant context, service delegation).
- Strictly enforce tenant isolation on all queries and mutations.
- Never expose carrier credentials, webhook secrets, or passwords in plaintext.
- Never call live carrier APIs directly from browser client code; interact solely via internal `/api/*` endpoints.
- Preserve existing `data-testid` attributes on interactive elements for Playwright tests.

## Review Focus

1. **Carrier PDF popup blocker**: Opening the carrier label PDF via `window.open` must not trigger browser popup blockers (trigger synchronously from user click or open in dedicated anchor/iframe).
2. **Double submit on Ship**: Clicking "Xác nhận đóng hàng & Lấy nhãn" multiple times must be prevented via disabled loading states to avoid duplicate carrier waybill creation and billing.
3. **Empty or missing package specs**: Orders lacking SKU mappings or dimensions must fallback gracefully to default packaging presets (10x10x5 cm, 100g) rather than crashing or blocking the operator.
4. **Tenant context leakage**: Navigating between routes must preserve the selected tenant context in headers and cookies.
5. **High volume table rendering**: Large order lists (100+ items) must scroll smoothly with compact 40px rows without layout shift.

---

### Task 1: Design Tokens & CSS Foundation

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/styles/globals.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind theme classes (`bg-slate-50`, `bg-white`, `border-slate-200`, `text-slate-900`, `text-slate-600`, `bg-indigo-600`) and CSS root variables (`--bg-page`, `--bg-surface`, `--border`, `--text-primary`, `--accent`).

- [ ] **Step 1: Update `tailwind.config.ts` and CSS variables**
  Set `--bg-page: #f8fafc`, `--bg-surface: #ffffff`, `--bg-surface2: #f1f5f9`, `--border: #e2e8f0`, `--border-strong: #cbd5e1`, `--text-primary: #0f172a`, `--text-secondary: #475569`, `--text-muted: #64748b`, `--accent: #4f46e5`.
- [ ] **Step 2: Clean `src/styles/globals.css` and `src/app/globals.css`**
  Remove dark-mode overrides and set standard light-mode background and font antialiasing.
- [ ] **Step 3: Verify CSS build and tokens**
  Run: `npm run typecheck`
  Expected: PASS

---

### Task 2: Core v2 UI Primitives (`src/components/ui/`)

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/StatusBadge.tsx`
- Modify: `src/components/ui/DataTable.tsx`
- Modify: `src/components/ui/ConfirmationModal.tsx`
- Modify: `src/components/ui/CopyButton.tsx`
- Modify: `src/components/ui/RoleBadge.tsx`
- Modify: `src/components/ui/TenantBadge.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ui/ErrorState.tsx`
- Modify: `src/components/ui/WarningBox.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 1.
- Produces: Reusable UI primitives with Light Mode styling and consistent interactive states.

- [ ] **Step 1: Implement `Button.tsx` with Light Mode variants**
  Primary (indigo `#4f46e5`), Secondary (white `#ffffff` with border `#e2e8f0`), Destructive (rose soft pill), Ghost, Outline.
- [ ] **Step 2: Implement `StatusBadge.tsx` with domain fulfillment pills**
  READY_TO_SHIP (blue), PENDING/IN_PROCESSING (amber), SHIPPED/DELIVERED (emerald), CANCELLED/FAILED (rose), ON_HOLD (slate).
- [ ] **Step 3: Implement `DataTable.tsx` with compact 40px rows**
  Slate-100 header, slate-200 border, hover highlight `hover:bg-slate-50`.
- [ ] **Step 4: Implement `ConfirmationModal.tsx` and `CopyButton.tsx`**
  White surface, rounded-xl, backdrop blur, 1-click clipboard copy.
- [ ] **Step 5: Verify primitives compile cleanly**
  Run: `npm run typecheck`
  Expected: PASS

---

### Task 3: Modern Application Shell (`Sidebar`, `Topbar`, Dashboard Layout)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Topbar.tsx`
- Modify: `src/components/layout/UserMenu.tsx`
- Modify: `src/components/layout/ChangePasswordDialog.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: UI primitives from Task 2.
- Produces: Unified 240px Sidebar and 52px Topbar console layout.

- [ ] **Step 1: Rewrite `Sidebar.tsx`**
  White background `#ffffff`, hairline border-r `#e2e8f0`, brand logo, navigation items (Đơn hàng, Vận đơn, Tra cứu đơn, Chi phí vận chuyển, Cài đặt, Quản trị hệ thống), active state with `bg-indigo-50 text-indigo-700 font-semibold`, user role badge and logout button.
- [ ] **Step 2: Rewrite `Topbar.tsx` and `UserMenu.tsx`**
  52px height, white background, breadcrumb navigation, Sandbox/Production badge, user avatar menu.
- [ ] **Step 3: Update `src/app/(dashboard)/layout.tsx`**
  Canvas background `#f8fafc`, flex sidebar layout, responsive content padding.
- [ ] **Step 4: Verify shell compilation**
  Run: `npm run typecheck`
  Expected: PASS

---

### Task 4: Fast 1-Click Shipping Flow & Orders Workspace

**Files:**
- Modify: `src/components/orders/OrdersTable.tsx`
- Modify: `src/components/orders/ShipOrderModal.tsx`
- Modify: `src/components/orders/BatchShipModal.tsx`
- Modify: `src/components/orders/OrderExpandPanel.tsx`
- Modify: `src/components/orders/EnvironmentSelector.tsx`

**Interfaces:**
- Consumes: `src/lib/api/orders.ts` (`getOrders`, `shipOrder`, `shipOrdersBatch`, `cancelYunShipment`, `resetOrder`).
- Produces: Streamlined Orders workspace with quick status filter tabs, 1-click packing modal, auto PDF label printing, direct tracking copy, and "In nhãn" reprint button.

- [ ] **Step 1: Reorganize `OrdersTable.tsx`**
  - Add Quick Status Tabs: `Tất cả` | `Chờ đóng hàng` | `Đang xử lý / Giao` | `Đã xuất kho / Hoàn tất` | `Hủy / Lỗi`.
  - Column structure: Checkbox, Order ID + Store, Recipient + Country, Items, Status Badge, Tracking Number (with copy button), Actions.
  - Action buttons:
    - If unfulfilled: Indigo button **"Ship"** (opens `ShipOrderModal`).
    - If shipped/in processing with tracking: Emerald button **"In nhãn"** (opens PDF label) + "Chi tiết" toggle.
    - Secondary dropdown `...`: "Hủy vận đơn Yun" (for orders under 30 mins) and "Reset đơn".
- [ ] **Step 2: Reorganize `ShipOrderModal.tsx` (1-Click Packing Modal)**
  - Pre-fill SKU, declared English name, declared Chinese name, parcel dimensions (L x W x H cm), package weight (g).
  - Pre-fill EU IOSS VAT number if destination country is in EU.
  - Primary button: **"Xác nhận đóng hàng & Lấy nhãn"**.
  - On confirm: Calls `/api/orders/[orderId]/ship` $\rightarrow$ immediately opens PDF label in new window $\rightarrow$ chains `/api/orders/[orderId]/confirm-shipped` $\rightarrow$ refreshes table row.
- [ ] **Step 3: Reorganize `BatchShipModal.tsx`**
  - Render selected order list.
  - Execute batch via `/api/orders/ship-batch` with clear progress state.
  - Display completion report with tracking codes and "In tất cả nhãn" action.
- [ ] **Step 4: Update `OrderExpandPanel.tsx`**
  - Light mode parcel details, items breakdown, recipient address, tracking events timeline.
- [ ] **Step 5: Verify Orders flow compiles and unit tests pass**
  Run: `npm run typecheck && npm test tests/orders/`
  Expected: PASS

---

### Task 5: Dedicated Shipments Hub (`/shipments`)

**Files:**
- Modify: `src/components/shipments/ShipmentsTable.tsx`
- Modify: `src/components/shipments/PreflightChecker.tsx`
- Modify: `src/components/shipments/ShipmentTimeline.tsx`
- Modify: `src/components/shipments/ShipmentDetailPanel.tsx`
- Modify: `src/components/shipments/LiveActionConfirmation.tsx`

**Interfaces:**
- Consumes: `src/lib/api/shipments.ts` (`getShipments`, `getShipment`, `syncTracking`).
- Produces: Dedicated tracking operations center for carrier synchronization and channel tracking updates.

- [ ] **Step 1: Rewrite `ShipmentsTable.tsx`**
  Clean Light data table: Tracking number, Carrier badge (YunExpress / Viettel Post), Order ID, Status, Sync state, Actions ("Xem hành trình", "Đồng bộ tracking", "Tải lại nhãn").
- [ ] **Step 2: Update `ShipmentTimeline.tsx` and `PreflightChecker.tsx`**
  Vertical milestone timeline with light status dots and timestamps.
- [ ] **Step 3: Verify Shipments compilation and tests**
  Run: `npm run typecheck && npm test tests/shipments/`
  Expected: PASS

---

### Task 6: Ancillary Dashboards & Settings Alignment

**Files:**
- Modify: `src/components/order-lookup/OrderLookupPage.tsx`
- Modify: `src/components/order-lookup/SearchCard.tsx`
- Modify: `src/components/shipping-costs/ShippingCostsPage.tsx`
- Modify: `src/components/settings/SettingsShell.tsx`
- Modify: `src/components/settings/CredentialForm.tsx`
- Modify: `src/components/settings/EditMemberModal.tsx`
- Modify: `src/components/settings/ApiKeyRevealModal.tsx`
- Modify: `src/components/platform/PlatformShell.tsx`
- Modify: `src/components/platform/PlatformUserMenu.tsx`
- Modify: `src/app/login/LoginForm.tsx`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: Platform, settings, and shipping costs APIs.
- Produces: 100% visual consistency across all remaining system screens.

- [ ] **Step 1: Align `OrderLookup` and `ShippingCosts`**
  Update search cards, stat metrics, and cost tables to Light Mode card styling.
- [ ] **Step 2: Align `Settings` and `Platform Admin`**
  Form inputs with border `#cbd5e1`, masked credentials with toggle reveal, clean role badges, copy buttons.
- [ ] **Step 3: Align `LoginForm`**
  Clean, high-contrast login card on slate-50 background.
- [ ] **Step 4: Verify full project compilation**
  Run: `npm run typecheck`
  Expected: PASS

---

### Task 7: Comprehensive Verification & Production Build

**Files:**
- Global verification across all changed files.

**Interfaces:**
- Validates the entire codebase meets the production gates defined in `AGENTS.md`.

- [ ] **Step 1: Run TypeScript typecheck**
  Run: `npm run typecheck`
  Expected: 0 errors
- [ ] **Step 2: Run ESLint**
  Run: `npm run lint`
  Expected: 0 errors, 0 warnings
- [ ] **Step 3: Run production build**
  Run: `npm run build`
  Expected: Successful Next.js production build
- [ ] **Step 4: Run unit tests**
  Run: `npm test`
  Expected: All unit tests PASS
- [ ] **Step 5: Verify live dev server**
  Verify `http://localhost:3000` loads properly with the new Light Mode console.
- [ ] **Step 6: Commit all changes to `feature/ui-v2`**
  Commit with descriptive message and produce `PASS` summary report.
