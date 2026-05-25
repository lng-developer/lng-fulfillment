# 03 Domain Model

Tài liệu này mô tả domain model ở mức governance. Đây chưa phải Prisma schema.

## V2-010 Prisma Enums

Enums được chọn cho identity/tenant baseline:

- `UserStatus`: `ACTIVE`, `DISABLED`
- `TenantStatus`: `ACTIVE`, `DISABLED`
- `TenantType`: `INTERNAL`, `CLIENT`, `PARTNER`
- `MembershipStatus`: `ACTIVE`, `INVITED`, `DISABLED`
- `TenantRole`: `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`
- `ApiKeyStatus`: `ACTIVE`, `REVOKED`
- `AuditActorType`: `USER`, `API_KEY`, `SYSTEM`

## Tenant

Đại diện một merchant, business unit hoặc customer organization sử dụng platform.

Fields dự kiến:

- `id`
- `name`
- `slug`
- `type`
- `status`
- `createdAt`
- `updatedAt`

Business rules:

- Tenant là boundary chính của business data.
- Tenant có thể có nhiều users thông qua `TenantMembership`.
- Tenant có thể có nhiều `TenantApiKey`.
- `CarrierAccount`/`CarrierCredential` store tenant-scoped carrier account and credential metadata.

## CarrierAccount

V2-097 implements the tenant-scoped `CarrierAccount` model in Prisma. It stores carrier account metadata only, not secret values.

Fields:

- `id`
- `tenantId`
- `carrierCode`
- `displayName`
- `status`
- `isDefault`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Business rules:

- A tenant can have multiple carrier accounts.
- A tenant should have at most one default active account per carrier by service rule.
- Carrier account summaries may be visible for operational workflows, but credentials are never exposed through the account summary.
- Indexes support tenant/carrier lookup, default account lookup, and status filtering.

## CarrierCredential

V2-097 implements the tenant-scoped `CarrierCredential` model in Prisma. It stores `secretRef` references or `encryptedPayload` ciphertext only.

Fields:

- `id`
- `tenantId`
- `carrierAccountId`
- `credentialType`
- `secretRef`
- `encryptedPayload`
- `keyPrefix`
- `status`
- `encryptionVersion`
- `keyVersion`
- `lastValidatedAt`
- `rotatedAt`
- `expiresAt`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

Business rules:

- Credentials are tenant-scoped through `tenantId` and `carrierAccountId`.
- Database stores only secret references, ciphertext, and safe metadata.
- No plaintext carrier credential is stored or returned in APIs.
- Credential access and changes must be audited with safe metadata only.
- `keyPrefix` is safe display metadata only and must not contain plaintext credential values.

## User

Đại diện người đăng nhập vào dashboard.

Fields dự kiến:

- `id`
- `email`
- `name`
- `passwordHash`
- `status`
- `createdAt`
- `updatedAt`

Business rules:

- Không lưu plaintext password.
- Một user có thể thuộc nhiều tenants.
- Role nằm trong `TenantMembership`, không nên hardcode global role cho nghiệp vụ tenant.
- User có thể có nhiều `Session`.

## TenantMembership

Liên kết user với tenant và role.

Fields dự kiến:

- `id`
- `tenantId`
- `userId`
- `role`
- `status`
- `invitedEmail`
- `invitedAt`
- `acceptedAt`
- `createdAt`
- `updatedAt`

Roles dự kiến:

- `OWNER`
- `ADMIN`
- `OPERATOR`
- `VIEWER`

Constraints và indexes trong V2-010:

- Unique `tenantId + userId`.
- Index `tenantId`.
- Index `userId`.
- Index `role + status`.

## Session

Server-side session record cho dashboard auth.

Fields trong V2-010:

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `lastUsedAt`
- `createdAt`

Business rules:

- Không lưu plaintext session token.
- `tokenHash` là unique.
- Session thuộc `User`.
- Index `userId`.
- Index `expiresAt`.

## TenantApiKey

API key dùng cho portal hoặc external systems gửi data vào tenant.

Fields dự kiến:

- `id`
- `tenantId`
- `name`
- `keyPrefix`
- `keyHash`
- `scopes`
- `status`
- `lastUsedAt`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

Business rules:

- Chỉ hiển thị plaintext key một lần khi tạo.
- Database chỉ lưu hash và prefix.
- Không có field plaintext API key.
- `keyHash` là unique.
- `scopes` là JSON để chuẩn bị cho scoped API key.
- Mọi request bằng API key phải resolve `tenantId`.
- Index `tenantId`.
- Index `tenantId + status`.

