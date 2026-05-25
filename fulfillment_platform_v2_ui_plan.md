# Fulfillment Platform v2 — UI Plan & Codex Brief

> Tài liệu này là kế hoạch thiết kế giao diện chi tiết cho Fulfillment Platform v2,
> dùng để giao cho Codex implement. Đọc kết hợp với `fulfillment_platform_v2_system_flows_for_claude.md`.

---

## 1. Stack & Design Language

```
Framework:   Next.js 14 (App Router)
Language:    TypeScript
Styling:     Tailwind CSS v3
Components:  shadcn/ui
Icons:       Lucide React
Fonts:       Inter (Google Fonts)
```

### Color Tokens

| Token | Hex | Tailwind | Dùng cho |
|---|---|---|---|
| Primary | `#0F172A` | `slate-900` | Sidebar, topbar bg |
| Accent | `#3B82F6` | `blue-500` | CTA, active nav, links |
| Danger | `#EF4444` | `red-500` | Revoke, disable, live warning |
| Warning | `#F59E0B` | `amber-500` | Live mode, confirm boxes |
| Success | `#10B981` | `emerald-500` | Active, delivered, OK |
| Muted | `#64748B` | `slate-500` | Labels, secondary text |
| Background | `#F8FAFC` | `slate-50` | Main content area |
| Surface | `#FFFFFF` | `white` | Cards, drawers, modals |
| Border | `#E2E8F0` | `slate-200` | Dividers, outlines |

### Typography

```
Font family: Inter
Heading:     font-semibold text-slate-900
Body:        font-normal text-slate-700
Caption:     text-xs text-slate-500
Monospace:   font-mono text-slate-800   ← IDs, keys, prefixes, codes
```

### Layout Constants

```
Sidebar width:    240px  (icon-only collapsed: 64px)
Topbar height:    56px
Content padding:  24px
Card gap:         16px
Table row height: 48px
Drawer width:     520px  (mobile: full width)
Modal max-width:  480px
```

---

## 2. Shell Layout

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR [56px] bg-slate-900                                   │
│  [Logo]  [TenantBadge ▾]              [RoleBadge] [UserMenu] │
├────────────┬─────────────────────────────────────────────────┤
│ SIDEBAR    │  MAIN CONTENT  bg-slate-50                      │
│ [240px]    │                                                  │
│ bg-slate-900│  <PageHeader title actions />                  │
│            │                                                  │
│ ● Orders   │  ┌────────────────────────────────────────┐    │
│ ● Shipments│  │  Page content                          │    │
│            │  │  Table / Cards / Form                  │    │
│ ─────────  │  └────────────────────────────────────────┘    │
│ ● Settings │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

### Topbar Components

- **Logo** — text "FP" trong rounded box + "Fulfillment" text, link → `/dashboard`
- **TenantBadge** — `tenant.name` dạng pill `bg-slate-800 text-white`, slug nhỏ bên dưới
- **RoleBadge** — pill màu theo role: OWNER=purple, ADMIN=blue, OPERATOR=amber, VIEWER=slate
- **UserMenu** — avatar initials + email, dropdown: "Settings" / "Logout"

### Sidebar Nav Items

```
Icon  Label         Route
───────────────────────────────
📦   Orders         /orders
🚚   Shipments      /shipments
─── (separator) ───────────────
⚙️   Settings       /settings
```

Active state: `bg-blue-600/10 text-blue-400 border-r-2 border-blue-500`
Inactive: `text-slate-400 hover:text-white hover:bg-slate-800`

---

## 3. Screens — Chi tiết

### 3.1 Login Page `/login`

```
Full-screen bg-slate-50, card căn giữa màn hình w-[400px]

┌────────────────────────────────┐
│  [FP Logo]                     │
│  Fulfillment Platform          │
│  Sign in to your account       │
│                                │
│  Email address                 │
│  [________________________]    │
│                                │
│  Password                      │
│  [________________________]    │
│                                │
│  [Sign In ──────────────────]  │
│   (blue button, full width)    │
│                                │
│  ⚠ Invalid credentials. ...   │  ← generic error only
└────────────────────────────────┘
```

