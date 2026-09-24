# Actual Ship Date Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry a carrier-proven handoff timestamp from Fulfillment to LNG and use it as the only Amazon ConfirmShipment ship date.

**Architecture:** Fulfillment classifies normalized YunExpress events in one pure helper, persists the earliest qualifying timestamp and evidence, then sends the timestamp in the existing portal tracking callback. Legacy LNG persists it per item and makes Amazon batches eligible only when that timestamp, tracking, carrier, order-item ID, and quantity exist. The Extension submits reviewed data only and never invents a date.

**Tech Stack:** Next.js 15, TypeScript, Prisma/PostgreSQL, Node/Mongoose, React, MV3 Chrome extension.

**Spec:** `docs/superpowers/specs/2026-09-24-actual-ship-date-flow.md`

## Global Constraints

- `TRACKING_PENDING`, label-created, and `Shipment information received` never qualify.
- The earliest qualifying carrier timestamp is immutable; later events cannot overwrite it.
- Convert the stored timestamp to `America/Los_Angeles` only when constructing the Amazon TSV date.
- No backfill or sync sends Amazon a shipment confirmation automatically.
- Never log CSRF tokens, cookies, credentials, or raw carrier responses.

## Review Focus

- A tracking-number-created event must not make an order Amazon-eligible.
- A pickup at 23:xx in another US timezone must retain the correct Los Angeles calendar date.
- A later transit event must not replace an earlier pickup timestamp.
- Existing vendor callbacks without `actualShipAt` must still update tracking but remain ineligible.
- A network timeout after Amazon submission must remain `unknown`, never auto-resend.

---

### Task 1: Classify carrier handoff events in Fulfillment

**Files:**
- Create: `src/modules/carrier/actual-ship-date.ts`
- Modify: `src/modules/carrier/index.ts`
- Test: `tests/carrier/actual-ship-date.test.ts`

**Interfaces:**
- Consumes: `CarrierTrackingEvent[]` from `src/modules/carrier/types.ts`.
- Produces: `deriveActualShipEvent(events): ActualShipEvent | null` where `ActualShipEvent` has `eventTime`, `eventCode`, `message`, `location`, `timezone`, and `source: "carrier_event"`.

- [ ] **Step 1: Write failing tests**

```ts
assert.equal(deriveActualShipEvent([{ eventStatus: "TRACKING_PENDING", eventTime: new Date("2026-09-18T17:20:33-05:00"), message: "Shipment information received" }]), null);
assert.equal(deriveActualShipEvent([{ eventStatus: "IN_TRANSIT", eventTime: new Date("2026-09-18T20:20:23-05:00"), message: "Picked up by Shipping Partner" }])?.eventTime.toISOString(), "2026-09-19T01:20:23.000Z");
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npx tsx tests/carrier/actual-ship-date.test.ts`

Expected: failure because `deriveActualShipEvent` does not exist.

- [ ] **Step 3: Implement the minimal pure classifier**

```ts
export function deriveActualShipEvent(events: CarrierTrackingEvent[]): ActualShipEvent | null {
  return [...events]
    .sort((left, right) => left.eventTime.getTime() - right.eventTime.getTime())
    .find((event) => event.eventStatus === "IN_TRANSIT" || /\b(picked up|accepted|in possession)\b/i.test(event.message ?? "")) ?? null;
}
```

- [ ] **Step 4: Run the test to verify GREEN**

Run: `npx tsx tests/carrier/actual-ship-date.test.ts`

Expected: pass for pending exclusion, earliest qualifying selection, and stable ordering.

- [ ] **Step 5: Commit**

```bash
git add src/modules/carrier tests/carrier/actual-ship-date.test.ts
git commit -m "feat(fulfillment): derive actual carrier handoff date"
```

