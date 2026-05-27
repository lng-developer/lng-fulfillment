# 07 Tasks and Status

## Current Task

V2-121 - Platform Audit Log Backend Multi-Action Pagination

## Last Completed Task

V2-120 - Platform Admin Audit Log Runtime Regression

## Next Recommended Task

`V2-122 - Platform Audit Log Query Performance Review`

Reason: Backend multi-action pagination is now implemented and in review; next useful follow-up is query performance/index review for larger audit volumes.

## Task Board

Status legend:

- `Not Started`: chưa bắt đầu.
- `In Progress`: đang thực hiện.
- `In Review`: đã hoàn tất phần việc chính và đang chờ review/acceptance.
- `Done`: đã hoàn tất và được chấp nhận.
- `Blocked`: đang bị chặn bởi dependency hoặc quyết định cần làm rõ.
- `Skipped`: bỏ qua có chủ đích.

| Task | Title | Status | Notes |
| --- | --- | --- | --- |
| V2-DOCS-002 | Refine Governance Docs After Review | Done | Đã cập nhật governance docs sau review trước bootstrap. |
| V2-000 | Bootstrap | Done | Đã khởi tạo scaffold Next.js/TypeScript/Prisma tối thiểu và được xác nhận hoàn tất. |
| V2-001 | Architecture baseline | Done | Đã audit/tighten scaffold, module boundaries, shared helpers, Prisma baseline và được xác nhận hoàn tất. |
| V2-010 | Identity/Tenant schema | Done | Đã thêm schema identity/tenant/session/API key/audit baseline; migration SQL được tạo nhưng chưa apply. |
| V2-010B | Apply Identity/Tenant Migration To Test DB And Seed Dev User | Blocked | Superseded by `V2-010B-RETRY` sau khi env/password được cấu hình lại. |
| V2-010B-RETRY | Verify Supabase Test DB, Apply Identity/Tenant Migration, Seed Dev User, And Test Auth Flow | In Review | Migration/seed/auth runtime tests đã pass trên approved Supabase test DB qua approved pooler host. |
| V2-011A | Auth Crypto And Session Utilities | Done | Đã thêm password hashing, session token hashing, cookie options và timing-safe compare utilities. |
| V2-011B | Login Logout Me APIs | In Review | API đã implement; DB-backed auth runtime tests đã pass trong `V2-010B-RETRY`, chờ acceptance. |
| V2-011C | Route Guard And Auth Context | In Review | Đã thêm server-side auth context helpers và dashboard protection placeholder. |
| V2-011D | Login Page UI | Done | Đã thêm minimal professional login form dùng existing login API và authenticated redirect; đã được xác nhận hoàn tất. |
| V2-011E | Logout/User Menu | Done | Đã thêm user menu tối thiểu và logout action trên protected dashboard; đã được xác nhận hoàn tất. |
| V2-011 | Auth APIs | Not Started | Parent task cho auth API workstream. |
| V2-012 | Tenant API keys | Done | Đã thêm current-tenant API key create/list/revoke/verify foundation; đã được xác nhận hoàn tất. |
| V2-020 | Portal receive | In Review | Đã thêm tenant API key authenticated `POST /api/portal/orders`, order schema tối thiểu, audit và runtime tests. |
| V2-020B | Portal Order Data Completeness Audit And Schema Hardening | In Review | Đã mở rộng schema/mapper Portal order để lưu normalized fields và vẫn giữ raw payload an toàn. |
| V2-021B | Order API Field Exposure Review | In Review | Đã chốt contract list/detail order APIs để trả normalized public fields có chủ đích và tránh raw/large JSON mặc định. |
| V2-021 | Order list/detail APIs | Done | Đã thêm dashboard-authenticated tenant-scoped order list/detail APIs; đã được xác nhận hoàn tất. |
| V2-022 | Orders Table UI | Done | Đã thêm Orders Table UI tối thiểu trong dashboard, dùng tenant-scoped order APIs; đã được xác nhận hoàn tất. |
| V2-030 | Shipment core | Done | Đã thêm shipment schema, draft creation, list/detail APIs và runtime tests; đã được xác nhận hoàn tất. |
| V2-031 | Carrier Adapter Interface | Done | Đã thêm carrier adapter contract, registry/factory placeholder và shipment execution boundary; đã được xác nhận hoàn tất. |
| V2-032 | Shipment Execution Service | Done | Đã thêm shipment execute service/API với no-live-adapter 501 path; đã được xác nhận hoàn tất. |
| V2-040 | YunExpress OMS adapter | Done | Đã implement `YUNEXPRESS_OMS` sau `CarrierAdapter`, có live guard và no-live tests; đã được xác nhận hoàn tất. |
| V2-041 | Manual UI Live CreateOrderLabel Preparation | Done | Đã thêm preflight endpoint và UI preparation để user tự kích hoạt CreateOrderLabel thủ công; đã được xác nhận hoàn tất. |
| V2-042 | User Manual Live Test Review | In Review | Đã ghi nhận user xác nhận manual QA checklist hoàn tất; live CreateOrderLabel result details chưa được cung cấp. |
| V2-050 | Shipment UI Hardening | Done | Đã harden dashboard shipment UI cho draft creation, related shipments, detail/history, preflight readiness và guarded execute controls. |
| V2-051 | Shipment Tracking UI | Done | Đã thêm tracking-focused shipment detail UI dùng existing shipment fields/status history và không gọi live tracking APIs; đã được xác nhận hoàn tất. |
| V2-052 | Shipment Result/Label Display Hardening | Done | Đã harden carrier result, label availability và failure display mà không expose raw carrier response; đã được xác nhận hoàn tất. |
| V2-060 | Tenant Settings UI | Done | Đã thêm tenant profile, read-only memberships summary và tenant API key management UI foundation; đã được xác nhận hoàn tất. |
| V2-061 | Tenant Members Management APIs | Done | Đã thêm current-tenant member list/update APIs với OWNER/ADMIN authorization, last-owner guard và audit logs; đã được xác nhận hoàn tất. |
| V2-062 | Tenant Members UI | Done | Đã thêm Members panel trong Settings dùng current-tenant member APIs; đã được xác nhận hoàn tất. |
| V2-070 | Audit Log Viewer | Done | Đã thêm current-tenant audit log API và Settings Audit Logs panel; đã được xác nhận hoàn tất. |
| V2-071 | Audit Metadata Redaction Hardening | Done | Đã harden sanitizer cho suspicious key/value variants, size limits và UI summary an toàn; đã được xác nhận hoàn tất. |
| V2-080 | Test/Role Seed Hardening | Done | Stable role seed và runtime permission matrix cho OWNER/ADMIN/OPERATOR/VIEWER đã pass trên approved test DB; đã được xác nhận hoàn tất. |
| V2-090 | Production Readiness Review | Done | Review tổng thể readiness đã hoàn tất và được xác nhận: staging nội bộ có thể đi tiếp với risks, production HOLD cho tới khi xử lý P1 security/testing/deployment/carrier gaps. |
| V2-091 | Rate Limit, CSRF, And Abuse Guard Hardening | Done | Đã thêm `RATE_LIMITED`, in-memory abuse guard, same-origin guard cho cookie-authenticated mutations và docs policy; đã được xác nhận hoàn tất. |
| V2-092 | CI Verification Pipeline | Done | Đã thêm GitHub Actions CI tối thiểu với dummy env, core checks và non-blocking audit warning; đã được xác nhận hoàn tất. |
| V2-093 | Production Deployment Checklist | Done | Đã thêm dedicated production/staging deployment checklist, release gate, migration/rollback/env/carrier safety checklists; đã được dùng làm nền cho V2-094. |
| V2-094 | Backup/Restore Rehearsal Plan | Done | Đã thêm backup/restore rehearsal process, pre-migration backup checklist, restore validation checklist và deployment integration; đã được xác nhận hoàn tất. |
| V2-095 | Dependency Vulnerability Review | Done | Đã xử lý known moderate `postcss` audit finding bằng npm override same-major, audit sạch và CI audit chuyển thành blocking; đã được xác nhận hoàn tất. |
| V2-096 | Carrier Credential Model Design | Done | Đã thiết kế tenant-scoped carrier account/credential model, secretRef/encryptedPayload strategy, resolver boundary, RBAC/audit và env fallback migration path; đã hoàn tất trước V2-097. |
| V2-097 | Carrier Credential Schema And Encryption Utilities | Done | Đã thêm Prisma schema/migration cho CarrierAccount/CarrierCredential, AES-256-GCM encryption utilities, internal carrier credential summaries/resolver và env placeholders; đã được xác nhận hoàn tất. |
| V2-098 | Carrier Credential Management APIs | Done | Đã thêm current-tenant carrier account/credential management APIs với OWNER/ADMIN RBAC, encryption, safe responses và audit logs; đã được xác nhận hoàn tất. |
| V2-099 | Carrier Credential UI | Done | Đã thêm Carrier Accounts panel trong Settings với encrypted YUNEXPRESS_OMS credential management an toàn; đã được xác nhận hoàn tất. |
| V2-100 | Carrier Credential Resolver Integration | Done | Đã wire tenant-scoped carrier credential resolver vào YunExpress preflight/execution path, giữ env fallback và no-live safety; đã được xác nhận hoàn tất. |
| V2-101 | YunExpress Tracking Adapter | Done | Đã implement internal YunExpress `getTracking` adapter, status/event normalization và mocked no-live checks; chưa thêm public sync endpoint; đã được xác nhận hoàn tất. |
| V2-102 | Shipment Tracking Sync API | Done | Đã thêm tenant-scoped `POST /api/shipments/:shipmentId/tracking`, service sync status/tracking/history và safe audit metadata bằng mocked/no-live adapter checks; đã được xác nhận hoàn tất. |
| V2-103 | Shipment Tracking UI Action | Done | Đã thêm manual `Sync tracking` action trong shipment detail, explicit-click only, safe result/error summaries và VIEWER read-only UX; đã được xác nhận hoàn tất. |
| V2-110 | Platform Admin Layer | Done | Added separate PlatformAdmin model, platform admin guard, `/api/platform/*` APIs, and `/platform` UI for cross-tenant SaaS administration; code/build verification passed, DB migration not yet applied. |
| V2-110B | Apply Platform Admin Migration And Smoke Test | Done | User confirmed success. Migration applied to approved local/test DB, seed rerun, platform API/UI smoke tests passed; non-platform UI denial was fixed from 500 to 404. |
| V2-111 | Platform Admin Tenant Creation UX Hardening | Done | User confirmed success. Hardened create tenant form validation, owner password guidance, safe mutation errors, double-submit prevention, success navigation, and duplicate slug conflict handling. |
| V2-112 | Platform Admin Authorization Matrix | Done | Audited and smoke-tested platform authorization boundaries. `PLATFORM_ADMIN` is allowed; tenant roles are denied safely; this led into V2-113 support read-only policy. |
| V2-113 | Platform Support Read-Only Policy | Done | User confirmed success. `PLATFORM_SUPPORT` has read-only platform access; platform mutations remain restricted to `PLATFORM_ADMIN`. |
| V2-114 | Platform Admin Tenant Detail UX Hardening | Done | User confirmed success. Hardened tenant detail summary, profile edit validation/confirmation, member add/update validation/confirmation, support read-only UX, and safe mutation error handling. |
| V2-115 | Platform Admin Browser Regression Automation | Done | User confirmed success. Added local/test Playwright browser regression for Platform Admin, Platform Support read-only, tenant-role denial, unauth redirect, safe DB precheck, and temp support cleanup. |
| V2-116 | Platform Admin Browser Regression CI Hardening | Done | CI/CD follow-up deferred by user. Browser regression remains local/manual via `npm run test:platform`; it is not PR/push CI blocking. |
| V2-116B | Run Manual Platform Browser Workflow With Approved CI Secrets | Skipped | Deferred until staging/production automation needs resume; do not run GitHub Actions workflow now. |
| V2-117 | Platform Admin Audit Coverage | Done | User confirmed success. Platform mutation audit events verified and hardened; read platform actions remain non-audited by default; runtime smoke pass with cleanup verified. |
| V2-118 | Platform Admin Audit Denied Access Telemetry | Done | User confirmed success. Added low-noise denied telemetry for authenticated non-platform API denial and PLATFORM_SUPPORT mutation denial; unauthenticated/successful reads/support reads remain non-audited. |
| V2-119 | Platform Admin Audit Log Filtering UX Hardening | Done | User confirmed success. Hardened platform audit log filters, action presets, action readability, safe metadata truncation, and URL deep-linking without changing API contract. |
| V2-120 | Platform Admin Audit Log Runtime Regression | Done | User confirmed success. Added and ran browser regression for platform audit filters, denied telemetry highlighting, support read-only access, tenant denial, metadata safety, and cleanup verification. |
| V2-121 | Platform Audit Log Backend Multi-Action Pagination | In Review | Added backend `actions=` multi-action filter with repository count/find pagination, updated grouped presets to one paginated API request, and extended platform browser regression. |

## Work Log

### V2-DOCS-002 — Refine Governance Docs After Review

- Đã chuẩn hóa module naming sang `tenant`.
- Đã thêm module public API/export rules.
- Đã thêm transaction boundary rules.
- Đã bổ sung lifecycle statuses `FAILED_CREATE`, `FAILED_LABEL`, `TRACKING_PENDING`.
- Đã làm rõ `READY_TO_SHIP` tương ứng concept `Fulfilled` trong MVP.
- Đã thêm standard API error codes.
- Đã thêm tenant context rules.
- Đã bổ sung timing-safe comparison, session rotation, rate-limit/abuse guard.
- Đã thêm rule audit cho platform admin cross-tenant access.
- Đã thêm frontend role-based visibility rules.
- Đã thêm status legend.
- Đã thêm Bootstrap, Tenant Isolation Audit, Security Review, Carrier Adapter prompt templates.
- Đã thêm `APP_ENV`, `TEST_DATABASE_URL` placeholder, migration command policy.
- Đã thêm MVP Code Porting Strategy.
- Không chạy tests/build vì documentation-only task.

### V2-000 — Bootstrap

- Repo ban đầu chưa có `package.json`, `src` hoặc Next.js scaffold.
- Đã bootstrap Next.js App Router + TypeScript.
- Đã thêm `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`.
- Đã thêm Prisma schema tối thiểu với PostgreSQL datasource và Prisma Client generator.
- Không tạo business models.
- Không tạo migrations.
- Không implement auth.
- Không implement tenant schema.
- Không implement order/shipment/carrier logic.
- Không gọi external APIs.
- Đã tạo `src/app/page.tsx`, layout, `globals.css` và `/api/health`.
- Đã tạo folder structure `src/app`, `src/modules`, `src/integrations/yunexpress-oms`, `src/shared`, `src/components`.
- Module folders hiện chỉ có placeholder public `index.ts` hoặc `README`.
- Đã thêm shared helpers: `api-response`, `errors`, `validation`, `logger`, `db`, `auth`, `security`.
- `GET /api/health` trả `{"success":true,"data":{"status":"ok"}}`.
- `npm install` pass, có 2 moderate vulnerabilities chưa auto-fix.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass sau khi thêm `.env` dummy ignored.
- `npm run prisma:generate` pass.
- `.env` local chỉ chứa dummy localhost placeholders, không có real secrets.

### V2-001 — Architecture Baseline Verification

- Scaffold matches required baseline: `src/app`, `src/modules`, `src/shared`, `src/components`, `src/integrations/yunexpress-oms`.
- Module folders chỉ expose placeholder public `index.ts` hoặc `README`.
- Không có repositories/services/business logic.
- Không có cross-module internal imports.
- `/api/health` route mỏng và chỉ dùng shared response helper.
- Không phát hiện MVP-looking copied code trong `src`.
- Đã align `docs/02_ARCHITECTURE.md` với actual `src` structure, `src/shared` và singular module folder names.
- Đã cập nhật `eslint.config.mjs` để ignore generated artifacts như `.next/**` và `next-env.d.ts`.
- `npm run lint` pass sau khi fix ESLint scanning `.next`.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- Health smoke test `GET /api/health` trả `{"success":true,"data":{"status":"ok"}}`.
- Prisma baseline sạch: PostgreSQL datasource, Prisma Client generator, no business models, no migrations.
- `.env.example` chỉ có placeholder.
- `.env` ignored.
- `api-response` khớp documented standard format.
- V2-010 readiness confirmed.

### V2-010 — Identity/Tenant Schema

