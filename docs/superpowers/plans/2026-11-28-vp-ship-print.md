# VP single and batch ship-to-print implementation plan

Goal: implement the ship -> wait for label -> print flow approved in this chat for single orders and VP batches.
Architecture: existing authenticated ship/sync/detail endpoints remain authoritative. A bounded browser worker submits each order once, polls saved shipments and synchronizes only existing identities. Backend assembles validated VP PDFs for one print window. No carrier calls from UI, migrations, live test shipments, or automatic creation retries.
Tech stack: existing Next/React and Prisma; pdf-lib for preserving PDF page sizes when combining labels.
Spec: user-approved flow in this chat, 2026-11-28.

- [x] Add tested ship/label worker: independent per-order failures, concurrency two, bounded waiting, cancellation on unmount, no creation retries, exact shipment/account.
- [x] Add VP batch modal: <=10, shared account/package defaults and per-order package/phone, missing-detail guards. Preserve existing Yun batch.
- [x] Connect single and batch submission to progress UI; pending tasks do not block order navigation. Recover existing pending shipments without resending. Add ready-label batch print.
- [x] Add authenticated tenant-scoped PDF batch endpoint: <=10 IDs, single/double, strict carrier CDN allowlist, no redirects, byte/page/time limits, atomic failure instead of silently dropping pages. Add security and PDF tests.
- [x] Run targeted worker/modal/integration UI tests plus existing ship/phone/cancel tests, lint, typecheck and build; review final diff.

Assumptions: auto-fetch runs while Orders is mounted; webhook/cron persists carrier progress after navigation. Bounded foreground polling stops after two minutes with explicit retry-fetch action; never re-create. Browser opens one reserved print tab from the user's click (popup-safe), not silent physical printing. VP double labels must use mergeLabelUrl, never duplicate a single label. No live calls during tests. Release is separate from implementation.

## Delivered API and operational limits

`POST /api/shipments/labels/batch` accepts `{shipmentIds: string[], mode: "single" | "double"}` (1-10 IDs) and returns a private, no-store PDF. It requires an active OWNER/ADMIN/OPERATOR membership and same-origin request, derives tenant from the session, rejects cancelled/exception/draft/failed or non-VP records, and resolves each saved carrier account. No URLs or tenant/account overrides are accepted from the browser. Downloads allow HTTPS CloudFront only, no redirects, <=10 MiB/file, <=25 MiB total, <=100 pages.

The progress filter applies to the current run. A batch uses two concurrent create workers; each create is attempted once, with a 120-second client timeout and an explicit review state on ambiguous failures. Label polling has a shared two-minute abort deadline, eight attempts maximum and 12-second intervals. Existing pending rows on the current Orders page resume label fetching once without opening a popup. Closing/navigating away stops foreground work; already submitted orders remain persisted and must be reconciled rather than recreated. Printing opens a PDF, with physical printer confirmation left to the browser/user.

## Verification

Passed: worker tests (including deadline mid-round and no retry of ambiguous creation); batch PDF/URL validation and route auth/tenant tests; mocked UI single/batch, per-order weight, account, loading guard, retained failed rows after changing label format; existing ship action, recipient phone and cancel UI regressions; ESLint and TypeScript. Fresh review found three issues (loading guard, failed-row retention, polling deadline), all fixed with regression coverage.

Next production build passed in a temporary source snapshot using the existing generated Prisma client. The standard npm build's Prisma generation step hit EPERM because the running local dev server holds the Windows Prisma DLL; that server was preserved. No live carrier calls, production data changes or deployment were performed. pdf-lib was added to combine original PDF page sizes without rasterization.
UI follow-up: Orders selection now caps at 10 (including header selection); the counter shows selected/10, unchecked rows are disabled at the cap while selected rows remain removable. VP batch now closes on backdrop mousedown, matching existing single/Yun modals; clicks within content remain open. Mocked 20-row selection/replacement/clear and backdrop/internal-click regressions passed, as did lint and typecheck. Page size remains 20.

Batch load follow-up: reuse Orders expanded detail cache at modal open; fetch only missing rows, publish each result independently, and load carrier accounts concurrently. Missing detail/account reads have a 30-second abort timeout. Regression test first failed on blank cached weight, then passed with immediate cached row, ACC2 loaded while other requests wait, and no detail request for the cached order. UI test, lint and typecheck passed; live latency was not measured.
