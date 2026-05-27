# Fulfillment Platform v2 - Tổng quan hệ thống, checklist và bước tiếp theo

Cập nhật lần cuối: 2026-05-25

## 1. Mục tiêu hệ thống

Fulfillment Platform v2 là nền tảng fulfillment dài hạn, thiết kế theo hướng multi-tenant để:

- nhận đơn hàng từ Portal hoặc hệ thống bên ngoài,
- quản lý orders theo từng tenant,
- tạo draft shipment,
- thực hiện carrier operations có kiểm soát,
- đồng bộ tracking,
- quản lý tenant settings,
- hỗ trợ quản trị SaaS bằng Platform Admin layer riêng.

Hệ thống v2 được thiết kế là nền tảng mới, tách biệt với MVP hiện tại. Không copy trực tiếp code/schema/behavior từ MVP nếu chưa review tenancy, security và architecture.

## 2. Nguyên tắc cốt lõi

- Multi-tenant-first: mọi business data phải được scoped bằng `tenantId`.
- Route handlers phải mỏng: parse request, resolve auth/tenant context, validate input, gọi service, trả response.
- Business logic đặt trong services.
- Database access đặt trong repositories.
- UI chỉ gọi platform APIs, không gọi carrier APIs trực tiếp.
- Carrier integrations phải đi qua carrier adapters và controlled services.
- Không lưu hoặc trả plaintext secrets.
- API keys, session tokens và password-derived values chỉ lưu dạng hash.
- Carrier credentials chỉ lưu dạng `secretRef` hoặc encrypted payload, không lưu plaintext.
- Live carrier operations phải là manual-only và có explicit confirmation.
- Production migration hoặc production API calls chỉ được thực hiện khi có approval rõ ràng.

## 3. Nhóm người dùng chính

| Nhóm người dùng | Vai trò |
| --- | --- |
| Platform Admin | Admin hệ thống/SaaS, quản lý tenants cross-tenant qua `/platform`. |
| Platform Support | Read-only platform role: được xem tenants, tenant detail/members và audit logs; không được mutation. |
| Tenant OWNER | Toàn quyền ở tenant-level: settings, members, API keys, carrier accounts. |
| Tenant ADMIN | Quản lý vận hành tenant và phần lớn settings. |
| Tenant OPERATOR | Xử lý orders, shipments, tracking workflow. |
| Tenant VIEWER | Chỉ xem dữ liệu. |
| External Portal | Gửi đơn vào tenant thông qua tenant API key. |
| Carrier Adapter | Boundary server-side cho carrier operations. |

## 4. Kiến trúc tổng quan

Các thư mục chính:

- `src/app`: Next.js App Router pages, layouts, route handlers.
- `src/modules`: domain services, repositories, validators, adapters, types.
- `src/components`: UI components.
- `src/shared`: auth context, DB client, response helpers, security helpers, shared infrastructure.
- `src/integrations`: carrier hoặc external integration boundaries.
- `prisma`: Prisma schema, migrations, seed.
- `docs`: tài liệu product, architecture, security, task, deployment, operations.

Luồng kiến trúc chuẩn:

```text
UI page/component
  -> src/lib/api client wrapper
  -> Next.js route handler
  -> auth/tenant/platform guard
  -> service
  -> repository / carrier adapter / audit service
  -> standard API response
```

## 5. Domain model chính

Các entity chính đã implement hoặc được thiết kế trong hệ thống:

- `User`: định danh user dashboard; lưu `passwordHash`, không lưu plaintext password.
- `Session`: session server-side; lưu `tokenHash`, không lưu raw token.
- `PlatformAdmin`: role record riêng cho admin hệ thống.
- `Tenant`: boundary chính của workspace/customer.
- `TenantMembership`: liên kết user với tenant, role và status.
- `TenantApiKey`: API key cho Portal/external systems; lưu `keyHash` và prefix.
- `AuditLog`: audit events với metadata an toàn.
- `Order`: order thuộc tenant, nhận từ Portal.
- `OrderItem`: item trong order.
- `OrderStatusHistory`: lịch sử trạng thái order.
- `Shipment`: shipment thuộc tenant, dùng cho draft/execution/tracking.
- `ShipmentItem`: item được phân bổ vào shipment.
- `ShipmentStatusHistory`: timeline trạng thái shipment.
- `CarrierAccount`: metadata tài khoản carrier theo tenant.
- `CarrierCredential`: metadata credential theo tenant, lưu encrypted/secretRef.

