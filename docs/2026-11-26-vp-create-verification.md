# VP creation verification

A successful HTTP response and a returned shipment identity do not prove an accepted shipment. After creation, query the exact shipment using the same account token, with a 15-second lookup timeout. Require a matching identity and a recognized non-error status.

Retain returned identities when VP reports an error/cancellation or verification is inconclusive (404, timeout, mismatched identity, unknown status). Persist EXCEPTION, keep the order IN_PROCESSING, show a review message, and do not offer an automatic second creation. An explicit rejection without an identity still follows the existing failed-creation path. This does not solve a POST timeout before any identity is received.

Direct and draft execution honor verification metadata. Batch results report review cases as unsuccessful while retaining the shipment. No portal tracking or shipment-created outbox event is emitted for the unverified result.

Tests: adapter mocked OAuth/create/detail flow; verification checks for matched status, rejection, missing identity, 404, timeout, and identity preservation; repository persistence regression; lint/typecheck.

Scoped order recovery is separate from deployment. For 113-2052858-6400243, the user authorized ACC2 resend at 170 g and 5 x 5 x 2 cm after exact-order lookup was empty and old detail returned SHIPMENT_NOT_FOUND. The old identity remains EXCEPTION history, not falsely marked carrier-cancelled. The new POST was rejected with HTTP 410 PARTNER_NOT_ENOUGH_BALANCE; no replacement identity was returned.

UI follow-up: persisted carrier balance failures show curated top-up guidance in Orders and shipment status/history/detail. The order list refreshes after a failed send. Raw carrier metadata is not exposed in the order API. Successful latest shipments clear stale failure guidance.

Order action follow-up: show Ship only for READY_TO_SHIP/FULFILLED, consistent with server eligibility. IN_PROCESSING without tracking/label shows a pending-carrier indicator, not another create button. No order status backfill or resend is performed for 111-6001512-2150606.

Order action completion: existing VP shipments show View shipment and Sync VP instead of Ship even without tracking or label. View reuses ShipmentDetailPanel; Sync calls the exact shipment endpoint and respects sync permission. Print is available when a label exists. Latest shipment ID is included in the order list and updated after creation.

Release review: verified detail tracking/label are retained if already available; mismatched detail cannot enrich the result. Code-only shipmentCode/vtpOrderNumber responses also preserve the VP identity for reconciliation. Added regression cases for both.