## Order

Đơn hàng nhận từ portal hoặc tạo nội bộ.

Fields dự kiến:

- `id`
- `tenantId`
- `externalOrderId`
- `orderNumber`
- `status`
- `recipientName`
- `recipientPhone`
- `recipientAddress`
- `destinationCountry`
- `metadata`
- `createdAt`
- `updatedAt`

Business rules:

- `externalOrderId` nên unique theo tenant/source nếu được dùng.
- Order không được truy vấn hoặc mutate khi thiếu `tenantId`.
- Order có nhiều `OrderItem`.

## OrderItem

Dòng hàng trong order.

Fields dự kiến:

- `id`
- `tenantId`
- `orderId`
- `sku`
- `name`
- `quantity`
- `weight`
- `declaredValue`
- `createdAt`
- `updatedAt`

## OrderStatusHistory

Lịch sử thay đổi trạng thái của order. V2-020 dùng model này để ghi trạng thái khởi tạo khi order được nhận từ Portal Receive API.

Fields trong V2-020:

- `id`
- `tenantId`
- `orderId`
- `status`
- `note`
- `actorType`
- `actorId`
- `createdAt`

Indexes trong V2-020:

- Index `tenantId + orderId + createdAt`.

## V2-020 Order Receive Schema

V2-020 đã thêm schema tối thiểu cho portal order ingestion:

- `OrderStatus`: `RECEIVED`, `READY_TO_SHIP`, `CANCELLED`, `ON_HOLD`.
- `Order`: lưu order tenant-scoped nhận từ portal.
- `OrderItem`: lưu items tenant-scoped thuộc order.
- `OrderStatusHistory`: lưu trạng thái khởi tạo và actor nguồn `API_KEY`.

`Order` fields trong schema:

- `id`
- `tenantId`
- `externalOrderId`
- `orderNumber`
- `source`
- `status`
- `recipientName`
- `recipientPhone`
- `recipientEmail`
- `recipientAddress`
- `destinationCountry`
- `rawPayload`
- `receivedAt`
- `createdAt`
- `updatedAt`

`OrderItem` fields trong schema:

- `id`
- `tenantId`
- `orderId`
- `externalItemId`
- `sku`
- `name`
- `quantity`
- `weight`
- `declaredValue`
- `rawPayload`
- `createdAt`
- `updatedAt`

Constraints và indexes trong V2-020:

- `Order` unique `tenantId + externalOrderId`.
- `Order` indexes `tenantId`, `tenantId + status`, `tenantId + receivedAt`.
- `OrderItem` index `tenantId + orderId`.
- `OrderStatusHistory` index `tenantId + orderId + createdAt`.

Business rules trong V2-020:

- Portal receive tạo order với initial status `READY_TO_SHIP`.
- `READY_TO_SHIP` tiếp tục tương ứng concept MVP `Fulfilled` ở mức business readiness, chưa có shipment hoặc carrier action.
- `rawPayload` được lưu để trace ingestion nhưng không được chứa API key hoặc secrets.
- Duplicate `externalOrderId` trong cùng tenant là idempotent skip, không update destructive fields.
- Cùng `externalOrderId` ở tenant khác được phép theo unique constraint tenant-scoped.

## V2-020B Order Data Hardening

V2-020B mở rộng `Order` và `OrderItem` theo hướng additive-only để giữ đủ dữ liệu Portal/POD cho vận hành dài hạn. `rawPayload` vẫn được giữ để audit và trace nguồn.

`Order` fields bổ sung:

- `sourceAccount`
- `shopName`
- `marketplace`
- `externalStatus`
- `purchaseAt`
- `paidAt`
- `destinationState`
- `destinationCity`
- `destinationPostalCode`
- `shippingService`
- `shippingType`
- `currency`
- `orderTotal`
- `metadata`

`OrderItem` fields bổ sung:

- `title`
- `asin`
- `listingId`
- `productType`
- `variant`
- `unitPrice`
- `currency`
- `customizationUrl`
- `customizationData`
- `snapshotImageUrl`
- `fulfillmentFile`
- `listingSnapshot`
- `costCenterSnapshot`
- `productionStatus`
- `scaleStatus`
- `qcNote`
- `metadata`

Indexes bổ sung:

- `Order tenantId + shopName`
- `Order tenantId + marketplace`
- `Order tenantId + purchaseAt`
- `Order tenantId + destinationCountry`
- `OrderItem tenantId + sku`
- `OrderItem tenantId + asin`
- `OrderItem tenantId + listingId`

