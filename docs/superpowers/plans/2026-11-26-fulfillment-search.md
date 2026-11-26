# Fulfillment internal search implementation plan

**Goal:** Consistent internal search in Orders, Shipments and Shipment Costs. No VP lookup UI or automatic replacement linking (user scope clarification).
**Architecture:** Reuse Prisma relational filters and a shared pure search helper; keep tenant/status/channel/date filters at repository roots. No new dependencies or migrations.
**Spec:** docs/2026-11-26-vp-reconciliation-search-design.md (internal search only).

- [x] Add regression tests capturing real repository list/count queries for identifiers, recipient, leading #, blanks, historical shipment matches, and filter/tenant composition.
- [x] Add shared normalization and order/shipment search clauses; wire the three repositories and keep list/count/export predicates consistent.
- [x] Align the three UI placeholders and update scope documentation.
- [x] Run focused tests, lint, typecheck; inspect diff preserving existing pending VP fixes.

Ruling: User selected internal search only. Remote discovery/reconciliation UI is deferred; existing status corrections remain intact. Do not automatically link a different carrier shipment or mutate production orders.

Validation: regression test failed before implementation (missing carrierShipmentId), then passed. Full lint and typecheck pass. Read-only peer review found no actionable search issues. No live database execution/performance test; no deployment or production mutation.