- Đã thêm Prisma enums: `UserStatus`, `TenantStatus`, `TenantType`, `MembershipStatus`, `TenantRole`, `ApiKeyStatus`, `AuditActorType`.
- Đã thêm Prisma models: `User`, `Tenant`, `TenantMembership`, `Session`, `TenantApiKey`, `AuditLog`.
- Đã giữ PostgreSQL datasource và Prisma Client generator.
- Không thêm Order/Shipment/Carrier/Tracking fulfillment models.
- Không lưu plaintext password, session token hoặc tenant API key.
- `User.passwordHash`, `Session.tokenHash`, `TenantApiKey.keyHash` được dùng cho secret-derived data.
- `TenantMembership` link `User` và `Tenant`, unique theo `tenantId + userId`.
- `TenantApiKey` thuộc `Tenant`, có `keyPrefix`, unique `keyHash`, `scopes`, status và revoke/usage timestamps.
- `AuditLog` hỗ trợ optional `tenantId`, optional `actorUserId`, actor type và indexes cho tenant/time, actor/time, resource lookup.
- Đã thêm public constants/types tối thiểu trong `src/modules/identity`, `src/modules/tenant`, `src/modules/audit`.
- Safe DB target summary: host `localhost`, database `fulfillment_v2_local`, schema `public`.
- Đã tạo migration SQL reviewable tại `prisma/migrations/20260516103000_v2_010_identity_tenant_schema/migration.sql`.
- Không apply migration vào database.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-011A — Auth Crypto And Session Utilities

- Đã thêm `hashPassword(password)` và `verifyPassword(password, passwordHash)`.
- Password hashing dùng Node.js built-in `crypto.scrypt` KDF với random salt và versioned hash format.
- Không dùng custom SHA/plain hash cho password.
- Đã thêm `generateSessionToken()` dùng cryptographically random token.
- Đã thêm `hashSessionToken(token)` để DB chỉ lưu hash session token.
- Đã thêm `SESSION_COOKIE_NAME` và `getSessionCookieOptions()`.
- Session cookie options: `httpOnly`, `sameSite: "lax"`, `secure` khi `APP_ENV=production`, `path: "/"`, TTL 7 ngày.
- Đã thêm `safeCompare(a, b)` dùng Node `crypto.timingSafeEqual` với digest cố định độ dài.
- Đã thêm constants `MIN_PASSWORD_LENGTH`, `MAX_PASSWORD_LENGTH`, `SESSION_TTL_SECONDS`.
- Đã expose utilities qua `src/shared/security`, `src/shared/auth`, và public exports tối thiểu trong `src/modules/identity`.
- Không implement login/logout/me routes, middleware, DB repositories, session cookie runtime, tenant API key runtime verification hoặc UI.

### V2-011B — Login Logout Me APIs

- Đã thêm Prisma client singleton trong `src/shared/db`.
- Đã thêm identity repository functions: find user/session, create/delete/update session, get tenant memberships.
- Đã thêm auth service functions: `loginWithEmailPassword`, `getCurrentSession`, `logout`.
- Login normalize email lowercase/trim, validate email/password, verify password bằng V2-011A utility và tạo session hash.
- Raw session token chỉ được trả nội bộ từ service về route để set httpOnly cookie; response body không chứa token.
- Me route đọc cookie, hash token, kiểm tra session tồn tại/chưa expired, update `lastUsedAt` và trả safe user/tenant summary.
- Logout route xóa session nếu có, clear cookie và trả success kể cả khi không có cookie.
- Đã thêm thin routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Auth responses không trả `passwordHash`, `tokenHash`, raw session token hoặc `keyHash`.
- Không implement login UI, middleware/route guard, tenant switcher, tenant API key runtime verification hoặc order/shipment/carrier logic.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- Manual/API smoke test: `POST /api/auth/login` invalid JSON trả 400.
- Manual/API smoke test: `POST /api/auth/logout` không có cookie trả success 200.
- Manual/API smoke test: `GET /api/auth/me` không có cookie trả 401.
- DB-backed login invalid credentials/success tests bị block vì local DB chưa apply migration/seed user trong scope task này.

### V2-010B — Apply Identity/Tenant Migration To Test DB And Seed Dev User

- Safe DB target check completed without printing credentials or full connection strings.
- Current `DATABASE_URL`: host `db.dnwethyafmoldxcyeemi.supabase.co`, database `postgres`, schema `public`.
- Current `DIRECT_URL`: host `db.dnwethyafmoldxcyeemi.supabase.co`, database `postgres`, schema `public`.
- `DEV_ADMIN_PASSWORD` is present; value was not printed.
- Added idempotent dev seed file `prisma/seed.ts`.
- Added `prisma:seed` script using `tsx`.
- Added `tsx` dev dependency for running the TypeScript seed.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `npx prisma migrate deploy` failed with Prisma schema engine error before migration result.
- `npx prisma migrate status` failed with Prisma schema engine error.
- Retried migrate deploy with `sslmode=require` applied in-process only; still failed with Prisma schema engine error.
- Seed was not run because migration did not apply.
- Runtime auth success tests were not run because migration/seed are blocked.

### V2-010B-RETRY — Verify Supabase Test DB, Apply Identity/Tenant Migration, Seed Dev User, And Test Auth Flow

