# 12 Backup Restore Rehearsal

This document defines the required backup and restore rehearsal process for Fulfillment Platform v2 staging and future production PostgreSQL/Supabase databases.

It is a planning and operations document only. It does not approve running backup, restore, migration, seed, production DB access, or live carrier operations.

## Purpose

- Define how staging and production database backups should be prepared.
- Define how restore rehearsal should be performed safely before production exposure.
- Connect backup/restore readiness to deployment, migration, and rollback decisions.
- Keep secrets out of docs, logs, chat, and tickets.

Production remains HOLD until a restore rehearsal has been completed and documented.

## Non-Negotiable Safety Rules

- Do not run backup or restore without explicit approval from the backup/restore owner.
- Do not connect to production DB from local tools unless the operation is approved and recorded.
- Do not use production DB as a restore rehearsal target.
- Do not restore into the MVP database.
- Do not print full DB URLs, usernames, passwords, query params, or secrets.
- Do not store DB credentials in this document.
- Do not run `prisma migrate dev`, `prisma migrate reset`, or seed scripts against staging/production.
- Do not call external APIs or YunExpress APIs during restore rehearsal.
- Keep `YUN_OMS_LIVE_ENABLED=false` during restore rehearsal.

## Roles And Ownership

Fill these before a real rehearsal:

- Backup owner:
- Restore rehearsal owner:
- Approver:
- Incident/rollback owner:
- Environment:
- Scheduled window:
- Backup artifact reference:
- Restore target reference:

## Backup Scope

Each approved backup should cover:

- Database schema.
- Database data.
- Prisma migration history, including `_prisma_migrations`.
- Current Prisma migration files in the release artifact.
- Environment variable inventory by key name only, without values.
- Application release version/commit associated with the backup.