**Rules:**
- `type="password"` + `autocomplete="current-password"`
- Không lưu credentials vào localStorage/sessionStorage
- Button disabled + spinner khi loading
- Error message generic: không leak email/password reason cụ thể
- Redirect → `/dashboard` khi success

---

### 3.2 Orders Page `/orders`

```
PageHeader:
  "Orders"                    [Search: orderNumber, sku...]
  [Status ▾] [Date range ▾]

DataTable:
  Col: #  orderNumber  source  status  recipient  destination  items  receivedAt  ⋯
  ─────────────────────────────────────────────────────────────────────────────────
  Row click → OrderDetailDrawer

Pagination:
  ← Prev  [1][2][3]...  Next →     Showing 1–20 of 143
```

**DataTable columns:**

| Column | Render | Notes |
|---|---|---|
| `orderNumber` | monospace, blue link | click → Detail Drawer |
| `source` | small pill badge | "portal", "manual" |
| `status` | `<StatusBadge />` | READY_TO_SHIP = emerald |
| `recipient` | name + flag emoji | country code → flag |
| `destination` | city, country | compact |
| `items` | "3 items · SKU-001" | truncate at 1 sku |
| `receivedAt` | relative "2h ago" | tooltip = full ISO |

**Filter query params:** `?page=1&pageSize=20&status=&search=&from=&to=&sortBy=receivedAt&sortOrder=desc`

**States:**
- Loading: `<LoadingSkeleton rows={10} />`
- Empty: icon box + "No orders found. Adjust your filters."
- Error: `<ErrorState message="Failed to load orders" retry />`

---

### 3.3 Order Detail Drawer

Slide-in từ phải. Overlay backdrop `bg-black/40`. Close bằng Esc hoặc click backdrop.

```
┌─────────────────────────────────────┐
│ ✕       ORDER-123          [READY]  │  ← header sticky
├─────────────────────────────────────┤
│ 📦 ORDER SUMMARY                    │
│   Source: portal                    │
│   Shop: MyShop · Marketplace: AMZ   │
│   Purchased: Jan 10 · Paid: Jan 10  │
│   Received: Jan 11, 09:32 AM        │
├─────────────────────────────────────┤
│ 📍 RECIPIENT                        │
│   John Doe                          │
│   123 Main St, Hanoi, VN 100000    │
│   Shipping: Standard · Express      │
├─────────────────────────────────────┤
│ 🛒 ITEMS (2)                        │
│  ┌──────┬──────────────┬───┬──────┐ │
│  │ SKU  │ Name         │Qty│Price │ │
│  ├──────┼──────────────┼───┼──────┤ │
│  │ A001 │ Mug Custom.. │ 2 │$12.00│ │
│  └──────┴──────────────┴───┴──────┘ │
│  + weight, declaredValue, prodStatus│
├─────────────────────────────────────┤
│ 📋 STATUS HISTORY                   │
│  ShipmentTimeline vertical          │
├─────────────────────────────────────┤
│ 🚚 RELATED SHIPMENTS (1)            │
│  ShipmentCard mini list             │
├─────────────────────────────────────┤
│ [+ Create Draft Shipment]           │  ← hidden for VIEWER
│  Inline form: checkbox items + qty  │
└─────────────────────────────────────┘
```

**Create Draft Shipment — inline form:**
```
Select items to include:
☑ SKU-A001 × [2] (max 2)
☐ SKU-B002 × [1] (max 1)

[Cancel]  [Create Draft Shipment]
```
- Quantity input: `type="number" min="1" max={item.quantity}`
- Loading state trên button
- Success: toast + refresh "Related Shipments" section
- Không navigate đi sau create

