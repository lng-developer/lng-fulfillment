# 05 Frontend Spec

## Frontend Principles

- Frontend chỉ gọi platform APIs.
- Frontend không gọi carrier APIs trực tiếp.
- Frontend không expose secrets, API keys, carrier credentials hoặc internal tokens.
- Mọi màn hình business data phải hoạt động trong tenant context rõ ràng.
- Loading, empty và error states phải được thiết kế ngay từ đầu.

## Login Page

Mục tiêu:

- Cho phép user đăng nhập bằng email/password.
- Hiển thị lỗi auth an toàn, không tiết lộ chi tiết nhạy cảm.
- Redirect vào dashboard sau khi login thành công.

Yêu cầu:

- Không log password.
- Không lưu password trong localStorage/sessionStorage.
- Form validation cơ bản cho email/password.
- Disable submit khi đang loading.
- V2-011C giữ `/login` là placeholder tối thiểu; form đăng nhập đầy đủ thuộc task UI sau.
- V2-011D implement `/login` bằng server page + client form component.
- `/login` redirect về `/dashboard` nếu user đã authenticated.
- Login form gọi `POST /api/auth/login`, hiển thị generic safe error khi thất bại và redirect về `/dashboard` khi thành công.
- Chưa có self-registration, forgot password hoặc reset password UI trong phase này.

## Dashboard Shell

Dashboard shell là layout chính sau đăng nhập.

Thành phần dự kiến:

- Sidebar navigation.
- Top bar.
- Tenant switcher.
- User menu.
- Main content area.

Navigation dự kiến:

- Orders.
- Shipments.
- Tracking.
- Callbacks.
- Settings.
- Audit Logs nếu role cho phép.

V2-011C baseline:

- `/dashboard` là server-rendered protected page tối thiểu.
- User chưa authenticated được redirect về `/login`.
- User authenticated thấy email/name, default tenant và membership role.
- Không build full dashboard UI, tenant switcher, orders, shipments hoặc settings trong task này.

V2-011E baseline:

- `/dashboard` có user menu tối thiểu cho authenticated user.
- User menu hiển thị safe identity: name nếu có, email, default tenant và membership role.
- Logout button gọi `POST /api/auth/logout`, disable khi đang pending và redirect về `/login` khi thành công.
- Logout UI không lưu auth data trong browser storage và không expose session token.
- Sau logout thành công, user menu ẩn thông tin authenticated user trước khi điều hướng.

## Tenant Switcher

Yêu cầu:

- Hiển thị tenant hiện tại.
- Cho phép chuyển tenant nếu user thuộc nhiều tenants.
- Sau khi đổi tenant, mọi data view phải reload theo tenant context mới.
- Không cho nhập `tenantId` tùy ý từ UI để bypass quyền.

## Role-Based UI Visibility

- `VIEWER` chỉ thấy read-only views và không thấy mutation actions như create, edit, cancel, retry hoặc delete.
- `OPERATOR` có thể xử lý orders, tạo/cập nhật shipments và xem tracking/callback status theo workflow được phép.
- `ADMIN` có thể quản lý vận hành tenant, settings, team, tenant API keys và carrier accounts theo policy.
- `OWNER` có toàn quyền tenant-level settings, team, API keys và các action nguy hiểm cần confirmation.
- UI visibility chỉ là usability layer; server vẫn phải enforce authorization.

## Orders Table

Yêu cầu:

- Hiển thị orders theo tenant hiện tại.
- Hỗ trợ pagination.
- Hỗ trợ filter theo status, date range và search theo order number/external id.
- Row click mở order detail hoặc shipment drawer tùy thiết kế task sau.
- Empty state rõ khi chưa có orders.
- Error state không expose stack trace.
- V2-021 đã có dashboard order read APIs: `GET /api/orders` và `GET /api/orders/:orderId`.
- Orders UI task sau nên dùng APIs này cho table/detail thay vì gọi database hoặc portal endpoint trực tiếp.
- List API hỗ trợ pagination, status filter, date range, search và safe sorting.
- List response không có `rawPayload`; detail response mặc định cũng không trả `rawPayload`.
- V2-021B đã chốt field exposure contract: list chỉ dùng compact operational fields, detail dùng normalized fields và safe JSON summaries.
- UI không được render `rawPayload`, full `customizationData`, full `fulfillmentFile`, full `listingSnapshot` hoặc full `costCenterSnapshot` mặc định.
- V2-022 đã implement Orders Table UI tối thiểu trong `/dashboard`.
- Orders Table UI gọi `GET /api/orders` với API query params, không gửi `tenantId`.
- Search input debounce khoảng 400ms và không filter toàn bộ orders ở client.
- Status filter, page/pageSize pagination và refresh button dùng API state.
- Row selection gọi `GET /api/orders/:orderId` bằng internal `Order.id`.
- Detail panel hiển thị order summary, items và status history; không render `rawPayload` hoặc mutation actions.
- Detail panel có thể hiển thị các summary field như `fulfillmentFileSummary`, `listingSnapshotSummary`, `costCenterSnapshotSummary`, nhưng không render JSON blob đầy đủ.
- UI có loading, empty, safe error, pagination disabled và refresh pending states.

Columns dự kiến:

- `orderNumber`
- `externalOrderId`
- `source`
- `shopName`
- `marketplace`
- `status`
- `recipientName`
- `destinationCountry`
- `destinationState`
- `destinationCity`
- `shippingService`
- `shippingType`
- `purchaseAt`
- `receivedAt`
- `itemCount`
- `firstSku`
- `firstItemName`
- `totalQuantity`
- `updatedAt`

## Shipment Drawer

Yêu cầu:

- Hiển thị shipment detail trong drawer hoặc side panel.
- Cho thấy carrier, tracking number, status, linked order và shipment items.
- Cho phép action theo role và lifecycle, ví dụ cancel hoặc retry carrier action nếu được hỗ trợ.
- Không hiển thị carrier credentials.

V2-041 manual YunExpress preparation:

- Orders detail có khu vực shipment execution preparation tối thiểu.
- UI gọi `GET /api/shipments?orderId=...` để hiển thị existing shipments của selected order.
- UI cho phép chọn shipment `DRAFT` hoặc `FAILED_CREATE` và carrier `YUNEXPRESS_OMS`.
- UI gọi `GET /api/shipments/:shipmentId/preflight` để lấy safe env presence và mapping preview.
- UI không gửi `tenantId` và không gọi carrier APIs trực tiếp.
- Khi `YUN_OMS_LIVE_ENABLED=false`, UI hiển thị `Live YunExpress OMS shipment creation is disabled.` và disable execute button.
- Khi `YUN_OMS_LIVE_ENABLED=true`, UI phải hiển thị warning mạnh và yêu cầu confirmation checkbox trước khi enable execute; không yêu cầu nhập exact confirmation text.
- UI không auto-submit, không retry tự động, không bulk execute và không lưu auth/carrier data trong browser storage.
- UI không render carrier credentials, Authorization token, `rawResponse`, hashes, cookie values hoặc secrets.
- Sau khi user tự execute thủ công ở phase sau, UI sẵn sàng hiển thị safe shipment status, carrier shipment id, tracking number, label URL hoặc safe error.

V2-050 shipment UI hardening:

- Order detail hiển thị rõ related shipments theo order hiện tại.
- Shipment list hiển thị status, carrier code, carrier shipment id, tracking number, label availability, created/updated time và item count.
- Shipment detail hiển thị shipment items và status history.
- Order detail có form tạo draft shipment từ selected order items và quantity; form gọi `POST /api/shipments` và không execute carrier tự động.
- Draft quantity phải là positive integer và không vượt quá order item quantity.
- Preflight panel hiển thị `liveEnabled`, safe env presence, receiver/package/parcels mapping preview, warnings và carrier `YUNEXPRESS_OMS`.
- Khi `YUN_OMS_LIVE_ENABLED=false`, execute button phải disabled và UI hiển thị live-disabled state.
- Khi `YUN_OMS_LIVE_ENABLED=true`, UI yêu cầu confirmation checkbox và exact text `CREATE YUNEXPRESS SHIPMENT` trước khi enable execute.
- Execute UI phải chống double submit, disable khi pending, không retry tự động và chỉ hiển thị safe result/error summary.
- UI không render `rawResponse`, credentials, Authorization token, API keys, hashes, cookie values, DB credentials hoặc secrets.

