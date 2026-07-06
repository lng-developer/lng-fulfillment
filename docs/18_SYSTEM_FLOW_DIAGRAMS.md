# System Flow Diagrams

Tai lieu nay tong hop cac luong xu ly chinh hien tai cua Fulfillment Platform v2.

Pham vi:

- Nhan don tu Portal.
- Auto shipment theo SKU + country mapping.
- Tao shipment thu cong va batch shipment.
- Tracking callback ve Portal theo source Amazon/Etsy.
- Confirm ship, cancel, reset order.
- Shipment cost estimate, actual fee, va YunExpress webhook.
- Security/tenancy boundary o muc flow.

Khong bao gom:

- Legacy draft/preflight shipment flow la luong chinh. Mot so route legacy van ton tai trong code, nhung business flow hien tai la direct YunExpress shipping.
- Chi tiet UI layout tung component.
- Carrier credentials/secret values.

## 1. High-Level System Context

```mermaid
flowchart LR
  Portal["Portal / External systems"]
  User["Dashboard user\nOWNER / ADMIN / OPERATOR / VIEWER"]
  Yun["YunExpress OMS"]

  subgraph Platform["Fulfillment Platform v2"]
    Orders["Orders"]
    Shipments["Shipments"]
    Automation["Shipment Automation"]
    Costs["Shipment Costs"]
    Webhooks["Yun Webhook Events"]
    Audit["Audit Logs"]
  end

  Portal -->|"POST /api/portal/orders\nTenant API Key"| Orders
  User -->|"Session cookie"| Orders
  User -->|"Session cookie"| Automation
  Orders --> Shipments
  Automation --> Shipments
  Shipments -->|"CreateOrderLabel / GetOrder / DeleteOrder / Fee APIs"| Yun
  Yun -->|"Webhook events\ntracking / fee / abnormal"| Webhooks
  Webhooks --> Shipments
  Webhooks --> Costs
  Shipments -->|"Tracking callback\nsource-aware"| Portal
  Orders --> Audit
  Shipments --> Audit
```

## 2. Order Status Lifecycle

```mermaid
stateDiagram-v2
  [*] --> FULFILLED: Portal order received

  FULFILLED --> IN_PROCESSING: Manual ship / Auto ship success
  READY_TO_SHIP --> IN_PROCESSING: Legacy compatible manual ship

  FULFILLED --> FULFILLED: Auto disabled / missing SKU mapping / method conflict / carrier failure
  FULFILLED --> CANCELLED: Not expected as normal path

  IN_PROCESSING --> SHIPPED: Confirm ship + actual package input
  IN_PROCESSING --> CANCELLED: Cancel Yun shipment

  SHIPPED --> CANCELLED: Cancel within 30 minutes
  SHIPPED --> SHIPPED: Tracking / fee updates

  CANCELLED --> FULFILLED: Reset order

  note right of READY_TO_SHIP
    Legacy status kept for backward compatibility.
    New Portal orders should enter as FULFILLED.
  end note
```

## 3. Portal Receive Order Flow

```mermaid
sequenceDiagram
  participant Portal
  participant Api as POST /api/portal/orders
  participant Tenant as Tenant API Key Auth
  participant OrderSvc as Order Service
  participant Auto as Auto Shipment Service
  participant Audit as Audit Log

  Portal->>Api: Send orders payload + API key
  Api->>Tenant: Verify API key, scope orders:write, active tenant
  Tenant-->>Api: tenantId + apiKeyId
  Api->>OrderSvc: receivePortalOrders(payload, tenantContext)

  loop each order
    OrderSvc->>OrderSvc: Validate and normalize order
    OrderSvc->>OrderSvc: Insert order + items as FULFILLED
    alt inserted
      OrderSvc->>Auto: processAutoShipmentForOrder(orderId)
      Auto-->>OrderSvc: auto shipment job summary
    else duplicate/skipped
      OrderSvc->>OrderSvc: Count as skipped
    end
  end

  OrderSvc->>Audit: PORTAL_ORDERS_RECEIVED safe metadata
  OrderSvc-->>Api: inserted/skipped/errors/autoShipment summary
  Api-->>Portal: Standard success response
```