---

### 3.4 Shipments Page `/shipments`

```
PageHeader:
  "Shipments"          [Status ▾] [Carrier ▾] [Date range ▾]

DataTable:
  Col: shipmentId  order  status  carrier  tracking  label  createdAt  ⋯
  Row click → ShipmentDetailPanel (slide-in)
```

| Column | Render |
|---|---|
| `shipmentId` | monospace, truncate |
| `order` | orderNumber link |
| `status` | `<StatusBadge />` |
| `carrier` | carrier icon + code |
| `trackingNumber` | monospace, copy icon |
| `label` | 🔗 icon link nếu có |
| `createdAt` | relative time |

---

### 3.5 Shipment Detail Panel

Slide-in từ phải, width 520px.

```
┌──────────────────────────────────────────┐
│ ✕  SHIP-456                  [DRAFT]     │
├──────────────────────────────────────────┤
│ Items: SKU-A001 × 2, SKU-B002 × 1       │
│ Order: ORDER-123 →                       │
├──────────────────────────────────────────┤
│ ⬡ PREFLIGHT CHECK                        │
│                         [Run Preflight]  │
│                                          │
│  ✅ Authentication OK                    │
│  ✅ Role: ADMIN — permitted              │
│  ✅ Shipment status: DRAFT               │
│  ✅ Carrier: yunexpress_oms registered   │
│  ✅ Credential: tenantCredential         │
│  ⚠️  liveEnabled: FALSE (sandbox)        │
│                                          │
│  MAPPING PREVIEW                         │
│  ─────────────────────────────────────  │
│  CustomerOrderNumber  ORDER-123          │
│  ShippingMethodCode   THZXR             │
│  Receiver             VN · Hanoi        │
│  Package              0.5 kg · 1 parcel │
│  Parcels:                                │
│    SKU-A001  Mug  ×2  0.25kg  $12.00   │
│  SourceCode           API               │
│                                          │
│  ⚠️ CustomerNo / ApiSecret: [HIDDEN]    │
├──────────────────────────────────────────┤
│ EXECUTE                                  │
│                                          │
│  ⚠️  liveEnabled=false                  │
│  Live carrier actions are disabled.     │
│  Enable live mode in Carrier Settings   │
│  to proceed.                            │
│                                          │
│  [Create YunExpress Shipment]            │
│   button disabled, cursor-not-allowed   │
├──────────────────────────────────────────┤
│ 📡 TRACKING                              │
│  Tracking #:  —                         │
│  Status:      —                         │
│  [Sync Tracking]   ← manual only        │
│   disabled if no carrier/tracking key   │
│  Result shows: status, trackingNumber,  │
│   latestEvent, eventsCount              │
├──────────────────────────────────────────┤
│ 📋 SHIPMENT TIMELINE                     │
│  ● DRAFT      Jan 11, 09:45 AM          │
│  (future statuses as they happen)       │
└──────────────────────────────────────────┘
```

**LiveActionConfirmation Modal (chỉ khi `liveEnabled=true`):**

```
┌──────────────────────────────────────────────┐
│  ⚠️  LIVE CARRIER ACTION                     │
│                                              │
│  You are about to create a REAL shipment     │
│  in YunExpress OMS. This action:             │
│                                              │
│  • Will be sent to YunExpress immediately    │
│  • Cannot be automatically reversed         │
│  • May incur carrier charges                 │
│                                              │
│  ☐  I understand this is a live operation   │
│                                              │
│  Type to confirm:                            │
│  [CREATE YUNEXPRESS SHIPMENT         ]       │
│                                              │
│  [Cancel]         [Confirm — Execute Live]   │
│                    (red, enabled only when   │
│                     checkbox + exact text)   │
└──────────────────────────────────────────────┘
```

