# 09 Deployment and Env

## Environment Strategy

V2 phải phân tách rõ các environments:

- `local`: developer machine.
- `test`: automated tests và migration safety checks.
- `staging`: gần production, dùng để verify integration và release candidate.
- `production`: live environment.

Không dùng production database cho local development hoặc automated tests.

## APP_ENV Convention

`APP_ENV` chỉ nên dùng một trong các giá trị:

- `local`
- `test`
- `staging`
- `production`

Code và deployment scripts không được suy luận production chỉ từ branch name; phải kiểm tra `APP_ENV` và target environment rõ ràng.

## Test DB First

- Mọi schema change phải chạy trên test database trước.
- Mọi migration phải được review trước khi áp dụng staging/production.
- Test data không được chứa production secrets.
- Nếu migration liên quan data lớn hoặc destructive change, cần plan rollback/recovery.

## Staging/Production Separation

- Staging và production phải dùng database, env vars, carrier credentials và callback endpoints riêng.
- Không trỏ staging vào live carrier APIs nếu chưa được phê duyệt.
- Không dùng production tenant API keys trong staging.
- Không share secrets giữa environments trừ khi có lý do vận hành được phê duyệt.

## Vercel Deployment Notes

Nếu dùng Vercel:

- Env vars phải cấu hình theo environment trong Vercel Project Settings.
- Không commit secrets vào repo.
- Preview deployments không được dùng production database.
- Production deployment cần checklist trước khi promote.
- Background jobs, queues hoặc scheduled tasks cần được thiết kế riêng nếu Next.js runtime không phù hợp.

## Production Deployment Checklist

Dedicated staging/production release gates, migration checklist, rollback checklist, env/secrets checklist, carrier live safety checklist, smoke tests, and production blockers are maintained in `docs/11_PRODUCTION_DEPLOYMENT_CHECKLIST.md`.

Keep this file as the environment/deployment reference. Use the checklist document as the operational release gate before staging expansion or production exposure.

Backup and restore rehearsal process is maintained in `docs/12_BACKUP_RESTORE_REHEARSAL.md`. A successful restore rehearsal is required before production database exposure.

Restore rehearsals must use an isolated restore target. The restore target must not be production, must not be the MVP database, and must not share production traffic or production secrets.

## Prisma Migration Safety Rules

- Không tạo Prisma schema trong documentation-only task.
- Không chạy migration nếu task không yêu cầu rõ.
- Không chạy production migration khi chưa có explicit approval.
- Chạy migration trên test DB trước.
- Review generated SQL nếu migration có rủi ro destructive.
- Backup hoặc recovery plan phải có trước migration production quan trọng.
- Backup/restore rehearsal phải được thực hiện và ghi nhận trước production database exposure.

## Migration Command Policy

- `local` và `test`: có thể dùng `prisma migrate dev` khi schema task cho phép.
- `local` và `test`: chỉ dùng `prisma migrate reset` khi database là disposable và người thực hiện hiểu rõ dữ liệu sẽ bị xóa.
- `staging` và `production`: dùng `prisma migrate deploy`.
- Không dùng `prisma migrate dev` hoặc `prisma migrate reset` trên staging/production.
- Không chạy bất kỳ migration command nào trong documentation-only task.

## No Production Migration Without Explicit Approval

Production migration chỉ được chạy khi người có thẩm quyền phê duyệt rõ:

- Target environment là `production`.
- Migration files cụ thể.
- Expected impact.
- Backup/recovery plan.
- Maintenance window nếu cần.

Nếu thiếu bất kỳ thông tin nào, không chạy migration.

## Env Variable Categories

### App Config

- `APP_ENV`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL` nếu cần public URL an toàn

`APP_URL` và `NEXT_PUBLIC_APP_URL` cũng được dùng để build allowed origin list cho same-origin guard trên cookie-authenticated mutation APIs. Production phải cấu hình exact origin của dashboard, không dùng wildcard. Local/test/development có thể dùng localhost dev origins.

### Database

- `DATABASE_URL`
- `TEST_DATABASE_URL=postgresql://test_user@localhost:5432/fulfillment_v2_test`

Placeholder trên chỉ minh họa test DB host/database và không chứa password. Secret thật phải nằm trong environment hoặc secret manager.

### Auth

- `SESSION_SECRET`
- `PASSWORD_RESET_SECRET` nếu có
- `DEV_ADMIN_PASSWORD`: password dùng cho seeded `admin@example.com` trong local/test only; phải đạt password policy hiện tại.
- `DEV_TEST_PASSWORD`: password dùng cho seeded role test users trong local/test only; nếu thiếu, seed có thể dùng `DEV_ADMIN_PASSWORD` hợp lệ cho các role test users.

Seeded role test users chỉ được dùng trên approved local/test DB:

- `admin@example.com` — `OWNER`
- `tenant-admin@example.com` — `ADMIN`
- `operator@example.com` — `OPERATOR`
- `viewer@example.com` — `VIEWER`