Important rules:

- Tenant is resolved only from tenant API key.
- Body-provided `tenantId` is ignored for business scoping.
- New orders are created as `FULFILLED`.
- Auto shipment is attempted only for newly inserted orders.
- API key must have `orders:write`.

## 4. Auto Shipment Flow

```mermaid
flowchart TD
  Start["Order inserted as FULFILLED"] --> Setting{"Automation enabled?"}

  Setting -- "No" --> JobDisabled["AutoShipmentJob: SKIPPED_DISABLED"]
  Setting -- "Yes" --> Existing{"Existing active shipment?"}

  Existing -- "Yes" --> JobExisting["AutoShipmentJob: SKIPPED_EXISTING_SHIPMENT"]
  Existing -- "No" --> LoadMap["Load active SKU-country mappings"]

  LoadMap --> Resolve["Extract SKU code from item SKU\nNormalize destination country"]
  Resolve --> Missing{"Every SKU + country has active mapping\nand eName/cName?"}

  Missing -- "No" --> JobMissing["AutoShipmentJob: MISSING_SKU_MAPPING"]
  Missing -- "Yes" --> Conflict{"Resolved shipping method is unique?"}

  Conflict -- "No" --> JobConflict["AutoShipmentJob: METHOD_CONFLICT"]
  Conflict -- "Yes" --> Build["Build ShipOrderOptions\nlike manual shipment"]

  Build --> Ioss{"Etsy + EU destination?"}
  Ioss -- "Yes" --> CheckIoss{"Tenant IOSS active or provided?"}
  CheckIoss -- "No" --> JobFailed["AutoShipmentJob: FAILED"]
  CheckIoss -- "Yes" --> Ship["shipOrderWithYun"]
  Ioss -- "No" --> Ship

  Ship --> ShipOk{"Yun CreateOrderLabel success?"}
  ShipOk -- "No" --> FailedCreate["Shipment: FAILED_CREATE\nAutoShipmentJob: FAILED"]
  ShipOk -- "Yes" --> Persist["Create Shipment\nOrder -> IN_PROCESSING"]
  Persist --> JobSuccess["AutoShipmentJob: SUCCEEDED"]
```

Auto mapping contract:

- Mapping key is `tenantId + skuCode + destinationCountryCode`.
- `skuCode` is extracted from SKU, for example SKU containing product code like `NK`.
- Mapping stores `shippingMethodCode`, `eName`, `cName`, `status`.
- Only `ACTIVE` mappings are used.
- Default package values for auto shipment are estimate values unless edited later.
- Missing phone defaults to `0123456789` when building auto shipment options.

## 5. Manual Single Shipment Flow

```mermaid
sequenceDiagram
  participant User
  participant UI as Orders UI
  participant Api as POST /api/orders/:orderId/ship
  participant ShipSvc as Shipment Service
  participant Yun as YunExpress OMS
  participant DB
  participant Portal

  User->>UI: Click Ship on FULFILLED order
  UI->>UI: Open modal with editable receiver/package/parcels
  UI->>UI: If Etsy EU, show editable IOSS
  User->>UI: Confirm Create shipment
  UI-->>User: Close modal immediately, show background progress
  UI->>Api: POST orderId + environment + options
  Api->>ShipSvc: shipOrderWithYun

  ShipSvc->>DB: Load tenant-scoped order + items
  ShipSvc->>ShipSvc: Validate status FULFILLED or READY_TO_SHIP
  ShipSvc->>ShipSvc: Validate IOSS if Etsy EU
  ShipSvc->>Yun: CreateOrderLabel

  alt Success
    Yun-->>ShipSvc: waybill, label, maybe tracking
    ShipSvc->>DB: Create shipment and set order IN_PROCESSING
    opt Tracking present
      ShipSvc->>Portal: Send tracking callback by source channel
    end
    ShipSvc-->>UI: shipment summary
    UI-->>User: Toast success and update row without full reload
  else Rejected
    Yun-->>ShipSvc: safe carrier error details
    ShipSvc->>DB: Create FAILED_CREATE shipment record
    ShipSvc-->>UI: CARRIER_ERROR with itemRemarks
    UI-->>User: Toast Yun rejection reason
  end
```