- Safe DB target check completed without printing full URLs, usernames, passwords, query params, cookie values, `DEV_ADMIN_PASSWORD`, or password hashes.
- `.env` direct host target was approved but Prisma migrate still failed with schema engine error against direct host.
- Approved Supabase pooler target `aws-1-ap-northeast-1.pooler.supabase.com:5432` was used for migration, seed, and runtime auth tests.
- `DEV_ADMIN_PASSWORD` presence was confirmed without printing the value.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- Initial `npx prisma migrate deploy` found a BOM at the start of `migration.sql` and failed before applying schema changes.
- Removed the BOM from `prisma/migrations/20260516103000_v2_010_identity_tenant_schema/migration.sql`.
- Marked the failed migration attempt as rolled back with Prisma migrate resolve on the approved test DB.
- `npx prisma migrate deploy` pass after BOM fix.
- `npx prisma migrate status` pass: database schema is up to date.
- `npm run prisma:seed` pass and is idempotent for tenant `internal-test`, user `admin@example.com`, and OWNER membership.
- Seed did not create `TenantApiKey`.
- Runtime auth test pass: invalid login body returns 400.
- Runtime auth test pass: invalid credentials return generic 401.
- Runtime auth test pass: seeded user login returns 200 and sets an httpOnly session cookie.
- Runtime auth test pass: `GET /api/auth/me` with cookie returns safe user and tenant membership.
- Runtime auth test pass: logout returns 200 and clears the cookie.
- Runtime auth test pass: `GET /api/auth/me` after logout returns 401.
- Response body safety confirmed: no `passwordHash`, `tokenHash`, raw session token, `keyHash`, or `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- Local auth test server was stopped after verification.

### V2-011C — Route Guard And Auth Context

- Đã thêm server-side auth context helpers trong `src/shared/auth/context.ts`.
- Đã thêm `getSessionTokenFromCookies()`, `getCurrentUser()`, `requireUser()`, `getCurrentUserWithTenants()`, `requireTenantAccess(tenantId, allowedRoles?)`, `getDefaultTenantForUser(userId)`.
- Helpers dùng session cookie hiện có, hash raw token trước DB lookup qua auth service, enforce session expiry và không trả `passwordHash`, `tokenHash` hoặc raw token.
- Default tenant MVP chọn ACTIVE membership đầu tiên.
- `requireTenantAccess` kiểm tra membership/role server-side, không tin client-provided `tenantId`.
- Đã refactor `GET /api/auth/me` dùng shared auth context helper và giữ nguyên response contract.
- Đã harden identity repository để session lookup không select `tokenHash` khi service không cần trả field đó.
- Đã thêm `/dashboard` protected server page tối thiểu; unauthenticated user redirect về `/login`.
- Dashboard authenticated hiển thị safe user email/name, default tenant và membership role.
- Đã thêm `/login` placeholder tối thiểu, chưa implement login form.
- Không implement full dashboard UI, tenant switcher UI, middleware global, tenant API key verification hoặc order/shipment/carrier logic.
- Runtime test pass: `GET /dashboard` không cookie redirect về `/login`.
- Runtime test pass: login seeded admin qua API trả 200 và set httpOnly cookie.
- Runtime test pass: `GET /dashboard` với cookie hiển thị user và default tenant.
- Runtime test pass: `GET /api/auth/me` với cookie vẫn trả safe user + tenants.
- Runtime test pass: `GET /api/auth/me` không cookie trả 401.
- Response safety confirmed: không có `passwordHash`, `tokenHash`, raw session token hoặc `keyHash` trong responses.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-011D — Login Page UI

- Đã thay `/login` placeholder bằng login page tối thiểu, chuyên nghiệp.
- Đã thay `/login` placeholder bằng server page có authenticated redirect về `/dashboard`.
- Đã thêm client component `src/app/login/LoginForm.tsx`.
- Đã thêm accessible email/password form.
- Đã hiển thị product name `Fulfillment Platform v2`.
- Đã thêm loading state.
- Đã thêm disabled state.
- Đã thêm generic error state.
- Đã thêm note Contact your tenant administrator.
- Client validation kiểm tra email required/valid format và password required.
- Client form gọi `POST /api/auth/login` với JSON.
- Login success redirect tới `/dashboard`.
- Login failure hiển thị safe generic message, không render raw API internals.
- `/login` là server page.
- Nếu đã authenticated, `/login` redirect tới `/dashboard`.
- Không thêm registration UI.
- Không thêm forgot password UI.
- Không thêm reset password UI.
- Không log password.
- Không lưu password ở browser storage.
- Cookie handling vẫn server-side qua login API.
- `GET /login` unauthenticated trả 200.
- Invalid email API validation trả 400 safe validation response.
- Wrong password trả generic 401.
- Seeded admin login trả 200 + httpOnly cookie.
- `/dashboard` sau login trả 200, hiển thị user và tenant.
- `GET /login` authenticated trả 307 redirect tới `/dashboard`.
- Runtime responses không có `passwordHash`, `tokenHash`, raw session token, `keyHash` hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-011E — Logout/User Menu

- Đã thêm UserMenu client component trên `/dashboard`.
- Đã thêm client component `src/app/dashboard/UserMenu.tsx`.
- `/dashboard` vẫn là protected server page tối thiểu, chưa build full dashboard shell.
- UserMenu hiển thị safe user identity: name/email, default tenant, tenant slug, membership role.
- Đã thêm Sign out button gọi `POST /api/auth/logout`.
- Logout có loading/disabled state.
- Có pending guard chống duplicate logout request.
- Logout success ẩn authenticated user data.
- Logout success dùng Next.js `router.replace("/login")` và refresh state.
- Logout failure hiển thị safe generic error.
- Không implement full dashboard app shell, tenant switcher UI, global middleware, registration, forgot/reset password, tenant API key verification hoặc fulfillment business logic.
- Seeded admin login trả 200 + httpOnly cookie.
- `/dashboard` hiển thị user menu information.
- Logout API clear cookie trả 200.
- Second logout với cùng cookie trả 200 idempotent.
- `/api/auth/me` after logout trả 401.
- `/dashboard` after logout redirect 307 tới `/login`.
- Pending guard verified trong component source.
- Không có session token, `tokenHash`, `passwordHash`, `keyHash` hoặc secrets trong tested responses/page output.
- Không lưu auth data trong `localStorage`/`sessionStorage`.
- Không in DB URL, DB credentials, cookie value hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-012 — Tenant API Keys

- Đã thêm `generateTenantApiKey`.
- Đã thêm `hashTenantApiKey`.
- Đã thêm `getTenantApiKeyPrefix`.
- Đã thêm `verifyTenantApiKey`.
- Raw keys được tạo bằng cryptographically random.
- DB chỉ lưu `keyHash` và `keyPrefix`.
- Verification dùng timing-safe comparison trên hashed raw key.
- Đã thêm tenant API key scopes hiện tại: `orders:write`, `orders:read`, `tracking:write`, `tracking:read`.
- Đã thêm tenant API key repository/service cho create/list/revoke/verify.
- Services enforce ACTIVE tenant membership và role rules.
- Đã thêm `GET /api/tenants/current/api-keys`.
- Đã thêm `POST /api/tenants/current/api-keys`.
- Đã thêm `DELETE /api/tenants/current/api-keys/[apiKeyId]`.
- Routes resolve default ACTIVE tenant từ session, không trust client `tenantId`.
- `OWNER`/`ADMIN` có thể manage keys.
- Roles khác bị service reject.
- Đã thêm minimal audit service/repository.
- Đã ghi `AuditLog` cho `API_KEY_CREATED` và `API_KEY_REVOKED`.
- Audit metadata chỉ gồm key id, key name, keyPrefix, scopes.
- Create response trả plaintext API key đúng một lần.
- List/revoke không trả plaintext key hoặc `keyHash`.
- Revoke đặt `status = REVOKED` và `revokedAt`.
- Verify chỉ trả tenant context nếu key ACTIVE, chưa expired và hash khớp.
- Verify thành công update `lastUsedAt`.
- Seeded admin login pass.
- Unauthenticated list request trả 401.
- List keys pass và không có `keyHash`.
- Create key pass, trả plaintext key một lần cùng safe record.
- Subsequent list không trả plaintext key hoặc `keyHash`.
- Revoke key pass, status `REVOKED`.
- Revoked key verification bị reject.
- Audit logs created for create/revoke and safe.
- Runtime responses/audit output không có `keyHash`, `passwordHash`, `tokenHash`, raw session token, DB credentials hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-020 — Tenant-scoped Portal Receive API

- Đã thêm enum `OrderStatus` với `RECEIVED`, `READY_TO_SHIP`, `CANCELLED`, `ON_HOLD`.
- Đã thêm Prisma models `Order`, `OrderItem`, `OrderStatusHistory`.
- Đã thêm migration `20260519090000_v2_020_portal_order_receive`.
- Đã apply migration bằng `prisma migrate deploy` trên approved Supabase pooler test DB.
- Không thêm Shipment/Carrier/Tracking models.
- Không implement shipment creation, carrier logic, order UI, queues/workers hoặc external carrier APIs.
- Đã thêm order module public exports, validation, service và repository.
- `POST /api/portal/orders` đọc API key từ `Authorization: Bearer <key>` hoặc `X-Tenant-API-Key`.
- Tenant context resolve từ verified tenant API key, không trust client `tenantId`.
- Portal receive yêu cầu scope `orders:write`.
- Body bắt buộc có `orders` array, batch tối đa 50 orders.
- Per-order invalid data được trả trong `errors`; valid orders vẫn được xử lý.
- Valid portal orders tạo initial status `READY_TO_SHIP`.
- Create order + items + status history chạy trong transaction.
- Duplicate `externalOrderId` trong cùng tenant được skip idempotently.
- Đã ghi `AuditLog` action `PORTAL_ORDERS_RECEIVED` với safe metadata.
- Audit metadata chỉ gồm counters và `apiKeyId`, không chứa raw API key hoặc `keyHash`.
- Runtime test pass: missing API key trả 401.
- Runtime test pass: invalid API key trả 401.
- Runtime test pass: seeded admin login pass.
- Runtime test pass: tạo tenant API key qua V2-012 API pass.
- Runtime test pass: valid portal batch tạo order/items/status history.
- Runtime test pass: duplicate `externalOrderId` trong cùng tenant được skip.
- Runtime test pass: created rows dùng `tenantId` từ API key.
- Runtime test pass: audit log được tạo và safe.
- Runtime responses không có `passwordHash`, `tokenHash`, `keyHash`, raw session token, raw API key, DB credentials hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-020B — Portal Order Data Completeness Audit And Schema Hardening

- Đã audit schema `Order`, `OrderItem`, `OrderStatusHistory` hiện tại.
- Kết luận: V2-020 chỉ normalize dữ liệu tối thiểu; nhiều field Portal/POD quan trọng trước đó chỉ nằm trong `rawPayload` hoặc chưa được mapper đọc.
- Đã thêm migration `20260520090000_v2_020b_order_data_hardening`.
- Đã bổ sung normalized `Order` fields: `sourceAccount`, `shopName`, `marketplace`, `externalStatus`, `purchaseAt`, `paidAt`, destination breakdown, shipping fields, `currency`, `orderTotal`, `metadata`.
- Đã bổ sung normalized `OrderItem` fields: `title`, `asin`, `listingId`, `productType`, `variant`, `unitPrice`, `currency`, customization/snapshot/fulfillment/listing/cost-center fields, production/QC fields, `metadata`.
- Đã giữ nguyên `rawPayload` trên `Order` và `OrderItem`.
- Đã thêm indexes có chọn lọc cho shop, marketplace, purchase date, destination country, sku, asin, listing id.
- Portal receive vẫn yêu cầu `orders` array và không nhận single object.
- Portal receive giờ chấp nhận `externalOrderId` hoặc alias `orderId`.
- Mapper hỗ trợ `customer_infor`, `marketplaceId`, `shipping_type`, `purchase_date`, `payments_date`.
- Item mapper hỗ trợ `orderItemId`, `title`, `customized_url`, `snapshotImage`, `fulfillment_file`, `listing`, `cost_center`, `scale_status`, `qc_note`.
- Unknown fields không bị reject và được giữ trong `rawPayload`.
- Duplicate `tenantId + externalOrderId` vẫn idempotent skip.
- List/detail order APIs vẫn không trả `rawPayload` hoặc JSON snapshot lớn mặc định.
- Safe DB target: approved Supabase pooler test DB, database `postgres`, schema `public`.
- `npx prisma migrate deploy` pass cho migration V2-020B.
- `npx prisma migrate status` pass.
- Runtime test pass: existing minimal Portal payload vẫn tạo order.
- Runtime test pass: rich Portal/MVP-like payload tạo order và item với normalized fields.
- Runtime test pass: duplicate rich payload skipped idempotently.
- Runtime test pass: DB check xác nhận normalized order/item fields được lưu.
- Runtime test pass: DB check xác nhận unknown order/item fields được giữ trong `rawPayload`.
- Runtime test pass: `GET /api/orders` không trả `rawPayload`.
- Runtime test pass: `GET /api/orders/:orderId` không trả `rawPayload` và vẫn trả detail.
- Runtime test dùng temporary session/API key, sau đó revoke/delete cleanup.
- Không gọi external APIs, không implement shipment/carrier/YunExpress logic.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-021B — Order API Field Exposure Review

- Đã audit `GET /api/orders` và `GET /api/orders/:orderId` sau V2-020B.
- Đã mở rộng list API contract với compact operational fields: source, shop, marketplace, destination breakdown, shipping fields, purchase/paid dates và item summary.
- Đã thêm `firstSku`, `firstItemName`, `totalQuantity` cho list response.
- Đã giữ list response không trả `rawPayload`, `recipientAddress`, `metadata`, `customizationData` hoặc large JSON blobs.
- Đã giữ detail response không trả `rawPayload` mặc định.
- Đã thêm detail safe summaries cho `fulfillmentFile`, `listingSnapshot`, `costCenterSnapshot`.
- Đã tránh trả full `customizationData` và full large JSON blobs mặc định.
- Đã bỏ `actorId` khỏi status history public detail response để giảm internal exposure.
- Repository/service hiện select/map field có chủ đích, không trả full Prisma objects.
- Đã cập nhật API contract và frontend spec cho order list/detail field exposure.

### V2-021 — Tenant-scoped Order List/Detail APIs

- Đã thêm `GET /api/orders`.
- Đã thêm `GET /api/orders/[orderId]`.
- Dashboard order APIs yêu cầu authenticated session.
- Server resolve default ACTIVE tenant từ session membership.
- Không nhận arbitrary `tenantId` query param trong MVP; nếu client gửi `tenantId` thì trả `400 VALIDATION_ERROR`.
- `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER` đều có thể list/view orders trong tenant.
- Repository methods nhận `tenantId` explicit và filter theo tenant.
- List API hỗ trợ `page`, `pageSize`, `status`, `search`, `from`, `to`, `sortBy`, `sortOrder`.
- `pageSize` default 20 và max 100.
- `search` áp dụng cho `externalOrderId`, `orderNumber`, `recipientName`.
- List response có pagination meta và `itemCount`.
- List response không trả `rawPayload`.
- Detail API dùng internal `Order.id`, không dùng `externalOrderId`.
- Detail API trả summary, items và status history.
- Detail API không trả `rawPayload` mặc định.
- Missing hoặc cross-tenant order trả `404 NOT_FOUND`.
- Runtime test pass: unauthenticated `GET /api/orders` trả 401.
- Runtime test pass: seeded admin login pass.
- Runtime test pass: `GET /api/orders` chỉ trả default tenant orders.
- Runtime test pass: pagination, status filter và search hoạt động.
- Runtime test pass: `GET /api/orders/:orderId` trả detail có items/history.
- Runtime test pass: missing order id trả 404.
- Runtime responses không có `rawPayload` trong list, `passwordHash`, `tokenHash`, `keyHash`, raw session token, DB credentials hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- Không cần migration.
- Không gọi external APIs.
- Không implement shipment/carrier/tracking/callback/UI trong task này.

### V2-022 — Orders Table UI

- Đã thêm minimal Orders Table UI trên protected `/dashboard`.
- Đã preserve `UserMenu` và logout behavior.
- UI gọi `GET /api/orders` cho list data.
- UI gọi `GET /api/orders/:orderId` cho detail.
- Detail dùng internal `Order.id`.
- Search input có debounce khoảng 400ms.
- Có status filter.
- Có page/pageSize pagination.
- Có refresh button với pending state.
- Có loading state.
- Có empty state.
- Có safe error state.
- Có disabled pagination state.
- Detail panel hiển thị order summary, items, status history.
- Không implement order mutation.
- Không implement shipment/carrier/tracking/callback UI.
- UI không gửi `tenantId`.
- Seeded admin login succeeds.
- `/dashboard` shows Orders table shell.
- Orders table API loads tenant orders.
- Search works and does not send `tenantId`.
- Status filter works.
- Pagination works.
- Detail fetch uses internal `Order.id`.
- Detail returns items/history.
- Logout still works.
- Unauthenticated `/dashboard` redirects to `/login`.
- Page output/responses không có `rawPayload`, `passwordHash`, `tokenHash`, `keyHash`, raw session token, DB credentials hoặc `DEV_ADMIN_PASSWORD`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-030 — Shipment Core

- Đã thêm carrier-agnostic `Shipment`.
- Đã thêm `ShipmentItem`.
- Đã thêm `ShipmentStatusHistory`.
- Đã thêm `ShipmentStatus` enum, bao gồm `TRACKING_PENDING`, `FAILED_CREATE`, `FAILED_LABEL`.
- Đã thêm tenant/order/item/status-history relations và indexes.
- Đã apply migration `20260519110000_v2_030_shipment_core` vào approved test DB.
- Không thêm carrier-specific YunExpress fields.
- Không thêm carrier credentials.
- Không thêm tracking/label integration.
- Đã thêm shipment repository/service/validation/types với explicit `tenantId` requirements.
- `createDraftShipment` validate tenant-owned order/items và item quantities.
- Initial shipment status là `DRAFT`.
- Tạo `ShipmentStatusHistory`.
- Ghi `AuditLog` action `SHIPMENT_DRAFT_CREATED` với safe metadata.
- Đã thêm `POST /api/shipments`.
- Đã thêm `GET /api/shipments`.
- Đã thêm `GET /api/shipments/[shipmentId]`.
- `OWNER`/`ADMIN`/`OPERATOR` có thể create shipment draft.
- `VIEWER` có thể list/view.
- Unauthenticated `GET /api/shipments` trả 401.
- Seeded admin login succeeds.
- Draft shipment creation succeeds cho existing tenant order item.
- Created `Shipment`, `ShipmentItem` và `ShipmentStatusHistory` đều tenant-scoped.
- List returns tenant shipments.
- Status filter works.
- Detail returns shipment with items/history.
- Missing shipment returns 404.
- Audit log created with safe metadata.
- Không gọi external APIs.
- Không chạy production migration.
- Không expose raw API keys, `keyHash`, `passwordHash`, `tokenHash`, raw session token, DB credentials, `DEV_ADMIN_PASSWORD` hoặc order `rawPayload`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `npx prisma migrate status` pass.
- `npx prisma migrate deploy` pass.

### V2-031 — Carrier Adapter Interface

- Đã thêm carrier-agnostic contracts cho create shipment, get label, get tracking, cancel shipment, update weight, estimate rate.
- Đã thêm carrier error mapping.
- Đã thêm `YUNEXPRESS_OMS` là known future carrier code.
- Chưa implement live adapter.
- Đã thêm registry helpers: `registerCarrierAdapter`, `getCarrierAdapter`, `hasCarrierAdapter`, `listKnownCarrierCodes`, `listRegisteredCarrierCodes`.
- Unknown carrier và unimplemented known carrier trả controlled `CARRIER_ERROR`.
- Đã thêm `prepareShipmentCarrierExecution` làm no-external-call boundary cho V2-032.
- `prepareShipmentCarrierExecution` validate tenant-scoped shipment access.
- `prepareShipmentCarrierExecution` normalize carrier code và check known carrier code.
- Không mutate shipment status/lifecycle trong task này.
- Carrier errors map sang standard `CARRIER_ERROR` với safe details: `carrierCode`, `reason`, `retryable`, safe metadata.
- `rawResponse` chỉ là server-side metadata, không phải default API/UI payload.
- Không gọi carrier APIs.
- Không thêm carrier credentials.
- Không expose secrets.
- Không chạy migration.
- Không thêm public endpoint.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-032 — Shipment Execution Service

- Đã thêm `executeShipment(tenantId, shipmentId, input, actor)`.
- `executeShipment` yêu cầu tenant-scoped shipment access.
- Chỉ cho phép shipment status `DRAFT` hoặc `FAILED_CREATE` được execute.
- Validate carrier code thông qua carrier registry.
- Khi adapter chưa registered, trả HTTP 501 với `CARRIER_ERROR`.
- Khi adapter chưa registered, không gọi external APIs.
- Khi adapter chưa registered, không mutate `Shipment`.
- Khi adapter chưa registered, không tạo `ShipmentStatusHistory`.
- Future live-adapter path đã được chuẩn bị trong service.
- Shipment service sẽ sở hữu `CREATING`, success, `FAILED_CREATE` transitions, status history và safe audit metadata.
- Chưa activate live adapter path vì chưa có registered live adapter.
- Đã thêm `POST /api/shipments/[shipmentId]/execute`.
- API yêu cầu authenticated dashboard session.
- API resolve default ACTIVE tenant từ session.
- `OWNER`, `ADMIN`, `OPERATOR` được execute.
- Unauthenticated execute trả 401.
- Seeded admin login trả 200.
- Execute trên `DRAFT` shipment với unregistered `YUNEXPRESS_OMS` trả 501 `CARRIER_ERROR`.
- Shipment status không đổi sau 501.
- Không có status history mới sau 501.
- Unknown shipment trả 404.
- Invalid carrier code trả controlled `CARRIER_ERROR`.
- Responses không chứa secrets hoặc `rawResponse`.
- Không implement YunExpress/live carrier adapter.
- Không cần migration.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-040 — YunExpress OMS Adapter

- Đã implement `YUNEXPRESS_OMS` sau `CarrierAdapter`.
- Đã registered `YUNEXPRESS_OMS` trong carrier registry.
- Đã thêm `createShipment`, `getLabel`, `getTracking`, `cancelShipment`, `updateWeight`, `estimateRate`.
- `createShipment` có guarded OMS path.
- `getLabel`/`getTracking`/`cancelShipment`/`updateWeight`/`estimateRate` hiện trả controlled `CARRIER_ERROR` / `NOT_SUPPORTED`.
- Đã thêm `.env.example` placeholders cho `YUN_OMS_*`.
- Credentials chỉ đọc từ env.
- Không print/log/store credentials trong source hoặc client responses.
- Đã thêm Basic auth helper dùng `customerNo&apiSecret` rồi base64.
- Đã thêm fetch client với timeout/abort handling.
- Không thêm dependency.
- Đã map normalized shipment input sang `CreateOrderLabel` payload, gồm receiver và parcels.
- Đã normalize root `Code`, `Item[].Success`, `WayBillNumber`, `TrackingNumber`, `Label`, `Remark`.
- `Code=0000` chỉ là request-level success; business success cần `Item.Success=1`.
- `YUN_OMS_LIVE_ENABLED=false` block trước network call.
- Runtime execute với `YUNEXPRESS_OMS` trả controlled 501 `CARRIER_ERROR` khi live disabled.
- Không gọi OMS network.
- Không mutate `Shipment`.
- Không tạo `ShipmentStatusHistory`.
- Mock/no-live auth header check pass.
- Mapping check pass.
- Response normalization success/failure cases pass.
- Live-disabled `createShipment` không gọi fetch.
- Không gọi production/sandbox `CreateOrderLabel`.
- Không tạo real/sandbox YunExpress shipment.
- Không có credentials, `rawResponse`, hashes, session token, DB credentials hoặc `DEV_ADMIN_PASSWORD` trong tested responses/logs.
- Không thêm carrier credential schema.
- Không implement dashboard shipment UI.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-041 — Manual UI Live CreateOrderLabel Preparation

- Đã thêm `GET /api/shipments/:shipmentId/preflight`.
- Preflight có session auth.
- Preflight resolve default tenant.
- Preflight enforce role.
- Preflight validate shipment status/items.
- Preflight validate registered carrier.
- Preflight check safe `YUN_OMS_*` env presence.
- Preflight build mapping preview an toàn.
- Preflight không gọi YunExpress network.
- Preflight không gọi `CreateOrderLabel`.
- Preflight không mutate shipment/status history.
- Đã thêm minimal dashboard shipment execution preparation trong order detail.
- UI load existing shipments cho selected order.
- UI cho phép chọn shipment và `YUNEXPRESS_OMS`.
- UI chạy preflight.
- UI hiển thị safe receiver/package/parcels preview.
- Khi `YUN_OMS_LIVE_ENABLED=false`, execute button disabled.
- Khi live enabled, UI yêu cầu confirmation checkbox; đã lược bỏ bước nhập exact text.
- Approved test DB host verified safely, không in URL/credentials.
- Seeded admin login pass.
- Unauthenticated shipment API trả 401.
- Preflight on `DRAFT` shipment trả 200, `liveEnabled=false`.
- Execute with live disabled trả 501 `CARRIER_ERROR`.
- Shipment status không đổi sau live-disabled execute.
- `ShipmentStatusHistory` không đổi sau live-disabled execute.
- Logout pass.
- Không gọi live/sandbox `CreateOrderLabel`.
- Không tạo real/sandbox YunExpress shipment.
- Không expose credentials, Authorization token, `rawResponse`, hashes, cookie values, DB credentials, raw API keys hoặc `DEV_ADMIN_PASSWORD`.
- Không sửa env values.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-042 — User Manual Live Test Review

- User xác nhận manual QA checklist đã hoàn tất cho Auth.
- User xác nhận manual QA checklist đã hoàn tất cho Orders Dashboard.
- User xác nhận manual QA checklist đã hoàn tất cho Shipments preparation.
- User xác nhận manual QA checklist đã hoàn tất cho Live disabled safety.
- User xác nhận manual QA checklist đã hoàn tất cho API safety spot checks.
- Live/sandbox `CreateOrderLabel` result details chưa được cung cấp.
- Chưa có `execute response status` từ manual UI live/sandbox test.
- Chưa có `shipment status after execution` từ manual UI live/sandbox test.
- Chưa có `carrierShipmentId` / waybill từ manual UI live/sandbox test.
- Chưa có `trackingNumber` từ manual UI live/sandbox test.
- Chưa có `labelUrl` từ manual UI live/sandbox test.
- Không giả định live shipment success.
- Không inspect DB vì live result details chưa được cung cấp.
- Không gọi `POST /api/shipments/:shipmentId/execute`.
- Không gọi live/sandbox YunExpress APIs.
- Không tạo real/sandbox YunExpress shipment.
- Không sửa env values.
- Không expose credentials, Authorization token, `rawResponse`, DB URL, cookie values hoặc secrets.
- Không chạy verification commands vì task chỉ record user-provided checklist result và không có code/doc behavior change ngoài status log.

### V2-050 — Shipment UI Hardening

- Đã harden shipment area trong order detail panel.
- Related shipments hiển thị status, carrier code, carrier shipment id, tracking number, label availability, created/updated time và item count.
- Đã thêm shipment detail view cho selected shipment.
- Shipment detail hiển thị shipment items và shipment status history.
- Đã thêm form tạo draft shipment từ selected order items.
- Draft shipment form validate quantity positive integer và không vượt quá order item quantity.
- Tạo draft shipment gọi `POST /api/shipments` và không execute carrier tự động.
- Sau khi tạo draft, UI refresh shipments và chọn draft shipment mới.
- Preflight panel hiển thị `YUNEXPRESS_OMS`, `liveEnabled`, safe env presence, mapping preview, warnings và readiness state.
- Khi `YUN_OMS_LIVE_ENABLED=false`, execute button disabled.
- Khi live enabled, execute UI yêu cầu confirmation checkbox và exact text `CREATE YUNEXPRESS SHIPMENT`.
- Execute UI chống double submit, disable khi pending, không retry tự động và hiển thị safe result/error summary.
- UI không gửi `tenantId`.
- UI không render `rawPayload`, `rawResponse`, carrier credentials, Authorization token, API keys, hashes, cookie values, DB credentials hoặc secrets.

### V2-051 — Shipment Tracking UI

- Đã thêm tracking-focused section trong shipment detail.
- UI hiển thị shipment status.
- UI hiển thị carrier code.
- UI hiển thị carrier shipment id / waybill.
- UI hiển thị tracking number.
- UI hiển thị label state.
- UI hiển thị latest known status.
- UI hiển thị `createdAt` / `updatedAt`.
- Đã thêm empty state khi chưa có tracking number.
- Đã thêm disabled placeholder: `Tracking sync not implemented yet`.
- Không gọi `getTracking`.
- Không thêm live tracking endpoint.
- Không trigger execute.
- Timeline hiển thị entries theo thứ tự API trả về.
- Timeline entry có status badge, note, safe actor type, `createdAt`.
- Không render internal `actorId`.
- Nếu có `labelUrl`, UI hiển thị `Open Label` mở tab mới.
- Nếu chưa có label, UI hiển thị `Label not available yet`.
- Không render raw label string hoặc `rawResponse`.
- `/dashboard` trả 200 với session tạm.
- `GET /api/shipments?orderId=...` trả 200.
- `GET /api/shipments/:shipmentId` trả 200 và có `statusHistory`.
- Empty tracking state được cover vì shipment test chưa có `trackingNumber`.
- Không có shipment test có `labelUrl` nên `Open Label` chưa runtime-tested bằng dữ liệu thật.
- Không gọi execute.
- Không gọi external carrier APIs.
- Không expose `rawPayload`, `rawResponse`, credentials, API keys, hashes, DB credentials, raw session token hoặc secrets.
- Không gọi live/sandbox YunExpress APIs.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-052 — Shipment Result/Label Display Hardening

- Đã thêm `Carrier result` panel trong shipment detail.
- Đã phân biệt safe states: label available, label unavailable, tracking pending, carrier result missing, carrier execution failed.
- `Open Label` chỉ hiện khi có `labelUrl`.
- `Open Label` mở tab mới.
- Không render full/signed URL thành text.
- Failure statuses `FAILED_CREATE`, `FAILED_LABEL`, `EXCEPTION` hiển thị danger state.
- Failure display dùng safe message từ status/history public.
- Không expose `Shipment.metadata`.
- Không expose `rawResponse`.
- Không expose raw carrier payload hoặc secrets.
- `/dashboard` trả 200 với session tạm.
- `GET /api/shipments/:shipmentId` trả 200.
- Missing `labelUrl` safe unavailable state verified.
- `Open Label` verified bằng temporary internal test `labelUrl`.
- Failure state verified bằng temporary internal `FAILED_CREATE` status history note.
- Temporary test data cleanup: label rows 0, history rows 0.
- Không gọi execute.
- Không gọi external carrier APIs.
- Không gọi live/sandbox YunExpress APIs.
- Không có `rawPayload`, `rawResponse`, credentials, API keys, hashes, DB credentials, raw session token hoặc secrets trong page/API output.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-060 — Tenant Settings UI

- User xác nhận `V2-060` đã thành công và được đánh dấu `Done`.
- Đã thêm Settings section tối thiểu trên protected `/dashboard`.
- Settings hiển thị tenant name, tenant slug, current user role và membership status.
- Đã thêm read-only members/roles summary từ existing auth context.
- Chưa implement invite/edit role APIs.
- Đã thêm Tenant API Keys panel dùng existing current-tenant APIs.
- `OWNER`/`ADMIN` có thể xem list, tạo và revoke tenant API keys từ UI.
- `OPERATOR`/`VIEWER` thấy read-only/access denied state cho API key management.
- Create form có `name`, scopes và optional `expiresAt`.
- Plaintext API key từ create response chỉ hiển thị một lần trong temporary component state.
- Plaintext API key được clear khi dismiss, refresh page hoặc component unmount.
- Không lưu tenant API key trong `localStorage` hoặc `sessionStorage`.
- Không `console.log` create API key response.
- List/revoke không hiển thị plaintext key hoặc `keyHash`.
- Revoke yêu cầu confirmation và refresh list sau khi hoàn tất.
- Đã thêm loading, empty, safe error, pending create/revoke và disabled states.
- Logout và existing Orders/Shipments dashboard behavior vẫn được giữ nguyên.
- Không implement carrier credential UI.
- Không implement tenant switcher.
- Không gọi external APIs.
- Không expose secrets, hashes, DB credentials, cookie values, raw session token hoặc carrier credentials.
- Runtime check pass: seeded admin session mở `/dashboard` và thấy Settings section.
- Runtime check pass: API key list loads qua `GET /api/tenants/current/api-keys`.
- Runtime check pass: create API key trả plaintext key một lần và safe record.
- Runtime check pass: subsequent list không trả plaintext key hoặc `keyHash`.
- Runtime check pass: revoke API key trả `REVOKED` và list refresh phản ánh trạng thái revoke.
- Runtime check pass: logout vẫn hoạt động.
- Seeded admin login API smoke test chưa pass vì `DEV_ADMIN_PASSWORD` hiện tại không đạt `MIN_PASSWORD_LENGTH` 12 ký tự; runtime UI/API checks dùng temporary DB-backed session thay thế và không in password/cookie.
- Source check pass: settings component không dùng `localStorage`, `sessionStorage` hoặc `console.log`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-061 — Tenant Members Management APIs

- User xác nhận `V2-061` đã thành công và được đánh dấu `Done`.
- Đã thêm `GET /api/tenants/current/members`.
- Đã thêm `PATCH /api/tenants/current/members/[membershipId]`.
- APIs yêu cầu authenticated dashboard session.
- APIs resolve default ACTIVE tenant từ session, không nhận client `tenantId`.
- `OWNER`/`ADMIN` có thể list/update members.
- `OPERATOR`/`VIEWER` bị deny ở service layer.
- List member response chỉ trả safe fields: membership id, user id, email, name, user status, role/status và timestamps.
- Không trả `passwordHash`, `tokenHash`, session data, API key hashes hoặc secrets.
- Update role/status chỉ hỗ trợ existing membership.
- Không implement add/invite member.
- Không implement invite email.
- Không implement delete member.
- Last ACTIVE OWNER protection được enforce.
- Self-lockout protection được enforce cho owner membership của chính actor.
- Role update ghi `AuditLog` action `MEMBER_ROLE_UPDATED`.
- Status update ghi `AuditLog` action `MEMBER_STATUS_UPDATED`.
- Audit metadata chỉ gồm membership id, target user id, previous value và next value.
- Runtime test pass: unauthenticated `GET /api/tenants/current/members` trả 401.
- Runtime test pass: seeded admin list tenant members.
- Runtime test pass: list response không có `passwordHash`, `tokenHash`, API key hashes hoặc secrets.
- Runtime test pass: OWNER update member role bằng temporary test membership.
- Runtime test pass: OWNER update member status bằng temporary test membership.
- Runtime test pass: OPERATOR bị deny member management với 403.
- Runtime test pass: self-lockout protection trả 409.
- Runtime test pass: cross-tenant membership update trả 404.
- Runtime test pass: last ACTIVE OWNER protection trả 409.
- Runtime test pass: audit logs created for role/status update and safe.
- Temporary runtime data cleanup: sessions, users, tenants, memberships và member audit logs đã được xóa.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-062 — Tenant Members UI

- User xác nhận `V2-062` đã thành công và được đánh dấu `Done`.
- Đã thêm Members panel trong existing Settings section.
- `OWNER`/`ADMIN` load member list qua `GET /api/tenants/current/members`.
- Members panel hiển thị safe fields: email, name, user status, role, membership status, created/updated time.
- `OPERATOR`/`VIEWER` thấy read-only/access-denied state.
- `OPERATOR`/`VIEWER` không có edit controls.
- Không thêm add/invite/delete/email flow.
- `OWNER`/`ADMIN` có role selector và status selector.
- Update role/status dùng `PATCH /api/tenants/current/members/:membershipId`.
- Bắt buộc confirmation trước khi apply update.
- Có pending state.
- Có success/error state.
- Refresh list sau update.
- Safe messages cho `401`, `403`, `404`, `409`.
- `409` last active OWNER/self-lockout được map sang safe message.
- Không bypass server authorization.
- Unauthenticated members list trả `401`.
- Seeded admin members list trả `200`.
- Role update test member trả `200`.
- Status update test member trả `200`.
- OPERATOR members list denial trả `403`.
- Self-lockout/last-owner protection trả `409`.
- Dashboard renders Members panel trả `200`.
- Existing Tenant API Keys list vẫn trả `200`.
- Logout vẫn hoạt động.
- Temporary runtime users/sessions/memberships đã cleanup.
- Không gọi external APIs.
- Không chạy production migrations.
- Không expose `passwordHash`, `tokenHash`, `keyHash`, session/API key secrets trong tested responses/page output.
- Source check không có `console.log`, `localStorage`, `sessionStorage` trong Settings component.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass sau khi xóa stale `.next` artifact.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-070 — Audit Log Viewer

- User xác nhận `V2-070` đã thành công và được đánh dấu `Done`.
- Đã thêm `GET /api/tenants/current/audit-logs`.
- Đã thêm audit repository/service tenant-scoped.
- Audit API hỗ trợ pagination và filters: page, pageSize, action, actorType, resourceType, from, to, sortOrder.
- Route handler mỏng: session/tenant context, query validation, service call, standard response.
- Đã thêm Audit Logs panel trong Settings.
- `OWNER`/`ADMIN` có thể xem audit logs.
- OPERATOR bị deny với `403`.
- Không accept hoặc trust client `tenantId`.
- UI hiển thị createdAt, action, actorType, resourceType, short resource/actor ids, safe metadata summary.
- Có action/resource/date filters.
- Có pagination.
- Có loading/empty/error states.
- Không implement audit export/download.
- Primitive safe metadata values có thể display.
- Nested objects/arrays được summarize.
- Suspicious keys được omitted/redacted và summarized qua `redactedFields`.
- Redaction test metadata pass.
- Nested metadata summary pass.
- Không leak `rawResponse`, `rawPayload`, `apiSecret`, `customerNo`, hash fields, session token, DB secrets hoặc test secret values.
- Unauthenticated audit list trả `401`.
- Seeded admin audit list trả `200`.
- Pagination với `pageSize=2` pass.
- `action` + `resourceType` filters pass.
- Dashboard renders Audit Logs panel trả `200`.
- Existing Members API trả `200`.
- Existing Tenant API Keys API trả `200`.
- Logout trả `200`.
- Temporary runtime sessions/users/memberships/audit logs đã cleanup.
- Không chạy migrations.
- Không gọi external APIs.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-071 — Audit Metadata Redaction Hardening

- User xác nhận `V2-071` đã thành công và được đánh dấu `Done`.
- Đã harden audit metadata sanitizer sau `V2-070`.
- Suspicious key detection bắt case/format variants: camelCase, snake_case và mixed case.
- Đã bổ sung key coverage cho token, secret, password, API key, key hash, auth header, cookie/session, raw response/payload, credentials, customer number, private/access/refresh token.
- Đã thêm value-level redaction cho `Bearer ...`, `Basic ...`, JWT-like strings, long opaque token-like strings, known API key prefix và connection-string-like values.
- Nested objects chỉ trả object summary với giới hạn safe keys.
- Arrays chỉ trả length summary, không trả raw values.
- Strings được giới hạn độ dài trước khi trả về.
- Metadata response dùng `redactedFieldsCount`, `redactedFieldCategories` và `omittedMetadataKeysCount`, không trả exact sensitive field names.
- Settings Audit Logs UI render summary labels an toàn cho hidden/omitted metadata.
- UI không render raw metadata bằng `JSON.stringify`.
- Runtime test tạo temporary audit log chứa safe primitives, nested object, array, suspicious keys và suspicious values.
- Unauthenticated audit list trả `401`.
- OPERATOR audit list trả `403`.
- OWNER/admin audit list trả `200`.
- Pagination/filter audit vẫn pass.
- Dashboard Audit Logs panel render pass.
- Existing Members API vẫn trả `200`.
- Existing Tenant API Keys API vẫn trả `200`.
- Logout vẫn trả `200`.
- Runtime response không leak suspicious keys/values, raw payload/response, bearer/basic/JWT/API key/connection string test values, hashes, DB credentials, cookie values hoặc secrets.
- Temporary runtime audit logs, sessions, user và membership đã cleanup.
- Không gọi external APIs.
- Không chạy migrations.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi dừng dev server tạm đang giữ Prisma engine DLL trên Windows.

### V2-080 — Test/Role Seed Hardening

- Đã bắt đầu `V2-080`.
- Đã kiểm tra safe DB target trước khi seed: host approved Supabase pooler, database `postgres`, schema `public`.
- Không in full DB URL, username, password hoặc secrets.
- Đã review `prisma/seed.ts`; seed trước đó chỉ tạo `admin@example.com` với role `OWNER`.
- Đã harden seed strategy để upsert deterministic tenant `internal-test`.
- Đã harden seed strategy để upsert stable role users:
  - `admin@example.com` — `OWNER`
  - `tenant-admin@example.com` — `ADMIN`
  - `operator@example.com` — `OPERATOR`
  - `viewer@example.com` — `VIEWER`
- Seed vẫn idempotent theo tenant slug, user email và unique `tenantId + userId`.
- Seed không reset database.
- Seed không delete existing/manual API keys hoặc dữ liệu thật.
- Seed không tạo tenant API keys.
- Password seed chỉ đọc từ env: `DEV_ADMIN_PASSWORD` và optional `DEV_TEST_PASSWORD`.
- Nếu `DEV_TEST_PASSWORD` thiếu, seed dùng `DEV_ADMIN_PASSWORD` hợp lệ cho role test users.
- Seed không in plaintext password hoặc `passwordHash`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `npm run prisma:seed` chưa chạy vì `.env` hiện có `DEV_ADMIN_PASSWORD` không đạt password policy 12 ký tự và chưa có `DEV_TEST_PASSWORD`.
- Runtime role matrix chưa chạy vì seed bị block bởi password env chưa hợp lệ.

### V2-080-RETRY — Run Role Seed And Permission Matrix

- User xác nhận `V2-080` đã thành công và được đánh dấu `Done`.
- Đã tiếp tục `V2-080` sau khi password env được cấu hình hợp lệ.
- Safe DB target check pass: approved Supabase pooler host, database `postgres`, schema `public`.
- Không in full DB URL, username, password hoặc secrets.
- `DEV_ADMIN_PASSWORD` present và valid length.
- `DEV_TEST_PASSWORD` present và valid length.
- Đã chạy `npm run prisma:seed` pass.
- Seed tạo/cập nhật tenant `internal-test`.
- Seed tạo/cập nhật `admin@example.com` role `OWNER`.
- Seed tạo/cập nhật `tenant-admin@example.com` role `ADMIN`.
- Seed tạo/cập nhật `operator@example.com` role `OPERATOR`.
- Seed tạo/cập nhật `viewer@example.com` role `VIEWER`.
- Seed không tạo tenant API keys.
- Đã chạy `npm run prisma:seed` lần hai để verify idempotency; không tạo duplicate users/memberships.
- Runtime auth matrix pass: `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER` login đều trả `200`.
- Runtime dashboard matrix pass: `/dashboard` trả `200` cho cả bốn role.
- Audit logs matrix pass: `OWNER`/`ADMIN` trả `200`, `OPERATOR`/`VIEWER` trả `403`.
- Tenant API keys matrix pass: `OWNER`/`ADMIN` list trả `200`, `OPERATOR`/`VIEWER` trả `403`.
- Members matrix pass: `OWNER`/`ADMIN` list trả `200`, `OPERATOR`/`VIEWER` trả `403`.
- Member update matrix pass: `OWNER`/`ADMIN` update existing memberships trả `200`, `OPERATOR`/`VIEWER` update trả `403`.
- Runtime responses không chứa `passwordHash`, `tokenHash`, `keyHash`, raw session token, DB credentials, `DEV_ADMIN_PASSWORD`, `DEV_TEST_PASSWORD` hoặc secrets.
- Runtime sessions được logout qua API sau matrix check.
- Local dev server tạm đã dừng và `.tmp-runtime` đã cleanup.
- Không reset database.
- Không delete real data.
- Không gọi external APIs.
- Không chạy production migrations.
- Không chạy `npm audit fix`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau retry vì lần đầu bị Windows EPERM tạm thời khi rename Prisma engine DLL.

### V2-090 — Production Readiness Review

- User xác nhận `V2-090` đã hoàn thành và được đánh dấu `Done`.
- Đã review governance docs, Prisma schema, env placeholders, migrations, current source tree và implemented platform APIs/UI.
- Đã review production readiness ở phạm vi review-only.
- Không implement feature mới.
- Không gọi YunExpress APIs.
- Không gọi external/carrier APIs.
- Không chạy production migrations.
- Không enable `YUN_OMS_LIVE_ENABLED`.
- Không tạo real/sandbox shipments.
- Không expose secrets.
- Environment baseline có `.env.example` đầy đủ cho app/auth/database/test seed/YunExpress placeholders; live flag mặc định `false`.
- Prisma schema validate pass; migrations hiện là additive domain foundation cho identity/tenant/order/shipment.
- Tenant isolation baseline tốt: business repositories/services nhận explicit `tenantId`, dashboard APIs resolve tenant từ session, portal APIs resolve tenant từ API key.
- RBAC baseline đã có stable role seed và matrix cho `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`.
- Auth/session baseline tốt nhưng vẫn thiếu rate limit/abuse guard, CSRF hardening, password reset và invite flow.
- YunExpress live safety baseline tốt: guarded adapter, preflight no-network, manual-only CreateOrderLabel rule; live/manual result vẫn chưa được cung cấp.
- Audit viewer và metadata redaction đã có, nhưng audit coverage chưa đầy đủ cho mọi security-sensitive flow như login failure/rate-limit events.
- Testing baseline pass bằng lint/typecheck/build/prisma, nhưng chưa có CI, unit/integration tests hoặc browser automation.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `npm audit --audit-level=moderate` fail với 2 moderate vulnerabilities từ `postcss <8.5.10` thông qua `next`; không chạy `npm audit fix`.
- Nền tảng hiện đủ để tiếp tục hardening trên staging nội bộ/restricted.
- Staging decision: `GO WITH RISKS` nếu staging là internal/restricted và không dùng production DB/secrets/live carrier.
- Production decision: `HOLD` vì còn thiếu P1 security, testing, deployment và carrier readiness gaps.

### V2-091 — Rate Limit, CSRF, And Abuse Guard Hardening

- User xác nhận `V2-091` đã thành công và được đánh dấu `Done`.
- Đã thêm standard error code `RATE_LIMITED`.
- Rate limit failure trả HTTP `429` với safe message.
- Đã thêm lightweight in-process rate limit foundation trong `src/shared/security`.
- Rate limit keys được hash trước khi lưu trong memory.
- Đã thêm `getClientIp`, `buildRateLimitKey`, `rateLimitOrThrow`, `assertSameOriginRequest`.
- Đã bảo vệ `POST /api/auth/login` theo IP và IP + normalized email.
- Đã bảo vệ `POST /api/portal/orders` bằng IP+route limiter trước API key verification và tenant/apiKey safe limiter sau verification.
- Đã bảo vệ tenant API key create/revoke, member update, shipment create/execute bằng userId + tenantId + route limiter.
- Đã thêm limiter cho shipment preflight GET vì endpoint có thể tốn tài nguyên.
- Đã thêm same-origin guard cho cookie-authenticated mutation APIs dựa trên `Origin` hoặc `Referer`.
- Same-origin guard không áp dụng cho `GET` routes.
- Same-origin guard không áp dụng cho Portal API key endpoint.
- Allowed origins lấy từ `APP_URL`, `NEXT_PUBLIC_APP_URL` và localhost dev origins khi `APP_ENV` là local/test/development.
- Đã document in-memory limiter limitation: per-instance, không phải distributed production-grade protection.
- Đã document production recommendation: Redis/Upstash/WAF/edge rate limit hoặc gateway-level controls.
- Không thêm dependency.
- Không gọi external/carrier/YunExpress APIs.
- Không bật YunExpress live mode.
- Không chạy production migrations.
- Không expose secrets.
- Runtime check pass: seeded admin login trước limit trả `200`.
- Runtime check pass: repeated invalid login eventually trả `429 RATE_LIMITED`.
- Runtime check pass: cookie-authenticated mutation với bad Origin trả `403`.
- Runtime check pass: same-origin tenant API key create trả `200`; plaintext key chỉ giữ trong runtime variable và không được in.
- Runtime check pass: Portal receive với valid temporary tenant API key dưới limit trả `200`.
- Runtime check pass: Portal receive thiếu API key trả `401`.
- Runtime check pass: same-origin tenant API key revoke trả `200`.
- Runtime check pass: `GET /api/tenants/current/api-keys` không bị CSRF guard chặn và trả `200`.
- Runtime check pass: valid same-origin logout trả `200`.
- Temporary tenant API key runtime check đã revoke sau test.
- Runtime response scan không thấy `passwordHash`, `tokenHash`, `keyHash`, raw session token, DB credentials hoặc dev password env names.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-092 — CI Verification Pipeline

- Đã kiểm tra repo chưa có `.github` hoặc CI config hiện có.
- Đã thêm `.github/workflows/ci.yml`.
- CI chạy trên `pull_request`.
- CI chạy trên push vào `main`.
- CI dùng Node.js 22 và `npm ci` với `package-lock.json`.
- CI dùng dummy env only: `APP_ENV=ci`, localhost app URLs, dummy PostgreSQL URL format, dummy session/pepper values, `YUN_OMS_LIVE_ENABLED=false`.
- CI không dùng Supabase DB thật, production DB, production secrets hoặc YunExpress credentials thật.
- CI không chạy migrations.
- CI không chạy seed.
- CI không gọi external APIs, carrier APIs hoặc YunExpress APIs.
- CI chạy `npm run lint`.
- CI chạy `npm run typecheck`.
- CI chạy `npm run build`.
- CI chạy `npm run prisma:validate`.
- CI chạy `npm run prisma:generate`.
- CI chạy `npm audit --audit-level=moderate` non-blocking do known moderate `postcss` issue qua `next`.
- Không chạy `npm audit fix`.
- Đã cập nhật docs deployment/env với CI dummy env, no migration/seed/no external API policy và non-blocking audit note.
- Local `npm run lint` pass.
- Local `npm run typecheck` pass.
- Local `npm run build` pass.
- Local `npm run prisma:validate` pass.
- Local `npm run prisma:generate` pass.
- Local `npm audit --audit-level=moderate` fail với 2 moderate vulnerabilities từ `postcss <8.5.10` qua `next`, đúng known issue; không chạy fix.
- Docs ghi `V2-095` cần xử lý dependency audit trước production readiness.
- User xác nhận V2-092 đã thành công và được đánh dấu Done.

### V2-093 — Production Deployment Checklist

- Đã tạo `docs/11_PRODUCTION_DEPLOYMENT_CHECKLIST.md`.
- Đã ghi staging decision hiện tại: GO WITH RISKS cho restricted/internal use.
- Đã ghi production decision hiện tại: HOLD cho tới khi P1 readiness gaps được xử lý.
- Đã thêm non-negotiable deployment rules: không dùng production DB sai môi trường, không in secrets, không chạy unsafe migration commands, không seed production, không gọi carrier APIs tự động.
- Đã thêm staging readiness checklist.
- Đã thêm staging smoke test checklist.
- Đã thêm production release gate.
- Đã thêm migration deployment checklist.
- Đã thêm rollback checklist.
- Đã thêm env/secrets checklist.
- Đã thêm carrier live safety checklist cho YunExpress manual-only flow.
- Đã thêm post-deploy/smoke expectations.
- Đã liệt kê remaining production blockers: dependency audit, backup/restore rehearsal, browser automation, DB integration tests, carrier credential model, manual live result verification, unsupported tracking/label/cancel/update-weight/rate methods, distributed limiter gap.
- Đã cập nhật `docs/09_DEPLOYMENT_AND_ENV.md` để tham chiếu checklist mới và giữ file này là env/deployment reference.
- Không implement product feature mới.
- Không chạy migrations.
- Không chạy seed.
- Không gọi external/carrier/YunExpress APIs.
- Không bật YunExpress live mode.
- Không tạo real/sandbox shipments.
- Không expose secrets.
- Không chạy `npm audit fix`.
- Không chạy build/tests vì task documentation-only.

### V2-094 — Backup/Restore Rehearsal Plan

- Đã tạo `docs/12_BACKUP_RESTORE_REHEARSAL.md`.
- Đã định nghĩa mục đích backup/restore rehearsal trước production database exposure.
- Đã ghi non-negotiable safety rules: không chạy backup/restore nếu chưa approved, không dùng production làm restore target, không restore vào MVP DB, không in DB URLs/secrets, không chạy seed/migrations ngoài phạm vi.
- Đã định nghĩa backup scope: schema, data, migration history, `_prisma_migrations`, migration files, env inventory không có values, app release version/commit.
- Đã thêm backup frequency recommendation cho staging và production.
- Đã thêm backup owner/approver/storage/retention/encryption/access-control placeholders.
- Đã document Supabase managed backups, Supabase dashboard export và `pg_dump` logical backup bằng placeholders only.
- Đã thêm backup verification checklist.
- Đã thêm restore rehearsal plan từng bước cho isolated target.
- Đã thêm safe validation commands list.
- Đã thêm functional smoke checks cho restored environment.
- Đã thêm critical data count checks cho tenants, users, memberships, API keys, orders, items, shipments và audit logs.
- Đã thêm restore validation checklist.
- Đã thêm pre-migration backup checklist.
- Đã thêm rollback integration notes.
- Đã cập nhật `docs/11_PRODUCTION_DEPLOYMENT_CHECKLIST.md` để tham chiếu rehearsal doc và làm rõ app rollback vs DB restore decision.
- Đã cập nhật `docs/09_DEPLOYMENT_AND_ENV.md` để tham chiếu rehearsal doc và yêu cầu restore rehearsal trước production DB exposure.
- Không chạy backup.
- Không chạy restore.
- Không connect production DB hoặc real Supabase DB.
- Không chạy migrations.
- Không chạy seed.
- Không gọi external APIs hoặc YunExpress APIs.
- Không expose DB URLs, credentials hoặc secrets.
- Không sửa app code.
- Không chạy `npm audit fix`.
- Verification chỉ dùng safe text checks.
- User xác nhận V2-094 đã thành công và được đánh dấu Done.

### V2-095 — Dependency Vulnerability Review

- Đã chạy `npm audit --audit-level=moderate`.
- Audit ban đầu fail với 2 moderate vulnerabilities.
- Vulnerable package là `postcss <8.5.10`.
- Advisory: `PostCSS has XSS via Unescaped </style> in its CSS Stringify Output`.
- Dependency path: direct `next@15.5.18` -> transitive `postcss@8.4.31`.
- `next` là direct dependency; `postcss` là transitive dependency.
- `npm audit fix --force` đề xuất `next@9.3.3`, bị reject vì là breaking downgrade.
- `npm outdated` cho thấy Next wanted vẫn là `15.5.18`, latest `16.2.6`, nhưng cả `next@15.5.18` và `next@16.2.6` đều khai báo `postcss@8.4.31`.
- Đã kiểm tra patched `postcss` version hiện có là `8.5.15`.
- Đã áp dụng minimal npm `overrides` cho `postcss@^8.5.15`.
- Đã chạy `npm install`, chỉ changed 1 package.
- `npm ls postcss` xác nhận `next@15.5.18` dùng `postcss@8.5.15`.
- `npm audit --audit-level=moderate` sau fix pass, found 0 vulnerabilities.
- Đã chuyển CI audit từ non-blocking sang blocking vì audit hiện sạch.
- Đã cập nhật dependency audit policy trong `docs/09_DEPLOYMENT_AND_ENV.md`.
- Đã cập nhật production release gate trong `docs/11_PRODUCTION_DEPLOYMENT_CHECKLIST.md`.
- Không chạy `npm audit fix`.
- Không chạy `npm audit fix --force`.
- Không downgrade Next.js.
- Không upgrade dependencies broadly.
- Không chạy migrations.
- Không gọi external/carrier/YunExpress APIs.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi dừng local `next dev` lock trên Prisma query engine.
- `npm audit --audit-level=moderate` pass.
- User xác nhận V2-095 đã thành công và được đánh dấu Done.

### V2-096 — Carrier Credential Model Design

- Đã tạo `docs/13_CARRIER_CREDENTIAL_MODEL.md`.
- Đã thiết kế goals cho tenant-scoped carrier credentials.
- Đã xác định no plaintext storage, no plaintext API responses, audited access/change, adapter/service boundary only.
- Đã thêm support design cho multiple carrier accounts per tenant và default account per tenant/carrier.
- Đã đề xuất future `CarrierAccount` model shape.
- Đã đề xuất future `CarrierCredential` model shape.
- Đã đề xuất enums `CarrierAccountStatus`, `CarrierCredentialStatus`, `CarrierCredentialType`.
- Đã tách credential storage strategy thành `secretRef` mode và `encryptedPayload` mode.
- `secretRef` mode được ghi là production-preferred.
- `encryptedPayload` mode được ghi là optional fallback sau khi có encryption/KMS decision.
- Đã document no plaintext credential storage, no decrypted API response, no plaintext secret in AuditLog/errors/logs.
- Đã document secret manager option và envelope encryption option.
- Đã thêm placeholder future `CARRIER_CREDENTIAL_MASTER_KEY` nếu chọn envelope encryption.
- Đã document key rotation, credential rotation và disaster recovery considerations.
- Đã define future service boundaries: list/get/create/update/disable account, save/rotate/validate credential, resolve carrier credentials.
- Đã define runtime resolver behavior cho `resolveCarrierCredentials(tenantId, carrierCode, carrierAccountId?)`.
- Đã define YunExpress OMS credential shape: `customerNo`, `apiSecret`, `baseUrl`, `lang`, default shipping/source/size config và `liveEnabled`.
- Đã ghi `liveEnabled` default false và không casually user-editable.
- Đã define validation policy: không tạo shipment, không gọi `CreateOrderLabel`, chỉ dùng safe non-creating endpoint nếu được approve.
- Đã define RBAC: OWNER/ADMIN manage, OPERATOR/VIEWER không view/manage secrets.
- Đã define audit events cho carrier account/credential create/update/disable/rotate/validate với safe metadata only.
- Đã define migration path từ env-level `YUN_OMS_*`: giữ env fallback tạm thời, không auto-migrate secrets, setup tenant credentials thủ công sau, deprecate env fallback cho production multi-tenant.
- Đã cập nhật architecture docs với carrier credential boundary.
- Đã cập nhật domain docs với planned `CarrierAccount`/`CarrierCredential`.
- Đã cập nhật security/tenancy docs với secretRef preferred, encryptedPayload fallback và adapter memory-only secrets.
- Đã cập nhật deployment/env docs với env fallback compatibility và future tenant credential resolver.
- Đã cập nhật production deployment checklist để carrier credential implementation vẫn là production gate.
- Không implement Prisma schema.
- Không tạo migrations.
- Không implement APIs/UI.
- Không gọi carrier/YunExpress APIs.
- Không bật YunExpress live mode.
- Không expose secrets.
- Verification chỉ dùng safe text checks.

### V2-097 — Carrier Credential Schema And Encryption Utilities

- User xác nhận V2-097 đã thành công và được đánh dấu Done.
- Safe DB target là approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`.
- Đã thêm enum `CarrierAccountStatus`.
- Đã thêm enum `CarrierCredentialStatus`.
- Đã thêm enum `CarrierCredentialType`.
- Đã thêm Prisma model `CarrierAccount`.
- Đã thêm Prisma model `CarrierCredential`.
- `CarrierAccount` và `CarrierCredential` đều tenant-scoped.
- `CarrierCredential` không có plaintext credential field.
- `secretRef` là reference-only metadata.
- `encryptedPayload` là ciphertext-only JSON.
- `keyPrefix` là safe display metadata.
- Đã thêm migration `20260521150000_v2_097_carrier_credentials`.
- Đã apply migration vào approved Supabase test DB host.
- `npx prisma migrate status` báo database schema up to date.
- Đã thêm AES-256-GCM encryption utilities cho carrier credentials.
- Master key đọc từ `CARRIER_CREDENTIAL_MASTER_KEY`.
- Không print master key, encrypted payload hoặc credential values.
- Encrypted payload lưu algorithm/version, IV, auth tag và ciphertext.
- Đã thêm `buildCredentialKeyPrefix` hash-derived prefix.
- Đã thêm internal carrier repository/service foundation.
- Đã thêm `listCarrierAccounts`.
- Đã thêm `getCarrierAccountSummary`.
- Đã thêm `getDefaultCarrierAccount`.
- Đã thêm `getCarrierCredentialSummary`.
- Đã thêm `resolveCarrierCredentials`.
- Summary functions không trả plaintext, `secretRef` hoặc `encryptedPayload`.
- Resolver decrypt chỉ server-side/in-memory.
- Resolver hỗ trợ temporary `YUNEXPRESS_OMS` env fallback cho internal/staging compatibility.
- Encryption roundtrip với dummy in-process key pass.
- Missing encryption key trả controlled `CARRIER_ERROR` pass.
- Temporary DB-backed carrier account/credential summary và resolver check pass.
- Temporary test account cleanup verified 0 remaining.
- Không thêm public carrier credential APIs.
- Không thêm carrier credential UI.
- Không migrate existing env secrets.
- Không gọi carrier/YunExpress APIs.
- Không bật YunExpress live mode.
- `.env.example` đã thêm `CARRIER_CREDENTIAL_MASTER_KEY`, `CARRIER_CREDENTIAL_ENCRYPTION_VERSION`, `CARRIER_CREDENTIAL_KEY_VERSION`.
- Docs đã cập nhật domain, security/tenancy, deployment/env và API contract internal note.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi dừng local `next dev` lock.
- `npx prisma format` pass.
- `npx prisma migrate deploy` pass.
- `npx prisma migrate status` pass.
- `git diff --check` chỉ reported existing README line-ending warning.

