# 04 API Contract

Tài liệu này định nghĩa API contract dự kiến. Đây chưa phải implementation.

## Standard API Response Format

Response thành công:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Quy tắc:

- `success` luôn là boolean.
- `data` chứa payload chính.
- `meta` chứa pagination, request id hoặc thông tin phụ.

## Standard Error Response Format

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Quy tắc:

- `error.code` là machine-readable.
- `error.message` là human-readable nhưng không expose secrets.
- `error.details` chỉ chứa thông tin an toàn.
- Không trả stack trace cho client.

## Standard Error Codes

- `VALIDATION_ERROR`: input không hợp lệ.
- `UNAUTHORIZED`: chưa xác thực hoặc session/API key không hợp lệ.
- `FORBIDDEN`: đã xác thực nhưng không đủ quyền.
- `NOT_FOUND`: resource không tồn tại trong tenant context hiện tại.
- `TENANT_ACCESS_DENIED`: user hoặc API key không có quyền truy cập tenant.
- `CONFLICT`: request xung đột với state hiện tại hoặc unique constraint.
- `RATE_LIMITED`: request bị giới hạn tần suất hoặc abuse guard chặn tạm thời.
- `CARRIER_ERROR`: carrier trả lỗi hoặc carrier action thất bại.
- `INTEGRATION_ERROR`: lỗi integration ngoài carrier hoặc callback/webhook.
- `INTERNAL_ERROR`: lỗi server không mong muốn.

## Rate Limit Response

Khi endpoint bị rate limit, API trả HTTP `429` với response chuẩn:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

Rate limit response không trả internal counters, raw key, session token, IP details hoặc thông tin giúp attacker điều chỉnh request.

## YunExpress Webhook API

- `GET /api/webhooks/yunexpress/events`: public health check for webhook endpoint availability.
- `POST /api/webhooks/yunexpress/events`: public YunExpress/Yuntu webhook receiver.
- Auth model: carrier signature verification, not dashboard session and not tenant API key.
- Required headers:
  - `X-Openapi-Request-Timestamp`
  - `X-Openapi-Signature`
- Request body:

```json
{
  "encrypt": "BASE64_ENCRYPTED_PAYLOAD"
}
```

YunExpress/Yuntu subscription activation may send a plain JSON challenge before
encrypted events are pushed:

```json
{
  "ACK": "challenge-value"
}
```

The receiver replies with the exact `ACK` value as `text/plain` within the
request and does not store or dispatch this activation request. `ACK` may be
sent as a string or number; the receiver echoes the string form of that value.
If Encryption Strategy is enabled, the activation challenge may use the normal
encrypted body shape; the receiver verifies the signature, decrypts the payload,
and echoes the decrypted top-level `ACK` value.

Processing rules:

- Server verifies `sha256(timestamp + YUN_WEBHOOK_ENCRYPT_KEY + rawBody)` using the exact raw request body.
- Server decrypts `encrypt` with AES-256-CBC using `SHA256(YUN_WEBHOOK_ENCRYPT_KEY)` as the AES key and the first 16 encrypted bytes as IV.
- Accepted webhook response is plain text `success`, not the standard JSON API response envelope.
- Events are stored in `YunWebhookEvent`, deduplicated by `eventId` when available, and dispatched by event category.
- Tracking events may update `Shipment.trackingNumber`, normalized shipment status, status history, and source-aware Portal tracking callback when tracking newly appears.
- Fee events may update existing `ShipmentCost.actual*` fields and set actual fee status to `AVAILABLE`.
- Abnormal events are stored/upserted as `YunAbnormalCase`; operator actions against abnormal cases are outside this endpoint.
- Unmatched events are stored as `UNMATCHED`; the platform must not create fake orders or shipments from webhook data alone.

## Platform YunExpress Webhook Management APIs

- `GET /api/platform/yun-webhooks`: list received YunExpress webhook events for Platform Admin/Support review.
- `GET /api/platform/yun-webhooks/setup`: show safe manual registration URL and receiver configuration status.
- `GET /api/platform/yun-webhooks/:eventId`: view one webhook event detail with sanitized decrypted payload.
- `POST /api/platform/yun-webhooks/:eventId/reprocess`: reprocess one `FAILED` or `UNMATCHED` event.

Rules:

- Requires active `PLATFORM_ADMIN` or `PLATFORM_SUPPORT` for read APIs.
- Reprocess requires `PLATFORM_ADMIN`, same-origin validation, and dashboard mutation rate limit.
- Setup API returns only safe booleans and URLs: receiver enabled, encryption key configured, receiver path, webhook URL, required header names, request body shape, and registration checklist.
- Setup API never returns `YUN_WEBHOOK_ENCRYPT_KEY`, signatures, decrypted payloads, encrypted payloads, carrier credentials, cookies, session tokens, API keys, DB URLs, or Authorization headers.
- Reprocess does not call YunExpress create/cancel/abnormal action APIs. It only re-runs internal tracking, fee, or abnormal event dispatch from the stored decrypted payload.
- Reprocess is allowed only for `FAILED` and `UNMATCHED`; `RECEIVED`, `PROCESSED`, and `DUPLICATE` are not reprocessed.
- List/detail responses never return `rawEncryptedBody`, full signature, Authorization headers, carrier credentials, API secrets, cookies, DB URLs, session tokens, raw credentials, or plaintext webhook keys.
- Detail payloads must be sanitized/redacted before display. UI must render through `SafeMetadataViewer` or equivalent bounded redaction.

List query params:

- `page`, `pageSize`
- `attention=true`: shortcut for `FAILED` or `UNMATCHED` events.
- `status`: `RECEIVED`, `PROCESSED`, `DUPLICATE`, `FAILED`, `UNMATCHED`
- `eventCategory`: `TRACKING`, `FEE`, `ABNORMAL`, `UNKNOWN`
- `eventType`
- `tenantId`, `shipmentId`
- `waybillNumber`, `trackingNumber`, `customerOrderNumber`
- `search`
- `from`, `to`
- `sortOrder`: `asc` or `desc`

## Same-Origin Mutation Rule