Manual shipment fields:

- Main: `ShippingMethodCode`, `CustomerOrderNumber`, `SourceCode`.
- Receiver: first/last name, company, country, street, city, state, zip, phone, email.
- Package: weight, length, width, height, size units, package count, application type, return option, tariff prepay, insurance option.
- Parcels: SKU, EName, CName, quantity, unit price, unit weight, currency code, invoice part, invoice usage, remark.
- Etsy EU: IOSS number.

## 6. Batch Shipment Flow

```mermaid
flowchart TD
  Select["User selects eligible orders"] --> Limit{"Selected <= 10?"}
  Limit -- "No" --> Block["Disable batch ship\nShow Yun limit warning"]
  Limit -- "Yes" --> Modal["Open batch modal"]

  Modal --> Expand["User may expand each order"]
  Expand --> Edit["Edit receiver/package/parcels/IOSS per order"]
  Edit --> Submit["Submit batch"]

  Submit --> Loop["Process orders sequentially"]
  Loop --> One["shipOrderWithYun(order)"]
  One --> Result{"Success?"}
  Result -- "Yes" --> Success["Add success result\nOrder -> IN_PROCESSING"]
  Result -- "No" --> Failure["Add failed result\nInclude safe error details"]
  Success --> More{"More orders?"}
  Failure --> More
  More -- "Yes" --> One
  More -- "No" --> Summary["Return partial success/failure results"]
```

Batch behavior:

- Eligible order statuses: `FULFILLED`, plus legacy `READY_TO_SHIP`.
- Yun batch limit in UI: max 10 orders.
- Current service processes each order through the same single-order `shipOrderWithYun` path.
- Partial failures do not fail the entire batch response.
- Each order can carry its own manual overrides from expanded modal.

## 7. Tracking Handling Flow

```mermaid
flowchart TD
  Create["Yun CreateOrderLabel response"] --> HasTrack{"TrackingNumber present?"}

  HasTrack -- "Yes" --> SaveTrack["Save trackingNumber on Shipment"]
  SaveTrack --> Callback["Send Portal tracking callback"]

  HasTrack -- "No" --> TrackType{"TrackType async / tracking null?"}
  TrackType -- "Yes" --> Poll["Short poll GetTrackingNumber/GetOrder\n2 attempts, ~5s interval"]
  Poll --> Found{"Tracking found?"}
  Found -- "Yes" --> SaveTrack
  Found -- "No" --> Pending["Shipment status TRACKING_PENDING"]

  Pending --> ManualSync["User can trigger tracking sync"]
  Pending --> Webhook["Yun tracking webhook can update later"]
  ManualSync --> SaveTrack
  Webhook --> SaveTrack
```

Source-aware Portal callback:

```mermaid
flowchart LR
  Shipment["Shipment tracking saved"] --> Source{"Order sourceChannel"}
  Source -- "AMAZON" --> Amz["POST Portal Amazon tracking endpoint"]
  Source -- "ETSY" --> Etsy["POST Portal Etsy tracking endpoint"]
  Source -- "MANUAL / UNKNOWN" --> Skip["Skip or no-op callback"]
```

## 8. Confirm Ship And Cost Estimate Flow

