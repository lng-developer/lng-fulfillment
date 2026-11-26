# Pending VP filter

Orders has an optional `pendingVp=true` filter (checkbox: Chờ gửi VP). No duration threshold, SLA alerts, migrations or carrier calls.

Eligible order states are READY_TO_SHIP and FULFILLED (manual resubmission after reset). Exclude any non-cancelled shipment that is beyond DRAFT/FAILED_CREATE or already has a carrier shipment identifier, tracking or label. This avoids inviting duplicate dispatch even when a failed-create record contains external evidence. Preserved cancelled history does not block resubmission.

Apply tenant scope and the predicate before pagination; list, count, expanded list and filtered CSV export share it. Existing search/channel/date filters remain effective. Selecting the checkbox clears the status tab and selected rows; selecting another status tab disables the checkbox.

Tests: pending-vp-filter.test.ts and fulfillment-search.test.ts validate query contracts without production writes. The feature does not infer that a carrier route supports every destination or automatically push an order.