Cookie-authenticated dashboard mutation APIs phải pass same-origin guard dựa trên `Origin` hoặc `Referer`.

Rules:

- Guard áp dụng cho session-cookie mutation routes như login/logout side effects, tenant API key create/revoke, member update, shipment create/execute.
- Guard không áp dụng cho `GET` routes.
- Guard không áp dụng cho Portal API key endpoint `POST /api/portal/orders`; endpoint này dùng tenant API key auth và rate limit riêng.
- Allowed origins lấy từ `APP_URL`, `NEXT_PUBLIC_APP_URL`, và localhost dev origins khi `APP_ENV` là local/test/development.
- Production không dùng wildcard origin.

## Tenant Context Rule

- Dashboard APIs resolve tenant từ session và tenant membership của user.
- Portal APIs resolve tenant từ tenant API key.
- Client không được truyền `tenantId` tự do để override tenant context.
- Nếu URL có `tenantId`, server vẫn phải verify quyền truy cập tenant từ session.
- Resource lookup phải scoped theo tenant context trước khi trả data hoặc `NOT_FOUND`.

## Pagination Format

Request query dự kiến:

```text
?page=1&pageSize=50
```

Response meta:

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 120,
    "totalPages": 3
  }
}
```

Cursor pagination có thể được thêm sau cho bảng log lớn.

## Auth APIs

- `POST /api/auth/login`: implemented in V2-011B, đăng nhập user bằng email/password.
- `POST /api/auth/logout`: implemented in V2-011B, đăng xuất và clear session cookie.
- `GET /api/auth/me`: implemented in V2-011B, lấy user/session hiện tại.
- `GET /api/auth/session`: deprecated planned name; use `GET /api/auth/me`.
- `POST /api/auth/change-password`: đổi password.
- `POST /api/auth/forgot-password`: planned, chưa ưu tiên MVP.
- `POST /api/auth/reset-password`: planned, chưa ưu tiên MVP.

Login và me response data:

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "status": "ACTIVE"
  },
  "tenants": [
    {
      "tenantId": "tenant_id",
      "tenantName": "Tenant Name",
      "tenantSlug": "tenant-slug",
      "role": "OWNER",
      "membershipStatus": "ACTIVE"
    }
  ]
}
```

Auth APIs không trả `passwordHash`, `tokenHash`, raw session token hoặc API key hashes.

## Tenant APIs Planned

- `GET /api/tenants`: danh sách tenants user có quyền truy cập.
- `GET /api/tenants/:tenantId`: chi tiết tenant.
- `PATCH /api/tenants/:tenantId`: cập nhật tenant settings.
- `GET /api/tenants/:tenantId/memberships`: danh sách memberships.
- `POST /api/tenants/:tenantId/memberships`: mời hoặc thêm user.
- `PATCH /api/tenants/:tenantId/memberships/:membershipId`: cập nhật role/status.

## Tenant Member APIs

V2-061 implement MVP current-tenant member management endpoints:

- `GET /api/tenants/current/members`: list members cho default ACTIVE tenant của authenticated user.
- `PATCH /api/tenants/current/members/:membershipId`: cập nhật role/status cho existing membership trong default ACTIVE tenant.

Rules:

- Yêu cầu authenticated dashboard session.
- Server resolve tenant từ ACTIVE membership đầu tiên trong session context.
- Client không được truyền `tenantId` để override tenant context.
- `OWNER` và `ADMIN` có thể list/update members.
- `OPERATOR` và `VIEWER` không được manage members.
- Không implement `POST` add/invite member, invite email hoặc delete member trong V2-061.
- Missing/cross-tenant membership trả `404 NOT_FOUND`.
- Response không trả `passwordHash`, `tokenHash`, session data, API key hashes hoặc secrets.
- Update role/status không được làm tenant mất active owner cuối cùng.
- User không được tự demote/disable owner membership của chính mình nếu việc đó xóa effective owner access.
- Role update ghi audit `MEMBER_ROLE_UPDATED`.
- Status update ghi audit `MEMBER_STATUS_UPDATED`.

List response data:

```json
{
  "members": [
    {
      "membershipId": "membership_id",
      "userId": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "userStatus": "ACTIVE",
      "role": "OWNER",
      "membershipStatus": "ACTIVE",
      "createdAt": "2026-05-20T00:00:00.000Z",
      "updatedAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```

Patch request:

```json
{
  "role": "OPERATOR",
  "membershipStatus": "ACTIVE"
}
```

Patch rules:

- `role` optional, allowed values: `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`.
- `membershipStatus` optional, allowed values for V2-061 update: `ACTIVE`, `DISABLED`.
- At least one of `role` or `membershipStatus` is required.
- `status` is accepted as a backwards-compatible alias for `membershipStatus`.

Patch response data:

```json
{
  "member": {
    "membershipId": "membership_id",
    "userId": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "userStatus": "ACTIVE",
    "role": "OPERATOR",
    "membershipStatus": "ACTIVE",
    "createdAt": "2026-05-20T00:00:00.000Z",
    "updatedAt": "2026-05-20T00:00:00.000Z"
  }
}
```

## Tenant Audit Log APIs

V2-070 implement MVP current-tenant audit log viewer endpoint:

- `GET /api/tenants/current/audit-logs`: list audit logs cho default ACTIVE tenant của authenticated user.

Rules:

- Yêu cầu authenticated dashboard session.
- Server resolve tenant từ ACTIVE membership đầu tiên trong session context.
- Client không được truyền `tenantId` để override tenant context.
- `OWNER` và `ADMIN` có thể view audit logs.
- `OPERATOR` và `VIEWER` không được view audit logs.
- Repository lookup luôn filter theo `tenantId`.
- Response chỉ trả metadata đã sanitize, không trả raw metadata mặc định.
- Response không trả secrets, raw API keys, `keyHash`, `passwordHash`, `tokenHash`, raw session token, raw carrier response, raw request body có PII/secrets hoặc DB credentials.

Query params:

- `page`: positive integer, default `1`.
- `pageSize`: positive integer, default `20`, max `100`.
- `action`: optional string, tối đa 100 ký tự.
- `actorType`: optional, one of `USER`, `API_KEY`, `SYSTEM`.
- `resourceType`: optional string, tối đa 100 ký tự.
- `from`: optional ISO date cho `createdAt >= from`.
- `to`: optional ISO date cho `createdAt <= to`.
- `sortOrder`: `asc` hoặc `desc`, default `desc`.

Response data:

```json
{
  "auditLogs": [
    {
      "id": "audit_log_id",
      "actorType": "USER",
      "actorUserId": "user_id",
      "action": "MEMBER_ROLE_UPDATED",
      "resourceType": "TenantMembership",
      "resourceId": "membership_id",
      "metadata": {
        "membershipId": "membership_id",
        "previousRole": "VIEWER",
        "nextRole": "OPERATOR"
      },
      "createdAt": "2026-05-21T00:00:00.000Z"
    }
  ]
}
```

Response meta:

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Metadata sanitizer rules:

- Primitive values are allowed by default.
- Nested objects/arrays are summarized instead of returned raw.
- Suspicious keys are omitted case-insensitively and format-insensitively, including `token`, `secret`, `password`, `apiKey`, `api_key`, `keyHash`, `key_hash`, `authorization`, `authHeader`, `cookie`, `session`, `rawResponse`, `raw_response`, `rawPayload`, `raw_payload`, `credential`, `credentials`, `customerNo`, `customer_no`, `apiSecret`, `api_secret`, `bearer`, `privateKey`, `private_key`, `accessToken`, `refreshToken`.
- Suspicious primitive string values are redacted even when the key looks safe, including `Bearer ...`, `Basic ...`, JWT-like strings, long opaque token-like strings, known API key prefixes, and database/connection-string-like values.
- Sanitized metadata returns safe summary fields such as `redactedFieldsCount`, `redactedFieldCategories`, and `omittedMetadataKeysCount`; it must not return exact sensitive field names.
- Returned metadata is size-limited: max top-level keys, max string length, max nested object key summaries, and arrays are summarized by length only.
- UI consumers must render sanitized key/value summaries only and must not call `JSON.stringify(metadata)` for display.

## Tenant API Key APIs

V2-012 implement MVP current-tenant API key endpoints:

- `GET /api/tenants/current/api-keys`: list tenant API keys cho default ACTIVE tenant của authenticated user.
- `POST /api/tenants/current/api-keys`: tạo tenant API key mới cho default ACTIVE tenant.
- `DELETE /api/tenants/current/api-keys/:apiKeyId`: revoke tenant API key.

Rules:

- Server resolve tenant từ authenticated session và ACTIVE membership đầu tiên.
- Client không được truyền `tenantId` để override tenant context.
- `OWNER` và `ADMIN` có thể list/create/revoke tenant API keys.
- `OPERATOR` và `VIEWER` không được manage tenant API keys.
- List/revoke không bao giờ trả plaintext key hoặc `keyHash`.
- Create response trả plaintext `apiKey` đúng một lần.

Create request:

```json
{
  "name": "Portal Production",
  "scopes": ["orders:write"],
  "expiresAt": null
}
```

Allowed scopes hiện tại:

- `orders:write`
- `orders:read`
- `tracking:write`
- `tracking:read`

Create response data:

```json
{
  "apiKey": "plaintext_key_visible_once",
  "apiKeyRecord": {
    "id": "api_key_id",
    "name": "Portal Production",
    "keyPrefix": "lngfp_xxxx",
    "scopes": ["orders:write"],
    "status": "ACTIVE",
    "expiresAt": null,
    "lastUsedAt": null,
    "revokedAt": null,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
}
```

List response data:

```json
{
  "apiKeys": [
    {
      "id": "api_key_id",
      "name": "Portal Production",
      "keyPrefix": "lngfp_xxxx",
      "scopes": ["orders:write"],
      "status": "ACTIVE",
      "expiresAt": null,
      "lastUsedAt": null,
      "revokedAt": null,
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
    }
  ]
}
```

V2-060 dashboard UI handling:

- Tenant Settings UI dùng các endpoint trên cho API key management của default ACTIVE tenant.
- Plaintext `apiKey` từ create response chỉ được hiển thị một lần trong temporary component state.
- UI không persist plaintext key trong browser storage và không log create response.
- Revoke UI gọi `DELETE` và coi kết quả là trạng thái `REVOKED`, không giả định hard delete.
- `OPERATOR` và `VIEWER` không gọi management actions từ UI; server APIs vẫn là source of truth cho authorization.

## Portal Receive API

- `POST /api/portal/orders`: implemented in V2-020, nhận order batch từ external portal bằng tenant API key.
- `GET /api/portal/orders/:externalOrderId`: planned, tra cứu order theo external id.

Rules:

- Request phải authenticate bằng tenant API key.
- API key được đọc từ `Authorization: Bearer <key>` hoặc `X-Tenant-API-Key`.
- API key phải `ACTIVE`, chưa expired và có scope `orders:write`.
- API key resolve ra `tenantId`; server không tin `tenantId` trong request body.
- Nếu client gửi `tenantId`, V2-020 bỏ qua giá trị đó và dùng tenant context từ API key.
- Browser-based Portal clients may call this endpoint cross-origin only when CORS allows the origin. Local/test/development auto-allows `localhost:<port>` and `127.0.0.1:<port>`; deployed Portal origins must be configured explicitly via `PORTAL_CORS_ORIGINS`.
- Preflight `OPTIONS /api/portal/orders` returns CORS headers for allowed origins and allows `Content-Type`, `Authorization`, and `X-Tenant-API-Key`.
- Không log hoặc trả raw API key, `keyHash`, DB credentials hoặc secrets.
- Body shape invalid trả `400 VALIDATION_ERROR`.
- Missing/invalid/revoked/expired API key trả `401 UNAUTHORIZED`.
- Per-order validation error trong batch được trả trong `data.errors`; các order hợp lệ vẫn được xử lý.
- Duplicate `externalOrderId` trong cùng tenant được skip idempotently, không tạo duplicate và không update destructive fields.

Request body:

```json
{
  "orders": [
    {
      "externalOrderId": "EXT-123",
      "orderNumber": "ORD-123",
      "source": "portal",
      "sourceChannel": "AMAZON",
      "recipient": {
        "name": "Jane Doe",
        "phone": "123456789",
        "email": "jane@example.com",
        "address": {
          "line1": "123 Main St",
          "city": "Austin",
          "state": "TX",
          "postalCode": "73301",
          "country": "US"
        }
      },
      "items": [
        {
          "externalItemId": "ITEM-1",
          "sku": "SKU-1",
          "name": "Item name",
          "quantity": 1,
          "weight": 0.1,
          "declaredValue": 10
        }
      ],
      "metadata": {}
    }
  ]
}
```

Portal compatibility body:

```json
{
  "data": [
    {
      "orderId": "112-0745906-0345025-R1",
      "customer_infor": {
        "name": "Jane Doe",
        "address": "123 Main St",
        "address_2": "",
        "city": "Austin",
        "state": "TX",
        "zip_code": "73301",
        "country": "US",
        "phone_number": "123456789"
      },
      "status": "Fulfilled",
      "purchase_date": "2026-05-28T03:51:03.369Z",
      "shopName": "QA Test Shop",
      "shipping_type": "Standard",
      "items": [
        {
          "orderItemId": "ITEM-1",
          "sku": "SKU-1",
          "title": "Personalized item",
          "quantity": 1,
          "version3Data": [
            { "label": "Color", "value": "Gray" }
          ],
          "snapshotImage": "https://example.test/snapshot.jpg",
          "fulfillment_file": {
            "front": "https://example.test/front.jpg"
          }
        }
      ]
    }
  ]
}
```

Validation:

- `orders` hoặc `data` array là bắt buộc.
- Batch tối đa 50 orders.
- Mỗi order cần `externalOrderId` hoặc alias `orderId`.
- `items` là bắt buộc và không được rỗng.
- `item.quantity` phải là positive integer.
- Recipient fields optional trong V2-020.
- Single order object không có `orders` hoặc `data` bị reject với `400 VALIDATION_ERROR`.
- Unknown fields không bị reject; server giữ full source object trong `rawPayload`.

- `source` identifies the integration path, such as `portal`; `sourceChannel` identifies the sales channel and accepts `AMAZON`, `ETSY`, `MANUAL`, or `UNKNOWN`.
- If `sourceChannel` is missing, server infers Amazon from standard Amazon order-number format when possible; otherwise it stores `UNKNOWN`.

V2-020B richer Portal/MVP-like payload support:

- Request batch aliases accepted: `orders` and Portal `data`.
- Order-level aliases accepted: `orderId`, `merchantId`, `marketplaceId`, `customer_infor`, `status`, `createdAt`, `base_cost`, `case`, `address_validation`, `scale_overall_status`, `scaledBy`, `seller`, `shipping_type`, `purchase_date`, `payments_date`.
- Recipient aliases accepted: `address`, `address_2`, `zip_code`, `phone_number`.
- Item-level aliases accepted: `orderItemId`, `title`, `version3Data`, `baseImageUrl`, `totalCustomizationPrice`, `customized_url`, `snapshotImage`, `fulfillment_file`, `tracking_info`, `listing`, `cost_center`, `scale_status`, `qc_note`.
- Server normalizes common fields into columns for search, shipment preparation, production review and audit.
- Server still stores original order/item source object in `rawPayload`.
- Server stores safe Portal operational fields in `metadata`/JSON snapshots for detail display, including seller/scaler summaries, cost center snapshot, listing snapshot, fulfillment file links, customization options, and portal tracking info.
- List APIs do not return `rawPayload` or large JSON snapshots.
- Detail APIs continue to omit `rawPayload` and raw large JSON snapshots by default. They may return curated safe display fields derived from metadata/snapshots.

Success response data:

```json
{
  "received": 2,
  "inserted": 1,
  "updated": 0,
  "skipped": 1,
  "errors": [
    {
      "externalOrderId": "EXT-2",
      "code": "VALIDATION_ERROR",
      "message": "items is required"
    }
  ],
  "orders": [
    {
      "id": "order_id",
      "tenantId": "tenant_id",
      "externalOrderId": "EXT-123",
      "status": "READY_TO_SHIP",
      "receivedAt": "2026-05-19T00:00:00.000Z"
    }
  ]
}
```

## Order APIs

- `GET /api/orders`: implemented in V2-021, danh sách orders theo default ACTIVE tenant của dashboard session.
- `POST /api/orders`: tạo order nội bộ.
- `GET /api/orders/:orderId`: implemented in V2-021, chi tiết order theo internal `Order.id`.
- `PATCH /api/orders/:orderId`: cập nhật order allowed fields.
- `POST /api/orders/:orderId/cancel`: hủy order nếu lifecycle cho phép.

Rules for implemented read APIs:

- Yêu cầu authenticated dashboard session.
- Server resolve default/current tenant từ ACTIVE tenant membership của user.
- `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER` đều có thể list/view orders trong tenant.
- MVP không nhận arbitrary `tenantId` query param; nếu client gửi `tenantId`, endpoint trả `400 VALIDATION_ERROR`.
- Repository lookup luôn filter theo `tenantId`.
- Detail API trả `404 NOT_FOUND` nếu order không tồn tại trong tenant context hiện tại, bao gồm trường hợp order thuộc tenant khác.
- V2-021B field exposure contract: repository/service chỉ select và map các field public có chủ đích, không trả full Prisma object.
- List API không trả `rawPayload`, `recipientAddress`, `metadata`, `customizationData`, `fulfillmentFile`, `listingSnapshot`, `costCenterSnapshot` hoặc JSON lớn.
- Detail API không trả `rawPayload` mặc định, không trả full `customizationData` hoặc full JSON blobs mặc định.

`GET /api/orders` query params:

- `page`: positive integer, default `1`.
- `pageSize`: positive integer, default `20`, max `100`.
- `status`: optional `OrderStatus`.
- `sourceChannel`: optional, one of `AMAZON`, `ETSY`, `MANUAL`, `UNKNOWN`.
- `search`: optional search trên `externalOrderId`, `orderNumber`, `recipientName`.
- `from`: optional ISO date cho `receivedAt >= from`.
- `to`: optional ISO date cho `receivedAt <= to`.
- `sortBy`: one of `receivedAt`, `createdAt`, `updatedAt`, `externalOrderId`, `orderNumber`, `status`; default `receivedAt`.
- `sortOrder`: `asc` hoặc `desc`; default `desc`.

