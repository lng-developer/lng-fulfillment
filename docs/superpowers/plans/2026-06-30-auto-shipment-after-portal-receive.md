# Auto Shipment After Portal Receive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically create YunExpress shipments after Portal orders are received when tenant automation is enabled and every order SKU can be mapped to one shipping method.

**Architecture:** Portal receive remains the ingestion entrypoint, but route handlers stay thin. `receivePortalOrders()` persists orders first, then calls an auto-shipment orchestration service for newly inserted orders. SKU mapping and automation settings are tenant-scoped database records managed from Settings by OWNER/ADMIN.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, existing tenant auth/session helpers, existing YunExpress shipment service, existing Settings UI patterns.

---

## Key Decisions

- Auto shipment runs after successful order insertion in `POST /api/portal/orders`.
- Duplicate/skipped Portal orders are not auto-shipped again.
- The first implementation processes auto shipment inline after ingestion and records every decision in `AutoShipmentJob`.
- Manual ship flow remains unchanged for orders that are missing mapping, have method conflicts, fail carrier creation, or have automation disabled.
- Automated tests must mock carrier behavior and must not call YunExpress.
- Production migration must not be run without explicit approval.

## Proposed Data Model

Create a Prisma migration with these tenant-scoped models:

- `TenantShipmentAutomationSetting`
  - `id`
  - `tenantId` unique
  - `autoCreateEnabled Boolean @default(false)`
  - `environment ShipmentYunEnvironmentMode @default(live)` or string if avoiding a new enum
  - `createdBy`, `updatedBy`
  - `createdAt`, `updatedAt`

- `SkuShippingMethodMapping`
  - `id`
  - `tenantId`
  - `skuCode`
  - `shippingMethodCode`
  - `description`
  - `status ACTIVE | DISABLED`
  - `createdBy`, `updatedBy`
  - unique `tenantId + skuCode`

- `AutoShipmentJob`
  - `id`
  - `tenantId`
  - `orderId`
  - `status`
  - `shippingMethodCode`
  - `skuCodes Json`
  - `missingSkuCodes Json`
  - `conflictingMethods Json`
  - `shipmentId`
  - `errorCode`
  - `errorMessage`
  - `attemptCount`
  - `lastAttemptAt`
  - `createdAt`, `updatedAt`
  - unique `tenantId + orderId`

Recommended job statuses:

- `PENDING`
- `PROCESSING`
- `SUCCEEDED`
- `FAILED`
- `SKIPPED_DISABLED`
- `MISSING_SKU_MAPPING`
- `METHOD_CONFLICT`
- `SKIPPED_EXISTING_SHIPMENT`

## SKU Parsing Rule

Add a pure helper:

```ts
export function extractSkuCode(sku: string | null | undefined): string | null {
  const parts = sku?.trim().split("-").filter(Boolean) ?? [];
  return parts.length >= 2 ? parts[1].toUpperCase() : null;
}
```

Examples:

- `J2618-NK-120626-002` -> `NK`
- `J2522-TT-080626-3` -> `TT`
- empty/null/malformed -> `null`

## Task 1: Schema And Repository Foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_auto_shipment_mapping/migration.sql`
- Create: `src/modules/auto-shipment/repository.ts`
- Create: `src/modules/auto-shipment/types.ts`
- Create: `src/modules/auto-shipment/index.ts`
- Test: `tests/auto-shipment/repository-shape.test.ts`

- [ ] Add Prisma models for automation settings, SKU mapping, and auto-shipment jobs.
- [ ] Add repository functions:
  - `getAutomationSetting(tenantId)`
  - `upsertAutomationSetting(input)`
  - `listSkuMappings(tenantId, query)`
  - `upsertSkuMapping(input)`
  - `disableSkuMapping(input)`
  - `createOrUpdateAutoShipmentJob(input)`
  - `getAutoShipmentJobByOrderId(tenantId, orderId)`
- [ ] Keep all repository queries tenant-scoped.
- [ ] Run `npx prisma validate`.
- [ ] Do not run migration against production.

## Task 2: SKU Mapping Resolver

**Files:**
- Create: `src/modules/auto-shipment/sku.ts`
- Create: `src/modules/auto-shipment/resolver.ts`
- Test: `tests/auto-shipment/sku-resolver.test.ts`

- [ ] Implement `extractSkuCode`.
- [ ] Implement `resolveOrderShippingMethodFromSkuMappings(orderItems, mappings)`.
- [ ] Return one of:
  - `{ kind: "resolved", shippingMethodCode, skuCodes }`
  - `{ kind: "missing", missingSkuCodes, skuCodes }`
  - `{ kind: "conflict", conflictingMethods, skuCodes }`
- [ ] Test:
  - `J2618-NK-120626-002` maps to `NK`.
  - one mapped SKU returns resolved method.
  - missing SKU mapping returns `missing`.
  - multiple SKU codes with different methods returns `conflict`.
  - malformed SKU returns missing.

## Task 3: Tenant Automation APIs

**Files:**
- Create: `src/app/api/tenants/current/shipment-automation/route.ts`
- Create: `src/app/api/tenants/current/sku-shipping-methods/route.ts`
- Create: `src/app/api/tenants/current/sku-shipping-methods/[mappingId]/route.ts`
- Create: `src/modules/auto-shipment/service.ts`
- Create: `src/modules/auto-shipment/validation.ts`
- Test: `tests/auto-shipment/api-validation.test.ts`