## Tracking Timeline

Yêu cầu:

- Hiển thị `TrackingEvent` theo thời gian.
- Phân biệt trạng thái normal, delivered và exception.
- Hiển thị location, event time, description.
- Nếu không có tracking events, hiển thị empty state.
- Không render raw payload mặc định cho user thường.

V2-051 shipment tracking UI:

- Shipment detail có tracking-focused section dùng dữ liệu shipment hiện có, không gọi live carrier tracking API.
- Tracking section hiển thị `Shipment.status`, carrier code, carrier shipment id/waybill, `trackingNumber`, trạng thái label, latest known status từ `ShipmentStatusHistory`, `createdAt` và `updatedAt`.
- Khi chưa có `trackingNumber`, UI hiển thị empty state rõ ràng rằng tracking chưa có.
- Status timeline hiển thị entries theo thứ tự thời gian, status badge, note, actor type an toàn và `createdAt`; không hiển thị internal `actorId` mặc định.
- Nếu `labelUrl` có sẵn, UI hiển thị action `Open Label` mở tab mới; không render label raw string hoặc raw carrier response.
- Tracking sync action hiện là disabled/informational placeholder: `Tracking sync not implemented yet`.
- UI không gọi `getTracking`, không thêm endpoint tracking live và không trigger execute shipment.

V2-052 shipment result/label hardening:

- Shipment detail có carrier result panel riêng để hiển thị trạng thái carrier result mà không expose raw carrier payload.
- Carrier result panel phân biệt các state an toàn: label available, label unavailable, tracking pending, carrier result missing và carrier execution failed.
- `Open Label` chỉ hiển thị khi `labelUrl` tồn tại, mở tab mới và không render full/signed label URL thành text.
- Khi `labelUrl` thiếu, UI hiển thị safe unavailable state: `Label not available yet`.
- Failure statuses `FAILED_CREATE`, `FAILED_LABEL`, `EXCEPTION` phải hiển thị rõ bằng badge/error state và safe message.
- Nếu có failure note trong public `ShipmentStatusHistory`, UI có thể hiển thị note đó; không render raw carrier error payload hoặc `Shipment.metadata` mặc định.
- UI không thêm live label fetch, không gọi `getLabel`, không gọi `getTracking`, không execute shipment tự động.

V2-103 shipment tracking sync action:

- Shipment detail replaces the previous disabled tracking placeholder with a manual `Sync tracking` action.
- Tracking sync never runs on page load, shipment selection, refresh, polling, or automatic state changes.
- The action is shown only when the shipment has a carrier and at least one lookup key: carrier shipment id/waybill, tracking number, order number, or external/customer order number.
- If no lookup key is available, UI shows `Tracking sync requires a waybill, tracking number, or customer order number.`
- `OWNER`, `ADMIN`, and `OPERATOR` may trigger sync; `VIEWER` sees a disabled/read-only state. Server API authorization remains the source of truth.
- The button disables while role is loading, while sync is pending, and after any condition that would make sync unsafe or unavailable.
- On explicit user click, UI calls `POST /api/shipments/:shipmentId/tracking`.
- On success, UI refreshes shipment list/detail and shows a safe summary with updated status, tracking number, latest event summary, and event count.
- Error display maps `401`, `403`, `404`, `429`, and carrier errors to safe user-facing messages.
- UI must not render raw carrier response, raw carrier payload, credentials, Authorization token, `secretRef`, `encryptedPayload`, decrypted payload, master key, cookies, API keys, DB credentials, or secrets.
- Automated tests must not click sync against a shipment that would call the real YunExpress adapter/network; use safe rendering checks or mocked/no-live paths only.

## Settings Pages