Business rules trong V2-020B:

- Portal receive chấp nhận cả `externalOrderId` và alias `orderId`.
- Portal receive chấp nhận các alias Portal/MVP như `customer_infor`, `marketplaceId`, `purchase_date`, `payments_date`, `shipping_type`, `customized_url`, `snapshotImage`, `fulfillment_file`, `cost_center`, `scale_status`, `qc_note`.
- Unknown fields không bị reject và được giữ trong `rawPayload`.
- List/detail API mặc định không trả `rawPayload` hoặc các JSON snapshot lớn.

## Shipment

Shipment được tạo từ một hoặc nhiều order items.

Fields dự kiến:

- `id`
- `tenantId`
- `orderId`
- `carrierAccountId`
- `carrierCode`
- `trackingNumber`
- `status`
- `labelUrl`
- `carrierShipmentId`
- `createdAt`
- `updatedAt`

Business rules:

- Shipment thuộc tenant.
- Shipment có thể liên kết order.
- Shipment không gọi carrier trực tiếp; service gọi adapter.
- V2-030 tạo shipment core carrier-agnostic; chưa có carrier credentials hoặc carrier-specific fields.
- Tạo shipment `DRAFT` không tự động đổi lifecycle của order.

## ShipmentItem

Map order items vào shipment.

Fields dự kiến:

- `id`
- `tenantId`
- `shipmentId`
- `orderItemId`
- `quantity`
- `createdAt`
- `updatedAt`

## ShipmentStatusHistory

Lịch sử trạng thái của shipment.

Fields trong V2-030:

- `id`
- `tenantId`
- `shipmentId`
- `status`
- `note`
- `actorType`
- `actorId`
- `createdAt`

Indexes trong V2-030:

- Index `tenantId + shipmentId + createdAt`.

## V2-030 Shipment Core Schema

V2-030 thêm shipment core carrier-agnostic:

- `ShipmentStatus`: `DRAFT`, `CREATING`, `CREATED`, `LABEL_READY`, `TRACKING_PENDING`, `IN_TRANSIT`, `DELIVERED`, `FAILED_CREATE`, `FAILED_LABEL`, `EXCEPTION`, `CANCELLED`.
- `Shipment`: record shipment thuộc tenant và order.
- `ShipmentItem`: map order item vào shipment với quantity.
- `ShipmentStatusHistory`: lưu status transition ban đầu và các transition sau này.

`Shipment` fields trong schema:

- `id`
- `tenantId`
- `orderId`
- `carrierCode`
- `carrierAccountId`
- `carrierShipmentId`
- `trackingNumber`
- `status`
- `labelUrl`
- `metadata`
- `createdAt`
- `updatedAt`

`ShipmentItem` fields trong schema:

- `id`
- `tenantId`
- `shipmentId`
- `orderItemId`
- `quantity`
- `createdAt`
- `updatedAt`

Constraints và indexes trong V2-030:

- `Shipment` index `tenantId + orderId`.
- `Shipment` index `tenantId + status`.
- `Shipment` index `tenantId + createdAt`.
- `ShipmentItem` unique `shipmentId + orderItemId`.
- `ShipmentItem` index `tenantId + shipmentId`.
- `ShipmentItem` index `tenantId + orderItemId`.
- `ShipmentStatusHistory` index `tenantId + shipmentId + createdAt`.

Business rules trong V2-030:

- Dashboard user có role `OWNER`, `ADMIN`, `OPERATOR` có thể tạo draft shipment.
- `VIEWER` có thể list/view shipment nhưng không được tạo draft shipment.
- `Shipment`, `ShipmentItem`, `ShipmentStatusHistory` luôn dùng `tenantId` từ session tenant context.
- Shipment draft chỉ được tạo từ order và order items cùng tenant.
- Shipment item quantity phải là positive integer và không được lớn hơn order item quantity.
- Initial shipment status là `DRAFT`.
- Tạo draft shipment ghi `ShipmentStatusHistory` và audit action `SHIPMENT_DRAFT_CREATED`.
- Không gọi carrier API, không tạo label, không ingest tracking, không gửi callback trong V2-030.

## V2-031 Carrier Adapter Interface

V2-031 định nghĩa carrier adapter contract trong code, chưa tạo carrier account/credential schema và chưa gọi carrier API.

Known future carrier code:

- `YUNEXPRESS_OMS`

Public adapter contract:

- `CarrierAdapter`
- `CreateCarrierShipmentInput`
- `CreateCarrierShipmentResult`
- `GetCarrierLabelInput`
- `GetCarrierLabelResult`
- `GetCarrierTrackingInput`
- `GetCarrierTrackingResult`
- `CancelCarrierShipmentInput`
- `CancelCarrierShipmentResult`
- `UpdateCarrierWeightInput`
- `UpdateCarrierWeightResult`
- `EstimateCarrierRateInput`
- `EstimateCarrierRateResult`
- `CarrierError`

Business rules:

- Adapter nhận normalized domain input từ platform service, không nhận raw UI payload.
- Adapter trả normalized domain output để shipment service quyết định status transition.
- Adapter không quyết định tenant authorization.
- Adapter không mutate trực tiếp `Shipment`, `ShipmentItem`, `TrackingEvent`, `AuditLog` hoặc business tables.
- Shipment service sở hữu workflow, transaction boundary và status updates.
- Carrier registry/factory lookup adapter theo `carrierCode`; unknown carrier hoặc carrier chưa implement trả controlled `CARRIER_ERROR`.
- `rawResponse` chỉ được phép tồn tại như server-side metadata nội bộ; API/UI default payload không expose raw carrier response.
- V2-032 sẽ implement shipment execution workflow dựa trên boundary này.

## V2-032 Shipment Execution Service

V2-032 thêm internal shipment execution workflow nhưng chưa implement live carrier adapter.

Business rules:

- Execution chỉ áp dụng cho shipment thuộc tenant context hiện tại.
- Shipment chỉ được execute khi `Shipment.status` là `DRAFT` hoặc `FAILED_CREATE`.
- Dashboard user role `OWNER`, `ADMIN`, `OPERATOR` có thể execute shipment.
- `VIEWER` không được execute shipment.
- `carrierCode` phải là known carrier code trong carrier registry.
- Nếu carrier adapter chưa được đăng ký, service trả controlled `CARRIER_ERROR` với HTTP 501.
- Khi adapter chưa đăng ký, service không gọi external API.
- Khi adapter chưa đăng ký, service không mutate `Shipment`.
- Khi adapter chưa đăng ký, service không tạo `ShipmentStatusHistory`.
- V2-032 chưa thêm carrier credentials, label generation, tracking ingest hoặc callback workflow.

Future live adapter path:

- Shipment service sở hữu transition `CREATING`, `CREATED`, `LABEL_READY`, `TRACKING_PENDING`, `FAILED_CREATE`.
- Carrier call không được nằm trong database transaction dài.
- Service ghi `ShipmentStatusHistory` và `AuditLog` với safe metadata cho các transition.
- `rawResponse` nếu có chỉ là server-side metadata, không được trả trong default API/UI payload.

## V2-040 YunExpress OMS Adapter

V2-040 thêm `YUNEXPRESS_OMS` adapter sau carrier adapter interface.

Business rules:

- Adapter được register cho carrier code `YUNEXPRESS_OMS`.
- Adapter đọc config từ environment variables, không đọc từ UI payload và không lưu credentials trong source code.
- Basic auth dùng raw string `${customerNo}&${apiSecret}` rồi encode thành `Authorization: Basic <base64>`.
- Không dùng Postman-style username/password Basic Auth.
- `createShipment` map normalized `CreateCarrierShipmentInput` sang YunExpress OMS `CreateOrderLabel` payload.
- `CustomerOrderNumber` lấy từ `orderNumber`, fallback `externalOrderId`, fallback `shipmentId`.
- `ShippingMethodCode` default là `THZXR`.
- `SourceCode` default là `API`.
- `SizeUnits` default là `cm`.
- Multi-item shipment map thành `Parcels`.
- `CName`/`EName` phải có safe default nếu input thiếu tên.
- Response normalization xem root `Code = "0000"` là request-level success, nhưng business success cần `Item[].Success = 1`.
- Missing tracking number vẫn hợp lệ và map thành tracking pending path ở shipment service khi adapter live path được cho phép.
- Missing label với `Success = 1` được xử lý an toàn, không coi là secret.
- `rawResponse` chỉ là server-side metadata, không phải default API/UI payload.
- Nếu `YUN_OMS_LIVE_ENABLED` không phải `true`, adapter trả controlled `CARRIER_ERROR` trước khi gọi `CreateOrderLabel`.
- Khi live disabled, shipment execution không gọi OMS network, không mutate `Shipment`, và không tạo `ShipmentStatusHistory`.
- Codex không được tự động gọi live/sandbox `CreateOrderLabel`; user phải tự thao tác từ UI khi đến bước manual verification.