### Task 2: Persist actual ship evidence on Fulfillment shipments

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260924000000_add_shipment_actual_ship_at/migration.sql`
- Modify: `src/modules/shipment/repository.ts`
- Modify: `src/modules/shipment/types.ts`
- Modify: `src/modules/shipment/service.ts`
- Test: `tests/shipment/actual-ship-date-sync.test.ts`

**Interfaces:**
- Consumes: `ActualShipEvent | null` from Task 1.
- Produces: `ShipmentDetail.actualShipAt: Date | null` and `actualShipEvidence: Json | null`.

- [ ] **Step 1: Write failing sync test**

```ts
assert.equal(updated.actualShipAt?.toISOString(), "2026-09-19T01:20:23.000Z");
assert.equal(updated.actualShipEvidence?.source, "carrier_event");
```

- [ ] **Step 2: Run test to verify RED**

Run: `npx tsx tests/shipment/actual-ship-date-sync.test.ts`

Expected: TypeScript failure because `actualShipAt` is absent from the shipment contract.

- [ ] **Step 3: Add nullable durable fields and idempotent repository update**

```prisma
actualShipAt       DateTime?
actualShipEvidence Json?
```

```ts
actualShipAt: input.actualShipAt ?? undefined,
actualShipEvidence: input.actualShipEvidence ?? undefined,
```

Only pass these fields when the stored shipment has no `actualShipAt` and Task 1 returns an event.

- [ ] **Step 4: Run focused test and schema validation**

Run: `npx tsx tests/shipment/actual-ship-date-sync.test.ts && npm run prisma:validate && npm run typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add prisma src/modules/shipment tests/shipment/actual-ship-date-sync.test.ts
git commit -m "feat(fulfillment): persist carrier-proven ship timestamp"
```

### Task 3: Extend Fulfillment-to-LNG tracking callback

**Files:**
- Modify: `src/modules/portal-tracking/service.ts`
- Modify: `src/modules/shipment/service.ts`
- Modify: `tests/portal-tracking/portal-tracking-service.test.ts`

**Interfaces:**
- Consumes: `actualShipAt` and evidence from Task 2.
- Produces: existing `POST /api/order/update-tracking` body with optional `actualShipAt` ISO string and `shipEvidence` metadata.

- [ ] **Step 1: Write failing callback payload assertion**

```ts
assert.equal(calls[0]?.init?.body, JSON.stringify({
  orderId: "112-4001151-4732212", tracking: "YT2605600704990185", carrier: "USPS", fulfillment: "LNG Group",
  actualShipAt: "2026-09-19T01:20:23.000Z", shipEvidence: { source: "carrier_event", message: "Picked up by Shipping Partner" },
}));
```

- [ ] **Step 2: Run the callback test to verify RED**

Run: `npx tsx tests/portal-tracking/portal-tracking-service.test.ts`

Expected: body mismatch because fields are not serialized.

- [ ] **Step 3: Serialize only validated optional fields**

```ts
...(input.actualShipAt ? { actualShipAt: input.actualShipAt.toISOString() } : {}),
...(input.shipEvidence ? { shipEvidence: input.shipEvidence } : {}),
```

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npx tsx tests/portal-tracking/portal-tracking-service.test.ts && npm run typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/portal-tracking src/modules/shipment tests/portal-tracking/portal-tracking-service.test.ts
git commit -m "feat(fulfillment): send actual ship evidence to lng"
```

### Task 4: Persist and enforce the field in legacy LNG

**Files:**
- Modify: `C:/lng-web-v1/lng-website/src/models/orderCustomProduct.model.js`
- Modify: `C:/lng-web-v1/lng-website/src/controllers/orderCustomProduct.controller.js`
- Modify: `C:/lng-web-v1/lng-website/src/controllers/shippingBatch.contrller.js`
- Create: `C:/lng-web-v1/lng-website/src/controllers/__tests__/shippingBatch.actualShipDate.test.js`
- Modify: `C:/lng-web-v1/lng-website/src/controllers/__tests__/shippingBatch.checkOrdersStatus.test.js`

**Interfaces:**
- Consumes: optional callback fields `actualShipAt` and `shipEvidence`.
- Produces: `items.tracking_info.actualShipAt`, `items.tracking_info.shipEvidence`, and only eligible batch rows with derived `shipDate`.

- [ ] **Step 1: Write failing eligibility tests**

```js
expect(getOrderShipmentSnapshot({ items: [{ orderItemId: "i1", quantity: 1, tracking_info: { tracking: "921...", carrier: "USPS" } }] }).bulkBlockReason).toBe("MISSING_ACTUAL_SHIP_DATE");
expect(getOrderShipmentSnapshot({ items: [{ orderItemId: "i1", quantity: 1, tracking_info: { tracking: "921...", carrier: "USPS", actualShipAt: new Date("2026-09-19T01:20:23.000Z") } }] }).bulkConfirmEligible).toBe(true);
```

- [ ] **Step 2: Run test to verify RED**

Run: `npx jest src/controllers/__tests__/shippingBatch.actualShipDate.test.js --runInBand`

Expected: missing actual-ship-date rule.

- [ ] **Step 3: Add fields, callback validation, and Los Angeles date derivation**

```js
actualShipAt: { type: Date, default: null },
shipEvidence: { type: Object, default: null },
```

`updateTrackingByOrderId` accepts valid ISO `actualShipAt`; batch construction uses `amazonUsDate(actualShipAt)` and blocks absent dates. It retains legacy callbacks without the field.

- [ ] **Step 4: Run focused tests**

Run: `npx jest src/controllers/__tests__/shippingBatch.actualShipDate.test.js src/controllers/__tests__/shippingBatch.checkOrdersStatus.test.js --runInBand`

Expected: pass; a 23:xx Central-time pickup produces the matching Los Angeles date.

- [ ] **Step 5: Commit in legacy repository**

```bash
git add src/models/orderCustomProduct.model.js src/controllers/orderCustomProduct.controller.js src/controllers/shippingBatch.contrller.js src/controllers/__tests__
git commit -m "feat(tracking): require carrier-proven ship date"
```

