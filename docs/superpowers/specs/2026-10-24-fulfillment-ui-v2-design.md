# Design Specification: Fulfillment Platform UI v2

- **Author**: Codex / Antigravity
- **Date**: 2026-10-24
- **Branch**: `feature/ui-v2`
- **Reference Standard**: `getdesign.md` via `DESIGN.md`
- **Builder Review**: Incorporated all 5 architectural clarifications (Fulfillment lifecycle, Query mapping, Carrier routing, Risk-control actions, Batch progress).

---

## 1. Intent & The Why

Fulfillment warehouse operators currently face friction when navigating across nested drawers and disjointed legacy panels to fulfill orders and print carrier shipping labels. Furthermore, the previous dark theme caused readability fatigue under warehouse ambient lighting.

UI v2 completely reorganizes the presentation layer around the warehouse operator's daily journey:
- Crisp, modern Light Mode (Slate-50 `#f8fafc` canvas, pure white `#ffffff` cards, hairline `#e2e8f0` borders, `#0f172a` typography, indigo `#4f46e5` accent).
- 1-Click Fast Fulfillment: Clicking "Ship" directly presents an auto-mapped packing popup (with SKU, declared Chinese/English names, package dimensions, weight, and EU IOSS pre-filled) $\rightarrow$ 1-click confirmation dispatches the carrier API request $\rightarrow$ immediately opens the carrier PDF shipping label in a new tab for thermal printing $\rightarrow$ live-updates the order row with the tracking number and an instant "In nhãn" button.
- Dedicated Shipments Hub: Orders and Shipments remain distinct on the navigation bar for high-volume tracking audits and Etsy channel sync, while the Orders table provides all inline shipment actions so operators never need to leave the screen during packing.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Light Logistics Theme**: Fully implement `DESIGN.md` across all dashboard routes (`/orders`, `/shipments`, `/shipping-costs`, `/order-lookup`, `/settings/*`, `/platform/*`, `/login`).
2. **1-Click Shipping Flow**: Direct transition from Order $\rightarrow$ `ShipOrderModal` (pre-filled) $\rightarrow$ API call $\rightarrow$ Auto-open label PDF $\rightarrow$ Row state updated.
3. **Batch Shipping**: Select multiple orders $\rightarrow$ `BatchShipModal` $\rightarrow$ background processing with clear loading indicator and comprehensive completion report.
4. **Instant Reprint & Tracking**: Shipped orders have 1-click tracking copy and direct "In nhãn" action.
5. **Expandable Order Detail Row**: Fast preview of recipient details, items, declared specs, and tracking events directly within the table.
6. **Zero Regression**: Pass all TypeScript checks (`npm run typecheck`), linting (`npm run lint`), and build (`npm run build`).

### Non-Goals
1. Modifying backend database schemas, Prisma migrations, or carrier adapter core logic.
2. Direct carrier API calls from the client browser.
3. Dark mode theme toggle (v2 is exclusively focused on the optimized Light Mode).

### Anti-Goals
1. Fragmented styling (e.g. Mixing random dark theme CSS modules with light theme classes).
2. Deeply nested dialogs where an operator has to click through 4 separate screens to generate 1 label.
3. Forcing warehouse staff to switch tabs to find the tracking number or reprint a label.

---

## 3. Architecture & Technical Constraints (AGENTS.md)

1. **Route Handlers Remain Thin**: Keep API endpoints strictly for validation, authentication/tenancy context, and service delegation.
2. **Strict Multi-Tenancy**: Every request, query, and UI fetch must respect `tenantId` boundaries.
3. **Security & Credentials**: Carrier credentials (AppKey, AppSecret), webhook tokens, and user passwords must never be exposed or logged in plain text.
4. **No Direct Carrier Calls**: UI components interact exclusively with `/api/*` internal endpoints.
5. **Playwright Test Attribute Preservation**: Retain existing `data-testid` attributes on interactive elements (e.g., table rows, search bars, ship buttons) so end-to-end tests remain green.

---

## 4. Operational Lifecycle & Builder Decisions

### 4.1 1-Click Fulfillment & Cost Calculation Flow
- When `ShipOrderModal` executes:
  1. Calls `POST /api/orders/[id]/ship` with the pre-filled dimensions, weight, SKU, and IOSS.
  2. Receives carrier tracking number and label PDF URL.
  3. Immediately opens the label PDF in a new browser tab for immediate thermal printing.
  4. Automatically chains a background call to `POST /api/orders/[id]/confirm-shipped` with the actual package dimensions to record the shipping cost estimate and transition the order state.
  5. The Orders table row immediately displays the tracking number and the green "In nhãn" button.

### 4.2 Quick Status Tabs Query Mapping
- Tab filtering maps directly to existing `OrderStatus` enum values supported by `/api/orders`:
  - `Tất cả`: `status=` (all orders)
  - `Chờ đóng hàng`: `status=READY_TO_SHIP`
  - `Đang xử lý / Giao`: `status=IN_PROCESSING`
  - `Đã xuất kho / Hoàn tất`: `status=SHIPPED`
  - `Hủy / Lỗi`: `status=CANCELLED`
- This ensures 100% server-side pagination and count accuracy without requiring any schema changes.

### 4.3 Multi-Carrier Routing (YunExpress vs Viettel Post)
- If the destination country is domestic (`VN`), the modal renders domestic packing fields and routes to the Viettel Post fulfillment pipeline.
- If the destination country is international (US, EU, UK, AU, etc.), the modal renders YunExpress international customs fields (English/Chinese item names, EU IOSS VAT number) and routes to `shipOrderWithYun`.

### 4.4 Risk Control Actions (Cancel Yun & Reset Order)
- The primary row displays the primary action ("Ship" or "In nhãn").
- Risk control actions (`Hủy vận đơn Yun` within the 30-minute grace period, and `Reset trạng thái đơn` for stuck/failed orders) are neatly placed in a secondary `...` action menu and inside the expandable row panel (`OrderExpandPanel`). This prevents clutter while preserving emergency operator capabilities.

### 4.5 Batch Shipping Execution
- Batch shipping uses the `/api/orders/ship-batch` endpoint.
- While the batch is executing, `BatchShipModal` displays a clean progress state.
- Upon completion, it displays a detailed summary table showing which orders succeeded with their tracking codes and direct links to print all labels simultaneously.

---

## 5. UI Organization & Shell Layout

### 5.1 Sidebar & Topbar Shell
- **Sidebar**:
  - Logo & Tenant selector header.
  - Main Navigation:
    - `Đơn hàng` (`/orders` - Primary workspace)
    - `Vận đơn` (`/shipments` - Tracking & carriers)
    - `Tra cứu đơn` (`/order-lookup` - Fast single search)
    - `Chi phí vận chuyển` (`/shipping-costs` - Shipping fees)
    - `Cài đặt` (`/settings` - Accounts, members, automation)
    - `Quản trị hệ thống` (`/platform` - Multi-tenant admin, visible to system admins)
  - User footer with tenant role badge and logout.
- **Topbar**:
  - Breadcrumbs, environment status indicator (Sandbox / Production badge), global search shortcut, user profile menu.

### 5.2 Orders Workspace (`/orders`)
- Quick Status Tabs on top.
- Data table: Compact 40px rows, clean light border, monospace tracking code with copy button, direct "Ship" or "In nhãn" action button, and expandable row for parcel details.