```mermaid
sequenceDiagram
  participant User
  participant UI as Orders UI
  participant Api as POST /api/orders/:orderId/confirm-shipped
  participant ShipSvc as Shipment Service
  participant Cost as Shipment Cost Service
  participant DB

  User->>UI: Click Confirm Ship on IN_PROCESSING order
  UI->>UI: Open actual package modal
  User->>UI: Enter actual weight/length/width/height
  UI->>Api: Confirm shipped + actual package
  Api->>ShipSvc: confirmOrderShipped
  ShipSvc->>DB: Load latest shipment
  ShipSvc->>ShipSvc: Require labelUrl
  ShipSvc->>Cost: Calculate estimate
  Cost->>Cost: volumetric = L * W * H / 7000
  Cost->>Cost: chargeable = max(actualWeight, volumetric)
  Cost->>Cost: round up to next rate bracket
  ShipSvc->>DB: Upsert ShipmentCost estimate
  ShipSvc->>DB: Order -> SHIPPED
  Api-->>UI: labelUrl + shipmentCost
  UI-->>User: Close modal and open label
```

Cost rules:

- Actual dimensions are captured at confirm time.
- Estimated chargeable weight is the larger of actual weight and volumetric weight.
- Estimate uses the configured rate table/bracket logic.
- Actual fee is pulled later from Yun or updated by webhook.

## 9. Cancel And Reset Flow

```mermaid
stateDiagram-v2
  IN_PROCESSING --> CANCELLED: Cancel Yun shipment
  SHIPPED --> CANCELLED: Cancel within 30 minutes
  CANCELLED --> FULFILLED: Reset order

  note right of SHIPPED
    Cancellation is allowed only within the configured
    30 minute cancel window.
  end note
```

```mermaid
sequenceDiagram
  participant User
  participant Api as cancel-yun / reset
  participant ShipSvc as Shipment Service
  participant Yun as YunExpress OMS
  participant DB

  User->>Api: Cancel Yun shipment
  Api->>ShipSvc: cancelOrderYunShipment
  ShipSvc->>DB: Load latest Yun shipment
  ShipSvc->>ShipSvc: Check cancel eligibility
  ShipSvc->>Yun: Delete/cancel order by waybill
  Yun-->>ShipSvc: Cancel result
  ShipSvc->>DB: Shipment -> CANCELLED, Order -> CANCELLED
  Api-->>User: Success

  User->>Api: Reset cancelled order
  Api->>ShipSvc: resetCancelledOrder
  ShipSvc->>DB: Order -> FULFILLED
  ShipSvc->>DB: Clear latest shipment tracking/label/carrier ids
  Api-->>User: Ready to ship again
```

## 10. Shipping Cost Actual Fee Flow

```mermaid
flowchart TD
  Shipped["Order confirmed SHIPPED"] --> Estimate["ShipmentCost created with estimated fee"]
  Estimate --> Page["Shipping Costs page"]
  Page --> ManualFetch["User fetches actual fee"]
  ManualFetch --> YunFee["Yun /api/Freight/GetShippingFeeDetail"]
  YunFee --> UpdateActual["Update actual fee fields\nactualFeeStatus AVAILABLE or FAILED"]

  Estimate --> FeeWebhook["Yun fee webhook"]
  FeeWebhook --> MatchShipment["Match by waybill/tracking/customer order"]
  MatchShipment --> UpdateActual
```

Displayed data:

- Estimated: actual dimensions, volumetric weight, chargeable weight, estimated fee.
- Actual: total cost shown in table.
- Actual fee detail: freight, fuel surcharge, registration fee, processing fee, other fee, gross/charge weight, occurrence time.
- Actual fee may be fetched again even after it was already available.

## 11. YunExpress Webhook Flow

