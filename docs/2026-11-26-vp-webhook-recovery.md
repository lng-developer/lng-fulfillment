# Viettel Post webhook receive recovery — 2026-11-26

## Evidence and scope
Vercel production request logs show POST /api/webhooks/viettelpost returning 200 at 13:51:23 ICT. The corresponding order still had no local tracking. Request bodies were not logged, so the exact payload and association with that order remain unproven. Compatibility fixtures are synthetic, not captured VP payloads.

The old receiver silently ignored notifications without numeric status or top-level order IDs, inconsistently matched customerOrderNumber, and reported received item count as processed count.

## Change
Treat public callbacks as notifications, then read authoritative tracking via the existing shipment sync using its saved carrier account. Accept bounded data/items envelopes, camel/Pascal field names, and string/numeric order references. Resolve by tenant-scoped order and/or exact carrier identity. Do not create shipments, choose ambiguous matches, accept a tenant from payload, or modify cancelled shipments. Force carrier refresh even when portal delivery is pending. Existing sync owns status history, handoff evidence and lifecycle outbox.

Return received/processed/skipped/failed counts; processed means successful sync, not necessarily changed data. Carrier failures return 503 for retry. Logs contain field types and skip reasons, never payload values or auth headers. Add existing per-IP rate guard and payload/batch bounds.

## Validation
- node tests/orders/viettel-webhook.test.cjs (red before fix, green after)
- npx tsx tests/orders/viettel-webhook-repository.test.ts
- npm run typecheck; npm run lint
- Existing VP carrier and tracking status tests

## Operational limits
VP documentation supplied does not define callback signing or a payload example. The endpoint remains public, but callback values cannot directly set tracking/status. In-process rate limiting is best-effort across serverless instances. Unsupported or ambiguous notifications are acknowledged with explicit skipped reasons and require operational review. No durable webhook inbox or schema migration is introduced. Inspect the next real VP callback after deployment; a manual replay does not prove VP delivery. Local pending UI/create-verification work is outside this release.
