# AGENTS.md

Tài liệu này là luật làm việc bắt buộc cho Codex và mọi agent tự động trong Fulfillment Platform v2. Nếu có xung đột giữa yêu cầu ngắn hạn và tài liệu governance, phải dừng lại và báo cáo thay vì tự mở rộng phạm vi.

## Nguyên tắc bắt buộc

- Luôn đọc các tài liệu liên quan trong `docs/` trước khi coding.
- Không mở rộng scope ngoài task được giao.
- Chỉ sửa các file được phép trong task hiện tại.
- Không implement application code khi task chỉ yêu cầu documentation, planning, review hoặc audit.
- Không tạo Prisma schema, migration hoặc seed nếu task không yêu cầu rõ.
- Không chạy production migrations.
- Không gọi live carrier APIs.
- Không gọi API production hoặc hệ thống bên thứ ba khi chưa có phê duyệt rõ ràng.
- Không expose secrets, tokens, API keys, passwords hoặc credentials trong code, logs, docs, commit message.
- Không lưu plaintext secret vào database, source code hoặc tài liệu.
- Giữ route handlers thin.
- Đặt business logic trong services.
- Đặt database access trong repositories.
- Không đặt business logic trong route handlers.
- UI không được gọi carrier APIs trực tiếp.
- Mọi business data phải được tenant-scoped.
- Mọi query dữ liệu nghiệp vụ phải filter theo `tenantId` trừ khi tài liệu kiến trúc cho phép ngoại lệ rõ ràng.
- Mọi thay đổi có rủi ro tenant isolation, security, auth, billing, carrier integration hoặc migration phải có test hoặc kế hoạch test rõ.
- Luôn bảo toàn thay đổi hiện có của người dùng, không revert code không do mình tạo trừ khi được yêu cầu rõ.
- Kết thúc task bằng báo cáo `PASS`, `FAIL`, hoặc `PASS WITH FIXES`.

## Quy trình trước khi làm việc

1. Đọc `README.md`.
2. Đọc các tài liệu liên quan trong `docs/`.
3. Kiểm tra trạng thái repo và file hiện có.
4. Xác định phạm vi file được phép sửa.
5. Nếu scope không rõ, chọn cách an toàn nhất hoặc hỏi lại người dùng.

## Quy tắc kiến trúc

- Next.js route handlers chỉ xử lý request parsing, auth/tenant context, gọi service và trả response.
- Services chịu trách nhiệm business rules, validation nghiệp vụ, orchestration và transaction boundary nếu cần.
- Repositories chịu trách nhiệm truy cập database và không chứa business workflow.
- Carrier adapters chịu trách nhiệm map request/response giữa domain nội bộ và carrier-specific protocol.
- Không để UI, route handler hoặc repository gọi trực tiếp live carrier APIs.
- Mọi integration external phải đi qua adapter/service được kiểm soát.

## Quy tắc báo cáo

Mỗi task phải trả về:

- `Status`: `PASS`, `FAIL`, hoặc `PASS WITH FIXES`.
- Files changed hoặc files created.
- Summary ngắn gọn.
- Tests/verification đã chạy hoặc lý do chưa chạy.
- Assumptions.
- Next recommended task nếu phù hợp.
