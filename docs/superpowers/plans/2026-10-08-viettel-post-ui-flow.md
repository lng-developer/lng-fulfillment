# Viettel Post Shipment UI Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorized Fulfillment users select Viettel Post, preflight a draft shipment, explicitly confirm a live action, and receive the carrier result without exposing credentials.

**Architecture:** Keep the existing shipment draft, preflight, and execution endpoints as the only mutation path. Extend the carrier preflight contract for `VIETTEL_POST`, then parameterize the client and replace Yun-specific UI copy/requests with a selected carrier value. Tenant credential resolution remains server-only and the already-registered VP adapter performs the live call.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Node `tsx --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-viettel-post-ui-flow-design.md`

## Global Constraints

- Credentials remain tenant-scoped encrypted records; no secret is added to browser state, logs, or client API payloads.
- Supported carrier values are exactly `YUNEXPRESS_OMS` and `VIETTEL_POST`.
- VP live execution requires the exact confirmation text `CREATE VIETTEL POST SHIPMENT`.
- Preflight must not call the Viettel Post network.
- Existing `Ship selected` remains YunExpress-only; no VP batch behavior in this plan.

## Review Focus

- A VP draft with any missing weight, dimension, HS code, recipient phone/address, item weight, or declared value must block execution without an HTTP call to VP.
- A VP tenant credential that is absent or has `liveEnabled: false` must be visible as a safe preflight failure and never expose credential fields.
- Switching from VP back to Yun must reset the previous preflight and confirmation, so a VP confirmation cannot execute Yun or vice versa.
- Repeated confirmation clicks must yield one idempotent carrier execution path.
- Existing YunExpress single and batch shipment paths must retain their carrier code and confirmation copy.

---

### Task 1: Add non-network Viettel Post preflight

**Files:**
- Modify: `src/modules/carrier/preflight.ts`
- Modify: `src/modules/carrier/types.ts`
- Modify: `src/types/shipments.ts`
- Modify: `src/integrations/viettel-post/adapter.ts`
- Test: `src/integrations/viettel-post/adapter.test.ts`

**Interfaces:**
- Consumes: `CreateCarrierShipmentInput`, `CarrierAdapterContext`, and `getCarrierCredentialRuntimeStatus`.
- Produces: `preflightCarrierShipmentCreation(input, context): Promise<CarrierShipmentPreflightResult>` for both supported carrier codes.

- [ ] **Step 1: Write failing VP preflight tests**

Add tests for a complete VP payload and each required VP data group. Assert that preflight returns safe warnings for missing fields and does not invoke the injected `fetchImpl`.

- [ ] **Step 2: Run the VP adapter test file to verify RED**

Run: `npx tsx --test src/integrations/viettel-post/adapter.test.ts`

Expected: FAIL because the preflight contract does not support `VIETTEL_POST`.

- [ ] **Step 3: Implement carrier-specific local validation and a VP preflight result**

In `src/integrations/viettel-post/adapter.ts`, expose a pure validator returning the missing VP input groups used by both adapter execution and preflight. In `src/modules/carrier/preflight.ts`, dispatch `VIETTEL_POST` to a local preflight that resolves credential status, maps only safe display metadata, and produces warnings without calling `fetch`.

- [ ] **Step 4: Generalize preflight result types without weakening Yun fields**