## 6. Các luồng hệ thống chính

### 6.1 Auth và session

1. User đăng nhập bằng email/password.
2. Server validate credentials và password policy.
3. Password được verify bằng versioned `scrypt` hash.
4. Server tạo random session token.
5. Database chỉ lưu `hashSessionToken(token)`.
6. Browser nhận httpOnly cookie.
7. `/api/auth/me` resolve safe user và tenant memberships.
8. Logout xóa session theo token hash và clear cookie.

Không bao giờ trả về:

- `passwordHash`
- `tokenHash`
- raw session token
- secrets hoặc credentials

### 6.2 Tenant context

Dashboard tenant APIs resolve default active tenant từ server-side session context. Client không được gửi arbitrary `tenantId` để override quyền truy cập.

Tenant-scoped routes phải enforce:

- authenticated session,
- active tenant membership,
- tenant role được phép,
- repository query filter theo `tenantId`.

### 6.3 Platform Admin context

Platform Admin tách riêng khỏi tenant roles.

Matrix hiện tại:

| Actor | Platform APIs | Platform pages |
| --- | --- | --- |
| Unauthenticated | `401` | redirect `/login` |
| Tenant OWNER only | `403` | safe `404` denial |
| Tenant ADMIN only | `403` | safe `404` denial |
| Tenant OPERATOR | `403` | safe `404` denial |
| Tenant VIEWER | `403` | safe `404` denial |
| `PLATFORM_ADMIN` active | allowed | allowed |
| `PLATFORM_SUPPORT` active | read-only `GET`; mutation `403` | read-only pages allowed |

`PLATFORM_SUPPORT` đã được implement theo policy read-only. UI không hiển thị controls tạo/sửa cho support, và server vẫn trả `403` cho mọi platform mutation.

### 6.4 Portal order receive

1. External Portal gọi `POST /api/portal/orders`.
2. API authenticate bằng tenant API key.
3. Raw API key chỉ tồn tại trong memory.
4. Server hash và verify key với `TenantApiKey.keyHash`.
5. Server resolve tenant context từ API key.
6. Order, items và initial status history được tạo theo tenant scope.
7. Audit log ghi safe metadata.

Không lưu hoặc trả về:

- plaintext API key,
- `keyHash`,
- raw auth token,
- payload nhạy cảm có secrets.

### 6.5 Order management

Tenant users có thể list và view orders qua:

- `GET /api/orders`
- `GET /api/orders/:orderId`

UI hiện có Orders experience với filters, pagination, status badges và expandable rows. Order detail hiển thị inline trong bảng, kèm related shipments và draft shipment creation.

Order detail không được expose raw payload mặc định.

### 6.6 Draft shipment

Draft shipment là shipment preparation record nội bộ.

Mục đích:

- chọn order items và quantities cần ship,
- gom items thành một shipment sẵn sàng gửi carrier,
- validate dữ liệu trước khi submit carrier,
- tránh gọi carrier ngay từ order view,
- cho phép preflight checks và manual confirmation trước live operation.

Tạo draft shipment gọi:

- `POST /api/shipments`

Lệnh này không gọi YunExpress hoặc bất kỳ live carrier operation nào.

### 6.7 Shipment preflight

Preflight kiểm tra safe readiness trước execution:

- auth/role,
- shipment status,
- adapter registration,
- credential source/configuration,
- `liveEnabled`,
- receiver/package/parcels mapping preview.

Endpoint:

- `GET /api/shipments/:shipmentId/preflight`

Preflight không được expose:

- `customerNo`,
- `apiSecret`,
- Authorization header,
- `secretRef`,
- `encryptedPayload`,
- decrypted payload,
- raw carrier response.

### 6.8 Shipment execute

Live shipment execution là manual-only.

Endpoint:

- `POST /api/shipments/:shipmentId/execute`

Rules:

- không auto-call khi page load,
- không auto-retry,
- execute button disable ngay sau click đầu tiên,
- yêu cầu live-mode warning,
- yêu cầu checkbox và exact typed confirmation,
- server vẫn là source of truth cho authorization và state.

### 6.9 Tracking sync

Tracking sync cũng là manual-only.

Endpoint:

- `POST /api/shipments/:shipmentId/tracking`

Rules:

- không polling,
- không auto-sync khi mở panel,
- UI không gọi carrier trực tiếp,
- chỉ trả safe result summary,
- không trả raw carrier response hoặc credentials.

### 6.10 Tenant settings

Tenant settings gồm:

- Tenant Profile,
- API Keys,
- Members,
- Carrier Accounts,
- Audit Logs.

Rules:

- `OWNER`/`ADMIN` quản lý API keys, members, carrier accounts.
- `OPERATOR`/`VIEWER` có quyền hạn chế hoặc read-only.
- API key plaintext chỉ hiển thị một lần sau khi tạo và sau đó clear khỏi state.
- Carrier credential form clear secret sau success hoặc failure.
- Carrier credential values không được pre-fill.
- Audit metadata được redact đệ quy trước khi hiển thị.

### 6.11 Platform Admin

Platform routes:

- `/platform`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/audit-logs`

Platform APIs:

- `GET /api/platform/tenants`
- `POST /api/platform/tenants`
- `GET /api/platform/tenants/:tenantId`
- `PATCH /api/platform/tenants/:tenantId`
- `GET /api/platform/tenants/:tenantId/members`
- `POST /api/platform/tenants/:tenantId/members`
- `PATCH /api/platform/tenants/:tenantId/members/:membershipId`
- `GET /api/platform/audit-logs`

Platform Admin có thể:

- xem/search tenants,
- tạo tenant và owner đầu tiên,
- cập nhật tenant name/type/status,
- xem/thêm/sửa tenant members,
- xem cross-tenant audit logs.

Platform Admin không được:

- impersonate users,
- bypass secret-handling rules,
- gọi carrier live APIs trực tiếp từ UI,
- truy cập production DB nếu chưa có approval.

## 7. UI hiện có

Các khu vực UI lớn đã có:

- Login page.
- Dashboard shell.
- Orders page/table với expandable rows.
- Inline order expand panel.
- Shipment operations UI.
- Shipment preflight và live confirmation components.
- Tracking result/sync UI.
- Settings tabs.
- Platform Admin shell.
- Platform tenant list.
- Platform tenant detail.
- Platform audit logs.

Yêu cầu UI:

- có loading, empty, error states cho async operations,
- toast an toàn cho mutations,
- không toast cho read operations,
- keyboard/accessibility baseline,
- không lưu credentials trong localStorage/sessionStorage,
- không render raw payloads, secrets, hashes hoặc credentials.

## 8. API surface

Auth:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Portal:

- `POST /api/portal/orders`

Orders:

- `GET /api/orders`
- `GET /api/orders/:orderId`

Shipments:

- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/shipments/:shipmentId`
- `GET /api/shipments/:shipmentId/preflight`
- `POST /api/shipments/:shipmentId/execute`
- `POST /api/shipments/:shipmentId/tracking`

Tenant settings:

- `GET /api/tenants/current/api-keys`
- `POST /api/tenants/current/api-keys`
- `DELETE /api/tenants/current/api-keys/:apiKeyId`
- `GET /api/tenants/current/members`
- `PATCH /api/tenants/current/members/:membershipId`
- `GET /api/tenants/current/carrier-accounts`
- `POST /api/tenants/current/carrier-accounts`
- `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId`
- `POST /api/tenants/current/carrier-accounts/:carrierAccountId/credentials`
- `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId/credentials/:credentialId/disable`
- `GET /api/tenants/current/audit-logs`

Platform:

- `GET /api/platform/tenants`
- `POST /api/platform/tenants`
- `GET /api/platform/tenants/:tenantId`
- `PATCH /api/platform/tenants/:tenantId`
- `GET /api/platform/tenants/:tenantId/members`
- `POST /api/platform/tenants/:tenantId/members`
- `PATCH /api/platform/tenants/:tenantId/members/:membershipId`
- `GET /api/platform/audit-logs`

