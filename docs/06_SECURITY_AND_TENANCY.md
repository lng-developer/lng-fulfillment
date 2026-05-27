# 06 Security and Tenant Isolation

## Auth Strategy

V2 phải auth-ready ngay từ đầu. Auth strategy dự kiến:

- Email/password cho MVP v2.
- Password hash bằng thuật toán an toàn.
- Session cookie cho dashboard.
- Tenant API key cho portal/external APIs.
- Role-based authorization theo tenant membership.

SSO hoặc OAuth có thể thêm sau nhưng không được phá vỡ tenant isolation model.

## Session Cookie Strategy

- Dùng secure, httpOnly session cookie.
- `SameSite` phải được cấu hình phù hợp với deployment.
- Cookie không chứa secrets nghiệp vụ hoặc carrier credentials.
- Session phải resolve `userId` và danh sách tenant access từ server-side.
- Client không tự quyết định role hoặc tenant access.
- Rotate session sau login, privilege change và các security-sensitive events.
- V2-010 schema lưu `Session.tokenHash`, không lưu plaintext session token.
- `Session.expiresAt` phải được enforce trong auth service khi V2-011 triển khai.
- V2-011A dùng `SESSION_COOKIE_NAME = "lng_fp_session"`.
- Cookie options mặc định: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge` 7 ngày.
- `secure` bật khi `APP_ENV=production`.
- Raw session token chỉ được gửi vào cookie một lần, database chỉ lưu `hashSessionToken(token)`.
- V2-011B login route set raw session token vào httpOnly cookie và chỉ trả safe user/tenant summary trong response body.
- V2-011B me route hash cookie token trước khi lookup session, reject missing/expired sessions và update `lastUsedAt`.
- V2-011B logout route xóa session nếu tồn tại, clear cookie và trả success kể cả khi cookie/session không tồn tại.
- Auth API responses không trả `passwordHash`, `tokenHash` hoặc raw session token.

## Auth Context Helpers

- V2-011C thêm server-side auth context helpers trong `src/shared/auth/context.ts`.
- `getSessionTokenFromCookies()` chỉ đọc `lng_fp_session` từ server cookies.
- `getCurrentUser()` và `getCurrentUserWithTenants()` hash raw cookie token trước khi lookup session qua auth service.
- Missing, invalid hoặc expired session trả `null` ở helper non-require và không expose chi tiết nhạy cảm.
- `requireUser()` ném `UNAUTHORIZED` khi không có session hợp lệ.
- `getCurrentUserWithTenants()` trả safe user summary và tenant memberships, không trả `passwordHash`, `tokenHash` hoặc raw token.
- Session expiry vẫn được enforce server-side và `lastUsedAt` được cập nhật khi session hợp lệ.
- `getDefaultTenantForUser(userId)` chọn ACTIVE membership đầu tiên cho MVP foundation.
- `requireTenantAccess(tenantId, allowedRoles?)` luôn kiểm tra membership server-side trước khi tin `tenantId`.
- Nếu user thiếu tenant membership hoặc role không nằm trong `allowedRoles`, server trả `FORBIDDEN`.
- Client-provided `tenantId` không được tin cậy nếu chưa gọi helper kiểm tra membership/role.

## Password Hashing Rule

- Không lưu plaintext password.
- Không tự viết hashing algorithm.
- Dùng password hashing library chuẩn khi implementation được phép.
- Password reset token nếu có phải hash hoặc lưu an toàn, có expiry.
- V2-011A dùng Node.js built-in `crypto.scrypt` password KDF với random salt, không dùng SHA/plain hash cho password.
- Password hash được lưu theo format versioned `scrypt` để có thể migrate thuật toán sau này.
- Password length hiện tại: tối thiểu 12 ký tự, tối đa 256 ký tự.

## Tenant Isolation Rule

- Mọi business data phải có tenant scope.
- API request phải resolve tenant context trước khi truy cập data.
- Repository method cho business data phải nhận `tenantId`.
- Không cho client override `tenantId` nếu tenant context đã được xác định từ session hoặc API key.
- Cross-tenant admin behavior phải là platform-level feature có audit rõ.
- Platform admin cross-tenant access phải ghi audit log với actor, reason, tenant target và resource/action nếu có.

## Role Model

Roles dự kiến:

- `OWNER`: quản lý tenant, members, API keys, carrier accounts và settings.
- `ADMIN`: quản lý vận hành tenant, users và phần lớn settings.
- `OPERATOR`: xử lý orders, shipments và tracking workflow.
- `VIEWER`: chỉ xem dữ liệu.

Authorization phải kiểm tra cả user identity và tenant membership.

V2-080 test/dev role seed:

- Role seed chỉ được dùng trong approved local/test DB, không dùng cho production/MVP DB.
- Seeded users dùng để runtime-test authorization matrix: `admin@example.com` (`OWNER`), `tenant-admin@example.com` (`ADMIN`), `operator@example.com` (`OPERATOR`), `viewer@example.com` (`VIEWER`).
- Password cho seeded users phải đến từ environment variables (`DEV_ADMIN_PASSWORD`, `DEV_TEST_PASSWORD`) và phải đạt password policy.
- Seed không được in plaintext password, `passwordHash`, session token hoặc secrets.
- Seed phải idempotent và chỉ upsert deterministic test records theo email/tenant slug.

## Platform Admin Authorization Matrix

Platform admin access is separate from tenant membership roles. Tenant `OWNER` or
`ADMIN` does not grant access to `/api/platform/*` or `/platform/*`.

| Actor | Platform APIs | Platform pages | Notes |
| --- | --- | --- | --- |
| Unauthenticated user | `401 UNAUTHORIZED` | Redirect to `/login` | No session context is available. |
| Tenant OWNER only | `403 FORBIDDEN` | Safe denial, currently `404` | Tenant ownership is tenant-scoped only. |
| Tenant ADMIN only | `403 FORBIDDEN` | Safe denial, currently `404` | Tenant admin is tenant-scoped only. |
| Tenant OPERATOR | `403 FORBIDDEN` | Safe denial, currently `404` | No platform access. |
| Tenant VIEWER | `403 FORBIDDEN` | Safe denial, currently `404` | No platform access. |
| `PLATFORM_ADMIN` active | Allowed | Allowed | Cross-tenant platform administration; mutations also require same-origin and rate-limit checks. |
| `PLATFORM_SUPPORT` active | Read-only `GET` allowed; mutations return `403 FORBIDDEN` | Read-only pages allowed | Support may inspect tenants, tenant members, and platform audit logs; it cannot create or update tenants or members. |

Implementation requirements:

- Platform APIs must call `requirePlatformAdmin()` through the platform route guard.
- Platform UI routes must use the platform layout guard and never return unsafe `500` for non-platform users.
- Platform mutations must require active `PLATFORM_ADMIN`, and must also apply same-origin validation and dashboard mutation rate limits.
- Cross-tenant platform actions must avoid exposing secrets, credentials, DB URLs, raw session tokens, password hashes, API key hashes, carrier payloads, or authorization headers.
- `PLATFORM_SUPPORT` is read-only. It must not receive mutation controls in UI and must receive `403 FORBIDDEN` from every platform mutation API.

## Tenant Member Management Rules

- V2-061 member management APIs chỉ làm việc trên default ACTIVE tenant resolve từ session.
- Client không được gửi `tenantId` để override tenant context.
- `OWNER` và `ADMIN` có thể list members và update existing membership role/status.
- `OPERATOR` và `VIEWER` không được manage members.
- V2-061 không implement add/invite/delete member hoặc email invitation.
- Member responses chỉ trả safe user fields: `userId`, `email`, `name`, `userStatus`, role/status và timestamps.
- Member responses không trả `passwordHash`, session data, token hashes, API key hashes hoặc secrets.
- Missing/cross-tenant membership trả `NOT_FOUND` để tránh lộ resource tenant khác.
- Không được demote/disable active owner cuối cùng của tenant.
- User không được tự demote/disable owner membership của chính mình nếu việc đó xóa effective owner access.
- Role/status changes phải ghi audit log với metadata an toàn: membership id, target user id, previous value và next value.

## Tenant API Key Hashing

- Plaintext key chỉ hiển thị một lần khi tạo.
- Database chỉ lưu `keyHash` và `keyPrefix`.
- Key prefix dùng để nhận diện key khi debug/audit, không đủ để authenticate.
- Khi verify key, hash input và so sánh an toàn.
- Nên dùng timing-safe comparison khi so sánh API key hash.
- Có `lastUsedAt`, `expiresAt` và `status` để vận hành.
- V2-010 schema thêm `TenantApiKey.scopes` dạng JSON để chuẩn bị cho scoped access.
- `TenantApiKey.revokedAt` được dùng khi thu hồi key.
- V2-011A thêm `safeCompare(a, b)` dùng Node `crypto.timingSafeEqual` trên digest cố định độ dài để xử lý unequal length an toàn.
- V2-012 thêm `generateTenantApiKey()`, `hashTenantApiKey(rawKey)`, `getTenantApiKeyPrefix(rawKey)` và `verifyTenantApiKey(rawKey, keyHash)`.
- Raw tenant API key được tạo bằng cryptographically random bytes.
- `hashTenantApiKey` dùng one-way hash cho lookup và storage; plaintext key không được lưu.
- `verifyTenantApiKey` dùng timing-safe comparison trên hash của raw key.
- API key verification chỉ trả tenant context nếu key `ACTIVE`, chưa expired và hash khớp.
- Verification thành công cập nhật `lastUsedAt`.
- Revoke API key đặt `status = REVOKED` và `revokedAt`.
- Create response được phép trả plaintext API key đúng một lần; list/revoke responses không trả plaintext key hoặc `keyHash`.
- Tenant API key management chỉ cho `OWNER` và `ADMIN`; `OPERATOR` và `VIEWER` không được manage API keys.

## Portal API Key Tenant Resolution

- V2-020 `POST /api/portal/orders` authenticate bằng tenant API key.
- API key có thể được gửi qua `Authorization: Bearer <key>` hoặc `X-Tenant-API-Key`.
- Raw API key chỉ được dùng trong request memory để hash/verify, không được log, lưu DB hoặc trả về response.
- Verification chỉ thành công nếu key `ACTIVE`, chưa expired và hash khớp bằng timing-safe comparison.
- Portal order receive yêu cầu scope `orders:write`.
- Tenant context luôn lấy từ verified API key; client-provided `tenantId` trong body bị bỏ qua và không được dùng để tạo records.
- Mọi `Order`, `OrderItem`, `OrderStatusHistory` tạo bởi portal receive phải dùng `tenantId` từ API key.
- Audit metadata cho portal receive chỉ chứa safe counters và `apiKeyId`; không chứa raw API key hoặc `keyHash`.
- Missing, invalid, revoked hoặc expired API key trả `UNAUTHORIZED` mà không tiết lộ key tồn tại hay không.

## Rate Limit and Abuse Guards

- Login endpoint phải có rate limit hoặc abuse guard theo IP/user/email khi implementation được phép.
- Tenant API key endpoints phải có rate limit, request size limit và logging an toàn.
- Portal receive APIs phải chống brute force API key và payload abuse.
- Rate-limit logs không được chứa plaintext secrets.
- V2-091 thêm in-process rate limit foundation cho MVP/staging.
- In-memory limiter là per-instance, không phải distributed production-grade protection; production nhiều instance cần Redis/Upstash/WAF hoặc managed edge rate limit.
- Rate limit key được hash trước khi lưu trong memory để không giữ email/API key/user identifiers dạng thô.
- `POST /api/auth/login` được giới hạn theo IP và IP + normalized email.
- `POST /api/portal/orders` được giới hạn theo IP + route trước khi authenticate API key, và theo IP + tenant/apiKey safe identifier sau khi key hợp lệ.
- Dashboard mutation APIs được giới hạn theo userId + tenantId + route sau khi session/tenant context hợp lệ.
- Rate limit failure trả HTTP `429` với code `RATE_LIMITED` và safe message, không expose counters hoặc secret-bearing request details.

## CSRF And Same-Origin Policy

- V2-091 áp dụng same-origin guard tối thiểu cho cookie-authenticated dashboard mutation APIs.
- Guard kiểm tra `Origin` hoặc `Referer` against allowed origins.
- Allowed origins lấy từ `APP_URL`, `NEXT_PUBLIC_APP_URL`; local/test/development cho phép localhost dev origins.
- Production phải cấu hình exact app origin, không wildcard.
- Guard áp dụng cho `POST`, `PATCH`, `DELETE` routes dùng session cookie auth.
- Guard không áp dụng cho `GET` routes.
- Guard không áp dụng cho Portal API key endpoint vì endpoint này không dựa vào browser session cookie; Portal được bảo vệ bằng tenant API key auth và rate limit.
- Token-based CSRF có thể được thêm sau nếu sản phẩm cần browser/API topology phức tạp hơn.

## Secret Handling

- Secrets phải nằm trong environment variables hoặc secret manager.
- Không commit `.env` chứa secrets.
- Không log secrets.
- Không trả secrets qua API.
- Không expose secrets trong frontend bundle.
- Không lưu carrier credential plaintext.

## Carrier Credential And Env Handling

- V2-040 `YUNEXPRESS_OMS` adapter đọc `YUN_OMS_CUSTOMER_NO` và `YUN_OMS_API_SECRET` từ environment variables.
- `.env.example` chỉ chứa placeholder rỗng, không chứa giá trị thật.
- Authorization header được tạo server-side bằng `${customerNo}&${apiSecret}` rồi base64 encode.
- Không log `Authorization`, `CustomerNo`, `ApiSecret`, raw auth token hoặc request body có PII/secrets.
- `YUN_OMS_LIVE_ENABLED` mặc định phải là `false`.
- Khi `YUN_OMS_LIVE_ENABLED=false`, adapter không gọi `CreateOrderLabel`.
- Codex không được tự động tạo live/sandbox YunExpress shipment; mọi thao tác live/sandbox phải do user thực hiện thủ công từ UI hoặc quy trình được phê duyệt.
- `rawResponse` carrier chỉ được dùng làm server-side metadata nội bộ và không trả trong default API/UI payload.
- V2-096 defines the planned tenant-scoped carrier credential model in `docs/13_CARRIER_CREDENTIAL_MODEL.md`.
- Production-preferred credential storage is `secretRef`, where DB stores only a reference to a secret manager or vault plus safe metadata.
- `encryptedPayload` is an optional fallback only after encryption utilities and key management are implemented.
- No plaintext carrier credential may be stored in DB, returned by APIs, written to `AuditLog`, shown in UI, or logged.
- Carrier credential service must resolve/decrypt secrets server-side and pass decrypted values to adapters only in memory.
- Adapters must not decide tenant authorization and must not persist decrypted credentials.
- Env-level `YUN_OMS_*` is temporary internal/staging compatibility and should not remain the default production multi-tenant credential path after tenant credentials are implemented.
- V2-097 implements `CarrierAccount` and `CarrierCredential` schema with no plaintext credential field.
- V2-097 implements AES-256-GCM encryption utilities for `encryptedPayload`.
- `CARRIER_CREDENTIAL_MASTER_KEY` must be configured server-side before encrypted credential payloads can be written or decrypted.
- The encrypted payload structure stores only algorithm/version metadata, IV, auth tag, and ciphertext.
- `buildCredentialKeyPrefix` returns a hash-derived safe prefix and must not expose credential values.
- `resolveCarrierCredentials` is server-only service logic; public APIs and UI must only receive summaries without `secretRef`, `encryptedPayload`, or decrypted values.
- V2-098 exposes carrier account/credential management APIs only to `OWNER`/`ADMIN`.
- `OPERATOR`/`VIEWER` cannot manage carrier accounts or credentials.
- V2-098 `encryptedPayload` mode requires `CARRIER_CREDENTIAL_MASTER_KEY`; missing/invalid encryption config returns controlled `CARRIER_ERROR`.
- V2-098 `secretRef` mode stores a reference only; public responses mask it by omitting the raw reference.
- Carrier credential APIs write audit logs for account create/update and credential create/update/disable with safe metadata only.
- Carrier credential APIs do not call YunExpress, do not validate live credentials, do not create shipments, and do not enable live mode.
- V2-100 wires the tenant credential resolver into `YUNEXPRESS_OMS` shipment execution and preflight.
- Runtime credential priority is: tenant active default carrier account with active credential, then temporary `YUN_OMS_*` env fallback, then controlled `CARRIER_ERROR`.
- Decrypted carrier credentials exist only in server memory during resolver/adapter execution and are never returned to route handlers as public response data, UI, audit metadata, logs, or error messages.
- Preflight may expose safe source metadata only: `credentialSource`, `credentialConfigured`, and `liveEnabled`; it must not expose `customerNo`, `apiSecret`, `secretRef`, `encryptedPayload`, decrypted payload, master key, or Authorization header.
- Env fallback remains internal/staging compatibility and should be disabled/deprecated for production multi-tenant use after tenant credential execution is verified.
- V2-101 implements internal YunExpress tracking adapter code paths. Tracking lookups still use server-side resolved credentials/fallback only and must not expose credentials or raw carrier responses.
- Codex automated tests for tracking must use mocked fetch/no-live checks only. Real tracking lookups must be user-triggered later through an approved manual/UI/API flow.
- Tracking normalization may return safe event/provider/status summaries, but it must not return `rawResponse`, Authorization headers, carrier secrets, encrypted payloads, DB credentials, cookies, API keys, or hashes.
- V2-102 exposes tracking sync through `POST /api/shipments/:shipmentId/tracking` for `OWNER`, `ADMIN`, and `OPERATOR` only; `VIEWER` is denied.
- Tracking sync is tenant-scoped, uses server-side resolved credentials only, and writes safe `SHIPMENT_TRACKING_SYNCED` / `SHIPMENT_TRACKING_SYNC_FAILED` audit metadata.
- Tracking sync may update `Shipment.status`, `trackingNumber`, and `ShipmentStatusHistory`, but it must never return or audit raw carrier responses, credentials, Authorization headers, encrypted payloads, DB credentials, cookies, API keys, or secrets.

## Audit Requirements

Phải audit các nhóm hành động:

- Login/logout quan trọng nếu cần điều tra.
- Tạo/sửa/xóa tenant API keys.
- Tạo/sửa carrier accounts và credentials.
- Thay đổi memberships và roles.
- Tạo/cancel shipments.
- Retry callbacks.
- Platform admin cross-tenant access.
- Platform admin cross-tenant access phải ghi rõ actor, tenant target, action và reason nếu available.
- V2-012 ghi audit log cho `API_KEY_CREATED` và `API_KEY_REVOKED`.
- Audit metadata cho API key chỉ chứa key id, key name, `keyPrefix` và scopes.
- V2-117 platform audit policy: platform mutation actions must be audited; normal platform reads are not audited by default to avoid noisy audit logs.
- Required platform mutation audit events:
  - `PLATFORM_TENANT_CREATED`
  - `PLATFORM_TENANT_UPDATED`
  - `PLATFORM_TENANT_MEMBER_ADDED`
  - `PLATFORM_TENANT_MEMBER_UPDATED`
- Platform audit metadata must use safe identifiers and transition fields only, such as `targetTenantId`, `targetTenantSlug`, `targetMembershipId`, `targetUserId`, `previousStatus`, `nextStatus`, `previousRole`, `nextRole`, `actorPlatformRole`, and `result`.
- Platform audit metadata must not include owner/member passwords, full request bodies, full user/tenant objects, email addresses unless explicitly required for an approved investigation workflow, raw payloads, DB URLs, tokens, hashes, API keys, carrier credentials, cookies, or Authorization headers.
- V2-118 denied platform access telemetry policy:
  - Authenticated non-platform users attempting Platform APIs are audited with `PLATFORM_ACCESS_DENIED`.
  - `PLATFORM_SUPPORT` mutation attempts are audited with `PLATFORM_MUTATION_DENIED`.
  - Unauthenticated platform access is not audited by default.
  - Successful platform reads are not audited.
  - Normal `PLATFORM_SUPPORT` read-only access is not audited.
  - Safe UI denial pages are not audited by default; API denial telemetry is the current investigation signal.
  - Denied telemetry must be low-noise, rate-limit aware, and recorded at most once per denied request path.
- Denied telemetry metadata must use safe fields only: `routeGroup`, `method`, `reasonCode`, `actorPlatformRole` if available, and `result`.
- Denied telemetry metadata must not include request body, query secrets, headers, cookies, Authorization, session token, email, raw errors, DB URLs, API keys, hashes, carrier credentials, raw payloads, or raw responses.

Audit log không được chứa plaintext secrets.

## Audit Log Visibility And Redaction

- V2-070 audit log viewer chỉ cho `OWNER`/`ADMIN` xem audit logs của default ACTIVE tenant.
- `OPERATOR`/`VIEWER` không được view tenant audit logs.
- Audit log API luôn filter theo `tenantId` server-side và không nhận client-provided `tenantId`.
- Audit metadata phải được sanitize trước khi trả về API/UI.
- Primitive metadata values được phép hiển thị nếu key không đáng ngờ.
- Nested objects/arrays chỉ được summarize, không trả raw object/array mặc định.
- Các key đáng ngờ phải được omit case-insensitively và format-insensitively, gồm `token`, `secret`, `password`, `apiKey`, `api_key`, `keyHash`, `key_hash`, `authorization`, `authHeader`, `cookie`, `session`, `rawResponse`, `raw_response`, `rawPayload`, `raw_payload`, `credential`, `credentials`, `customerNo`, `customer_no`, `apiSecret`, `api_secret`, `bearer`, `privateKey`, `private_key`, `accessToken`, `refreshToken`.
- Primitive string values cũng phải bị redact nếu trông giống secret/token dù key an toàn: `Bearer ...`, `Basic ...`, JWT-like string, long opaque token-like string, known API key prefix, hoặc database/connection-string-like value.
- Redaction summary chỉ được trả bằng `redactedFieldsCount`, broad `redactedFieldCategories`, hoặc count tương tự; không trả exact sensitive field names.
- Metadata response phải có size limits: giới hạn số key top-level, giới hạn độ dài string, giới hạn số key nested object được summarize, và arrays chỉ được summarize bằng length.
- UI không được render raw metadata bằng `JSON.stringify` và không được expose raw carrier response, raw payload, credentials, hashes, DB URLs, cookie values hoặc secrets.

## No Plaintext Secret Rule

Các dữ liệu sau không được lưu plaintext:

- User passwords.
- Tenant API keys.
- Carrier API keys.
- Carrier passwords.
- Webhook signing secrets.
- Password reset tokens.
- Any long-lived access token.

Nếu cần lưu để sử dụng lại, phải hash hoặc encrypt tùy use case:

- Dữ liệu chỉ cần verify: hash.
- Dữ liệu cần gửi lại cho carrier: encrypt hoặc secret manager.