**Rules:**
- Button enabled chỉ khi: checkbox checked AND input text === `"CREATE YUNEXPRESS SHIPMENT"` (exact)
- Single click — disable button sau lần click đầu
- Không auto-retry
- Loading spinner trên button khi submitting

---

### 3.6 Settings Page `/settings`

**Layout:** Tabs nằm ngang dưới PageHeader

```
Settings
──────────────────────────────────────────────────
[Tenant Profile] [API Keys] [Members] [Carrier Accounts] [Audit Logs]
```

Tab Audit Logs ẩn với OPERATOR/VIEWER.

---

#### Settings › Tenant Profile

```
┌────────────────────────────────┐
│ TENANT INFORMATION             │
│                                │
│ Name        Acme Fulfillment   │
│ Slug        acme-fulfillment   │
│ Your Role   [ADMIN]            │
│ Status      [ACTIVE]           │
└────────────────────────────────┘
```

---

#### Settings › API Keys

```
PageHeader: "API Keys"   [+ Create API Key]  ← OWNER/ADMIN only

Table:
Name | Prefix | Scopes | Status | Expires | Last Used | Created | ⋯
─────────────────────────────────────────────────────────────────────
portal-key  fp_live_abc  orders:write,read  ACTIVE  Never  2h ago  [Revoke]
```

**Create API Key Modal:**
```
┌──────────────────────────────────────┐
│ Create API Key                       │
│                                      │
│ Name *                               │
│ [___________________________]        │
│                                      │
│ Scopes *                             │
│  ☑ orders:write   ☑ orders:read     │
│  ☐ tracking:write ☐ tracking:read   │
│                                      │
│ Expires (optional)                   │
│ [Date picker ──────────────]         │
│                                      │
│ [Cancel]  [Create Key]               │
└──────────────────────────────────────┘
```

**One-Time Reveal Modal (POST success):**
```
┌──────────────────────────────────────────┐
│ ✅ API Key Created Successfully          │
│                                          │
│  ╔════════════════════════════════════╗  │
│  ║ ⚠️  COPY THIS KEY NOW             ║  │
│  ║ It will NOT be shown again.        ║  │
│  ╚════════════════════════════════════╝  │
│                                          │
│  fp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx     │
│  [  Copy to Clipboard  ✓ Copied! ]       │
│                                          │
│  [I have copied this key — Close]        │
│   (can't close by clicking backdrop)     │
└──────────────────────────────────────────┘
```

**Revoke Confirmation Modal:**
```
Revoke "portal-key"?

This key will immediately stop working.
Any integrations using it will fail.

[Cancel]  [Revoke Key]  ← red button
```

---

#### Settings › Members

```
PageHeader: "Members"

Table:
Email | Name | Role | Status | Joined | Actions
────────────────────────────────────────────────────
alice@co  Alice  [OWNER]   [ACTIVE]   Jan 2025  [Edit]
bob@co    Bob    [OPERATOR][ACTIVE]   Feb 2025  [Edit]
```

**Edit Member Modal:**
```
┌──────────────────────────────────────┐
│ Edit Member — bob@co                 │
│                                      │
│ Role                                 │
│ [OPERATOR ▾]                         │
│  Options: OWNER / ADMIN / OPERATOR   │
│           / VIEWER                   │
│                                      │
│ Status                               │
│ ● ACTIVE   ○ DISABLED               │
│                                      │
│ ⚠️  You cannot disable your own      │  ← khi edit chính mình
│    account or the last OWNER.        │
│                                      │
│ [Cancel]  [Save Changes]             │
└──────────────────────────────────────┘
```

---

#### Settings › Carrier Accounts

```
PageHeader: "Carrier Accounts"  [+ Add Account]  ← OWNER/ADMIN only

┌─────────────────────────────────────────────────────┐
│  ★ DEFAULT                               [ACTIVE]   │
│  YunExpress OMS                                     │
│  yunexpress_oms                                     │
│                                                     │
│  Credential:  ✅ Configured (sandbox mode)          │
│  Last updated: 3 days ago                           │
│                                                     │
│  [Edit Account]   [Manage Credential]               │
└─────────────────────────────────────────────────────┘
```

