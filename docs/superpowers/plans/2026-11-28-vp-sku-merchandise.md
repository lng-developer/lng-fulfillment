# Viettel Post SKU merchandise mapping

## Source and verified contract

Source: user-provided `[EPACKET]-Tài liệu public API (31032026).docx`, read locally on 2026-11-28. No live carrier API was called.

- Create shipment describes required `merchandise` as one object obtained from `GET /api/partner/management/get-merchandise`.
- `lineItems` is a list. Each entry requires name, quantity, USD price, and two-letter country of origin; SKU is also present.
- The merchandise search response supplies identity/code, parentCode/category, localized names. Select an exact code; do not select the first fuzzy result.
- The supplied document does not describe multiple merchandise objects per shipment. Until VP confirms an alternative, reject an order whose items resolve to different merchandise codes. Do not silently split it or select a dominant item.

## Existing defects

The adapter defaults missing HS to `6109100004`, falls back to a hardcoded T-shirt merchandise even for unknown codes/API failures, and can select the first fuzzy search result. Its merchandise cache is scoped only to environment + HS. The frontend product-name heuristic is not a reliable customs declaration. VP lineItems.name currently uses the source item name instead of a validated explicit declaration name.

## Concrete implementation scope

1. New tenant-scoped `SkuViettelMerchandiseMapping` persistence: id, tenantId, skuCode, destinationCountryCode, declarationName, merchandiseCode, createdBy/updatedBy, timestamps. Unique tenant + SKU + destination. Store codes/names, not carrier credentials or hardcoded VP merchandise IDs. No default rows or inferred classifications.
2. Add schema and additive migration file only after explicit authorization required by AGENTS.md. Do not run a production migration. Existing Yun shipping-method mappings remain separate.
3. Service/repository/validation for bounded bulk lookup and upsert. OWNER/ADMIN/OPERATOR may prepare/update mappings; tenant comes from the authenticated session, not request body. Same-origin protection and validation follow existing mutation routes.
4. Single and batch VP UI show every item with SKU, source name, editable declaration name, merchandise/HS code, and mapping state. Reuse a shared editor. Existing mapping prefills; unmapped stays blank. Explicit Save mapping persists changes for future orders. Unsaved per-order overrides apply only to that submission. Do not change Yun declarations.
5. Backend resolves all actual shipment items by exact SKU + destination and applies per-item overrides keyed by orderItemId. Validate names/codes before carrier creation. Missing mapping, missing SKU without explicit per-item declaration, or mixed merchandise codes block that order; independent valid batch rows continue. Never change quantity or auto-resubmit a failed create.
6. Adapter requires an explicit merchandise code, queries VP under the selected saved account, and requires one exact returned code with valid identity. Remove all T-shirt fallbacks and first-result selection. Do not reuse cached metadata across tenant/accounts/environments. Use resolved declarationName as lineItems.name. If VP lookup fails, fail with actionable error before POST shipment.
7. UI permits manual entry of a code from the user's VP catalog; server validates against VP at send time. This task does not authorize sending live test shipments or guessing HS codes from product titles.

## Verification

- Tenant isolation and permissions for lookup/save; invalid names/codes and duplicate SKU inputs.
- Saved mappings, per-order override, missing mapping, repeated SKU lines, no-SKU explicit declaration, mixed merchandise groups.
- Exact VP catalog match; missing/ambiguous matches, network failures, no T-shirt fallback, no create POST after validation failure.
- Single and batch editors, per-item names/quantities, independent invalid rows, retained ACC2/double label defaults.
- Existing Yun/VP adapter, phone, ship action, batch print tests; lint/typecheck/build.
- Deployment requires separately applying the reviewed additive migration before the dependent application release. No production migration or live shipment creation in this implementation task.

## Authorization and delivery

User explicitly approved the mapping table, migration file and both UIs on 2026-11-28, and prohibited running production migration. Implementation uses the existing checkout and preserves preceding batch/printing/modal changes.