Update `CarrierShipmentPreflightResult` and browser `PreflightResult` so credential-presence and mapping-preview fields can safely describe either carrier; do not include credential values.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npx tsx --test src/integrations/viettel-post/adapter.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/carrier/preflight.ts src/modules/carrier/types.ts src/types/shipments.ts src/integrations/viettel-post/adapter.ts src/integrations/viettel-post/adapter.test.ts
git commit -m "feat: preflight Viettel Post shipments"
```

### Task 2: Parameterize shipment client calls and confirmation copy

**Files:**
- Modify: `src/lib/api/shipments.ts`
- Modify: `src/components/shipments/LiveActionConfirmation.tsx`
- Create: `src/components/shipments/carrier-presentation.ts`
- Test: `tests/shipments/carrier-presentation.test.ts`

**Interfaces:**
- Consumes: carrier code selected by the shipment screen.
- Produces: `getPreflight(shipmentId, carrierCode, carrierAccountId?)`, `executeShipment(shipmentId, carrierCode, carrierAccountId?)`, and `getCarrierPresentation(carrierCode)`.

- [ ] **Step 1: Write failing presentation tests**

Add tests proving `getCarrierPresentation("VIETTEL_POST")` returns VP-specific display name, live warning, and exact confirmation text, while Yun returns its current text.

- [ ] **Step 2: Run the presentation test to verify RED**

Run: `npx tsx --test tests/shipments/carrier-presentation.test.ts`

Expected: FAIL because carrier presentation does not exist.

- [ ] **Step 3: Implement `getCarrierPresentation(carrierCode)`**

Create the pure presentation helper; it must have no credential knowledge and return safe fixed copy only.

- [ ] **Step 4: Pass carrier choice through client API helpers**

Build the preflight query string from `carrierCode` and optional `carrierAccountId`; include the same fields in the execute body. Preserve `YUNEXPRESS_OMS` as the caller-supplied legacy default only where no carrier selection is shown.

- [ ] **Step 5: Make `LiveActionConfirmation` carrier-aware**

Accept `carrierCode` and optional `carrierAccountId`; display helper copy and execute the chosen carrier. Reset local confirmation state when these props change.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npx tsx --test tests/shipments/carrier-presentation.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/shipments.ts src/components/shipments/LiveActionConfirmation.tsx src/components/shipments/carrier-presentation.ts tests/shipments/carrier-presentation.test.ts
git commit -m "feat: parameterize carrier shipment confirmation"
```

### Task 3: Expose carrier selection in the draft shipment UI

**Files:**
- Modify: `src/components/shipments/ShipmentDetailPanel.tsx`
- Modify: `src/components/orders/OrderDetailDrawer.tsx`
- Modify: `src/components/orders/OrdersTable.tsx`
- Test: `tests/platform/platform-admin.spec.ts`

**Interfaces:**
- Consumes: draft shipment id, selected carrier code, Task 2 API helpers, and the existing owner/admin/operator authorization enforced by server routes.
- Produces: a user-visible draft → carrier → preflight → live confirmation workflow.

- [ ] **Step 1: Write a failing browser test for the VP draft path**

Extend the platform test to create/open a draft shipment, select `Viettel Post`, run preflight, and assert that the page shows VP-specific live confirmation text rather than YunExpress text. The test must not submit the live action.

- [ ] **Step 2: Run the browser test to verify RED**

Run: `npx playwright test --config=playwright.platform.config.ts tests/platform/platform-admin.spec.ts --grep "Viettel Post"`

Expected: FAIL because the shipment UI hard-codes YunExpress.

- [ ] **Step 3: Add a carrier selector to draft shipment detail**

In `ShipmentDetailPanel`, show a carrier selector only for executable draft/failed-create shipments. Selecting a carrier clears previous preflight and confirmation state, calls preflight with that carrier, and labels the execution button from `getCarrierPresentation`.

- [ ] **Step 4: Route order shipping toward the draft workflow**

Use the existing `createDraftShipment` path from order details and expose/open its resulting shipment detail. Keep the legacy direct Yun modal unavailable for VP selections so an operator cannot submit the wrong carrier.

- [ ] **Step 5: Run browser test, focused server tests, and typecheck**

Run: `npx playwright test --config=playwright.platform.config.ts tests/platform/platform-admin.spec.ts --grep "Viettel Post" && npx tsx --test src/integrations/viettel-post/adapter.test.ts src/modules/shipment/tracking-sync-batch.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/shipments/ShipmentDetailPanel.tsx src/components/orders/OrderDetailDrawer.tsx src/components/orders/OrdersTable.tsx tests/platform/platform-admin.spec.ts
git commit -m "feat: create Viettel Post shipments from drafts"
```

### Task 4: Full regression and release evidence

**Files:**
- Modify: `docs/16_ETSY_TRACKING_SYNC_USAGE.md` only if its shared tracking guidance is materially inaccurate after VP UI support.

**Interfaces:**
- Consumes: the three completed tasks.
- Produces: evidence that the UI retains Yun behavior and VP execution remains guarded.

- [ ] **Step 1: Run the project verification commands**

Run: `npm run typecheck && npm run lint && npm run test:platform`

Expected: PASS; report every unrelated existing failure by file and assertion.

- [ ] **Step 2: Review production safety conditions without calling VP**

Verify that the UI displays credential/live readiness only, that no plaintext credential appears in network responses or logs, and that the exact VP confirmation is required before execution.

- [ ] **Step 3: Commit any accurate documentation correction**

```bash
git add docs/16_ETSY_TRACKING_SYNC_USAGE.md
git commit -m "docs: clarify carrier tracking operations"
```
