# 10 Migration From MVP

## Current MVP Remains Operational

MVP hiện tại tiếp tục vận hành riêng trong khi Fulfillment Platform v2 được xây dựng. Không được làm thay đổi MVP runtime, database, credentials hoặc production integrations trong các task v2 trừ khi có task migration/cutover riêng và approval rõ.

## What Can Be Reused Conceptually

Có thể reuse ở mức khái niệm:

- Business understanding về order intake.
- Mapping thực tế giữa order và shipment.
- Kinh nghiệm xử lý YunExpress OMS.
- Các trạng thái tracking thường gặp.
- Callback delivery behavior và retry needs.
- Operational pain points từ MVP.

Reuse conceptual không đồng nghĩa copy code hoặc schema.

## What Should Not Be Copied Blindly

Không copy máy móc:

- MVP schema nếu chưa review tenant isolation.
- Hardcoded credentials hoặc env vars.
- Route handlers có business logic lẫn database access.
- Carrier-specific logic đặt trực tiếp trong UI hoặc route.
- Logs chứa raw secrets hoặc PII không cần thiết.
- Assumptions chỉ đúng với single-tenant MVP.
- Workarounds tạm thời không phù hợp long-term architecture.

## Code Porting Strategy

- Không port route handlers từ MVP một cách máy móc.
- Port business knowledge, edge cases và operational lessons, không port accidental architecture.
- Port OMS mapping chỉ phía sau `CarrierAdapter`.
- Không để OMS-specific mapping rò rỉ vào UI, route handlers hoặc generic shipment service.
- UI patterns từ MVP chỉ reuse chọn lọc nếu phù hợp dashboard v2, role model và tenant context.
- Mọi code được port phải đi qua review về tenant isolation, secrets, audit và maintainability.

## Data Migration Principles

- Migration phải tenant-aware.
- Mọi migrated business record phải map được sang `tenantId`.
- Không import dữ liệu nếu không xác định được ownership.
- Giữ raw source reference khi cần audit.
- Validate counts trước và sau migration.
- Migration phải chạy thử trên test database trước.
- Không migration production nếu chưa có approval rõ.
- Sensitive data phải được hash/encrypt theo rule v2, không copy plaintext secret.

## Possible Mapping

| MVP | V2 | Notes |
| --- | --- | --- |
| MVP `Order` | V2 `Order` | Cần map `tenantId`, `externalOrderId`, recipient fields và status. |
| MVP `YunShipment` | V2 `Shipment` | Carrier-specific fields nên đưa vào normalized fields hoặc metadata an toàn. |
| MVP tracking logs | V2 `TrackingEvent` | Normalize event code/status/time/location/description. |
| MVP callback logs | V2 `CallbackDeliveryLog` | Map status, attempts, target URL và response snippet an toàn. |

## Cutover Strategy Placeholder

Cutover strategy sẽ được xác định trong task riêng. Các hướng cần đánh giá:

- Parallel run MVP và v2 trong staging.
- One-way historical data import.
- Dual-write tạm thời nếu business yêu cầu.
- Freeze window cho migration cuối.
- Tenant-by-tenant cutover.
- Rollback plan về MVP nếu v2 chưa đạt tiêu chí production.

Cutover không được thực hiện trong documentation task.