- Added `SkuViettelMerchandiseMapping` and additive migration `20261128090000_add_vp_sku_merchandise`; no seed or database migration executed.
- Added `GET/PUT /api/tenants/current/vp-merchandise` for authenticated bounded lookup/upsert. Destination-specific mapping keys remain tenant scoped.
- Added shared `VpDeclarationEditor` in both single and batch dialogs. Source name/SKU/quantity are shown separately from editable declaration fields. Names/codes start blank without a saved mapping. Save is explicit, disabled for missing SKU; per-item overrides still support items without SKU.
- Added backend validation and mapping on direct ship, preflight and shipment execution. Overrides must reference actual shipment items, unique by item ID. Mixed merchandise codes block a shipment. Yun declarations remain unchanged.
- Removed hardcoded merchandise catalogs, default T-shirt codes, first-result matching and shared cross-account merchandise cache. Exact code, valid identity and non-inactive category are required before create. The supplied document spells `Fillter`; the query sends the same value as both `Fillter` and existing `Filter` for gateway compatibility. This compatibility has not been verified live.
- Code edits apply only to current submission unless Save mapping is clicked. Saved codes are verified against the selected VP account at send time, not at mapping-save time.

## Verification record

Passed: declaration/parser tests, service tests with mocked repository, route auth/role/origin/tenant tests, shared editor browser tests (manual edit, delayed lookup, save, mixed codes, country change), single/batch shipping browser tests, recipient-phone regression and VP adapter tests including no POST for inactive merchandise. Fresh review identified the inactive-category case; it is fixed and covered.

Prisma schema validation and offline SQL generation passed with dummy localhost connection strings; no database connection or migration was executed. Client generation passed in an isolated temporary directory because the running dev server locks the workspace Prisma DLL. Production must receive the migration before this application's persistent mapping feature is enabled. Local dev server may need restart to load the regenerated client after a separately authorized dev migration.

Final gates: ESLint, TypeScript, git diff whitespace check, and optimized Next.js build all passed. Build ran in an isolated source snapshot without production environment files. Offline generated SQL confirmed the mapping table columns, unique index and tenant foreign key match the reviewed migration. No production API/carrier calls, database writes, migration execution, commit, push or deployment occurred.

## UI follow-up: dedicated SKU mapping management

- Added Settings > Khai báo hàng VP with bounded, tenant-scoped search/pagination and create/edit/delete.
- POST rejects duplicate SKU/country instead of silently overwriting. Edit keeps the compound key fixed; delete requires confirmation and only affects future declarations.
- Shared single/batch declaration editor now starts collapsed, showing readiness and a management link prefiltered by SKU. Explicit reload fetches saved configuration; per-submission overrides remain available.
- Added mocked browser CRUD coverage and expanded route/service checks for create/delete, permissions, same-origin, server tenant, duplicate and missing records, and invalid filters.
- Local CRUD, editor, single phone, batch ship/print tests, lint and typecheck pass. No production migration, carrier request or deployment performed. The existing additive migration is required before persistent CRUD can work against a database.

## Group mapping follow-up (2026-11-28)

- User requested SKU groups such as ACO. Add mappingType SKU/GROUP; existing mappings default to SKU.
- Uniqueness is tenant + type + key + destination. GROUP keys are uppercase alphanumeric tokens. The group is the second hyphen-separated SKU segment; malformed/empty-segment SKUs do not fall back.
- Resolution: explicit per-item override, exact SKU/country, group/country, otherwise validation error. Matching is never substring-based.
- CRUD offers SKU/group selection and displays the type; editing keeps identity fixed. Saving from the shipment editor always creates an exact-SKU exception, never changes a shared group.
- Added additive migration 20261128110000_vp_merchandise_groups. It follows the initial mapping-table migration; neither was executed against a database.
- Tests cover precedence, destination boundaries, nonmatching groups, group CRUD, tenant/type repository guards, and the shared single/batch editor.

## Authorized production release (2026-11-28)

- User explicitly approved pushing main and executing both mapping migrations on production.
- Rehearsed on disposable PostgreSQL 16: all migrations, then a scoped package omitting the unrelated pending index migration. Real database checks passed for CRUD, exact-SKU priority and tenant isolation.
- Production applied only `20261128090000_add_vp_sku_merchandise` and `20261128110000_vp_merchandise_groups` with Prisma migrate deploy. The older pending `20261117170000_optimize_p0_p1_indexes` was excluded; no migration history was falsified.
- Existing migration checksum differences were verified to be CRLF/LF only. The temporary release package preserved each already-applied checksum.
- Lint, typecheck, production build, Prisma generation, mocked UI/service/route tests and 18 adapter/job/PDF/declaration tests passed. Dependency audit passed the repository critical gate; existing moderate/high advisories remain.
- Recovery: roll back the application while retaining additive mapping schema and saved configuration. Do not drop production mapping data.
- No real carrier creation or production mapping seed was performed. Users must configure the actual declaration name and verified merchandise code for their SKU/groups.
