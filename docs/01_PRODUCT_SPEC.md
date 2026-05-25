# 01 Product Spec

## Product Vision

Fulfillment Platform v2 là nền tảng fulfillment dài hạn cho nhiều tenants, hỗ trợ quản lý orders, shipments, tracking và carrier integrations theo hướng an toàn, chuẩn hóa và mở rộng được.

Sản phẩm phải phục vụ vận hành thực tế nhưng vẫn giữ cấu trúc kỹ thuật đủ rõ để thêm carrier, thêm portal, thêm workflow và thêm báo cáo mà không phá vỡ lõi domain.

## Users

- `Platform Admin`: quản trị toàn hệ thống, hỗ trợ tenant onboarding, audit và xử lý sự cố.
- `Tenant Owner`: quản lý tenant, users, API keys, carrier accounts và settings.
- `Tenant Operator`: xử lý orders, tạo shipments, theo dõi tracking và callback status.
- `Tenant Viewer`: xem orders, shipments, tracking và logs nhưng không thay đổi cấu hình quan trọng.
- `External Portal`: hệ thống gửi orders vào v2 qua tenant-scoped API.
- `Carrier Adapter`: lớp tích hợp carrier nhận yêu cầu shipment/tracking từ platform service.

## MVP Scope cho v2

- Multi-tenant foundation.
- Auth-ready identity model.
- Tenant membership và role model cơ bản.
- Tenant API key model và receive API cho portal.
- Order intake và order management cơ bản.
- Shipment core và shipment items.
- Tracking events.
- Callback delivery logs.
- Carrier account/credential abstraction.
- YunExpress OMS adapter ở mức thiết kế sẵn sàng triển khai.
- Audit log cho hành động quan trọng.
- Frontend shell gồm login, dashboard, tenant switcher, orders table, shipment drawer, tracking timeline và settings.

## Long-Term Scope

- Nhiều carriers và carrier account routing.
- Carrier rate shopping nếu business cần.
- Advanced tracking normalization.
- Retry queue và dead-letter workflow cho callbacks.
- Webhook subscription management.
- Reporting và operational dashboards.
- Tenant-level billing hoặc usage metering.
- Fine-grained permissions.
- SSO hoặc enterprise identity.
- Data export/import tools.
- Controlled migration từ MVP.

## Out of Scope hiện tại

- Production carrier calls.
- Production migrations.
- Billing implementation.
- Warehouse management system đầy đủ.
- Inventory management đầy đủ.
- Complex rate shopping.
- Mobile app native.
- Data migration thực tế từ MVP.
- Prisma schema nếu task bootstrap chưa yêu cầu.
- Copy trực tiếp code/schema từ MVP.

## Current Business Decisions

- V2 là hệ thống mới, tách biệt MVP.
- Multi-tenant-first là yêu cầu nền tảng, không phải tính năng thêm sau.
- Mọi business data phải có tenant boundary rõ ràng.
- Carrier integration phải đi qua adapter pattern.
- UI không gọi carrier API trực tiếp.
- Tenant API keys phải được hash, không lưu plaintext.
- Secrets chỉ đi qua environment hoặc secret manager phù hợp.
- Route handlers thin; services chứa business logic; repositories chứa database access.
- Test database phải được ưu tiên trước staging/production.