- `include`: optional. `expanded` returns the current page list plus safe expanded row data in one response. This is intended for expandable table UIs and avoids per-row `GET /api/orders/:orderId` and per-row shipment list calls.

`GET /api/orders/:orderId` remains the single-order detail endpoint and should not be used to build paginated list screens by looping over list ids.

Future expandable/list UIs should follow the same rule: list endpoints return the filtered/paginated working set, and opt-in include or batch shapes provide row expansion data. Detail endpoints are for a single selected resource, not list hydration loops.

List response:

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "externalOrderId": "EXT-123",
        "orderNumber": "ORD-123",
        "source": "portal",
        "sourceChannel": "AMAZON",
        "shopName": "QA Test Shop",
        "marketplace": "amazon-us",
        "status": "READY_TO_SHIP",
        "recipientName": "Jane Doe",
        "destinationCountry": "US",
        "destinationState": "TX",
        "destinationCity": "Austin",
        "destinationPostalCode": "73301",
        "shippingService": "Standard",
        "shippingType": "standard",
        "purchaseAt": "2026-05-18T00:00:00.000Z",
        "paidAt": "2026-05-18T01:00:00.000Z",
        "receivedAt": "2026-05-19T00:00:00.000Z",
        "createdAt": "2026-05-19T00:00:00.000Z",
        "updatedAt": "2026-05-19T00:00:00.000Z",
        "itemCount": 1,
        "firstSku": "SKU-1",
        "firstItemName": "Item name",
        "totalQuantity": 1
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

Detail response data:

```json
{
  "order": {
    "id": "order_id",
    "externalOrderId": "EXT-123",
    "orderNumber": "ORD-123",
    "source": "portal",
    "sourceChannel": "AMAZON",
    "sourceAccount": "store-account-1",
    "shopName": "QA Test Shop",
    "marketplace": "amazon-us",
    "externalStatus": "paid",
    "purchaseAt": "2026-05-18T00:00:00.000Z",
    "paidAt": "2026-05-18T01:00:00.000Z",
    "status": "READY_TO_SHIP",
    "recipientName": "Jane Doe",
    "recipientPhone": "123456789",
    "recipientEmail": "jane@example.com",
    "recipientAddress": {
      "line1": "123 Main St",
      "country": "US"
    },
    "destinationCountry": "US",
    "destinationState": "TX",
    "destinationCity": "Austin",
    "destinationPostalCode": "73301",
    "shippingService": "Standard",
    "shippingType": "standard",
    "currency": "USD",
    "orderTotal": "10",
    "portalMetadata": {
      "merchantId": "merchant-account-1",
      "marketplaceId": "ATVPDKIKX0DER",
      "portalCreatedAt": "2026-05-28T03:51:03.373Z",
      "baseCost": "15.05",
      "addressValidation": true,
      "scaleOverallStatus": "Sent",
      "scaledBy": {
        "id": "user-source-id",
        "name": "Scaler Name",
        "email": "scaler@example.test"
      },
      "seller": {
        "id": null,
        "name": "Seller Name",
        "email": "seller@example.test"
      }
    },
    "receivedAt": "2026-05-19T00:00:00.000Z",
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z",
    "items": [
      {
        "id": "order_item_id",
        "externalItemId": "ITEM-1",
        "sku": "SKU-1",
        "name": "Item name",
        "title": "Item title",
        "asin": "B000TEST",
        "listingId": "LISTING-1",
        "productType": "cap",
        "variant": "black",
        "quantity": 1,
        "unitPrice": "10",
        "currency": "USD",
        "weight": "0.1",
        "declaredValue": "10",
        "customizationUrl": "https://example.test/custom",
        "snapshotImageUrl": "https://example.test/image.png",
        "baseImageUrl": "https://example.test/base.png",
        "totalCustomizationPrice": "16.9",
        "customizationOptions": [
          { "label": "Color", "value": "Gray" }
        ],
        "trackingInfo": {
          "fulfillment": "Merchize",
          "status": "New",
          "tracking": "",
          "note": ""
        },
        "fulfillmentFiles": {
          "front": "https://example.test/front.jpg"
        },
        "costCenter": {
          "vendorProductId": "vendor-product-id",
          "vendorProductDisplayName": "Vendor product name",
          "vendorProductSKU": "SKU-VENDOR",
          "sizeValue": "One size",
          "colorValue": null
        },
        "listing": {
          "asinType": "Normal",
          "productImageUrl": "https://example.test/product.png",
          "psd": {
            "status": "Available",
            "fileExt": ".zip",
            "archive": true,
            "fileName": "B000TEST.zip",
            "mime": "application/zip",
            "psdId": "B000TEST",
            "size": "122354",
            "url": "https://example.test/B000TEST.zip"
          }
        },
        "fulfillmentFileSummary": {
          "type": "object",
          "keys": ["url"]
        },
        "listingSnapshotSummary": {
          "type": "object",
          "keys": ["title"]
        },
        "costCenterSnapshotSummary": {
          "type": "object",
          "keys": ["code"]
        },
        "productionStatus": "READY",
        "scaleStatus": "SCALED",
        "qcNote": null,
        "createdAt": "2026-05-19T00:00:00.000Z",
        "updatedAt": "2026-05-19T00:00:00.000Z"
      }
    ],
    "statusHistory": [
      {
        "id": "status_history_id",
        "status": "READY_TO_SHIP",
        "note": "Portal order received.",
        "actorType": "API_KEY",
        "createdAt": "2026-05-19T00:00:00.000Z"
      }
    ]
  }
}
```

Không trả mặc định:

- `rawPayload` trên `Order` hoặc `OrderItem`.
- `metadata`.
- `customizationData`.
- Full `fulfillmentFile`, `listingSnapshot`, `costCenterSnapshot`.
- Secrets, key hashes, token hashes, raw session token, DB credentials.

Future debug flag chưa implement:

- `GET /api/orders/:orderId?includeRaw=true` chỉ được cân nhắc trong task riêng.
- Nếu thêm sau này, chỉ `OWNER`/`ADMIN` được dùng và phải ghi `AuditLog`.

## Shipment APIs

- `GET /api/shipments`: implemented in V2-030, danh sách shipments theo default ACTIVE tenant của dashboard session.
- `POST /api/shipments`: implemented in V2-030, tạo draft shipment từ order/order items.
- `GET /api/shipments/:shipmentId`: implemented in V2-030, chi tiết shipment theo internal `Shipment.id`.
- `POST /api/shipments/:shipmentId/execute`: implemented in V2-032, internal shipment execution workflow qua carrier adapter boundary.
- `GET /api/shipments/:shipmentId/preflight`: implemented in V2-041, kiểm tra readiness an toàn trước khi user tự tạo YunExpress shipment thủ công từ UI.
- `POST /api/shipments/:shipmentId/cancel`: hủy shipment nếu lifecycle và carrier cho phép.
- `POST /api/shipments/:shipmentId/tracking`: implemented in V2-102, dashboard-triggered tracking sync using carrier adapter `getTracking`.

Rules for implemented shipment APIs:

- Yêu cầu authenticated dashboard session.
- Server resolve default/current tenant từ ACTIVE tenant membership của user.
- `OWNER`, `ADMIN`, `OPERATOR` có thể tạo draft shipment.
- `VIEWER` có thể list/view nhưng không thể tạo draft shipment.
- Client không được gửi `tenantId`; server luôn dùng tenant context từ session.
- Repository lookup luôn filter theo `tenantId`.
- Missing hoặc cross-tenant shipment trả `404 NOT_FOUND`.
- V2-030 không gọi carrier APIs, không tạo label, không ingest tracking và không gửi callback.
- Tạo draft shipment không tự động đổi `Order.status`.
- V2-032 execute endpoint không gọi carrier API khi adapter chưa đăng ký và không mutate shipment trong trường hợp này.
- V2-040 register `YUNEXPRESS_OMS` adapter; khi `YUN_OMS_LIVE_ENABLED=false`, execute trả controlled `CARRIER_ERROR` trước network call và không mutate shipment.
- V2-041 preflight endpoint không gọi YunExpress network và chỉ trả safe env presence + mapping preview.
- V2-100 shipment execute/preflight resolves `YUNEXPRESS_OMS` credentials in priority order: tenant active default `CarrierAccount` + active `CarrierCredential`, then `YUN_OMS_*` env fallback, then controlled `CARRIER_ERROR` if neither source is usable.
- V2-100 preflight may return safe credential source fields: `credentialSource`, `credentialConfigured`, and `liveEnabled`; it never returns customer number, API secret, `secretRef`, `encryptedPayload`, decrypted payload, or master key.
- Preflight không trả carrier credentials, Authorization token, `rawResponse`, hash, cookie value hoặc secrets.
- V2-051 tracking UI chỉ dùng các field hiện có trong `GET /api/shipments/:shipmentId`: `status`, `carrierCode`, `carrierShipmentId`, `trackingNumber`, `labelUrl`, `createdAt`, `updatedAt`, `items`, `statusHistory`.
- V2-101 implements internal `YUNEXPRESS_OMS` adapter `getTracking` with normalized tracking status/events and mocked/no-live verification.
- V2-102 adds `POST /api/shipments/:shipmentId/tracking` to sync normalized tracking results into `Shipment` and `ShipmentStatusHistory`; the endpoint does not return raw carrier responses.
- Tracking sync is user/operator triggered. Automated tests must use mocked/no-live adapter behavior and must not call YunExpress network.
- Shipment detail response không trả `rawResponse`, carrier credentials, Authorization token, hash, cookie value hoặc secrets.
- V2-052 label/result UI chỉ dùng `labelUrl` như action target khi field tồn tại; UI không render full/signed `labelUrl` thành text.
- Failure display chỉ dùng `Shipment.status` và public `ShipmentStatusHistory.note`; default shipment detail response không trả `Shipment.metadata` hoặc raw carrier error payload.
- Live label fetch endpoint chưa implemented; UI không gọi carrier adapter `getLabel` hoặc external label/print API.

`POST /api/shipments` request body:

```json
{
  "orderId": "internal-order-id",
  "items": [
    {
      "orderItemId": "internal-order-item-id",
      "quantity": 1
    }
  ]
}
```

Draft create validation:

- `orderId` là bắt buộc.
- `items` là bắt buộc và không được rỗng.
- Mỗi `orderItemId` phải thuộc order và tenant hiện tại.
- `quantity` phải là positive integer.
- `quantity` không được lớn hơn quantity của `OrderItem`.
- Duplicate `orderItemId` trong cùng request bị reject.

`GET /api/shipments` query params:

- `page`: positive integer, default `1`.
- `pageSize`: positive integer, default `20`, max `100`.
- `status`: optional `ShipmentStatus`.
- `orderId`: optional internal `Order.id`.
- `search`: optional search trên `trackingNumber` hoặc `carrierShipmentId`.
- `sortBy`: `createdAt` hoặc `updatedAt`; default `createdAt`.
- `sortOrder`: `asc` hoặc `desc`; default `desc`.

List response data:

```json
{
  "shipments": [
    {
      "id": "shipment_id",
      "orderId": "order_id",
      "orderNumber": "ORD-123",
      "externalOrderId": "EXT-123",
      "status": "DRAFT",
      "carrierCode": null,
      "carrierShipmentId": null,
      "trackingNumber": null,
      "labelUrl": null,
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z",
      "itemCount": 1
    }
  ]
}
```

Detail response data:

```json
{
  "shipment": {
    "id": "shipment_id",
    "orderId": "order_id",
    "orderNumber": "ORD-123",
    "externalOrderId": "EXT-123",
    "status": "DRAFT",
    "carrierCode": null,
    "carrierAccountId": null,
    "carrierShipmentId": null,
    "trackingNumber": null,
    "labelUrl": null,
    "items": [],
    "statusHistory": []
  }
}
```

`POST /api/shipments/:shipmentId/execute` request body:

```json
{
  "carrierCode": "YUNEXPRESS_OMS",
  "carrierAccountId": null
}
```

Execution rules:

- Yêu cầu authenticated dashboard session.
- Server resolve default/current tenant từ ACTIVE tenant membership của user.
- `OWNER`, `ADMIN`, `OPERATOR` có thể execute shipment.
- `VIEWER` không được execute shipment.
- Lookup shipment luôn filter theo tenant; missing hoặc cross-tenant shipment trả `404 NOT_FOUND`.
- Shipment chỉ được execute từ `DRAFT` hoặc `FAILED_CREATE`.
- Unknown carrier code trả controlled `CARRIER_ERROR`.
- Known carrier chưa registered adapter trả HTTP 501 với standard error code `CARRIER_ERROR`.
- Khi adapter chưa registered, không gọi external API, không mutate `Shipment`, không tạo `ShipmentStatusHistory`.
- Khi `YUNEXPRESS_OMS` adapter registered nhưng resolved tenant credential `liveEnabled=false` hoặc env fallback `YUN_OMS_LIVE_ENABLED=false`, endpoint trả HTTP 501 `CARRIER_ERROR`, không gọi `CreateOrderLabel`, không mutate `Shipment`, không tạo `ShipmentStatusHistory`.
- Tenant credential source được ưu tiên hơn env fallback. Env fallback chỉ dùng cho internal/staging compatibility khi không có tenant default active credential.
- Response/error không trả `rawResponse`, secrets, credentials, `passwordHash`, `tokenHash`, `keyHash` hoặc raw session token.

Unimplemented adapter error:

```json
{
  "success": false,
  "error": {
    "code": "CARRIER_ERROR",
    "message": "Carrier adapter is not implemented.",
    "details": {
      "carrierCode": "YUNEXPRESS_OMS",
      "retryable": false
    }
  }
}
```

Live-disabled YunExpress error:

```json
{
  "success": false,
  "error": {
    "code": "CARRIER_ERROR",
    "message": "YunExpress OMS live shipment creation is disabled.",
    "details": {
      "carrierCode": "YUNEXPRESS_OMS",
      "reason": "NOT_SUPPORTED",
      "retryable": false,
      "safeMetadata": {
        "liveEnabled": false
      }
    }
  }
}
```

`GET /api/shipments/:shipmentId/preflight` query params:

- `carrierCode`: optional, default `YUNEXPRESS_OMS`.
- `carrierAccountId`: optional future placeholder.

Preflight rules:

- Yêu cầu authenticated dashboard session.
- Server resolve default/current tenant từ ACTIVE tenant membership của user.
- `OWNER`, `ADMIN`, `OPERATOR` có thể chạy preflight.
- `VIEWER` không được chạy preflight.
- Lookup shipment luôn filter theo tenant; missing hoặc cross-tenant shipment trả `404 NOT_FOUND`.
- Shipment chỉ được preflight từ `DRAFT` hoặc `FAILED_CREATE`.
- Endpoint validate shipment có items, carrier code known/registered và mapping preview build được.
- Endpoint đọc env presence nhưng không trả env values.
- Endpoint không gọi `CreateOrderLabel`, không gọi YunExpress network, không mutate `Shipment`, không tạo `ShipmentStatusHistory`.

Preflight response data:

```json
{
  "shipmentId": "shipment_id",
  "shipmentStatus": "DRAFT",
  "carrierCode": "YUNEXPRESS_OMS",
  "credentialSource": "tenantCredential",
  "credentialConfigured": true,
  "liveEnabled": false,
  "env": {
    "baseUrlPresent": true,
    "customerNoPresent": true,
    "apiSecretPresent": true,
    "defaultShippingMethodCode": "THZXR"
  },
  "mappingPreview": {
    "customerOrderNumber": "ORD-123",
    "shippingMethodCode": "THZXR",
    "receiver": {
      "country": "US",
      "state": "TX",
      "city": "Austin",
      "postalCode": "73301"
    },
    "package": {
      "weight": 0.1,
      "length": 1,
      "width": 1,
      "height": 1,
      "packageCount": 1
    },
    "parcels": [
      {
        "sku": "SKU-1",
        "eName": "Item name",
        "cName": "Item name",
        "quantity": 1,
        "unitWeight": 0.1,
        "unitPrice": 10
      }
    ],
    "sourceCode": "API"
  },
  "warnings": []
}
```

`POST /api/shipments/:shipmentId/tracking` request body:

- No request body is required.
- Client must not send `tenantId`; server resolves default ACTIVE tenant from session.

Tracking sync rules:

- Requires authenticated dashboard session.
- `OWNER`, `ADMIN`, and `OPERATOR` can sync tracking.
- `VIEWER` cannot sync tracking.
- Lookup shipment is tenant-scoped; missing or cross-tenant shipment returns `404 NOT_FOUND`.
- Shipment must have `carrierCode`.
- Shipment must have at least one lookup key: `carrierShipmentId`, `trackingNumber`, or order/customer order number.
- The shipment service calls the registered carrier adapter `getTracking` with server-side resolved credentials.
- Tracking sync may save `trackingNumber` when returned and the shipment does not already have one.
- Tracking sync may update `Shipment.status` to `TRACKING_PENDING`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`, or `CANCELLED` based on normalized adapter status.
- Normalized `RETURNED` maps to `EXCEPTION` with a safe status history note.
- Normalized `UNKNOWN` does not downgrade current status; it only keeps early created/tracking-pending shipments in `TRACKING_PENDING`.
- `ShipmentStatusHistory` is created only when status changes.
- The endpoint does not update `labelUrl`.
- Audit logs use safe metadata only and must not include raw response or credentials.

Tracking sync response data:

```json
{
  "shipment": {
    "id": "shipment_id",
    "status": "IN_TRANSIT",
    "carrierCode": "YUNEXPRESS_OMS",
    "carrierShipmentId": "YT123",
    "trackingNumber": "YT123",
    "updatedAt": "2026-05-22T00:00:00.000Z"
  },
  "tracking": {
    "status": "IN_TRANSIT",
    "latestEvent": {
      "eventTime": "2026-05-22T00:00:00.000Z",
      "message": "Departed facility",
      "location": "Los Angeles, CA"
    },
    "eventsCount": 3
  }
}
```

Tracking sync response never returns `rawResponse`, carrier credentials, `secretRef`, `encryptedPayload`, decrypted payload, master key, Authorization token, DB credentials, cookies, API keys, or secrets.

## Carrier Adapter Contract

V2-031 không thêm public API endpoint mới. Task này định nghĩa internal carrier adapter contract để V2-032 có thể implement shipment execution service.

Internal contract trong `src/modules/carrier`:

- `CarrierAdapter`
- `CreateCarrierShipmentInput` / `CreateCarrierShipmentResult`
- `GetCarrierLabelInput` / `GetCarrierLabelResult`
- `GetCarrierTrackingInput` / `GetCarrierTrackingResult`
- `CancelCarrierShipmentInput` / `CancelCarrierShipmentResult`
- `UpdateCarrierWeightInput` / `UpdateCarrierWeightResult`
- `EstimateCarrierRateInput` / `EstimateCarrierRateResult`
- `CarrierError`

Rules:

- Shipment APIs và future execution APIs gọi platform service, không gọi carrier adapter trực tiếp từ route handler.
- UI không gọi carrier API trực tiếp.
- Adapter input phải là normalized domain input, không phải raw dashboard payload.
- Adapter output phải là normalized domain result; shipment service quyết định `Shipment.status`, `trackingNumber`, `labelUrl` và audit/status history updates.
- Adapter không quyết định tenant authorization và không trực tiếp mutate database.
- `rawResponse` nếu có chỉ là server-side metadata, không phải default API response.
- Carrier-level failures map về standard `CARRIER_ERROR`, có `retryable` flag trong safe details khi hữu ích.
- `getTracking` returns normalized carrier tracking data: `carrierShipmentId`, `trackingNumber`, normalized `status`, YunExpress `packageState`/`trackingStatus`, provider summary, chronological events, latest event, and safe errors.
- YunExpress tracking status normalization maps pending/in-transit/delivered/exception/cancelled/returned/unknown states into carrier-agnostic status values.
- Tracking adapter output must not expose carrier credentials, Authorization header, `secretRef`, `encryptedPayload`, decrypted payload, master key, raw carrier `rawResponse`, DB credentials, cookies, API keys, or secrets.

## Callback APIs Planned

- `GET /api/callbacks/logs`: danh sách callback delivery logs.
- `GET /api/callbacks/logs/:logId`: chi tiết callback log.
- `POST /api/callbacks/logs/:logId/retry`: retry callback nếu allowed.

## Carrier APIs Planned

V2-097 adds internal `CarrierAccount`/`CarrierCredential` schema, encryption utilities, and service resolver foundation only. It does not add public carrier credential APIs. Future public APIs must return summaries only and must never return `secretRef`, `encryptedPayload`, decrypted credential values, raw carrier responses, hashes, cookies, DB URLs, or secrets.

V2-098 implements current-tenant carrier account and credential management APIs:

- `GET /api/tenants/current/carrier-accounts`
- `POST /api/tenants/current/carrier-accounts`
- `GET /api/tenants/current/carrier-accounts/:carrierAccountId`
- `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId`
- `POST /api/tenants/current/carrier-accounts/:carrierAccountId/credentials`
- `PATCH /api/tenants/current/carrier-accounts/:carrierAccountId/credentials/:credentialId/disable`

Authorization:

- Dashboard session required.
- Default ACTIVE tenant is resolved server-side.
- `OWNER`/`ADMIN` can manage carrier accounts and credentials.
- `OPERATOR`/`VIEWER` receive `403`.
- Client-provided `tenantId` is not accepted.

Carrier account create body:

```json
{
  "carrierCode": "YUNEXPRESS_OMS",
  "displayName": "YunExpress Production",
  "isDefault": true
}
```

Carrier account update body:

```json
{
  "displayName": "YunExpress Production",
  "status": "ACTIVE",
  "isDefault": true
}
```

Credential save body, encrypted payload mode:

```json
{
  "credentialType": "YUNEXPRESS_OMS",
  "mode": "encryptedPayload",
  "credentials": {
    "customerNo": "...",
    "apiSecret": "...",
    "baseUrl": "https://example.invalid",
    "lang": "en-US",
    "defaultShippingMethodCode": "THZXR",
    "defaultSourceCode": "API",
    "defaultSizeUnit": "cm",
    "liveEnabled": false
  }
}
```

Credential save body, secret reference mode:

```json
{
  "credentialType": "YUNEXPRESS_OMS",
  "mode": "secretRef",
  "secretRef": "vault/path/or/env/ref",
  "keyPrefix": "yun***"
}
```

Response safety:

- Account list/detail returns account metadata plus active credential summary when available.
- Credential save/disable returns credential summary only.
- Responses never return plaintext credentials, raw `secretRef`, `encryptedPayload`, decrypted payload, master key, Authorization token, raw credential payload, DB credentials, cookies, hashes, or raw carrier response.
- Credential validation does not call YunExpress or any carrier network in V2-098.

Carrier APIs ở đây là platform APIs để quản lý carrier settings, không phải direct carrier calls từ UI.

V2-031 chỉ thêm internal adapter interface và registry/factory placeholder. Chưa có public carrier settings API và chưa có live carrier adapter.

V2-040 register internal `YUNEXPRESS_OMS` adapter. Adapter có code path cho `CreateOrderLabel`, nhưng platform không được tự động gọi live/sandbox shipment creation khi `YUN_OMS_LIVE_ENABLED=false`.

- `GET /api/carriers`: danh sách carrier codes platform hỗ trợ.
- `GET /api/carrier-accounts`: danh sách carrier accounts theo tenant.
- `POST /api/carrier-accounts`: tạo carrier account.
- `PATCH /api/carrier-accounts/:carrierAccountId`: cập nhật account metadata.
- `POST /api/carrier-accounts/:carrierAccountId/credentials`: cập nhật credentials an toàn.
- `POST /api/carrier-accounts/:carrierAccountId/test`: planned, test connection trong môi trường an toàn.