Không in hoặc commit giá trị `DEV_ADMIN_PASSWORD`, `DEV_TEST_PASSWORD` hoặc `passwordHash`. Không chạy seed vào production/MVP DB.

### Tenant API

- `TENANT_API_KEY_PEPPER` nếu implementation chọn pepper.
- Webhook signing secrets nếu callback signing được triển khai.
- `PORTAL_TRACKING_UPDATE_URL`: server-side Portal tracking update endpoint. Defaults to `https://api.lngmerch.co/api/order/update-tracking` if omitted; shipment creation with a tracking number sends `{ orderId, tracking }` to this endpoint after local shipment records are saved.

### Carrier Integration

- Carrier credentials không nên là global nếu thuộc tenant.
- Global sandbox config có thể dùng env vars riêng cho staging/test.
- Tenant-specific credentials nên lưu encrypted hoặc trong secret manager.
- YunExpress OMS env placeholders:
  - `YUN_OMS_BASE_URL`
  - `YUN_OMS_CUSTOMER_NO`
  - `YUN_OMS_API_SECRET`
  - `YUN_OMS_LANG=en-US`
  - `YUN_OMS_LIVE_ENABLED=false`
  - `YUN_OMS_DEFAULT_SHIPPING_METHOD_CODE=THZXR`
  - `YUN_OMS_DEFAULT_SOURCE_CODE=API`
  - `YUN_OMS_DEFAULT_SIZE_UNIT=cm`
- `YUN_OMS_LIVE_ENABLED` phải giữ `false` trong local/test trừ khi user phê duyệt manual live/sandbox verification.
- Không cấu hình production YunExpress endpoint hoặc credentials cho preview/local.
- Không in hoặc commit giá trị thật của `YUN_OMS_CUSTOMER_NO` hoặc `YUN_OMS_API_SECRET`.
- V2-041 manual live test rule: Codex không được tự bật `YUN_OMS_LIVE_ENABLED`, không được tự chạy live/sandbox `CreateOrderLabel`, và không được tự tạo shipment thật/sandbox.
- Khi cần live/sandbox verification, user phải tự cấu hình env, tự thao tác từ UI và tự xác nhận kết quả.
- Preflight chỉ được đọc env presence an toàn và tạo mapping preview nội bộ; preflight không được gọi YunExpress network.
- V2-096 carrier credential model design is documented in `docs/13_CARRIER_CREDENTIAL_MODEL.md`.
- Current `YUN_OMS_*` env values remain an internal/staging compatibility fallback until tenant-scoped carrier credentials are implemented.
- Future production multi-tenant deployments should use tenant-scoped carrier credential resolver instead of shared global `YUN_OMS_*` credentials.
- Do not auto-migrate env secrets into the database; tenant carrier credentials must be set up manually through a future approved workflow.
- If envelope encryption is selected later, a production-grade master key or KMS-backed mechanism must be configured before storing encrypted credential payloads.
- V2-097 adds tenant-scoped carrier credential schema and AES-256-GCM encryption utilities.
- Carrier credential encryption env:
  - `CARRIER_CREDENTIAL_MASTER_KEY`
  - `CARRIER_CREDENTIAL_ENCRYPTION_VERSION=v1`
  - `CARRIER_CREDENTIAL_KEY_VERSION=v1`
- `CARRIER_CREDENTIAL_MASTER_KEY` must be generated and stored only in the deployment secret manager. Do not commit it, print it, reuse test keys in production, or rotate it without a credential rotation plan.
- The current `YUN_OMS_*` env fallback remains temporary internal/staging compatibility until carrier credential APIs and resolver integration are implemented.
- V2-098 encrypted credential save APIs require `CARRIER_CREDENTIAL_MASTER_KEY` for `encryptedPayload` mode.
- `secretRef` mode can be used to store a reference to a future vault/secret-manager location without storing plaintext in the database.
- Production must not reuse local/test `CARRIER_CREDENTIAL_MASTER_KEY`; rotation requires a planned credential re-encryption/rotation workflow.
- V2-098 does not migrate existing `YUN_OMS_*` env secrets into tenant credentials automatically.
- V2-099 Carrier Credential UI requires `CARRIER_CREDENTIAL_MASTER_KEY` to be configured server-side before encrypted credential save can succeed.
- The UI does not validate credentials against YunExpress or any live carrier endpoint.
- `liveEnabled` in saved carrier credentials is operationally sensitive and defaults to `false`; enabling it must not trigger carrier calls by itself.
- V2-100 wires tenant-scoped carrier credentials into YunExpress shipment preflight/execution before env fallback.
- Credential source priority is tenant active default credential first, then `YUN_OMS_*` env fallback for internal/staging compatibility.
- Production multi-tenant deployments should configure tenant carrier credentials and treat global `YUN_OMS_*` as temporary fallback only.
- Preflight may show safe `credentialSource` and `credentialConfigured` status, but must never expose credential values, `secretRef`, `encryptedPayload`, decrypted payload, or master key.
- V2-101 YunExpress tracking uses the same tenant credential resolver/env fallback and adds no new environment variables.
- Automated tracking tests must use mocked/no-live calls only. Staging/production tracking lookups require explicit approved runtime/API/UI flow and must not expose raw carrier responses or credentials.
- V2-102 tracking sync uses the same credential resolver/env fallback and adds no new environment variables.
- Tracking sync is user/operator-triggered and must not call `CreateOrderLabel`, create shipments, or expose raw carrier responses. Automated checks must keep using mocked/no-live adapter behavior.
- `SHIPMENT_TRACKING_FLOW_DEBUG=true` enables temporary safe debug logs for the ship-to-tracking-to-Portal flow. It must remain `false` by default and must not log Authorization, carrier credentials, raw label strings, cookies, session tokens, DB URLs, API keys, or raw carrier payloads.
- `YUN_OMS_DEBUG_RAW_RESPONSE=true` temporarily prints the exact YunExpress HTTP response body in the local/server console for carrier debugging. Keep it `false` by default and remove/disable it after debugging.