**Manage Credential Panel/Modal:**
```
┌──────────────────────────────────────────────┐
│ YunExpress OMS — Credentials                 │
│                                              │
│ Customer No *                                │
│ [________________________________]           │
│                                              │
│ API Secret *                                 │
│ [••••••••••••••••••••••••••]  [👁]           │
│ autocomplete="off"                           │
│                                              │
│ Base URL                                     │
│ [http://oms.api.yunexpress.com       ]       │
│                                              │
│ Language                                     │
│ [en-US ▾]                                    │
│                                              │
│ Shipping Method Code                         │
│ [THZXR__________________________]           │
│                                              │
│ Source Code                                  │
│ [API____________________________]           │
│                                              │
│ Size Unit    [cm ▾]                          │
│                                              │
│ ─────────────────────────────────────────   │
│ LIVE MODE                                    │
│                                              │
│ ☐ Enable live mode                          │
│                                              │
│ ╔═══════════════════════════════════════╗   │
│ ║ ⚠️  WARNING — LIVE MODE               ║   │  ← hiện khi checked
│ ║ Enabling live mode sends REAL orders  ║   │
│ ║ to YunExpress. Only enable after      ║   │
│ ║ credentials are production-verified.  ║   │
│ ╚═══════════════════════════════════════╝   │
│                                              │
│ [Cancel]           [Save Credential]         │
└──────────────────────────────────────────────┘
```

**Security rules trong component này:**
- `apiSecret` field: `type="password"` default, toggle visibility
- `autocomplete="off"` trên toàn bộ form
- Clear form sau submit success
- Clear `apiSecret` value nếu submit fail
- Không hiển thị encryptedPayload sau save
- Không hiển thị giá trị cũ của secret khi mở lại form

---

#### Settings › Audit Logs

*Chỉ OWNER và ADMIN thấy tab này.*

```
PageHeader: "Audit Logs"

Filters:
  [Action ▾] [Actor Type ▾] [Resource Type ▾] [From] [To] [Search]

Table:
Timestamp      | Action                    | Actor      | Resource  | ID       | ⋯
──────────────────────────────────────────────────────────────────────────────────
2 min ago      SHIPMENT_DRAFT_CREATED      USER        SHIPMENT    ship-456   [▶]
1 hour ago     API_KEY_CREATED             USER        API_KEY     key-123    [▶]
3 hours ago    MEMBER_ROLE_UPDATED         USER        MEMBERSHIP  mem-789    [▶]

Expandable row → SafeMetadataViewer:
{
  "shipmentId": "ship-456",
  "orderId": "ord-123",
  "itemCount": 2,
  "apiSecret": "[REDACTED]",
  "rawPayload": "[REDACTED]"
}
```

---

## 4. Component Library Spec

### `<StatusBadge status={status} />`

```
Status mapping → Tailwind classes:

READY_TO_SHIP    → bg-emerald-100 text-emerald-700
DRAFT            → bg-slate-100   text-slate-600
PENDING          → bg-amber-100   text-amber-700
CREATED          → bg-blue-100    text-blue-700
FAILED_CREATE    → bg-red-100     text-red-700
IN_TRANSIT       → bg-blue-100    text-blue-700
DELIVERED        → bg-emerald-100 text-emerald-700
EXCEPTION        → bg-red-100     text-red-700
CANCELLED        → bg-slate-100   text-slate-500
RETURNED         → bg-orange-100  text-orange-700
ACTIVE           → bg-emerald-100 text-emerald-700
DISABLED         → bg-slate-100   text-slate-500
REVOKED          → bg-red-100     text-red-700
TRACKING_PENDING → bg-amber-100   text-amber-700
```

### `<RoleBadge role={role} />`