### V2-098 — Carrier Credential Management APIs

- User xác nhận V2-098 đã thành công và được đánh dấu Done.
- Safe DB target check dùng approved Supabase pooler host.
- Đã thêm `GET /api/tenants/current/carrier-accounts`.
- Đã thêm `POST /api/tenants/current/carrier-accounts`.
- Đã thêm `GET /api/tenants/current/carrier-accounts/:carrierAccountId`.
- Đã thêm `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId`.
- Đã thêm `POST /api/tenants/current/carrier-accounts/:carrierAccountId/credentials`.
- Đã thêm `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId/credentials/:credentialId/disable`.
- APIs resolve default ACTIVE tenant từ dashboard session.
- Không accept hoặc trust client `tenantId`.
- OWNER/ADMIN có thể manage carrier accounts và credentials.
- OPERATOR/VIEWER bị deny với 403.
- Route handlers giữ mỏng: auth/context, same-origin/rate-limit guard, validation, service call, response.
- Carrier service sở hữu validation, RBAC, encryption workflow và audit.
- Carrier repository sở hữu DB access.
- `carrierCode` validate qua known carrier registry.
- `displayName`, `status`, `isDefault`, `credentialType`, `mode`, URL và safe strings đều được validate.
- `encryptedPayload` mode yêu cầu `CARRIER_CREDENTIAL_MASTER_KEY`.
- Credentials được encrypt bằng AES-256-GCM utilities.
- DB chỉ lưu ciphertext hoặc `secretRef`.
- Public responses không trả plaintext credentials, raw `secretRef`, `encryptedPayload`, decrypted payload hoặc master key.
- `secretRef` mode lưu reference-only và public response chỉ trả safe `keyPrefix`.
- Disable credential set status `DISABLED`, không physical delete.
- Đã ghi AuditLog `CARRIER_ACCOUNT_CREATED`.
- Đã ghi AuditLog `CARRIER_ACCOUNT_UPDATED`.
- Đã ghi AuditLog `CARRIER_CREDENTIAL_CREATED`.
- Đã ghi AuditLog `CARRIER_CREDENTIAL_UPDATED` khi rotate active credential cũ.
- Đã ghi AuditLog `CARRIER_CREDENTIAL_DISABLED`.
- Audit metadata chỉ gồm safe carrier/account/credential/status/keyPrefix metadata.
- OWNER/ADMIN list/create/update runtime checks pass.
- OPERATOR/VIEWER denial runtime checks pass.
- Encrypted credential save runtime check pass.
- `secretRef` save runtime check pass và raw `secretRef` không xuất hiện trong response.
- Disable credential runtime check pass.
- Missing encryption key returns controlled `CARRIER_ERROR` pass.
- Resolver decrypt server-side với dummy key pass trong tenant tạm.
- Audit metadata no-secret checks pass.
- Temporary carrier accounts, tenant, memberships, sessions và audit logs đã cleanup.
- Không trả Authorization token.
- Không trả raw credential payload.
- Không in DB URL, credentials, cookies, API keys, master key, encrypted payload hoặc plaintext credential.
- Không gọi external/carrier/YunExpress APIs.
- Không enable live mode.
- Không tạo real/sandbox shipments.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `git diff --check` chỉ có existing README line-ending warning.