## 9. Security checklist

- [x] Password được hash bằng versioned `scrypt`.
- [x] Session chỉ lưu `tokenHash`.
- [x] Auth response không expose token hoặc password hash.
- [x] Tenant API key chỉ lưu hash và prefix.
- [x] API key plaintext chỉ hiển thị một lần sau create.
- [x] Business data tenant-scoped.
- [x] Route handlers dùng auth/tenant/platform guards.
- [x] Portal order receive resolve tenant từ API key.
- [x] UI không gọi carrier APIs trực tiếp.
- [x] Carrier operations đi qua services/adapters.
- [x] Carrier credentials không lưu plaintext.
- [x] Carrier credential UI không pre-fill secret.
- [x] Preflight chỉ expose readiness/mapping data an toàn.
- [x] Execute shipment là manual-only.
- [x] Tracking sync là manual-only.
- [x] Audit metadata viewer redact sensitive keys đệ quy.
- [x] Platform Admin tách khỏi tenant OWNER/ADMIN.
- [x] Non-platform users nhận safe platform denial behavior.
- [x] Same-origin guard có cho cookie-authenticated dashboard mutations.
- [x] In-memory rate-limit/abuse guard đã có.
- [x] Production deployment và backup/restore checklists đã có.

## 10. Checklist công việc đã hoàn thành

Foundation:

- [x] Next.js/TypeScript/Prisma scaffold.
- [x] Architecture baseline.
- [x] Governance docs.
- [x] Standard API response format.
- [x] Prisma identity/tenant baseline.
- [x] Approved test DB migration/seed path validated.

Auth và tenant:

- [x] Password/session crypto utilities.
- [x] Login/logout/me APIs.
- [x] Auth context helpers.
- [x] Login UI.
- [x] Logout/user menu.
- [x] Tenant API keys.
- [x] Tenant member APIs và UI.
- [x] Tenant audit logs và safe metadata viewer.

Orders:

- [x] Portal order receive API.
- [x] Order data hardening.
- [x] Order list/detail APIs.
- [x] Orders table UI.
- [x] Expandable order rows.
- [x] Inline draft shipment creation từ order items.

Shipments và carrier operations:

- [x] Shipment schema/core APIs.
- [x] Carrier adapter interface.
- [x] Shipment execution service.
- [x] YunExpress OMS adapter với live guard.
- [x] Manual live create preparation.
- [x] Shipment UI hardening.
- [x] Shipment result/label display hardening.
- [x] Tracking adapter.
- [x] Tracking sync API.
- [x] Tracking sync UI action.

Carrier credentials:

- [x] Carrier credential model design.
- [x] Carrier account/credential schema.
- [x] Encryption utilities.
- [x] Carrier credential management APIs.
- [x] Carrier credential UI.
- [x] Credential resolver integration vào YunExpress preflight/execution path.

Operations và readiness:

- [x] Production readiness review.
- [x] Rate limit, CSRF, abuse guard foundation.
- [x] CI verification pipeline.
- [x] Production deployment checklist.
- [x] Backup/restore rehearsal plan.
- [x] Dependency vulnerability review.

Platform Admin:

- [x] PlatformAdmin model và roles.
- [x] Platform admin guard.
- [x] Platform tenant APIs.
- [x] Platform tenant member APIs.
- [x] Platform audit log API.
- [x] Platform UI routes.
- [x] Platform migration applied vào approved local/test DB.
- [x] Platform smoke tests passed.
- [x] Tenant creation UX hardened.
- [x] Platform authorization matrix audited và documented.
- [x] Platform Support read-only policy implemented.

## 11. Trạng thái hiện tại

Task hiện đang in review:

- `V2-113 - Platform Support Read-Only Policy`

Task gần nhất đã xác nhận done:

- `V2-112 - Platform Admin Authorization Matrix`

Task được đề xuất tiếp theo:

- `V2-114 - Platform Admin Tenant Detail UX Hardening`

Behavior quan trọng hiện tại:

