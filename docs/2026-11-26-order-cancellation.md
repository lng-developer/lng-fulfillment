# Fulfillment order cancellation

- Action: **Hủy đơn Fulfillment**, separate from carrier cancellation. OWNER, ADMIN and OPERATOR only.
- `POST /api/orders/:orderId/cancel` accepts `{ "reason": "..." }` (trimmed, 1–500 characters). Session tenant, same-origin and mutation rate limits apply.
- RECEIVED, ON_HOLD, READY_TO_SHIP and FULFILLED may be cancelled. IN_PROCESSING/SHIPPED must first complete the existing verified reset flow after carrier cancellation.
- Inspect every shipment, not only the latest. Only CANCELLED or DRAFT/FAILED_CREATE without external identifiers, tracking, label or handoff evidence are safe. CREATING and PROCESSING automation block cancellation.
- Update status, history, audit and stop unfinished automation atomically in a serializable transaction. Preserve all shipment identifiers and records. Repeating a successful cancellation is idempotent.
- Direct shipping claims the order before the carrier request; cancellation cannot win after that claim. Failed creation releases the claim. Draft execution locks/checks the parent order before moving to CREATING.
- No carrier cancellation API or marketplace cancellation is called. No schema change or migration.

Validation: `npx tsx tests/orders/cancel-order.test.ts`, `node tests/orders/cancel-order-route.test.cjs`, `node tests/orders/cancel-order-ui.mjs`, typecheck, lint. Live cancellation is deliberately not performed.
