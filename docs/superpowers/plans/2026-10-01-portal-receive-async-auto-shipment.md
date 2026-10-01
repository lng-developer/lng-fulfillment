# Portal Receive Async Auto Shipment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Etsy batch intake acknowledge durable orders immediately and move YunExpress creation into an idempotent, tenant-scoped scheduled worker.

**Architecture:** The platform persists a `PENDING` `AutoShipmentJob` in the same transaction as each inserted order, then returns the existing intake result with an additive queued count. A protected cron worker atomically claims bounded pending jobs and invokes the current shipment service. The Etsy backend treats an intake timeout as ambiguous and reconciles each order through a tenant-API-key status lookup rather than labelling it failed.

**Tech Stack:** Next.js 15 route handlers, Prisma/PostgreSQL, existing YunExpress adapter, Express/Mongoose/Axios, Jest.

**Spec:** `docs/superpowers/specs/2026-10-01-portal-receive-async-auto-shipment.md`

## Global Constraints

- Do not call YunExpress or any live carrier from tests, local checks, or Codex.
- Keep all platform order/job operations tenant-scoped; retain existing API-key auth and rate limits.
- Do not add a dependency, schema migration, or raw payload/credential logging.
- Preserve `tenantId + externalOrderId` idempotency and prevent duplicate active shipments.
- Deploy platform intake/worker before the Etsy consumer; live cron enablement needs separate approval.

## Review Focus

- Duplicate retry is skipped and does not enqueue or ship again (Task 1).
- Two worker invocations race for one pending job: exactly one claims it (Task 2).
- A Yun failure makes only that job `FAILED`; other jobs continue (Task 2).
- A valid 50-order intake returns independently of mocked carrier latency (Task 1).
- Etsy timeout records `pending_reconciliation` and never automatically re-sends (Task 4).

---

## File map

- `src/modules/order/service.ts`, `src/modules/order/repository.ts`, `src/modules/order/types.ts`: persist/queue portal orders and expose safe status.
- `src/modules/auto-shipment/repository.ts`, `src/modules/auto-shipment/service.ts`, `src/modules/auto-shipment/index.ts`: atomic claim and bounded worker.
- `src/app/api/cron/auto-shipment/route.ts`: CRON_SECRET protected trigger.
- `src/app/api/portal/orders/[externalOrderId]/route.ts`: tenant-API-key reconciliation status.
- `vercel.json`: schedule only after host cadence is confirmed.
- `C:/Users/stack/Task/lng-website-lng-dev/src/controllers/etsyOrder.controller.js`: timeout classification/reconciliation.

### Task 1: Queue portal intake atomically

**Files:** Modify `src/modules/order/repository.ts`, `src/modules/order/service.ts`, `src/modules/order/types.ts`, `src/modules/auto-shipment/repository.ts`; create `tests/auto-shipment/portal-receive-async.test.ts`.

**Interfaces:** `receivePortalOrders()` returns `autoShipment: { queued: number }` and never awaits carrier work. `enqueuePortalOrderWithAutoShipmentJob(input)` creates the order/status history and `PENDING` job in one Prisma transaction.

- [ ] Write tests for new intake: one inserted order creates `PENDING`; duplicate is skipped without a new job; a 50-order payload returns while carrier work remains unresolved.
- [ ] Run `npx tsx tests/auto-shipment/portal-receive-async.test.ts`; expect RED because current intake awaits `processAutoShipmentForOrder`.
- [ ] Implement transaction-scoped enqueue, remove inline processor call, and retain existing validation/skip behavior.
- [ ] Re-run the test; expect PASS.
- [ ] Commit: `feat: queue auto shipments after portal intake`.

### Task 2: Execute exclusively claimed jobs

**Files:** Modify `src/modules/auto-shipment/repository.ts`, `src/modules/auto-shipment/service.ts`, `src/modules/auto-shipment/index.ts`; create `tests/auto-shipment/worker.test.ts`.

**Interfaces:** `claimPendingAutoShipmentJobs(limit: number)` returns exclusively claimed tenant/order IDs. `runPendingAutoShipmentJobs({ limit: number, actorId: string })` returns safe aggregate counters.

- [ ] Write tests for concurrent claims, bounded execution, and a failed mocked processor that does not block a second job.
- [ ] Run `npx tsx tests/auto-shipment/worker.test.ts`; expect RED because no worker API exists.
- [ ] Atomically change only `PENDING` rows to `PROCESSING`; use the existing `processAutoShipmentForOrder` and fixed default limit `5`.
- [ ] Re-run the test; expect PASS.
- [ ] Commit: `feat: process queued auto shipment jobs`.

### Task 3: Add protected worker and reconciliation APIs

**Files:** Create `src/app/api/cron/auto-shipment/route.ts`, `src/app/api/portal/orders/[externalOrderId]/route.ts`; modify order service/repository/types and `vercel.json`; create `tests/orders/portal-order-status.test.ts`, `tests/auto-shipment/cron-route.test.ts`.

**Interfaces:** `GET /api/portal/orders/:externalOrderId` uses tenant API key and returns safe intake/job/shipment status. `GET /api/cron/auto-shipment` uses `CRON_SECRET` and returns only aggregate worker counts.

- [ ] Write route tests for tenant isolation, `NOT_FOUND`, rejected cron authorization, and response redaction of raw payload/labels/tracking/carrier metadata.
- [ ] Run `npx tsx tests/orders/portal-order-status.test.ts; npx tsx tests/auto-shipment/cron-route.test.ts`; expect RED.
- [ ] Implement thin routes using existing API-key and cron guards. Read `AUTO_SHIPMENT_CRON_TENANT_ID` and a defaulted `AUTO_SHIPMENT_CRON_LIMIT=5`; add a schedule only after host support is verified.
- [ ] Re-run route tests; expect PASS.
- [ ] Commit: `feat: expose queued shipment status and worker cron`.

### Task 4: Reconcile ambiguous Etsy pushes

**Files:** Modify `C:/Users/stack/Task/lng-website-lng-dev/src/controllers/etsyOrder.controller.js`; modify `C:/Users/stack/Task/lng-website-lng-dev/src/controllers/__tests__/etsyOrder.resetBaseCost.test.js`.

**Interfaces:** Axios timeout is stored as `{ code: "FULFILLMENT_PLATFORM_TIMEOUT", ambiguous: true }`; a found platform order is accepted/queued instead of failed.

- [ ] Write Jest cases for `ECONNABORTED`: one platform status found response, one not-found response; both must make no automatic POST retry.
- [ ] Run `npx jest src/controllers/__tests__/etsyOrder.resetBaseCost.test.js --runInBand`; expect RED because request errors are confirmed failures.
- [ ] Detect timeout only, perform one authenticated read-only platform lookup per affected order, and persist safe pending-reconciliation metadata. Preserve non-timeout HTTP error handling.
- [ ] Re-run focused Jest test; expect PASS.
- [ ] Commit: `fix: reconcile timed out Etsy fulfillment pushes`.

### Task 5: Verify and hand off deployment

**Files:** Only scoped follow-ups required by test outcomes.

- [ ] Run platform checks: `npx prisma validate`, `npm run typecheck`, `npm run lint`, and `npm run build`; do not run migrations or carrier calls.
- [ ] Run Tasks 1-4 focused tests and verify the intake response exposes only documented safe fields.
- [ ] Deploy platform intake/worker first with cron disabled or test-scoped. Before enabling live cron, obtain explicit approval and run a user-controlled single-order verification; then deploy the Etsy consumer.