```
OWNER    → bg-purple-100 text-purple-700
ADMIN    → bg-blue-100   text-blue-700
OPERATOR → bg-amber-100  text-amber-700
VIEWER   → bg-slate-100  text-slate-600
```

### `<ConfirmationModal />`

Props:
- `title: string`
- `description: string`
- `confirmLabel: string`
- `variant: "default" | "danger" | "live"`
- `requireTypedConfirmation?: string` — nếu có, user phải type chính xác string này
- `requireCheckbox?: string` — label của checkbox phải check
- `onConfirm: () => Promise<void>`
- `onCancel: () => void`

### `<CopyButton value={string} />`

- Click → `navigator.clipboard.writeText(value)`
- Icon đổi từ Copy → Check trong 2 giây
- Không lưu value vào state sau copy

### `<LoadingSkeleton rows={n} />`

- Animated `bg-slate-200 animate-pulse` rows
- Chiều rộng ngẫu nhiên trong mỗi row cho tự nhiên

### `<EmptyState icon description cta? />`

- Lucide icon lớn (48px), text muted
- Optional CTA button

### `<ErrorState message retry? />`

- Red icon + message + optional "Retry" button

### `<WarningBox message variant="warning|danger" />`

- Amber (warning) hoặc Red (danger) background box
- Icon + message, không dismissable ở live action context

### `<SafeMetadataViewer data={object} />`

- Render JSON tree, collapsible nodes
- Auto-redact keys containing: `token`, `secret`, `password`, `apiKey`,
  `keyHash`, `auth`, `cookie`, `rawResponse`, `rawPayload`, `credential`,
  `customerNo`, `apiSecret`, `encryptedPayload`
- Redacted value hiển thị: `"[REDACTED]"`
- Không dùng `JSON.stringify` trực tiếp

### `<ShipmentTimeline events={[]} />`

```
● DRAFT         Jan 11, 09:45 AM
|
● PENDING       Jan 11, 09:46 AM
|
● CREATED       Jan 11, 09:47 AM
  Tracking: YE-123456789
```

### `<TrackingResultPanel result={...} />`

Fields shown: `status`, `trackingNumber`, `latestEvent`, `eventsCount`
Fields NOT shown: `rawResponse`, `rawPayload`, any credential

---

## 5. File & Folder Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx          ← redirect to /orders
│   ├── orders/
│   │   └── page.tsx
│   ├── shipments/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx          ← tab-based layout
│
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── UserMenu.tsx
│   │
│   ├── ui/
│   │   ├── StatusBadge.tsx
│   │   ├── RoleBadge.tsx
│   │   ├── TenantBadge.tsx
│   │   ├── DataTable.tsx
│   │   ├── DetailDrawer.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── CopyButton.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── WarningBox.tsx
│   │   └── SafeMetadataViewer.tsx
│   │
│   ├── orders/
│   │   ├── OrdersTable.tsx
│   │   ├── OrderDetailDrawer.tsx
│   │   └── CreateDraftShipmentForm.tsx
│   │
│   ├── shipments/
│   │   ├── ShipmentsTable.tsx
│   │   ├── ShipmentDetailPanel.tsx
│   │   ├── PreflightChecker.tsx
│   │   ├── LiveActionConfirmation.tsx
│   │   ├── ShipmentTimeline.tsx
│   │   └── TrackingResultPanel.tsx
│   │
│   └── settings/
│       ├── TenantProfileTab.tsx
│       ├── ApiKeysTab.tsx
│       ├── ApiKeyRevealModal.tsx
│       ├── MembersTab.tsx
│       ├── EditMemberModal.tsx
│       ├── CarrierAccountsTab.tsx
│       ├── CarrierAccountCard.tsx
│       ├── CredentialForm.tsx
│       └── AuditLogsTab.tsx
│
├── lib/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── shipments.ts
│   │   ├── api-keys.ts
│   │   ├── members.ts
│   │   ├── carrier-accounts.ts
│   │   └── audit-logs.ts
│   ├── auth.ts               ← session/me helpers
│   └── rbac.ts               ← role check helpers
│
└── types/
    ├── auth.ts
    ├── orders.ts
    ├── shipments.ts
    └── settings.ts