### Task 5: Surface evidence and retain submission safety in the Extension

**Files:**
- Modify: `C:/lng_system/lng-web/Amazon-Extension/options.js`
- Modify: `C:/lng_system/lng-web/Amazon-Extension/options.html`
- Modify: `C:/lng_system/lng-web/Amazon-Extension/background.js`
- Modify: `C:/lng_system/lng-web/Amazon-Extension/test/upload-feed-task-tab-policy.test.mjs`

**Interfaces:**
- Consumes: reviewed batch rows with server-derived `shipDate` and evidence.
- Produces: TSV rows using the supplied date only, plus task status `submitted`, `completed`, `failed`, or `unknown`.

- [ ] **Step 1: Write failing policy tests**

```js
assert.equal(canSubmitAmazonRow({ tracking: "921", carrier: "USPS", shipDate: "" }), false);
assert.equal(canSubmitAmazonRow({ tracking: "921", carrier: "USPS", shipDate: "2026-09-18" }), true);
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --test test/upload-feed-task-tab-policy.test.mjs`

Expected: missing eligibility policy.

- [ ] **Step 3: Add minimal client guard and evidence display**

```js
export function canSubmitAmazonRow({ tracking, carrier, shipDate }) {
  return Boolean(String(tracking || "").trim() && String(carrier || "").trim() && /^\d{4}-\d{2}-\d{2}$/.test(String(shipDate || "")));
}
```

No UI control can replace the server-derived date. Preserve existing dedicated Feeds tab and CSRF policy.

- [ ] **Step 4: Run focused test and syntax check**

Run: `node --test test/upload-feed-task-tab-policy.test.mjs && node --check background.js`

Expected: pass.

- [ ] **Step 5: Commit without including unrelated dirty files**

```bash
git add background.js options.js options.html lib/upload-feed-task-tab-policy.js test/upload-feed-task-tab-policy.test.mjs
git commit -m "feat(extension): require reviewed actual ship date"
```

### Task 6: Read-only backfill and controlled verification

**Files:**
- Create: `C:/lng_system/lng-web/lng-fulfillment/scripts/backfill-actual-ship-date.ts`
- Create: `C:/lng_system/lng-web/lng-fulfillment/tests/shipment/backfill-actual-ship-date.test.ts`

**Interfaces:**
- Consumes: selected shipment IDs and Task 1 classifier.
- Produces: a dry-run report; execution mode updates only missing `actualShipAt` fields and invokes no Amazon API.

- [ ] **Step 1: Write failing dry-run test**

```ts
assert.deepEqual(await backfillActualShipDate({ shipmentIds: ["s-1"], dryRun: true }), { scanned: 1, qualified: 1, updated: 0, skipped: 0 });
```

- [ ] **Step 2: Run test to verify RED**

Run: `npx tsx tests/shipment/backfill-actual-ship-date.test.ts`

Expected: missing script/function.

- [ ] **Step 3: Implement dry-run-default script**

```ts
const dryRun = process.argv.includes("--apply") === false;
if (!dryRun) await persistMissingActualShipAt(candidate);
```

The initial report includes only safe fields: shipment ID, order ID, candidate date, event code, and decision.

- [ ] **Step 4: Run verification gates**

Run: `npx tsx tests/shipment/backfill-actual-ship-date.test.ts && npm run typecheck && npm run lint && npm run prisma:validate`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-actual-ship-date.ts tests/shipment/backfill-actual-ship-date.test.ts
git commit -m "feat(fulfillment): add safe actual ship date backfill"
```

### Task 7: Deploy and validate one reviewed order

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-actual-ship-date-flow.md`

- [ ] **Step 1: Deploy database migration and Fulfillment application to approved target**

Run: `npx prisma migrate deploy`

Expected: migration applies once; do not use `prisma migrate dev` or `prisma migrate reset`.

- [ ] **Step 2: Run dry-run backfill for `114-8657036-8948248`**

Run: `npx tsx scripts/backfill-actual-ship-date.ts --order-id 114-8657036-8948248`

Expected: report a 2026-09-18 candidate with carrier pickup evidence and `updated: 0`.

- [ ] **Step 3: Apply one approved Fulfillment update and verify legacy callback**

Run: `npx tsx scripts/backfill-actual-ship-date.ts --order-id 114-8657036-8948248 --apply`

Expected: legacy LNG row has matching tracking, USPS carrier, actual ship timestamp, and evidence.

- [ ] **Step 4: Verify review candidate, then request separate user confirmation before Amazon submission**

Expected: UI displays `2026-09-18` as derived from carrier pickup. Do not dispatch `UPLOAD_TRACKING` without the separate confirmation.

- [ ] **Step 5: Record outcome and commit documentation**

```bash
git add docs/superpowers/specs/2026-09-24-actual-ship-date-flow.md
git commit -m "docs(fulfillment): record actual ship date validation"
```