### V2-099 — Carrier Credential UI

- User xác nhận V2-099 đã thành công và được đánh dấu Done.
- Đã thêm Carrier Accounts panel trong dashboard Settings.
- OWNER/ADMIN có thể list/create/update carrier accounts.
- OWNER/ADMIN có thể save encrypted `YUNEXPRESS_OMS` credentials.
- OWNER/ADMIN có thể disable active credentials.
- OPERATOR/VIEWER thấy restricted state và không có credential controls.
- Existing Tenant Profile, API Keys, Members, Audit Logs vẫn được wired.
- Encrypted payload mode đã được implement trong UI.
- `apiSecret` dùng password input và `autocomplete=off`.
- Credential form clear sau successful submit.
- `apiSecret` clear khi save failure.
- `liveEnabled` default false.
- Khi `liveEnabled` enabled, UI hiển thị strong warning.
- SecretRef UI deferred as future work.
- OWNER login trả 200.
- Dashboard render với Carrier Accounts panel trả 200.
- Carrier account list/create/update trả 200.
- Encrypted credential save với dummy values trả 200.
- Credential disable trả 200.
- ADMIN carrier list trả 200.
- OPERATOR/VIEWER carrier list trả 403.
- Existing API Keys/Members/Audit Logs APIs trả 200.
- Logout trả 200.
- Temporary carrier account/credential test data cleaned up.
- Source scan không có `console.log`, `localStorage`, `sessionStorage`, hoặc `CreateOrderLabel` trong Settings components.
- Không gọi YunExpress/carrier APIs.
- Không enable live mode bởi Codex.
- Không tạo real/sandbox shipment.
- Tested responses/page output không có plaintext credentials, raw `secretRef`, `encryptedPayload`, master key, cookies, API keys, hashes, DB credentials hoặc secrets.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi stop stale local Next dev processes đang lock Prisma DLL.