### Observability

- `LOG_LEVEL`
- Error tracking DSN nếu có.
- Metrics endpoint/key nếu có.

### Abuse Guard / Rate Limit

- V2-091 in-memory rate limiter chỉ phù hợp MVP/staging một instance hoặc nội bộ.
- Staging/production nhiều instances cần distributed limiter như Redis/Upstash, provider edge rate limit, WAF hoặc gateway-level controls.
- Rate limit storage/telemetry không được chứa raw passwords, tenant API keys, session tokens, cookies, carrier credentials hoặc DB URLs.

### CI Verification

- V2-092 GitHub Actions CI uses dummy env values only.
- CI must not use production DB, real Supabase DB, production secrets, or real carrier credentials.
- CI must not run `prisma migrate deploy`, `prisma migrate dev`, `prisma db seed`, or any migration/seed command.
- CI must not call external APIs, carrier APIs, YunExpress APIs, or live/sandbox shipment creation.
- CI runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run prisma:validate`, and `npm run prisma:generate`.
- CI runs `npm audit --audit-level=moderate` as a blocking check after V2-095 resolved the known moderate `postcss` issue.
- CI must not run `npm audit fix` automatically.
- If future audit findings appear, do not force-fix automatically; create a dependency review task and record the risk/fix decision.

### Platform Browser Regression

- `npm run test:platform` runs the Platform Admin browser regression suite with Playwright.
- This command is local/test-only and is not CI-blocking by default.
- Required env: `APP_ENV=local` or `APP_ENV=test`, approved local/test `DATABASE_URL`, approved local/test `DIRECT_URL` if configured, `DEV_ADMIN_PASSWORD`, and `DEV_TEST_PASSWORD`.
- Browser regression precheck prints only safe DB target fields: host, database, and schema.
- Do not run platform browser regression against production DBs or production secrets.
- Do not print passwords, cookies, session tokens, full DB URLs, password hashes, token hashes, API keys, or carrier credentials from browser regression output.
- The suite may create temporary platform support test data and must clean it up after the run.
- The suite must not call carrier APIs, YunExpress APIs, external APIs, or create real/sandbox shipments.
- V2-116 adds a separate manual-only GitHub Actions workflow named `Platform Browser Regression`.
- The platform browser workflow uses `workflow_dispatch` only; it does not run on pull request or push by default and is not a blocking CI gate.
- The platform browser workflow requires the confirmation input `APPROVED_TEST_DB`.
- Required GitHub secrets for the manual workflow are `PLATFORM_TEST_DATABASE_URL`, `PLATFORM_TEST_DIRECT_URL`, `PLATFORM_TEST_DEV_ADMIN_PASSWORD`, `PLATFORM_TEST_DEV_TEST_PASSWORD`, `PLATFORM_TEST_SESSION_SECRET`, and `PLATFORM_TEST_TENANT_API_KEY_PEPPER`.
- The workflow must use an approved isolated local/test database with seeded users; it must not use the dummy CI database URLs from the core CI workflow.
- Do not promote `npm run test:platform` to blocking CI until an isolated CI DB strategy and browser runtime have been proven stable.

### Dependency Audit Policy

- V2-095 resolved the known moderate `postcss <8.5.10` finding by adding an npm `overrides` entry for patched same-major `postcss`.
- The vulnerable package was transitive through `next`; `npm audit fix --force` suggested `next@9.3.3`, which was rejected as an unsafe breaking downgrade.
- The accepted fix path is a minimal transitive override to `postcss@^8.5.15` with full verification.
- Production release requires `npm audit --audit-level=moderate` to pass unless a future finding has an explicit dated risk acceptance from the release owner.

### Deployment

- Build/runtime config theo provider.
- Không dùng env var public cho secret.