- [ ] Add `GET /api/tenants/current/shipment-automation`.
- [ ] Add `PATCH /api/tenants/current/shipment-automation`.
- [ ] Add `GET /api/tenants/current/sku-shipping-methods`.
- [ ] Add `POST /api/tenants/current/sku-shipping-methods`.
- [ ] Add `PATCH /api/tenants/current/sku-shipping-methods/:mappingId`.
- [ ] Use `OWNER` and `ADMIN` for mutations.
- [ ] Allow `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER` to read mappings if useful for order troubleshooting.
- [ ] Validate shipping method against known UI options: `VN-YTYCPREC`, `VNFZZXR`, `VNTHZXR`.
- [ ] Audit setting and mapping mutations with safe metadata only.

## Task 4: Auto Shipment Processor

**Files:**
- Modify: `src/modules/shipment/service.ts`
- Create: `src/modules/auto-shipment/processor.ts`
- Test: `tests/auto-shipment/processor.test.ts`

- [ ] Add `processAutoShipmentForOrder({ tenantId, orderId, actorId })`.
- [ ] Load order with items, latest shipment, automation setting, and mappings.
- [ ] If automation disabled, record `SKIPPED_DISABLED`.
- [ ] If existing active shipment exists, record `SKIPPED_EXISTING_SHIPMENT`.
- [ ] If SKU mapping missing, record `MISSING_SKU_MAPPING`.
- [ ] If mapping conflict, record `METHOD_CONFLICT`.
- [ ] If resolved, call existing shipment creation path with:
  - `actorType: "SYSTEM"`
  - `shippingMethodCode` from mapping
  - `environment` from tenant automation setting
- [ ] On success, record `SUCCEEDED` and link `shipmentId`.
- [ ] On failure, record `FAILED` with safe error code/message.
- [ ] Ensure carrier raw response, credentials, Authorization, cookies, and raw payloads are never stored in job error details.

## Task 5: Wire Into Portal Receive

**Files:**
- Modify: `src/modules/order/service.ts`
- Modify: `src/modules/order/types.ts`
- Test: `tests/auto-shipment/portal-receive-auto-shipment.test.ts`

- [ ] Track newly inserted order IDs in `receivePortalOrders()`.
- [ ] After the receive audit log, call `processAutoShipmentForOrder()` for each inserted order.
- [ ] Keep validation errors and duplicate skipped orders behavior unchanged.
- [ ] Extend `PortalReceiveResult` with a safe optional summary:
  - `autoShipment: { attempted, succeeded, failed, missingMapping, methodConflict, skipped }`
- [ ] If one auto-shipment fails, continue processing the rest of the batch.
- [ ] Do not fail the entire Portal receive request unless order ingestion itself fails.

## Task 6: Orders API Exposure And Filters

**Files:**
- Modify: `src/modules/order/repository.ts`
- Modify: `src/modules/order/types.ts`
- Modify: `src/modules/order/validation.ts`
- Modify: `src/types/orders.ts`
- Modify: `src/lib/api/orders.ts`
- Test: `tests/orders/order-auto-shipment-filter.test.ts`

- [ ] Add latest `autoShipmentJob` summary to order list/detail responses.
- [ ] Add query filter `autoShipmentStatus`.
- [ ] Add a preset value for `MISSING_SKU_MAPPING`.
- [ ] Keep `tenantId` override disallowed.
- [ ] Do not return raw job metadata or carrier error payloads.

## Task 7: Settings UI For Automation And SKU Mapping

**Files:**
- Modify: `src/components/settings/SettingsShell.tsx`
- Create: `src/components/settings/ShipmentAutomationTab.tsx`
- Create: `src/lib/api/shipment-automation.ts`
- Create: `src/types/shipment-automation.ts`

- [ ] Add Settings tab `Shipment Automation`.
- [ ] Show toggle `Auto-create shipment after Portal receive`.
- [ ] Show environment selector `live | test`.
- [ ] Show SKU mapping table.
- [ ] Add create/edit/disable mapping controls for `OWNER`/`ADMIN`.
- [ ] Show read-only table or restricted message for lower roles.
- [ ] Use loading, empty, and safe error states.
- [ ] Do not expose carrier credentials.

## Task 8: Orders UI Classification

**Files:**
- Modify: `src/components/orders/OrdersTable.tsx`
- Modify: `src/components/orders/OrderExpandPanel.tsx`
- Modify: `src/components/ui/StatusBadge.tsx`

- [ ] Add filter or quick chip `Chưa config map SKU`.
- [ ] Show auto-shipment status badge on each row or expanded summary.
- [ ] For `MISSING_SKU_MAPPING`, show the missing SKU codes safely.
- [ ] Keep manual `Ship` action available for eligible orders.
- [ ] Ensure VIEWER does not see mutation actions.

## Task 9: Verification

**Commands:**

```powershell
npx prisma validate
npx tsx tests\auto-shipment\sku-resolver.test.ts
npx tsx tests\auto-shipment\processor.test.ts
npx tsx tests\auto-shipment\portal-receive-auto-shipment.test.ts
npm run typecheck
npm run lint
npm run build
```

Manual verification on approved local/test DB:

- Configure mapping `NK -> VN-YTYCPREC`.
- Enable auto-create in Settings.
- Push a Portal order with SKU `J2618-NK-120626-002`.
- Confirm order is received and auto shipment is attempted.
- Push an order with unmapped SKU code.
- Confirm it appears under `Chưa config map SKU`.
- Manually open the ship modal for unmapped order and verify existing manual flow still works.

## Risks And Guards

- Inline auto-shipment can slow `POST /api/portal/orders` when YunExpress is slow. If this becomes painful, move processor execution to a cron/queue while keeping the same job table.
- Auto shipment creates real YunExpress shipments when tenant setting uses `live`; the UI must make this risk explicit.
- Tests must use mocked adapter paths and must not call YunExpress.
- Migration must be applied only to approved DB targets.
