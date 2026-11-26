# VP reconciliation and consistent fulfillment search

Status: internal search and automatic reconciliation approved. No remote VP search/selection UI. The approved automatic rule below supersedes the earlier manual-selection proposal.

## Problem
Order 111-6873005-0481047 has a replacement VP shipment not linked locally. Replacing identifiers on the old record would lose history and could associate a live shipment with the wrong account. Search placeholders currently promise identifiers the backend does not query.

## Proposed behavior
- Add a per-order Find on VP action with an explicit tenant-owned VP account selection.
- Lookup the exact external order reference; display every exact-match remote shipment with VP code, tracking, carrier status, and creation time. No writes during lookup.
- The operator selects the shipment to link. Do not choose the newest automatically or mark older shipments cancelled based on a cancellation request.
- Before linking, refetch the selected shipment on the same account, verify exact order and carrier identity, and check the local order has not changed.
- If already linked, update that same shipment through the existing tracking flow. Otherwise create a separate shipment, preserving all old identifiers/history, its original carrier account, normalized status and tracking. Never use creation time as handoff time.
- Transactional tenant-scoped audit records the selected identity and prior state. No carrier creation, cancellation, reset, or marketplace dispatch is performed by reconciliation.
- Search on Orders, Shipments, and Shipment Costs accepts external order ID, internal business order number, VP shipment code, tracking number, and recipient name. Trim whitespace and an optional leading # consistently. Preserve status/channel/date filters and tenant boundaries; allow discovery of historical shipments.
- Internal search remains read-only; remote lookup is a separate explicit action.

## Implementation boundaries
Use carrier adapter for remote lookup, shipment service for reconciliation rules, repositories for database access, and thin authenticated/rate-limited routes. Reuse existing modal, feedback, and account APIs. No schema migration, new dependency, or changes to LNG Web BE in this scope. Preserve pending shipment-status corrections already in this branch.

## Verification
Mocked adapter tests for exact order/account matching and multiple results. Repository/service tests for cross-tenant rejection, duplicate linking, concurrent changes, preserved history, and no fabricated handoff. Search tests cover every supported identifier across all three screens and filter composition. UI test covers selecting a replacement and errors. Run lint and typecheck. No automatic repair of production order data or replay of carrier/marketplace operations during testing.

## Approved automatic reconciliation (implemented)

The existing VP sync button and cron discover candidates on each active tenant VP account. A replacement is linked only after a complete exact-order lookup confirms the original account, all relevant old shipments are remotely failed/cancelled, and exactly one unlinked newer shipment has valid tracking and a waiting/in-transit/delivered status. Unknown status, missing history, duplicates, multiple candidates, cross-account history, and concurrent changes block linking. Archived cancellations remain archived; error status 4 is preserved as EXCEPTION rather than asserted cancelled.

A serializable transaction preserves old identifiers/labels/history, checks account and order/item/shipment snapshots, stops pending automation, creates a separate shipment with account provenance, writes audit/history, and clears only unsupported old handoff timestamps while recording their prior values in audit. No carrier creation/cancellation or marketplace upload occurs in reconciliation. New handoff time remains empty. Orders with a replacement return to IN_PROCESSING (ON_HOLD stays held).

Discovery is bounded to the first 200 remote records per account, matching the operational batch window; older replacements outside it need separately scoped lookup. Exact-order lookup must be complete (up to 500 records, otherwise no link). This is a safety limit, not a claim that all historical records were reconciled. API/UI report linked/review-required/account-error counts.

Validation: mocked adapter, policy and transactional repository tests passed; search/status regression tests retained. Lint/typecheck and peer review passed. No production data update, release, live carrier creation, or real PostgreSQL concurrency test in this implementation.