```mermaid
sequenceDiagram
  participant Yun
  participant Api as POST /api/webhooks/yunexpress/events
  participant Verify as Signature/Decrypt
  participant Store as YunWebhookEvent
  participant Dispatch as Webhook Dispatcher
  participant Shipment as Shipment Services
  participant Cost as Shipment Cost Service
  participant Portal

  Yun->>Api: POST encrypted body or activation challenge
  Api->>Verify: Verify timestamp/signature and decrypt if needed

  alt ACK / activation
    Verify-->>Api: ACK detected
    Api-->>Yun: text/plain success
  else event
    Verify->>Store: Store sanitized event record
    Store->>Dispatch: Dispatch by category

    alt tracking event
      Dispatch->>Shipment: applyYunWebhookTrackingUpdate
      Shipment->>Portal: source-aware tracking callback if tracking newly appears
    else fee event
      Dispatch->>Cost: applyYunWebhookActualFeeUpdate
    else abnormal event
      Dispatch->>Store: Store/upsert abnormal case
    else unmatched
      Dispatch->>Store: Mark UNMATCHED
    end

    Api-->>Yun: text/plain success
  end
```

Webhook rules:

- Public receiver does not use dashboard session or tenant API key.
- Verification uses Yun signature headers and encrypted body.
- Response to accepted webhook/challenge is plain text `success`.
- Raw encrypted body is stored server-side, but management APIs/UI expose only sanitized payloads.
- Webhook must not create fake orders or shipments if no match is found.

## 12. Dashboard Authorization Flow

```mermaid
flowchart TD
  Request["Dashboard request"] --> Cookie{"Session cookie present?"}
  Cookie -- "No" --> Unauthorized["401 / redirect login"]
  Cookie -- "Yes" --> Session["Hash token and load session"]
  Session --> Active{"Session active and not expired?"}
  Active -- "No" --> Unauthorized
  Active -- "Yes" --> Tenant{"Active tenant membership?"}
  Tenant -- "No" --> NoTenant["No active tenant / access denied"]
  Tenant -- "Yes" --> Role{"Role allowed for action?"}
  Role -- "No" --> Forbidden["403 FORBIDDEN"]
  Role -- "Yes" --> Origin{"Mutation route?"}
  Origin -- "No" --> Allow["Allow"]
  Origin -- "Yes" --> SameOrigin{"Origin/Referer allowed?"}
  SameOrigin -- "No" --> SameOriginFail["403 Same-origin request required"]
  SameOrigin -- "Yes" --> Allow
```

Role intent:

- `OWNER`, `ADMIN`: manage settings, members, API keys, shipment automation, carrier accounts.
- `OPERATOR`: operate orders, shipments, tracking.
- `VIEWER`: read-only; no ship/cancel/confirm/reset controls.
- Platform admin/support are separate from tenant roles.

## 13. End-To-End Main Path

```mermaid
flowchart LR
  A["Portal sends order"] --> B["FF creates FULFILLED order"]
  B --> C{"Automation can resolve SKU + country?"}
  C -- "Yes" --> D["Auto CreateOrderLabel"]
  C -- "No" --> E["Manual Ship from Orders UI"]
  D --> F{"Yun success?"}
  E --> F
  F -- "No" --> G["FAILED_CREATE\nshow Yun reason"]
  F -- "Yes" --> H["IN_PROCESSING\nshipment saved"]
  H --> I{"Tracking available?"}
  I -- "Yes" --> J["Save tracking\ncallback Portal"]
  I -- "No" --> K["TRACKING_PENDING\nmanual sync/webhook later"]
  H --> L["Confirm Ship\nactual package input"]
  L --> M["Calculate estimate\nOrder SHIPPED"]
  M --> N["Open label"]
  M --> O["Fetch actual fee later\nor fee webhook"]
```

## 14. Operational Notes

- Orders are tenant-scoped at every business query.
- Portal APIs use tenant API key; dashboard APIs use session cookie.
- UI never calls YunExpress directly.
- Carrier calls go through shipment service and carrier adapter.
- Tracking callback is source-aware and should not confuse Amazon/Etsy flows.
- Etsy EU requires IOSS. Current default can be configured in Shipment Automation settings and edited in shipment modal.
- Auto shipment is best-effort after receive; failure does not reject the Portal receive batch.
- Manual ship remains the fallback path for unmapped SKU, method conflict, or carrier rejection.
- Webhooks update existing matched records only; unmatched events stay reviewable in Platform Yun Webhooks.