### V2-100 — Carrier Credential Resolver Integration

- User xác nhận V2-100 đã thành công và được đánh dấu Done.
- Đã wire tenant-scoped carrier credential resolver vào `YUNEXPRESS_OMS` preflight và execute runtime path.
- Credential source priority: tenant active default `CarrierAccount` + active `CarrierCredential`, sau đó `YUN_OMS_*` env fallback, sau đó controlled `CARRIER_ERROR`/missing status.
- YunExpress adapter nhận resolved runtime credentials qua server-side carrier context trước khi fallback env.
- Decrypted credentials chỉ tồn tại server-side/in memory.
- Public preflight chỉ trả `credentialSource`, `credentialConfigured`, `liveEnabled`, safe env presence và mapping preview.
- Public preflight không trả customer number, API secret, raw `secretRef`, `encryptedPayload`, decrypted payload, master key hoặc Authorization token.
- Execute với tenant credential `liveEnabled=false` trả controlled 501 `CARRIER_ERROR`.
- Execute live-disabled không mutate `Shipment`.
- Execute live-disabled không tạo thêm `ShipmentStatusHistory`.
- Env fallback vẫn hoạt động khi không có tenant credential.
- Missing credential source trả safe preflight status `credentialSource=missing`, `credentialConfigured=false`.
- Runtime no-live checks dùng approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`.
- Temporary tenant/order/shipment/carrier credential test data đã cleanup, remaining V2-100 temp tenants = 0.
- Không gọi YunExpress APIs.
- Không gọi `CreateOrderLabel`.
- Không tạo real/sandbox shipment.
- Không enable live mode.
- Không in DB URL, credentials, decrypted credentials, encrypted payload, master key, raw secretRef, cookies, API keys hoặc secrets.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi stop stale local `next dev` processes đang lock Prisma DLL.

### V2-101 — YunExpress Tracking Adapter

- User xác nhận V2-101 đã thành công và được đánh dấu Done.
- Đã implement `YUNEXPRESS_OMS` `CarrierAdapter.getTracking`.
- Tracking lookup code path hỗ trợ `carrierShipmentId`/WayBillNumber, fallback `trackingNumber`, fallback `customerOrderNumber` qua `GetTrackingNumber`.
- Đã thêm YunExpress tracking client helpers cho:
  - `GET /api/Waybill/GetTrackingNumber`
  - `GET /api/Tracking/GetTrackInfo`
  - `GET /api/Tracking/GetTrackAllInfo`
  - `POST /api/Waybill/GetCarrier`
- `GetCarrier` dùng JSON array body trực tiếp.
- Đã thêm response types cho tracking number, track info/all info và carrier provider.
- Đã normalize `GetTrackingNumber` status `1`, `2`, `4`.
- Đã normalize `GetTrackAllInfo` events theo chronological order.
- Đã map `PackageState`/`TrackingStatus` sang normalized statuses: `TRACKING_PENDING`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`, `CANCELLED`, `RETURNED`, `UNKNOWN`.
- Đã normalize provider fields từ `GetCarrier`: carrier code, English/name fallback, website, phone.
- Adapter output không trả `rawResponse` mặc định.
- Không thêm public tracking sync endpoint.
- Không mutate Shipment DB trong task này.
- Mock/no-live adapter check pass với mocked `GetTrackingNumber`, `GetTrackAllInfo`, `GetCarrier`.
- Mock/no-live normalization checks pass cho delivered, exception, cancelled, returned, in-transit và tracking-number generating/failed cases.
- Không gọi YunExpress network.
- Không gọi `CreateOrderLabel`.
- Không tạo real/sandbox shipment.
- Không expose credentials, Authorization token, raw response, encrypted payload, secretRef, DB credentials, cookies, API keys hoặc secrets trong normalized output.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.

### V2-102 — Shipment Tracking Sync API

- User xác nhận V2-102 đã thành công và được đánh dấu Done.
- Đã thêm `POST /api/shipments/:shipmentId/tracking`.
- API yêu cầu authenticated dashboard session.
- API có same-origin guard.
- API có rate limit.
- API dùng tenant-scoped lookup.
- API resolve default ACTIVE tenant từ session.
- `OWNER`, `ADMIN`, `OPERATOR` được sync tracking.
- `VIEWER` bị deny.
- Route handler mỏng và dùng same-origin/rate-limit guard.
- Đã thêm `syncShipmentTracking(tenantId, shipmentId, actor)`.
- Service load shipment tenant-scoped và validate carrier/lookup keys.
- Service gọi `CarrierAdapter.getTracking` qua registered adapter.
- Runtime checks dùng mocked adapter/no-live path.
- Tracking sync save `trackingNumber` nếu adapter trả về và shipment chưa có.
- Tracking sync update shipment status theo normalized carrier status.
- `RETURNED` map sang `EXCEPTION` với safe note.
- `UNKNOWN` không downgrade current status, chỉ giữ early shipment ở `TRACKING_PENDING`.
- `ShipmentStatusHistory` chỉ được tạo khi status đổi.
- Không overwrite `labelUrl`.
- Đã thêm safe audit events `SHIPMENT_TRACKING_SYNCED` và `SHIPMENT_TRACKING_SYNC_FAILED`.
- Audit metadata chỉ có shipment id, carrier code, previous/next status, trackingNumberPresent và eventsCount.
- Không trả `rawResponse`.
- Không trả credentials, Authorization token, `secretRef`, `encryptedPayload`, decrypted payload, master key, DB credentials, cookies, API keys hoặc secrets.
- Không gọi YunExpress/external network trong automated checks.
- Không gọi `CreateOrderLabel`.
- Không tạo real/sandbox shipment.
- Mock adapter sync pass cho tracking pending, in transit, delivered, exception, returned, unknown.
- Không tạo duplicate status history khi status unchanged.
- Tracking number save verified.
- Audit creation verified.
- Temporary runtime tenant/order/shipment data cleaned up 0 remaining.
- HTTP RBAC smoke: OWNER/ADMIN/OPERATOR login OK và reached tenant-scoped 404 cho fake shipment.
- VIEWER got 403.
- Không có credentials, rawResponse, secretRef, encryptedPayload, decrypted payload, master key, cookies, API keys, DB URL hoặc secrets được print/return.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi stop stale local Next processes lock Prisma DLL trên Windows.

### V2-103 — Shipment Tracking UI Action

- Đã thêm manual `Sync tracking` action trong shipment detail.
- Tracking sync không auto-run khi page load, chọn shipment, refresh hoặc polling.
- Action chỉ enable khi shipment có carrier và lookup key: carrier shipment id/waybill, tracking number, order number hoặc external/customer order number.
- Nếu thiếu lookup key, UI hiển thị safe message yêu cầu waybill, tracking number hoặc customer order number.
- UI fetch `/api/auth/me` để xác định tenant role cho visibility/read-only state.
- `OWNER`, `ADMIN`, `OPERATOR` có thể trigger sync trong UX.
- `VIEWER` thấy disabled/read-only state.
- Button disabled khi role loading hoặc sync đang pending.
- Click explicit gọi `POST /api/shipments/:shipmentId/tracking`.
- Success refresh shipment list/detail qua refresh token.
- Success hiển thị safe summary gồm updated status, tracking number, latest event summary và eventsCount.
- Error mapping an toàn cho `401`, `403`, `404`, `429` và `CARRIER_ERROR`.
- Không render raw carrier response hoặc raw carrier payload.
- Không render credentials, Authorization token, `secretRef`, `encryptedPayload`, decrypted payload, master key, cookies, API keys, DB credentials hoặc secrets.
- Không gọi `CreateOrderLabel`.
- Không thêm carrier adapter method mới.
- Không gọi external/YunExpress APIs trong automated checks.
- OWNER/ADMIN/OPERATOR/VIEWER dashboard smoke passed.
- Không click sync against real adapter/network.
- Source checks confirmed explicit-click-only POST wiring.
- Source checks không thấy sensitive markers.
- Không có credentials, rawResponse, secretRef, encryptedPayload, decrypted payload, master key, cookies, API keys, DB credentials hoặc secrets exposed.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass sau khi stop stale Next process.


### V2-110 - Platform Admin Layer

- Added separate `PlatformAdmin` model.
- Added PlatformAdmin roles `PLATFORM_ADMIN` and `PLATFORM_SUPPORT`.
- Separated Platform Admin from tenant `OWNER`/`ADMIN`.
- Seed local/test assigns `admin@example.com` as `PLATFORM_ADMIN`.
- Added server guard `requirePlatformAdmin()`.
- Added `GET/POST /api/platform/tenants`.
- Added `GET/PATCH /api/platform/tenants/:tenantId`.
- Added `GET/POST /api/platform/tenants/:tenantId/members`.
- Added `PATCH /api/platform/tenants/:tenantId/members/:membershipId`.
- Added `GET /api/platform/audit-logs`.
- Added UI `/platform`.
- Added UI `/platform/tenants`.
- Added UI `/platform/tenants/:tenantId`.
- Added UI `/platform/audit-logs`.
- Platform admin can view/search tenants.
- Platform admin can create tenant + first owner.
- Platform admin can update tenant name/type/status.
- Platform admin can view/add/edit tenant members.
- Platform admin can view cross-tenant audit logs.
- Did not add impersonation.
- Did not call live carrier APIs.
- `npm run prisma:generate` pass.
- `npm run prisma:validate` pass.
- `npm run typecheck` pass.
- `npm run lint` pass.
- `npm run build` pass.
- `/platform/tenants` returns 307 when not logged in, matching protected route behavior.

### V2-110B - Apply Platform Admin Migration And Smoke Test