The environment inventory must list names such as `APP_ENV`, `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `TENANT_API_KEY_PEPPER`, and `YUN_OMS_*` without storing values.

## Backup Frequency Recommendation

### Staging

- Before every staging migration.
- Before destructive or data-moving validation work.
- At least weekly while staging contains useful QA data.
- On demand before release candidate validation.

### Production

- Before every production migration.
- Before enabling any live carrier workflow.
- Daily managed backups at minimum if supported by the database provider.
- Point-in-time recovery should be enabled if the Supabase/PostgreSQL plan supports it.
- Retention policy must be approved before production exposure.

## Backup Storage Policy

Use placeholders in docs and tickets:

- Backup artifact: `<BACKUP_FILE>`
- Approved storage: `<APPROVED_BACKUP_LOCATION>`
- Source database: `<DATABASE_URL>`

Requirements:

- Backups must be encrypted at rest.
- Access must be limited to approved operators.
- Storage location must be environment-specific.
- Production backups must not be stored in public buckets, repo files, chat, or local unencrypted folders.
- Backup retention and deletion policy must be documented by the operations owner.

## Supabase/PostgreSQL Backup Options

Choose one approved method per environment.

### Supabase Managed Backups

- Use Supabase managed backups if the project plan supports them.
- Confirm backup timestamp and restore capability.
- Confirm whether point-in-time recovery is available.
- Record backup reference without exposing secrets.

### Supabase Dashboard Export

- Use dashboard export only when approved for the target environment.
- Verify export includes the expected schema and data.
- Store exported artifact in `<APPROVED_BACKUP_LOCATION>`.

### Logical Backup With pg_dump

Use placeholders only:

```bash
pg_dump "<DATABASE_URL>" --format=custom --file="<BACKUP_FILE>"
```

Rules:

- Do not paste the real `<DATABASE_URL>` into docs, logs, or chat.
- Prefer environment variables or secret manager injection.
- Use custom format for safer restore testing.
- Capture command exit status and backup file metadata, not credentials.

## Backup Verification After Creation

After backup creation, verify:

- Backup artifact exists.
- Backup file size is plausible.
- Backup timestamp is recorded.
- Backup source environment is recorded.
- Backup restore method is known.
- Backup artifact is readable by approved operator only.
- No secrets were printed during backup.

## Restore Rehearsal Plan

Perform restore rehearsal into an isolated target only.

1. Choose isolated restore target.
2. Confirm restore target is not production.
3. Confirm restore target is not the MVP database.
4. Confirm restore target has no production app traffic.
5. Confirm `YUN_OMS_LIVE_ENABLED=false`.
6. Confirm no external carrier calls will run.
7. Select approved backup artifact from `<APPROVED_BACKUP_LOCATION>`.
8. Restore into `<RESTORE_TARGET_DATABASE_URL>`.
9. Confirm schema and migration state.
10. Run safe local validation commands against the restored environment.
11. Run functional smoke checks.
12. Verify critical data counts.
13. Record result and gaps.

Example restore command placeholder:

```bash
pg_restore --dbname="<RESTORE_TARGET_DATABASE_URL>" --clean --if-exists "<BACKUP_FILE>"
```

Rules:

- Do not use production as `<RESTORE_TARGET_DATABASE_URL>`.
- Do not print the real restore target URL.
- Do not run seed after restore unless a separate approved test-only plan requires it.
- Do not run migrations as part of restore rehearsal unless the rehearsal specifically tests migration recovery.

## Safe App Validation Commands

Run after restore target is configured safely:

```bash
npm run prisma:validate
npm run prisma:generate
npm run lint
npm run typecheck
npm run build
```

These commands must not run migrations, seed, external APIs, or carrier calls.

## Functional Smoke Checks

Run only against the isolated restored environment:

- Login with seeded/test user if available.
- Dashboard loads.
- Settings loads.
- Audit logs load for `OWNER`/`ADMIN`.
- Orders list loads.
- Shipment list/detail loads if data exists.
- Tenant API key list loads for allowed roles.
- Portal receive test key works only in staging/test context.
- Logout works.

Do not create live shipments. Do not call YunExpress.

## Critical Data Count Checks

Record counts before backup if possible, then compare after restore:

- tenants
- users
- tenant memberships
- sessions, if intentionally included
- tenant API keys
- orders
- order items
- order status history
- shipments
- shipment items
- shipment status history
- audit logs

Count differences must be explained before the rehearsal can pass.

## Restore Validation Checklist

- [ ] App can connect to restored DB.
- [ ] Schema version is correct.
- [ ] `_prisma_migrations` table is intact.
- [ ] Prisma migration files match database migration state.
- [ ] Critical data counts match expected baseline or documented variance.
- [ ] Auth login works in restored environment.
- [ ] Tenant isolation spot check works.
- [ ] Portal receive test key works only in staging/test context.
- [ ] Dashboard settings and audit logs load.
- [ ] Orders list/detail load.
- [ ] Shipment list/detail load if data exists.
- [ ] `YUN_OMS_LIVE_ENABLED=false`.
- [ ] No live carrier calls were made.
- [ ] No production writes occurred during rehearsal.
- [ ] No secrets were printed or stored in docs/logs.

## Pre-Migration Backup Checklist

Complete this before staging or production migration:

- [ ] DB target verified with safe summary only:
  - host
  - database
  - schema
- [ ] Full DB URL/password not printed.
- [ ] Backup completed.
- [ ] Backup artifact is accessible to approved operator.
- [ ] Backup artifact is stored in `<APPROVED_BACKUP_LOCATION>`.
- [ ] Restore rehearsal completed recently.
- [ ] Migration SQL reviewed.
- [ ] Migration impact understood.
- [ ] Rollback owner identified.
- [ ] Restore decision owner identified.
- [ ] Production live carrier disabled or explicitly approved.
- [ ] Go/no-go recorded.

## Rollback Integration

Backup/restore planning is part of rollback readiness:

- App rollback may be enough for code-only failures.
- DB rollback requires explicit restore decision by the rollback owner.
- Destructive migrations require extra approval and a restore or compensating migration plan before deployment.
- Carrier live flag should be disabled during rollback unless explicitly approved.
- If restore is required, document expected data loss window before proceeding.

## Rehearsal Result Record

Use this template after a real rehearsal:

- Date/time:
- Environment:
- Backup source:
- Backup artifact:
- Restore target:
- Restore owner:
- Approver:
- App version/commit:
- Restore command type:
- Validation commands result:
- Functional smoke result:
- Count comparison result:
- Secrets exposure check:
- External API/carrier call check:
- Result: PASS / PASS WITH RISKS / FAIL
- Follow-up tasks:
