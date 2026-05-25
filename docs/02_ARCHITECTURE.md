# 02 Architecture

## Architecture Overview

Fulfillment Platform v2 dùng Next.js fullstack architecture trong `src/`:

- `src/app/`: routing, pages, layouts và route handlers.
- `src/modules/`: domain modules chứa services, repositories, validators, adapters và types.
- `src/components/`: shared UI components.
- `src/integrations/`: external integration adapters hoặc carrier-specific integration folders.
- `src/shared/`: shared infrastructure helpers như auth context, tenant context, response helpers, logging và config.
- `docs/`: governance và product/technical specification.

Chi tiết folder có thể thay đổi trong task bootstrap, nhưng các boundary bên dưới là bắt buộc.

## Modular Module Structure

Mỗi domain lớn nên được tổ chức theo module:

- `identity`: users, auth, sessions.
- `tenant`: tenants, memberships, roles, tenant API keys.
- `order`: orders, order items, order lifecycle.
- `shipment`: shipments, shipment items, shipment lifecycle.
- `tracking`: tracking events và tracking normalization.
- `callback`: callback delivery logs và retry behavior.
- `carrier`: carrier accounts, credentials, adapters.
- `audit`: audit logs.
- `billing`: future billing hoặc usage metering boundary.

Module không được truy cập database của module khác bằng đường vòng. Nếu cần phối hợp workflow, gọi public service của module liên quan.

## Module Public API Rule

- Mỗi module chỉ expose public services, types và helpers được phép dùng qua `index` hoặc public exports.
- Module khác không được import trực tiếp internal repositories, validators, adapters hoặc private helpers.
- Cross-module workflow phải đi qua public service contract.
- Repository là implementation detail của module sở hữu dữ liệu.

## Service/Repository Pattern

Route handler:

- Parse request.
- Resolve auth/session context.
- Resolve `tenantId`.
- Validate input ở boundary.
- Gọi service.
- Trả response chuẩn.
- Không quản lý transaction phức tạp.

Service:

- Chứa business logic.
- Enforce tenant scope.
- Enforce lifecycle rules.
- Điều phối repositories và adapters.
- Quyết định transaction boundary khi cần.
- Mở, commit hoặc rollback transaction ở service layer khi workflow cần nhiều repository writes.

Repository:

- Chứa database access.
- Nhận `tenantId` explicit cho business data.
- Nhận transaction context từ service nếu workflow yêu cầu.
- Không chứa business workflow.
- Không gọi carrier APIs.

## Transaction Boundary Rules

- Services quyết định transaction boundaries.
- Repositories chấp nhận transaction context nếu cần, nhưng không tự quyết định workflow transaction.
- Route handlers không quản lý complex transactions.
- Carrier API calls không nên nằm trong database transaction dài; service phải tách rõ database state transition và external side effect.

## Carrier Adapter Pattern

Carrier integration phải đi qua adapter interface thống nhất. V2-031 định nghĩa contract trong `src/modules/carrier` trước khi có live adapter:

```ts
interface CarrierAdapter {
  createShipment(input: CreateCarrierShipmentInput, context: CarrierAdapterContext): Promise<CreateCarrierShipmentResult>;
  getLabel(input: GetCarrierLabelInput, context: CarrierAdapterContext): Promise<GetCarrierLabelResult>;
  getTracking(input: GetCarrierTrackingInput, context: CarrierAdapterContext): Promise<GetCarrierTrackingResult>;
  cancelShipment(input: CancelCarrierShipmentInput, context: CarrierAdapterContext): Promise<CancelCarrierShipmentResult>;
  updateWeight(input: UpdateCarrierWeightInput, context: CarrierAdapterContext): Promise<UpdateCarrierWeightResult>;
  estimateRate(input: EstimateCarrierRateInput, context: CarrierAdapterContext): Promise<EstimateCarrierRateResult>;
}
```

Mỗi carrier như `YunExpressOmsAdapter` chịu trách nhiệm:

- Map domain input sang carrier request.
- Gọi carrier client được kiểm soát.
- Normalize carrier response về domain result.
- Map carrier errors sang error chuẩn của platform.
- Không expose carrier credentials ra UI hoặc logs.
- Không quyết định tenant authorization; service layer phải resolve tenant/session/API key trước.
- Không mutate trực tiếp `Shipment` hoặc các business records; shipment service sở hữu workflow/status updates.
- Có thể trả `rawResponse` trong server-side metadata để debug nội bộ, nhưng UI/API default payload không được expose raw carrier response.

Carrier registry/factory:

- `src/modules/carrier/registry.ts` quản lý lookup adapter theo `carrierCode`.
- V2-031 chỉ khai báo known future carrier code `YUNEXPRESS_OMS`; chưa đăng ký live adapter.
- Unknown carrier hoặc carrier chưa có adapter phải trả controlled `CARRIER_ERROR`.
- Thêm carrier mới bằng cách implement adapter và register qua carrier module, không sửa shipment core.

## Carrier Credential Boundary

Carrier credentials are a carrier module/service concern, not an adapter, route handler, UI, or shipment repository concern. V2-096 defines the planned tenant-scoped carrier credential model in `docs/13_CARRIER_CREDENTIAL_MODEL.md`.

Future carrier credential flow:

- Dashboard APIs resolve tenant/session and RBAC, then call carrier credential service.
- Carrier credential repository stores only `secretRef`, `encryptedPayload`, and safe metadata.
- Carrier credential service resolves/decrypts credentials server-side.
- Shipment execution calls credential resolver before invoking a carrier adapter.
- Carrier adapters receive decrypted credentials only in memory through adapter context or typed input.
- UI never receives credentials after save.
- Env-level `YUN_OMS_*` remains temporary internal/staging compatibility until tenant-scoped credentials are implemented.

## Multi-Tenant-First Rule

- Mọi business entity phải thuộc tenant hoặc có quan hệ tenant rõ.
- Mọi API nghiệp vụ phải resolve tenant context trước khi truy cập dữ liệu.
- Mọi repository query cho business data phải nhận `tenantId`.
- Không dùng global lookup cho orders, shipments, tracking events hoặc callback logs nếu thiếu tenant scope.
- Platform-level admin access phải là ngoại lệ rõ ràng, audit được.

## UI và Carrier Calls

UI không được gọi carrier APIs trực tiếp. UI chỉ gọi platform APIs. Platform services quyết định có cần gọi carrier adapter hay không.

## Route Handler Rules

- Không business logic trong route handlers.
- Không database query phức tạp trong route handlers.
- Không gọi carrier APIs trong route handlers.
- Không xử lý secrets trong route handlers ngoài việc truyền qua service/config được kiểm soát.