- User confirmed V2-110B successful.
- `APP_ENV` is `local`.
- `DATABASE_URL` points to approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- `DIRECT_URL` points to approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- `npx prisma migrate deploy` applied migration `20260525120000_v2_platform_admin`.
- `npx prisma migrate status --schema prisma/schema.prisma` confirmed database schema is up to date.
- Initial `migrate status` without explicit schema returned a generic schema engine error; retry with explicit schema passed.
- `npm run prisma:seed` pass.
- `admin@example.com` has `PLATFORM_ADMIN`.
- `admin@example.com` remains `OWNER` in `internal-test`.
- `tenant-admin@example.com` remains `ADMIN`.
- `operator@example.com` remains `OPERATOR`.
- `viewer@example.com` remains `VIEWER`.
- Unauthenticated `GET /api/platform/tenants` returned `401`.
- Admin `GET /api/platform/tenants` returned `200`.
- Admin `GET /api/platform/audit-logs` returned `200`.
- Admin tenant detail/members APIs returned `200`.
- Temp tenant create/detail/patch/members returned `200`.
- Temp tenant/user cleanup verified `0` remaining.
- Unauthenticated `/platform/tenants` returned `307 /login`.
- Admin `/platform` returned `307 /platform/tenants`.
- Admin `/platform/tenants` returned `200`.
- Admin `/platform/tenants/:tenantId` returned `200`.
- Admin `/platform/audit-logs` returned `200`.
- Logout returned `200`.
- `operator@example.com` login returned `200`.
- Operator `GET /api/platform/tenants` returned `403`.
- Operator `/platform/tenants` initially returned `500`; fixed to safe `404` denial behavior.
- No external APIs were called.
- No YunExpress APIs were called.
- No carrier live operations were called.
- No real/sandbox shipments were created.
- No secrets, cookies, session tokens, password hashes, full DB URLs, API keys, carrier credentials, `passwordHash`, `tokenHash`, or `keyHash` were printed.
- `npm run prisma:validate` pass.
- `npm run prisma:generate` pass.
- `npx prisma migrate deploy` pass.
- `npx prisma migrate status --schema prisma/schema.prisma` pass.
- `npm run prisma:seed` pass.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.
- Final `npm run prisma:validate` pass.
- Final `npm run prisma:generate` pass.

### V2-111 - Platform Admin Tenant Creation UX Hardening

- User confirmed V2-111 successful.
- Đã harden Platform Admin create tenant UX.
- Đã thêm client validation.
- Đã thêm inline errors.
- Đã thêm first-invalid-field focus.
- Đã thêm slug helper/preview.
- Đã thêm status select.
- Đã thêm owner behavior explanation.
- Đã thêm pending state.
- Đã thêm double-submit guard.
- Đã clear password sau success/failure.
- Success now refreshes and navigates to created tenant detail.
- Đã thêm safe mapping cho owner-password-required.
- Đã thêm safe mapping cho validation.
- Đã thêm safe mapping cho conflict/duplicate slug.
- Đã thêm safe mapping cho auth/permission.
- Đã thêm safe mapping cho generic errors.
- Fixed duplicate slug path trả safe `409 CONFLICT` thay vì `500`.
- Admin login trả `200`.
- Missing owner password trả `400 VALIDATION_ERROR`.
- Temp tenant create trả `200`.
- Duplicate slug trả `409 CONFLICT`.
- `/platform/tenants` trả `200`.
- `/platform/tenants/:tenantId` trả `200`.
- `/platform/audit-logs` trả `200`.
- Operator platform API trả `403`.
- Cleanup verified `0` temp tenants/users remaining.
- Không chạy migrations.
- Không gọi external APIs.
- Không gọi YunExpress APIs.
- Không gọi carrier live operations.
- Không tạo shipment.
- Không in secrets, cookies, session tokens, password hashes, full DB URLs, API keys, carrier credentials, `passwordHash`, `tokenHash` hoặc `keyHash`.
- `npm run lint` pass.
- `npm run typecheck` pass.
- `npm run build` pass.

### V2-112 - Platform Admin Authorization Matrix

- Audited platform API route handlers and confirmed each `/api/platform/*` handler calls the platform guard.
- Audited platform UI layout and confirmed authenticated non-platform denial uses safe `404` behavior instead of unsafe `500`.
- Confirmed platform admin guard is separate from tenant `OWNER`/`ADMIN` membership checks.
- Documented expected platform authorization matrix in `docs/06_SECURITY_AND_TENANCY.md`.
- Documented `PLATFORM_SUPPORT` as currently unsupported and denied by design.
- Safe DB target summary: `APP_ENV=local`, approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Unauthenticated `GET /api/platform/tenants` returned `401`.
- Unauthenticated `/platform/tenants` returned `307` redirect to `/login`.
- `PLATFORM_ADMIN` `GET /api/platform/tenants` returned `200`.
- `PLATFORM_ADMIN` `GET /api/platform/audit-logs` returned `200`.
- `PLATFORM_ADMIN` tenant detail and members APIs returned `200`.
- `PLATFORM_ADMIN` temp tenant create/detail/patch/members/member create/member patch returned `200`.
- `PLATFORM_ADMIN` `/platform` returned `307` redirect to `/platform/tenants`.
- `PLATFORM_ADMIN` `/platform/tenants`, `/platform/tenants/:tenantId`, and `/platform/audit-logs` returned `200`.
- Tenant `ADMIN` only, `OPERATOR`, `VIEWER`, and temp tenant `OWNER` only users received `403` from platform API.
- Tenant `ADMIN` only, `OPERATOR`, `VIEWER`, and temp tenant `OWNER` only users received safe `404` platform UI denial.
- Temp `PLATFORM_SUPPORT` user received `403` from platform read and mutation APIs.
- Temp `PLATFORM_SUPPORT` user received safe `404` platform UI denial.
- Temp tenant and temp users cleanup verified `0` remaining.
- No migrations were run.
- No external APIs were called.
- No YunExpress APIs were called.
- No carrier live operations were called.
- No real or sandbox shipments were created.
- No secrets, cookies, session tokens, password hashes, full DB URLs, API keys, carrier credentials, `passwordHash`, `tokenHash`, or `keyHash` were printed.
- `npm run lint` pass with pre-existing `Topbar.tsx` unused-variable warnings.
- `npm run typecheck` pass.
- `npm run build` pass with the same pre-existing `Topbar.tsx` unused-variable warnings.

### V2-113 - Platform Support Read-Only Policy

- User confirmed V2-113 successful.
- `PLATFORM_SUPPORT` hiện được phép read-only trên Platform Console.
- `PLATFORM_SUPPORT` được phép `GET /api/platform/tenants`.
- `PLATFORM_SUPPORT` được phép `GET /api/platform/audit-logs`.
- `PLATFORM_SUPPORT` được phép `GET /api/platform/tenants/:tenantId`.
- `PLATFORM_SUPPORT` được phép `GET /api/platform/tenants/:tenantId/members`.
- `PLATFORM_SUPPORT` truy cập được `/platform/tenants`.
- `PLATFORM_SUPPORT` truy cập được tenant detail.
- `PLATFORM_SUPPORT` truy cập được audit logs.
- `PLATFORM_SUPPORT` bị deny create tenant.
- `PLATFORM_SUPPORT` bị deny update tenant.
- `PLATFORM_SUPPORT` bị deny add/update members.
- UI support không còn thấy mutation controls như Create tenant, edit tenant profile, add/save member.
- `PLATFORM_ADMIN` vẫn giữ toàn quyền như trước.
- Tenant roles vẫn không vào được platform console/API.
- Runtime smoke pass.
- Temp support/tenant test data cleanup verified `0` remaining.
- Không chạy migration.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không gọi carrier live operations.
- Không tạo shipment thật/sandbox.
- Không in secrets, cookies, session tokens, full DB URL, password/API key/credential/hash.
- `npm run lint` pass với warning cũ ở `src/components/layout/Topbar.tsx`.
- `npm run typecheck` pass.
- `npm run build` pass với warning cũ ở `Topbar.tsx`.

### V2-114 - Platform Admin Tenant Detail UX Hardening

- User confirmed V2-114 successful.
- Đã harden tenant summary display.
- Tenant detail hiển thị name, slug, type, status, createdAt, updatedAt.
- Tenant detail hiển thị member count, owner count, order count, shipment count, carrier count.
- Đã thêm tenant detail skeleton.
- Đã thêm members empty state.
- Đã thêm safe retry/error behavior.
- Đã thêm inline validation.
- Đã thêm first-invalid-field focus.
- Đã thêm pending states.
- Đã thêm double-submit guards.
- `PLATFORM_SUPPORT` read-only note được hiển thị.
- `PLATFORM_SUPPORT` không thấy tenant/member mutation controls.
- Server-side mutation denial cho `PLATFORM_SUPPORT` vẫn giữ nguyên.
- `PLATFORM_ADMIN` tenant profile edit validate name/type/status.
- `PLATFORM_ADMIN` phải confirm trước khi set tenant status `DISABLED`.
- Member add validate email/name/password/role/status.
- Member add clears password after success/failure.
- Member role/status update yêu cầu confirmation.
- Duplicate platform member create map an toàn sang `409 CONFLICT`.
- Không chạy migrations.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipment.
- Không in/lưu secrets, cookies, session tokens, full DB URLs, passwords, hashes.
- `npm run lint` pass với existing `Topbar.tsx` unused-variable warnings.
- `npm run typecheck` pass.
- `npm run build` pass với same existing warnings.

### V2-115 - Platform Admin Browser Regression Automation

- User confirmed V2-115 successful.
- Đã thêm Playwright dev dependency.
- Đã thêm `npm run test:platform`.
- Đã thêm `playwright.platform.config.ts`.
- Đã thêm `tests/platform/*`.
- Browser tests cover unauth redirect.
- Browser tests cover Platform Admin controls.
- Browser tests cover Platform Support read-only UI.
- Browser tests cover support mutation API `403`.
- Browser tests cover tenant operator API `403`.
- Browser tests cover operator/viewer safe `404` UI denial.
- Đã thêm safe DB precheck, chỉ print host/database/schema.
- Đã thêm temporary Platform Support test user setup and teardown.
- Added page auth helper để platform page denial dùng safe redirect/notFound thay vì AppError stack output.
- `npm run lint` pass với existing `Topbar.tsx` unused-variable warnings.
- `npm run typecheck` pass.
- `npm run build` pass với same existing warnings.
- `npm run test:platform` pass: `5` passed, `0` failed.
- Cleanup verified `remainingPlatformSupportBrowserTestUsers: 0`.
- Không chạy migrations.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipments.
- Không in full DB URLs, passwords, cookies, session tokens, hashes, API keys hoặc credentials.
- Không hardcode test passwords; browser tests đọc từ `DEV_ADMIN_PASSWORD` / `DEV_TEST_PASSWORD`.
- Added dependency `@playwright/test@1.60.0`.
- Chưa thêm `test:platform` vào CI blocking.

### V2-116 - Platform Admin Browser Regression CI Hardening

- Audited current `.github/workflows/ci.yml`.
- Confirmed core CI runs on pull request and push to `main`.
- Confirmed core CI uses dummy DB URLs and must not run `test:platform`.
- Confirmed current CI does not install Playwright browser binaries.
- Chose Option B: add a separate manual/non-blocking workflow.
- Did not add `test:platform` to pull request or push CI.
- Added `.github/workflows/platform-browser-regression.yml`.
- Workflow uses `workflow_dispatch` only.
- Workflow requires confirmation input `APPROVED_TEST_DB`.
- Workflow uses GitHub secrets by name for approved test DB and test passwords.
- Workflow does not print full DB URLs, passwords, cookies, session tokens, hashes, API keys, or credentials.
- Workflow does not run migrations.
- Workflow installs Playwright Chromium for GitHub runner.
- Updated `playwright.platform.config.ts` so local defaults to system Chrome while CI can use installed Chromium without a fixed Chrome channel.
- Hardened browser test temp support user to use a unique email per run.
- Added browser test state file under ignored `test-results`.
- Teardown deletes temp support users by generated email and browser-test prefix.
- Updated `README.md` and `docs/09_DEPLOYMENT_AND_ENV.md` with manual workflow policy, required secrets, no-production warning, dummy-DB warning, and non-blocking status.
- Local safe DB target: approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Local `npm run test:platform` pass: `5` passed, `0` failed.
- Cleanup verified `remainingPlatformSupportBrowserTestUsers: 0`.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, or carrier credentials.
- `npm run lint` pass with existing `Topbar.tsx` unused-variable warnings.
- `npm run typecheck` pass.
- `npm run build` pass with same existing warnings.
- User deferred further CI/CD continuation for now.
- V2-116B manual platform browser workflow run is deferred.
- Browser regression remains local/manual via `npm run test:platform`.
- GitHub Actions workflow does not need to run now.
- `test:platform` remains non-blocking for PR/push.
- No workflow changes were made in this status update.
- No build/tests were run because this is docs/status-only.

### V2-117 - Platform Admin Audit Coverage

- User confirmed V2-117 successful.
- Đã harden Platform Admin audit coverage cho mutation actions.
- Đã thêm/xác nhận `PLATFORM_TENANT_CREATED`.
- Đã thêm/xác nhận `PLATFORM_TENANT_UPDATED`.
- Đã thêm/xác nhận `PLATFORM_TENANT_MEMBER_ADDED`.
- Đã thêm/xác nhận `PLATFORM_TENANT_MEMBER_UPDATED`.
- Đã đổi member audit event từ `PLATFORM_MEMBER_*` sang `PLATFORM_TENANT_MEMBER_*`.
- Đã loại `ownerEmail` khỏi audit metadata create tenant.
- Audit metadata chỉ còn safe fields: `targetTenantId`, `targetTenantSlug`, `targetMembershipId`, `targetUserId`, role/status transition, `actorPlatformRole`, `result`.
- Đã document policy: platform reads không audit mặc định.
- Denied-access telemetry defer sang task sau.
- Runtime verification dùng approved DB host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Đã tạo temp tenant, update tenant, add member, update member.
- Verify đủ 4 audit logs.
- Verify platform read actions không tạo thêm mutation audit logs.
- Verify metadata không chứa sensitive-looking fields.
- Cleanup pass: `remainingTenants=0`, `remainingUsers=0`, `remainingAuditLogs=0`.
- Không chạy migration.
- Không đổi CI/CD.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipment.
- Không in secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys hoặc carrier credentials.
- `npm run typecheck` pass.
- `npm run lint` pass với 3 warning cũ ở `Topbar.tsx`.
- `npm run build` pass với cùng warning cũ.
- Audited platform service mutation audit coverage.
- Confirmed platform read actions stay non-audited by default to avoid noisy audit logs.
- Confirmed route handlers remain thin and delegate platform mutations to services.
- Confirmed platform audit log listing sanitizes metadata before API/UI response.
- Confirmed `SafeMetadataViewer` still applies recursive UI redaction.
- Hardened tenant create audit metadata to remove owner email and use safe target fields.
- Hardened tenant update audit metadata to use target tenant and transition fields.
- Renamed member add audit event to `PLATFORM_TENANT_MEMBER_ADDED`.
- Renamed member update audit event to `PLATFORM_TENANT_MEMBER_UPDATED`.
- Member audit metadata now uses `targetTenantId`, `targetMembershipId`, `targetUserId`, role/status transitions, `actorPlatformRole`, and `result`.
- Added platform audit policy notes to `docs/06_SECURITY_AND_TENANCY.md`.
- Runtime smoke used approved local/test DB only.
- Runtime smoke created a temporary tenant.
- Runtime smoke verified `PLATFORM_TENANT_CREATED`.
- Runtime smoke verified `PLATFORM_TENANT_UPDATED`.
- Runtime smoke added a temporary tenant member.
- Runtime smoke verified `PLATFORM_TENANT_MEMBER_ADDED`.
- Runtime smoke updated the temporary tenant member.
- Runtime smoke verified `PLATFORM_TENANT_MEMBER_UPDATED`.
- Runtime smoke verified platform read actions did not create extra mutation audit logs.
- Runtime smoke verified audit metadata did not contain sensitive-looking fields.
- Runtime cleanup verified `remainingTenants=0`, `remainingUsers=0`, `remainingAuditLogs=0`.
- Did not run migrations.
- Did not change CI/CD.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, or carrier credentials.
- `npm run typecheck` pass.
- `npm run lint` pass with existing `Topbar.tsx` unused-variable warnings.
- `npm run build` pass with same existing warnings.

### V2-118 - Platform Admin Audit Denied Access Telemetry