## TrackingEvent

Sự kiện tracking đã normalize.

Fields dự kiến:

- `id`
- `tenantId`
- `shipmentId`
- `carrierCode`
- `trackingNumber`
- `eventCode`
- `eventStatus`
- `eventTime`
- `location`
- `description`
- `rawPayload`
- `createdAt`

Business rules:

- Có thể lưu `rawPayload` nhưng phải tránh secrets và PII không cần thiết.
- Tracking events phải gắn tenant.

## CallbackDeliveryLog

Log gửi callback/webhook từ platform đến tenant hoặc external endpoint.

Fields dự kiến:

- `id`
- `tenantId`
- `eventType`
- `targetUrl`
- `status`
- `attemptCount`
- `lastAttemptAt`
- `nextRetryAt`
- `responseStatus`
- `responseBodySnippet`
- `createdAt`
- `updatedAt`

Business rules:

- Không log secrets.
- Response body chỉ lưu snippet an toàn.
- Retry policy phải rõ trong service.

## AuditLog

Log hành động quan trọng phục vụ security và operation review.

Fields dự kiến:

- `id`
- `tenantId`
- `actorUserId`
- `actorType`
- `action`
- `resourceType`
- `resourceId`
- `metadata`
- `createdAt`

Business rules:

- Ghi lại thay đổi auth, tenant, API keys, carrier credentials, orders, shipments và callbacks quan trọng.
- Không lưu plaintext secrets.
- `tenantId` optional để hỗ trợ system-level audit.
- `actorUserId` optional để hỗ trợ actor type `API_KEY` hoặc `SYSTEM`.
- Index `tenantId + createdAt`.
- Index `actorUserId + createdAt`.
- Index `resourceType + resourceId`.

## CarrierAccount

Cấu hình account carrier của tenant.

Fields dự kiến:

- `id`
- `tenantId`
- `carrierCode`
- `name`
- `status`
- `createdAt`
- `updatedAt`

## CarrierCredential

Thông tin credential cho carrier account.

Fields dự kiến:

- `id`
- `tenantId`
- `carrierAccountId`
- `credentialType`
- `encryptedPayload`
- `status`
- `createdAt`
- `updatedAt`

Business rules:

- Không lưu plaintext carrier secret.
- Credential payload phải encrypt hoặc dùng secret manager.
- Chỉ service có quyền phù hợp mới được truy cập credential.

V2-097 note: the implemented carrier credential schema also includes `secretRef`, `keyPrefix`, `encryptionVersion`, `keyVersion`, `lastValidatedAt`, `rotatedAt`, `expiresAt`, `createdBy`, and `updatedBy`. `encryptedPayload` is ciphertext-only JSON and `secretRef` is reference-only metadata.

## Order Lifecycle

Order lifecycle và Shipment lifecycle là hai lifecycle riêng. `Order.status` mô tả trạng thái xử lý đơn hàng; `Shipment.status` mô tả trạng thái tạo vận đơn, label và tracking với carrier.

Trạng thái dự kiến:

- `RECEIVED`: order đã được nhận.
- `VALIDATED`: order qua validation cơ bản.
- `READY_TO_SHIP`: order sẵn sàng tạo shipment; đây là khái niệm tương đương MVP `Fulfilled` ở mức business readiness, không có nghĩa shipment đã được carrier tạo.
- `PARTIALLY_SHIPPED`: một phần items đã được shipment.
- `SHIPPED`: toàn bộ items đã shipment.
- `CANCELLED`: order bị hủy.
- `ON_HOLD`: order cần xử lý thủ công.

## Shipment Lifecycle

Trạng thái dự kiến:

- `DRAFT`: shipment được chuẩn bị nội bộ.
- `CREATING`: đang tạo với carrier.
- `FAILED_CREATE`: tạo shipment với carrier thất bại.
- `CREATED`: carrier đã tạo shipment.
- `TRACKING_PENDING`: shipment đã có tracking number hoặc carrier reference nhưng chưa có tracking events normalized.
- `FAILED_LABEL`: carrier đã tạo shipment nhưng lấy hoặc tạo label thất bại.
- `LABEL_READY`: label đã sẵn sàng nếu carrier hỗ trợ.
- `IN_TRANSIT`: shipment đang vận chuyển.
- `DELIVERED`: đã giao.
- `EXCEPTION`: có sự cố.
- `CANCELLED`: shipment bị hủy.
