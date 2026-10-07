# Fulfillment Platform v2

Fulfillment Platform v2 là dự án professional long-term để xây dựng nền tảng fulfillment multi-tenant-first, auth-ready, carrier-adapter-ready và dễ bảo trì lâu dài.

Hệ thống v2 được thiết kế tách biệt với MVP hiện tại. MVP vẫn tiếp tục vận hành riêng trong thời gian v2 được xây dựng, kiểm thử và chuẩn bị cutover.

## Mục tiêu

- Quản lý tenants, users, roles và tenant API keys.
- Nhận đơn hàng từ merchant portal hoặc hệ thống ngoài.
- Quản lý orders, shipments, tracking events và callback delivery.
- Chuẩn hóa carrier adapters để tích hợp nhiều carrier trong tương lai.
- Thiết kế security, audit, tenancy isolation và deployment safety ngay từ đầu.

## Docs Map

- `AGENTS.md`: Luật làm việc cho Codex và agent tự động.
- `docs/01_PRODUCT_SPEC.md`: Product vision, scope và business decisions.
- `docs/02_ARCHITECTURE.md`: Kiến trúc Next.js fullstack, modules, services, repositories và carrier adapters.
- `docs/03_DOMAIN_MODEL.md`: Domain entities và lifecycle.
- `docs/04_API_CONTRACT.md`: API response format và planned APIs.
- `docs/05_FRONTEND_SPEC.md`: Frontend screens, states và security rules.
- `docs/06_SECURITY_AND_TENANCY.md`: Auth, tenancy isolation, secrets và audit.
- `docs/07_TASKS_AND_STATUS.md`: Roadmap, task board và work log.
- `docs/08_CODEX_PROMPTS.md`: Prompt templates dùng lại cho Codex.
- `docs/09_DEPLOYMENT_AND_ENV.md`: Environment, deployment và migration safety.
- `docs/10_MIGRATION_FROM_MVP.md`: Nguyên tắc migration từ MVP sang v2.
- `docs/contracts/lng-fulfillment-lifecycle.v1.openapi.yaml`: Canonical contract for LNG order intake and signed fulfillment lifecycle events.

## Local Setup

Yêu cầu tối thiểu:

- Node.js tương thích với Next.js 15.
- npm.
- PostgreSQL local/test database khi bắt đầu dùng Prisma với database thật.

Thiết lập:

```bash
npm install
```

Tạo `.env` local từ `.env.example` và chỉ dùng giá trị local/test. Không dùng production database hoặc production secrets cho local development.

## Common Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test:platform
npm run prisma:validate
npm run prisma:generate
```

Không chạy migrations production nếu chưa có explicit approval.

## Platform Browser Regression

`npm run test:platform` runs the Platform Admin browser regression suite with Playwright. It is a local/test-only command and is not CI-blocking by default.

Required env:

- `APP_ENV=local` or `APP_ENV=test`
- `DATABASE_URL` pointing only to an approved local/test DB
- `DIRECT_URL` if configured, also pointing only to an approved local/test DB
- `DEV_ADMIN_PASSWORD`
- `DEV_TEST_PASSWORD`

The test command prints only safe DB target fields: host, database, and schema. It must not be run against production, must not print secrets, and must not call carrier or external APIs.

The optional GitHub Actions workflow `Platform Browser Regression` is manual-only (`workflow_dispatch`) and non-blocking for PR/push CI. It requires approved test DB secrets and the confirmation input `APPROVED_TEST_DB`; do not point it at production or dummy CI database URLs.

## Cảnh báo về MVP

MVP hiện tại là hệ thống riêng và vẫn tiếp tục vận hành. Không copy code, schema, secrets hoặc integration behavior từ MVP vào v2 một cách máy móc. Mọi reuse phải đi qua review về tenancy, security, maintainability và carrier abstraction.