Settings dự kiến:

- Tenant profile.
- Members và roles.
- Tenant API keys.
- Carrier accounts.
- Callback/webhook settings.
- Audit logs nếu role cho phép.

Rules:

- Plaintext tenant API key chỉ hiển thị một lần khi tạo.
- Không hiển thị plaintext carrier credentials.
- Các action nguy hiểm cần confirmation rõ.

V2-060 tenant settings UI:

- `/dashboard` có Settings section tối thiểu bên dưới khu Orders/Shipments hiện tại.
- Tenant profile hiển thị tenant name, tenant slug, current user role và membership status từ server auth context.
- Members/roles summary hiện chỉ là read-only view của các tenant memberships có sẵn trong session context; chưa có invite/edit role UI.
- Tenant API Keys panel dùng existing APIs `GET /api/tenants/current/api-keys`, `POST /api/tenants/current/api-keys` và `DELETE /api/tenants/current/api-keys/:apiKeyId`.
- `OWNER` và `ADMIN` thấy list/create/revoke API key actions; `OPERATOR` và `VIEWER` chỉ thấy access-denied/read-only state cho API key management.
- Create form gồm `name`, `scopes` và optional `expiresAt`; scopes hiện tại là `orders:write`, `orders:read`, `tracking:write`, `tracking:read`.
- Plaintext tenant API key chỉ được giữ trong temporary component state sau create response và có nút dismiss để xóa khỏi UI.
- UI không lưu plaintext API key trong `localStorage`/`sessionStorage` và không log create response.
- List/revoke UI không hiển thị plaintext key hoặc `keyHash`; revoke dùng confirmation và refresh list sau khi hoàn tất.
- Settings UI có loading, empty, safe error, pending create/revoke và disabled states.

V2-061 tenant members APIs:

- Platform đã có `GET /api/tenants/current/members` và `PATCH /api/tenants/current/members/:membershipId`.
- Full members management UI chưa implement trong V2-061.
- Future UI nên dùng member APIs này để list members và update role/status, không đọc database trực tiếp.
- UI chỉ nên hiển thị update role/status actions cho `OWNER`/`ADMIN`; server APIs vẫn enforce authorization.
- Future UI phải chặn trạng thái nguy hiểm như self-lockout hoặc last-owner removal dựa trên lỗi API an toàn, không tự giả định thành công.
- Invite/add member và email invitation vẫn là task riêng.

V2-062 tenant members UI:

- Settings section đã có Members panel dùng `GET /api/tenants/current/members` và `PATCH /api/tenants/current/members/:membershipId`.
- Members panel hiển thị safe fields: email, name, user status, role, membership status, createdAt và updatedAt.
- `OWNER`/`ADMIN` thấy controls để update role/status cho existing memberships và phải confirm trước khi apply.
- `OPERATOR`/`VIEWER` chỉ thấy read-only/access-denied state; server APIs vẫn là source of truth cho authorization.
- UI hiển thị safe messages cho `401`, `403`, `404` và `409` last-owner/self-lockout protections.
- Invite/add member, delete/remove member và email invitation vẫn là future tasks; UI chỉ hiển thị disabled placeholder.
- UI không render `passwordHash`, `tokenHash`, session data, API key hashes, secrets hoặc internal raw metadata.

V2-070 audit log viewer:

- Settings section có Audit Logs panel dùng `GET /api/tenants/current/audit-logs`.
- `OWNER`/`ADMIN` có thể xem audit logs của default ACTIVE tenant.
- `OPERATOR`/`VIEWER` thấy restricted/access-denied state hoặc không thấy dữ liệu audit.
- Audit Logs panel hiển thị createdAt, action, actorType, resourceType, resourceId và sanitized metadata summary.
- UI hỗ trợ filter theo action, resourceType, date range và pagination.
- UI có loading, empty và safe error states.
- UI không render raw metadata bằng `JSON.stringify`, không render raw carrier response, raw payload, API keys, hashes, credentials, cookie values hoặc secrets.
- V2-071 hardening: UI hiển thị `redactedFieldsCount`, `redactedFieldCategories` và `omittedMetadataKeysCount` như summary an toàn, không hiển thị exact sensitive field names.
- Nested metadata chỉ hiển thị object/array summary; arrays chỉ hiển thị số lượng phần tử, không render raw values.
- Audit export/download chưa implement trong task này.

