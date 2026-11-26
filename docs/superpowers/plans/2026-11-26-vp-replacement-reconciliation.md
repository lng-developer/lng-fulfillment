# VP replacement reconciliation plan

Approved rule: same tenant/account/exact external order, old shipments remotely failed/cancelled, exactly one previously unlinked valid newer shipment. Multiple/missing/unknown matches are no-ops. Preserve history and identifiers. No marketplace callbacks or carrier creation/cancellation.

1. Add an adapter lookup that reads all pages for the exact order using the recorded account, with bounded pagination and fail-closed incomplete responses.
2. Add/test a pure eligibility policy and a serializable repository write with snapshot guards, duplicate guards, account provenance, history and audit.
3. Run reconciliation in the existing VP sync path. Retain the earlier status/search corrections. Do not build a VP search UI.
4. Test ambiguity, wrong account/order, cancelled archive, missing old shipment, duplicate responses, repeat invocation, concurrency; lint/typecheck and read-only review.

Production data correction and release are separate from mocked verification. Reconciliation preserves old actual handoff evidence; it never uses creation time as handoff time.

Completed: adapter/policy/serializable persistence and existing VP sync integration, account guards, status/search preservation, UI outcome counts. Review fixed bounded discovery and metadata preservation. Tests cover repeat linking, conflicts, missing/ambiguous evidence, wrong accounts, exact lookup pagination and tenant-scoped persistence. No production execution or deploy.
