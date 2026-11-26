# Shipments grouped history

The Shipments screen requests `groupByOrder=true`. Pagination and total count are computed over order groups on the server, with carrier filtering before pagination. Each row shows the latest shipment by creation timestamp (ID is the tie breaker); previous attempts are returned as history, newest first. Search and status filters match any shipment in the group; the UI explains this when these filters are used. The default API remains ungrouped for existing callers.

History expansion retains tracking copy and detail navigation for the exact historical shipment. Cancelled history is not deleted and cannot become the displayed newest shipment simply because it matched a search.

VP TRACKING_PENDING with a tracking number displays Chờ vận chuyển in the table/history/detail; this is presentation only. No tracking displays Chờ tracking. Shipment creation is not carrier handoff: list/detail show Chưa xác nhận gửi when actualShipAt is absent. No database backfill, carrier calls, migrations, or order status changes.

Verification: grouped repository/pagination/count contract test, Edge UI regression (one order row, status wording, history expand/collapse, old detail selection), lint/typecheck. Database execution and production deployment are not part of this verification.
