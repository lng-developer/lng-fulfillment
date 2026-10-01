# Portal receive without inline carrier work

## Goal

`POST /api/portal/orders` must acknowledge a valid Etsy batch after durable
order intake, without waiting for YunExpress label creation or tracking
callbacks. A client timeout must never make a received order look rejected.

## Evidence and scope

The current handler calls `receivePortalOrders()`. It processes each order
serially and awaits `processAutoShipmentForOrder()` before returning. That
processor can call YunExpress and then PATCH tracking to the source portal.
For Etsy order `4185748365`, the platform persisted the order and created a
label before the source service's 30-second HTTP timeout expired.

This change is limited to portal order intake and automatic shipment work. It
does not change manual shipment execution, carrier mappings, or tracking
semantics.

## Contract

`POST /api/portal/orders` keeps its API-key auth, rate limit, input shape, and
per-order idempotency (`tenantId + externalOrderId`). Its success response
continues to report `received`, `inserted`, `skipped`, `errors`, and `orders`.

For each newly inserted order, the response adds a safe `autoShipment` summary
with `queued` count. `succeeded`, `failed`, mapping results, and carrier data
are deliberately not returned from this request because they happen later.

Duplicate orders remain `skipped`; they must not enqueue another active job or
create another carrier shipment. The caller can retry a timed-out POST safely.

## Durable workflow

1. Validate every submitted order as today.
2. Insert each new order and create/update its tenant-scoped `AutoShipmentJob`
   as `PENDING` in the same database transaction.
3. Return the intake response immediately after the receive audit log.
4. A separately invoked worker claims bounded `PENDING` jobs atomically,
   changes them to `PROCESSING`, then calls the existing auto-shipment
   processor.
5. The existing resolver and shipment path record the final job state:
   `SUCCEEDED`, `FAILED`, `MISSING_SKU_MAPPING`, `METHOD_CONFLICT`,
   `SKIPPED_DISABLED`, or `SKIPPED_EXISTING_SHIPMENT`.

The worker must be a durable scheduled/worker deployment, not an unawaited
promise after a Next.js response. Claiming is conditional on `PENDING` so two
worker instances cannot process the same job concurrently. A stuck
`PROCESSING` recovery policy is outside this first slice and must be designed
with an explicit lease/attempt policy before enabling retries.

## Source-portal behavior

The Etsy backend treats a successful intake response as accepted/queued, not
as carrier shipment success. On HTTP timeout it records an ambiguous state
(`pending_reconciliation`) instead of `failed`; it must not automatically
resend. Reconciliation reads the platform's order/job state through a
tenant-API-key-protected status endpoint before changing the source order UI.

The status endpoint is additive and returns only safe fields: external order
ID, intake result, auto-shipment status, shipment status, and timestamps. It
does not expose raw payloads, customer details, carrier credentials, labels,
or carrier responses.

## Security and tenancy

All order/job reads and claims stay tenant-scoped. The existing portal API-key
authentication and rate limits apply to intake and reconciliation. No raw
carrier response, API key, customer payload, or credential is included in
jobs, API responses, or logs.

## Tests and rollout

- Regression test: a batch intake returns before mocked carrier work resolves
  and creates `PENDING` jobs only for inserted orders.
- Worker tests: atomic claim, duplicate protection, and one job's failure not
  blocking another job.
- Contract tests: source client renders accepted/queued separately from
  shipment completion and records timeout as pending reconciliation.
- Run unit/type/lint verification only with mocked carrier adapters; do not
  invoke YunExpress or production migrations.
- Deploy platform intake + worker first, then deploy the Etsy consumer change.
  Existing `PROCESSING`/terminal jobs remain untouched; only newly received
  orders use the queued path.