- `PLATFORM_ADMIN` có thể truy cập platform console.
- Tenant roles không thể truy cập platform console.
- `PLATFORM_SUPPORT` có quyền read-only trên platform console và bị deny toàn bộ mutation.

## 12. Known issues và risks

P1:

- Live/sandbox `CreateOrderLabel` result vẫn cần user/operator manual verification.
- `getLabel`, `cancelShipment`, `updateWeight`, `estimateRate` chưa implement real carrier operations.
- Production-grade distributed rate limit chưa implement; hiện mới có in-memory per instance.
- Token-based CSRF chưa implement; hiện dùng same-origin guard.
- Chưa có dedicated DB integration test framework.
- Chưa có dedicated browser automation framework.
- Backup/restore rehearsal đã document nhưng cần rehearsal thực tế.
- Env fallback cho YunExpress credentials vẫn còn cho internal/staging compatibility và cần kế hoạch deprecation.

P2:

- `PLATFORM_SUPPORT` read-only đã có, nhưng vẫn cần regression/browser coverage riêng.
- Platform Admin UX mới smoke-tested, vẫn cần hardening thêm.
- Tenant switcher vẫn là minimal/future.
- Invite/add/delete member và email invitation flows đang deferred.
- Browser-based accessibility/regression testing chưa tự động.
- Manual tracking/live carrier review vẫn pending.
- SecretRef UI đang deferred.

## 13. Bước tiếp theo được đề xuất

### Ngay trước mắt

1. Accept hoặc revise `V2-113 - Platform Support Read-Only Policy`.
2. Bắt đầu `V2-114 - Platform Admin Tenant Detail UX Hardening`.
3. Bổ sung browser automation cho support read-only controls.
4. Review audit reason capture cho các platform admin mutation.

### Carrier operations

1. Chạy controlled manual review cho live/sandbox `CreateOrderLabel` result.
2. Document actual carrier response shape nhưng không expose raw credentials hoặc secrets.
3. Quyết định có implement label fetch/cancel/update weight/rate estimate hay không.
4. Giữ mọi carrier calls là manual, server-side, tenant-scoped và audited.

### Production readiness

1. Chạy backup/restore rehearsal trên approved non-production environment.
2. Thêm distributed rate limiter hoặc managed WAF/edge limit trước khi production scale.
3. Thêm DB integration test suite cho auth, tenancy, orders, shipments, platform admin.
4. Thêm browser automation cho login, orders, shipments, settings, platform console.
5. Review deployment environment variables và secret management.
6. Review migration/rollback runbooks trước mọi production migration.

### Tenant và SaaS UX

1. Thêm tenant switcher nếu multi-tenant user workflows bắt đầu active.
2. Thêm tenant invitation/member creation lifecycle.
3. Harden Platform Admin tenant detail UX.
4. Thêm cross-tenant audit reason capture rõ hơn cho platform actions.
5. Chỉ thêm usage reporting hoặc billing sau khi core operations ổn định.

### Security hardening

1. Quyết định token-based CSRF hay tiếp tục same-origin-only posture.
2. Thêm session rotation sau privilege changes.
3. Review audit coverage cho tất cả mutation routes.
4. Thêm automated checks để đảm bảo API responses không có secret fields.
5. Thêm production secret manager plan cho carrier credentials.

## 14. Lệnh verification chuẩn

Dùng các lệnh này cho code verification thông thường:

```bash
npm run lint
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:generate
```

Migration commands chỉ được chạy với approved local/test DB trừ khi có approval production rõ ràng:

```bash
npx prisma migrate deploy
npx prisma migrate status --schema prisma/schema.prisma
npm run prisma:seed
```

## 15. Safety rules cho các task sau

- Không chạy production migrations nếu chưa có approval rõ.
- Không gọi external APIs nếu chưa được duyệt.
- Không gọi YunExpress live/sandbox APIs từ automated tasks.
- Không tự động tạo real hoặc sandbox shipments.
- Không in secrets, full DB URLs, cookies, session tokens, password hashes, API keys, carrier credentials, `passwordHash`, `tokenHash`, hoặc `keyHash`.
- Không thêm application features trong documentation/audit tasks.
- Luôn preserve existing user changes và untracked work.