V2-099 carrier credential UI:

- Settings section co Carrier Accounts panel dung current-tenant carrier account APIs.
- `OWNER`/`ADMIN` co the list/create/update carrier accounts, save encrypted `YUNEXPRESS_OMS` credential, va disable active credential.
- `OPERATOR`/`VIEWER` chi thay restricted/access-denied state; UI khong hien credential forms hoac mutation controls.
- Carrier account list chi hien safe summary: carrier code, display name, status, default state, credential status/type/key prefix, va timestamps.
- UI khong render plaintext credentials, raw `secretRef`, `encryptedPayload`, decrypted payload, master key, Authorization token, cookies, API keys hoac secrets.
- Encrypted credential form gom `customerNo`, password-type `apiSecret`, `baseUrl`, `lang`, default shipping/source/size config va `liveEnabled`.
- `apiSecret` va sensitive inputs dung `autocomplete="off"`; credential form state duoc clear sau successful submit, va `apiSecret` duoc clear khi save failed.
- `liveEnabled` default `false`. Khi user chon `true`, UI hien warning manh ve operational risk nhung khong trigger bat ky live carrier action nao.
- UI khong validate credentials against YunExpress live endpoint va khong goi carrier APIs truc tiep.
- Secret reference mode UI chua implement; se la future task neu can secret manager/vault workflow.

## Platform YunExpress Webhook Management

`/platform/yun-webhooks` is a Platform Admin/Support console for reviewing
received YunExpress webhook events.

Rules:

- `PLATFORM_ADMIN` and `PLATFORM_SUPPORT` can view webhook event list/detail.
- Only `PLATFORM_ADMIN` can see/use `Reprocess` for eligible `FAILED` or `UNMATCHED` events.
- The page includes a setup panel with the manual Yuntu/YunExpress registration URL, receiver enabled status, encryption-key configured status, required header names, expected body shape, and checklist.
- The setup panel must never render `YUN_WEBHOOK_ENCRYPT_KEY`, full signatures, decrypted secrets, encrypted payload values, carrier credentials, cookies, session tokens, DB URLs, or Authorization headers.
- Event summary cards should provide quick filters for all events, needs attention, failed, unmatched, tracking, fee, and abnormal.
- The UI must not call YunExpress carrier APIs directly and must not trigger shipment create/cancel.
- The UI must not render raw encrypted body, full signature, Authorization, API secrets, carrier credentials, cookies, session tokens, DB URLs, or webhook keys.
- Decrypted payload and safe metadata must render through `SafeMetadataViewer` or equivalent bounded redaction.
- Filters should support status, category, waybill, tracking, customer order, search, and date range.
- Detail panel should show safe links/ids for tenant, shipment, and shipment cost when available.

## Loading State Rules

- Button action phải có loading state và disable double submit.
- Table/list phải có skeleton hoặc loading row.
- Drawer/detail phải có loading state riêng.
- Không để UI nhảy layout quá mức khi load.

## Empty State Rules

- Empty state phải nêu object đang trống, ví dụ orders, shipments hoặc tracking events.
- Empty state có thể có CTA nếu user có quyền tạo dữ liệu.
- Không dùng empty state để mô tả nội bộ technical quá dài.

## Error State Rules

- Error message phải ngắn, an toàn và actionable.
- Không expose stack trace, SQL, tokens, carrier raw errors hoặc secrets.
- Với lỗi permission, hiển thị access denied rõ.
- Với lỗi network, cho phép retry nếu phù hợp.

## Client Secret Rules

- Không lưu secrets trong frontend bundle.
- Không dùng `NEXT_PUBLIC_` cho secrets.
- Không lưu tenant API key sau khi tạo.
- Không render carrier credentials.
- Không log sensitive request/response vào browser console.