```

---

## 6. API Fetch Layer Pattern

```typescript
// lib/api/base.ts
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.code, err.message);
  }
  return res.json();
}
```

---

## 7. RBAC Helpers

```typescript
// lib/rbac.ts
type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export const can = {
  manageApiKeys: (role: Role) => ['OWNER', 'ADMIN'].includes(role),
  manageMembers: (role: Role) => ['OWNER', 'ADMIN'].includes(role),
  manageCarrierAccounts: (role: Role) => ['OWNER', 'ADMIN'].includes(role),
  viewAuditLogs: (role: Role) => ['OWNER', 'ADMIN'].includes(role),
  createShipment: (role: Role) => ['OWNER', 'ADMIN', 'OPERATOR'].includes(role),
  syncTracking: (role: Role) => ['OWNER', 'ADMIN', 'OPERATOR'].includes(role),
  executeShipment: (role: Role) => ['OWNER', 'ADMIN', 'OPERATOR'].includes(role),
};
```

Note: Role check trên UI chỉ để UX (ẩn button). Server API vẫn là source of truth.

---

## 8. Build Order (Phase by Phase)

```
PHASE 1 — Foundation
─────────────────────
1. DashboardShell (Sidebar + Topbar)
2. Design tokens / globals.css
3. StatusBadge, RoleBadge, TenantBadge
4. DataTable (generic, paginated)
5. LoadingSkeleton, EmptyState, ErrorState
6. Login page

PHASE 2 — Core Workflow
────────────────────────
7. Orders page + OrdersTable
8. OrderDetailDrawer
9. CreateDraftShipmentForm (inline trong drawer)

PHASE 3 — Shipment Operations
───────────────────────────────
10. Shipments page + ShipmentsTable
11. ShipmentDetailPanel
12. PreflightChecker UI
13. LiveActionConfirmation modal
14. ShipmentTimeline
15. TrackingResultPanel + Sync button

PHASE 4 — Settings
────────────────────
16. Settings shell (tab layout)
17. TenantProfileTab
18. ApiKeysTab + ConfirmationModal + ApiKeyRevealModal
19. MembersTab + EditMemberModal
20. CarrierAccountsTab + CredentialForm
21. AuditLogsTab + SafeMetadataViewer

PHASE 5 — Polish
──────────────────
22. Toast notifications (success/error/warning)
23. Global error boundary
24. Responsive adjustments (tablet breakpoints)
25. Keyboard navigation + accessibility
```

---

## 9. Critical Rules — Không được vi phạm

```
❌ KHÔNG bao giờ:
   - Gọi YunExpress / carrier API trực tiếp từ UI
   - Tự động gọi CreateOrderLabel (phải user bấm thủ công)
   - Auto-sync tracking khi load / poll / refresh
   - Hiển thị: apiSecret, customerNo, rawPayload, rawResponse,
               encryptedPayload, keyHash, Authorization header
   - Lưu credentials vào localStorage / sessionStorage / cookie từ JS
   - console.log() bất kỳ response chứa credentials
   - Cho phép copy encryptedPayload / master key

✅ LUÔN LUÔN:
   - Confirmation modal trước mọi destructive action
   - Live carrier execute: checkbox + typed confirmation
   - Disable button sau single live action click (prevent double submit)
   - Role check trước khi render action buttons
   - Loading / empty / error state cho mọi data-fetching component
   - Generic error message (không leak server internals)
   - Clear credential form sau save success
   - Clear apiSecret sau save failure
```

---

*End of UI Plan — Fulfillment Platform v2*