- User confirmed V2-118 successful.
- Đã implement `PLATFORM_ACCESS_DENIED` cho authenticated non-platform users hitting Platform APIs.
- Đã implement `PLATFORM_MUTATION_DENIED` cho `PLATFORM_SUPPORT` mutation attempts.
- Không audit unauthenticated platform access.
- Không audit successful platform reads.
- Không audit normal support read-only access.
- Không audit safe platform UI `404` denial by default.
- Telemetry dùng existing rate-limit helper.
- Telemetry writes at most once per denied helper path.
- Telemetry failures được swallow để request behavior không đổi.
- Metadata chỉ gồm safe fields: `routeGroup`, `method`, `reasonCode`, `actorPlatformRole`, `result`.
- Runtime smoke dùng approved DB host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Unauth platform API trả `401`, no telemetry.
- Operator platform API trả `403`, exactly one `PLATFORM_ACCESS_DENIED`.
- Viewer platform UI safe `404`, no API denied telemetry.
- Support mutation trả `403`, exactly one `PLATFORM_MUTATION_DENIED`.
- Support read trả `200`, no denied telemetry.
- Admin read trả `200`, no denied telemetry.
- Cleanup pass: `remainingSupportUsers=0`, `remainingAuditLogs=0`.
- Không chạy migrations.
- Không đổi CI/CD.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipments.
- Không in secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, carrier credentials.
- `npm run typecheck` pass.
- `npm run lint` pass với existing 3 `Topbar.tsx` warnings.
- `npm run build` pass với same warnings.
- Defined denied telemetry policy for Platform Admin access.
- Authenticated non-platform users attempting Platform APIs now write `PLATFORM_ACCESS_DENIED`.
- `PLATFORM_SUPPORT` mutation attempts now write `PLATFORM_MUTATION_DENIED`.
- Unauthenticated platform access is not audited by default.
- Successful platform reads are not audited.
- Normal `PLATFORM_SUPPORT` read-only access is not audited.
- Safe platform UI denial pages remain safe `404` and are not audited by default.
- Denied telemetry is rate-limit aware and skips logging when the telemetry key is over limit.
- Denied telemetry is recorded once per denied helper path.
- Telemetry failure is swallowed and never changes request behavior.
- Added safe metadata fields only: `routeGroup`, `method`, `reasonCode`, `actorPlatformRole`, and `result`.
- Did not log request bodies, query secrets, headers, cookies, Authorization, session tokens, emails, raw errors, DB URLs, hashes, API keys, carrier credentials, raw payloads, or raw responses.
- Kept route handlers thin; platform API route handlers only pass `Request` and route group into shared guard helpers.
- Added policy documentation to `docs/06_SECURITY_AND_TENANCY.md`.
- Runtime smoke used approved local/test DB only.
- Runtime smoke safe DB target: host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Runtime smoke verified unauthenticated platform API returns `401` and writes no denied telemetry.
- Runtime smoke verified tenant `OPERATOR` platform API denial returns `403` and writes exactly one `PLATFORM_ACCESS_DENIED`.
- Runtime smoke verified tenant `VIEWER` platform UI denial returns safe `404` and writes no API denied telemetry.
- Runtime smoke verified `PLATFORM_SUPPORT` mutation denial returns `403` and writes exactly one `PLATFORM_MUTATION_DENIED`.
- Runtime smoke verified `PLATFORM_SUPPORT` platform read returns `200` and writes no denied telemetry.
- Runtime smoke verified `PLATFORM_ADMIN` platform read returns `200` and writes no denied telemetry.
- Runtime smoke verified denied telemetry metadata contains no sensitive-looking fields.
- Runtime cleanup verified `remainingSupportUsers=0`, `remainingAuditLogs=0`.
- Did not run migrations.
- Did not change CI/CD.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, or carrier credentials.
- `npm run typecheck` pass.
- `npm run lint` pass with existing 3 `Topbar.tsx` unused-variable warnings.
- `npm run build` pass with the same existing warnings.

### V2-119 - Platform Admin Audit Log Filtering UX Hardening

- User confirmed V2-119 successful.
- Đã harden `/platform/audit-logs` UX.
- Đã thêm quick presets: All, Mutations, Denied Access.
- Đã thêm filters: action, actor type, resource type, tenant ID, from/to date.
- Filters sync vào URL search params để deep-link được.
- Đã thêm action pills.
- Đã thêm friendly labels/descriptions.
- Đã highlight denied telemetry.
- Metadata vẫn đi qua `SafeMetadataViewer`.
- Không render raw JSON.
- `SafeMetadataViewer` hiện truncate string dài.
- `SafeMetadataViewer` giới hạn object/array entries để tránh UI phình hoặc leak dữ liệu dài không cần thiết.
- Không đổi API contract.
- Không chạy migration.
- Không đổi CI/CD.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipment.
- `npm run lint` pass với 3 warning cũ ở `Topbar.tsx`.
- `npm run build` pass với cùng 3 warning cũ.
- `npm run typecheck` pass sau khi build regenerate `.next/types`.
- Lần typecheck đầu fail do `.next/types` stale/missing trước build, không phải lỗi code.
- Current task set to `V2-119 - Platform Admin Audit Log Filtering UX Hardening`.
- Hardened `/platform/audit-logs` filter UX.
- Added quick presets: All, Mutations, Denied Access.
- Added exact action filter for platform mutation and denied telemetry events.
- Added actor type, resource type, tenant ID, from date, and to date filters using existing API query support.
- Added URL search params for deep-linkable audit filters.
- Added clear filters action.
- Added friendly action labels and descriptions.
- Added visual action pills for mutation and denied access events.
- Added denied access highlight for `PLATFORM_ACCESS_DENIED` and `PLATFORM_MUTATION_DENIED`.
- Kept metadata rendering behind `SafeMetadataViewer`.
- Hardened `SafeMetadataViewer` with string truncation and bounded object/array rendering.
- Did not render raw metadata with `JSON.stringify`.
- Did not change API contract.
- Did not run migrations.
- Did not change CI/CD.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, carrier credentials, raw payloads, or raw responses.
- `npm run lint` pass with existing 3 `Topbar.tsx` warnings.
- Initial `npm run typecheck` failed because `.next/types` references were stale/missing before build.
- `npm run build` pass with existing 3 `Topbar.tsx` warnings and regenerated `.next/types`.
- Final `npm run typecheck` pass.

### V2-120 - Platform Admin Audit Log Runtime Regression

- User confirmed V2-120 successful.
- Đã thêm runtime/browser regression coverage cho `/platform/audit-logs`.
- Test setup tạo temporary safe audit rows với prefix `PLATFORM-AUDIT-RUNTIME-*`.
- Đã cover mutation preset.
- Đã cover denied preset.
- Đã cover exact action filter.
- Đã cover resource type filter.
- Đã cover tenant ID filter.
- Đã cover date range filter.
- Đã cover URL params.
- Đã cover clear filters.
- Đã cover metadata safety.
- Đã cover support read-only access.
- Đã cover tenant-user denial.
- Đã update audit date filter request values để `to` includes full selected day.
- Test login helper hiện authenticate qua `POST /api/auth/login` request context.
- Tránh credentials trong URL form-submit fallback.
- Safe DB target là `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Targeted audit-log browser test pass.
- Full `npm run test:platform` trên isolated `PLATFORM_TEST_PORT=3013` pass: `7 passed`, `0 failed`.
- Cleanup verified: `remainingAuditLogs=0`, `remainingSupportUsers=0`.
- Không chạy migrations.
- Không đổi CI/CD.
- Không gọi external APIs.
- Không gọi YunExpress/carrier APIs.
- Không tạo shipments.
- Không in secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, credentials, raw payloads hoặc raw responses.
- `npm run typecheck` pass.
- `npm run lint` pass với existing 3 `Topbar.tsx` warnings.
- `npm run build` pass với same existing warnings.
- Current task set to `V2-120 - Platform Admin Audit Log Runtime Regression`.
- Added browser regression coverage for `/platform/audit-logs` filters.
- Extended platform browser test setup with temporary audit marker `PLATFORM-AUDIT-RUNTIME-*`.
- Created temporary safe audit rows for platform mutation events.
- Created temporary safe audit rows for denied telemetry events.
- Verified safe DB target before browser runtime: host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Verified `PLATFORM_ADMIN` can view tenants, tenant detail, and audit logs.
- Verified `PLATFORM_SUPPORT` can view audit logs read-only.
- Verified tenant `VIEWER` cannot view platform audit logs and receives safe `404`.
- Verified unauthenticated platform page redirect behavior remains safe.
- Verified quick preset `Mutations` shows mutation audit events.
- Verified quick preset `Denied Access` shows denied telemetry events.
- Verified exact action filter for `PLATFORM_TENANT_CREATED`.
- Verified resource type, tenant ID, and from/to date filters for audit logs.
- Verified URL search params update for deep-linkable filters.
- Verified clear filters resets `/platform/audit-logs`.
- Verified metadata remains behind `SafeMetadataViewer`.
- Verified metadata display does not expose sensitive-looking text patterns covered by platform browser tests.
- Updated browser login helper to authenticate through `POST /api/auth/login` request context so credentials are never submitted into the login URL.
- Adjusted runtime selector strategy to use stable tenant ID and visible audit rows.
- Ran targeted audit-log browser test on isolated test port `3012`: pass.
- Ran full `npm run test:platform` on isolated test port `3013`: `7 passed`, `0 failed`.
- Cleanup verified: `remainingAuditLogs=0`, `remainingSupportUsers=0`.
- Did not run migrations.
- Did not change CI/CD.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, carrier credentials, raw payloads, raw responses, or Authorization values.
- `npm run typecheck` pass.
- `npm run lint` pass with existing 3 `Topbar.tsx` warnings.
- `npm run build` pass with same existing 3 `Topbar.tsx` warnings.

### V2-121 - Platform Audit Log Backend Multi-Action Pagination

- Current task set to `V2-121 - Platform Audit Log Backend Multi-Action Pagination`.
- Added backend `actions=` query support for platform audit logs.
- Kept existing exact `action=` filter contract; exact `action` takes precedence when both `action` and `actions` are present.
- Added allowlist validation for grouped platform audit actions.
- Invalid multi-action values return safe `400 VALIDATION_ERROR`.
- Repository now applies `action: { in: actions }` for multi-action list/count queries.
- Count query uses the same multi-action filter as list query for correct pagination totals.
- Updated platform API client to serialize array query values as comma-separated `actions`.
- Updated `/platform/audit-logs` Mutations and Denied Access presets to call one backend paginated query.
- Removed client-side multi-request merge/sort behavior from grouped presets.
- Updated UI copy to state grouped presets use backend multi-action pagination.
- Extended browser regression with direct API coverage for `actions=...`.
- Verified exact `action=PLATFORM_TENANT_CREATED` still works.
- Verified invalid `actions` query returns `400`.
- Hardened platform browser teardown to cleanup denied telemetry rows created by support/operator API tests.
- Runtime/browser regression used approved local/test DB only.
- Runtime/browser safe DB target: host `aws-1-ap-northeast-1.pooler.supabase.com`, database `postgres`, schema `public`.
- Full `npm run test:platform` on isolated `PLATFORM_TEST_PORT=3016` pass: `8 passed`, `0 failed`.
- Cleanup verified: `remainingAuditLogs=0`, `remainingSupportUsers=0`.
- Did not run migrations.
- Did not change CI/CD.
- Did not call external APIs.
- Did not call YunExpress/carrier APIs.
- Did not create shipments.
- Did not print secrets, cookies, session tokens, full DB URLs, passwords, hashes, API keys, carrier credentials, raw payloads, raw responses, or Authorization values.
- `npm run typecheck` pass.
- `npm run lint` pass with existing 3 `Topbar.tsx` warnings.
- `npm run build` pass with same existing 3 `Topbar.tsx` warnings.

## Known Issues

- Chưa có test runner chuyên biệt ngoài lint/typecheck/build.
- Chưa có global middleware route guard.
- Chưa có invite/add/delete member UI/API hoặc email invitation flow.

## Known Issues/P1

- Live/sandbox `CreateOrderLabel` chưa test và chỉ được test thủ công bởi user từ UI.
- `getLabel`/`cancelShipment`/`updateWeight`/`estimateRate` hiện chưa implement thật, đang trả `NOT_SUPPORTED`.
- Internal YunExpress `getTracking` adapter và public tracking sync API đã có, nhưng chưa có manual live tracking verification.
- V2-042 chưa có live/sandbox `CreateOrderLabel` result details; cần `V2-042B` để verify manual live result trước khi đánh dấu live shipment success.
- Rate limit/abuse guard hiện mới là in-memory per-instance foundation; production nhiều instances cần distributed limiter/WAF/edge controls.
- CSRF posture hiện là same-origin guard tối thiểu; token-based CSRF chưa implement.
- CI pipeline tối thiểu đã có; vẫn chưa có DB integration tests hoặc browser automation tests.
- Chưa thực hiện backup/restore rehearsal thực tế; release gate và rollback checklist đã được document nhưng cần rehearsal để đóng blocker.
- Tenant credential resolver đã được gắn vào YunExpress adapter runtime path; production vẫn cần manual live result verification và env fallback deprecation plan.

## Known Issues/P2

- Repo vẫn có Platform Admin files đang untracked từ V2-110/V2-110B; không revert.
- `Topbar.tsx` vẫn còn 3 warning cũ.
- Manual GitHub workflow chưa được chạy với approved CI test secrets.
- `test:platform` vẫn non-blocking cho PR/push.
- CI/CD hardening sẽ quay lại sau khi cần staging/production automation.
- Platform audit log backend multi-action pagination is implemented; large-volume query performance/indexing is not load-tested yet.
- `test:platform` can reuse stale local dev servers on the default port; use an isolated `PLATFORM_TEST_PORT` when validating local browser regressions.
- `prisma migrate status` without explicit schema once returned a generic schema engine error; use `npx prisma migrate status --schema prisma/schema.prisma` as the stable path.
- Real tracking sync result vẫn cần user/operator manual review.
- V2-099 UI behavior được verify qua dashboard render, API runtime smoke tests và source safety checks; chưa có dedicated browser automation framework.
- SecretRef UI deferred as future work.

- Local `next dev` processes có thể lock Prisma Windows query engine DLL; cần stop dev server trước `prisma generate` nếu gặp lỗi.
- Env fallback vẫn còn cho internal/staging compatibility; deprecation cần task riêng sau khi tenant credential live path được verify thủ công.
- `npm audit` hiện pass sau V2-095; future audit findings vẫn phải được review trước production.
- CI audit hiện blocking sau V2-095.
- Không chạy `npm audit fix --force`; nếu future finding yêu cầu force/breaking change thì phải tạo dependency review task riêng.
- Prisma hiện vẫn ở 6.x, chưa upgrade trong phase này.
- Prisma schema engine still fails against approved direct host `db.dnwethyafmoldxcyeemi.supabase.co:5432`; approved Supabase pooler host `aws-1-ap-northeast-1.pooler.supabase.com:5432` worked for migration/seed/runtime tests.
- Chưa có dedicated browser automation framework; client validation mới verify qua rendered form attributes và API-level validation.
- Chưa có browser automation framework để simulate double-click UI thực tế.
- Chưa có dedicated browser automation framework; UI interaction được verify qua source checks + API/runtime no-live flow.
- OPERATOR/VIEWER settings create/revoke visibility chưa runtime-tested vì chưa có seeded non-admin membership; UI source gating đã implement và server APIs vẫn enforce authorization.
- Live/sandbox shipment creation chỉ được user tự test thủ công trên UI.
- Runtime tests dùng approved Supabase pooler environment.
- Non-admin role 403 chưa runtime-tested vì chưa có seeded non-admin membership.
- Same `externalOrderId` under different tenant chưa runtime-tested vì test DB hiện chỉ có seeded tenant/API key mặc định.
- Runtime UI interaction được verify qua dashboard HTML, API behavior và component source checks; chưa có dedicated browser automation framework.
- VIEWER create-denial chưa runtime-tested vì chưa có seeded VIEWER membership.
- Cumulative allocation across multiple draft shipments để lại cho task shipment allocation sau.
- Chưa có runtime API test vì V2-031 chỉ thêm internal contracts.
- VIEWER execute-denial chưa runtime-tested vì chưa có seeded VIEWER membership.
- `Open Label` đã runtime-tested bằng temporary internal test `labelUrl`; chưa có real carrier `labelUrl` từ manual YunExpress result.
- Tracking sync UI action vẫn chưa implemented; V2-102 mới thêm API/service path.
- Chưa có live/sandbox YunExpress tracking test.
- Real carrier tracking lookup chưa test và phải do user/operator trigger sau.
- Route success với real adapter chưa execute để tránh network calls; service behavior đã verify bằng mocked adapter.
- UI interaction được verify bằng source checks + API/runtime smoke tests; chưa có dedicated browser automation framework.
- Runtime checks dùng approved Supabase test DB target trong `.env`.
- Vẫn chưa có dedicated browser automation framework.

## Decisions

- V2 tách biệt MVP hiện tại.
- Multi-tenant-first là rule bắt buộc.
- Carrier integration phải dùng adapter pattern.
- Route handlers thin, business logic trong services, database access trong repositories.
- Tenant API keys phải hash và không lưu plaintext.
- Production migrations cần phê duyệt rõ trước khi chạy.
