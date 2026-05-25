# 11 Production Deployment Checklist

This checklist is the release gate for Fulfillment Platform v2 staging and production exposure.

Current readiness decision from V2-090:

- Staging: GO WITH RISKS for restricted/internal use.
- Production: HOLD until P1 readiness gaps are closed.

This document is operational guidance only. It does not approve production migrations, live carrier calls, or real shipment creation by itself.

Backup/restore rehearsal requirements and execution templates are maintained in `docs/12_BACKUP_RESTORE_REHEARSAL.md`.

## Non-Negotiable Rules

- Do not use production database credentials in local, CI, test, preview, or staging unless explicitly approved for a controlled recovery or migration task.
- Do not print full database URLs, usernames, passwords, session cookies, API keys, carrier credentials, or other secrets in logs, docs, tickets, or chat.
- Do not run `prisma migrate dev` or `prisma migrate reset` in staging or production.
- Do not run seed scripts in production.
- Do not call live/sandbox carrier APIs from automated checks.
- Do not enable `YUN_OMS_LIVE_ENABLED=true` without explicit manual approval and a user-controlled UI test plan.
- Codex/AI must not trigger `CreateOrderLabel` or equivalent live/sandbox shipment creation.

## Staging Readiness Checklist

Staging may be used only for restricted/internal validation when all required checks pass and known risks are accepted.

- [ ] CI required checks pass:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run prisma:validate`
  - `npm run prisma:generate`
- [ ] `npm audit --audit-level=moderate` result is reviewed and recorded.
- [ ] Staging uses staging/test database only.
- [ ] Staging does not point to production database.
- [ ] Staging does not use production secrets.
- [ ] Staging tenant API keys are test/staging-only keys.
- [ ] `APP_ENV=staging`.
- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` are exact staging origins.
- [ ] Same-origin guard works with staging origin.
- [ ] `YUN_OMS_LIVE_ENABLED=false` by default.
- [ ] YunExpress credentials are absent or staging/sandbox-only unless manual live test is explicitly approved.
- [ ] Access is restricted to approved internal users.
- [ ] Role seed/test users are not production users.
- [ ] Known risks are documented and accepted by the release owner.

### Staging Smoke Tests

- [ ] Login works for `OWNER`.
- [ ] Login works for `ADMIN`.
- [ ] Login works for `OPERATOR`.
- [ ] Login works for `VIEWER`.
- [ ] Dashboard loads for all seeded roles.
- [ ] Settings loads for allowed roles.
- [ ] Audit Logs load for `OWNER`/`ADMIN`.
- [ ] Audit Logs deny `OPERATOR`/`VIEWER`.
- [ ] Tenant API key list/create/revoke works in staging only.
- [ ] Portal receive works with a staging tenant API key.
- [ ] Orders table loads and does not expose raw payload by default.
- [ ] Order detail loads safe fields.
- [ ] Shipment draft creation works.
- [ ] Shipment preflight works with live disabled.
- [ ] Execute with live disabled returns controlled error and does not call YunExpress.
- [ ] No live `CreateOrderLabel` call is made.
- [ ] Logout works.
- [ ] Responses do not contain `passwordHash`, `tokenHash`, `keyHash`, raw session token, raw API key, DB credentials, carrier credentials, or `rawResponse`.

## Production Release Gate

Production remains HOLD until every required gate is complete.

- [ ] All P1 readiness gaps are closed or explicitly accepted by the release owner with a dated exception.
- [ ] CI required checks pass on the release commit.
- [ ] Dependency audit is reviewed and `npm audit --audit-level=moderate` passes, or a dated release-owner risk acceptance exists.
- [ ] V2-095 dependency vulnerability review is complete before production readiness.
- [ ] Backup exists and is verified before production migration.
- [ ] Restore rehearsal is complete and documented according to `docs/12_BACKUP_RESTORE_REHEARSAL.md`.
- [ ] Rollback plan is approved.
- [ ] Migration plan is approved.
- [ ] Production env/secrets are reviewed by an authorized operator.
- [ ] `APP_ENV=production`.
- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` are exact production origins.
- [ ] Session cookie secure behavior is verified in production-like environment.
- [ ] Distributed rate limiting or provider edge/WAF controls are approved for production traffic.
- [ ] Carrier credential storage plan is approved; V2-096 design is documented in `docs/13_CARRIER_CREDENTIAL_MODEL.md`.
- [ ] Tenant-scoped carrier credential model is implemented before production multi-tenant carrier use.
- [ ] YunExpress live safety plan is reviewed.
- [ ] Manual live/sandbox `CreateOrderLabel` result verification is complete before claiming carrier production readiness.
- [ ] Go/no-go owner is identified.
- [ ] Incident owner and escalation contact are identified.
- [ ] Release notes and known risks are documented.

## Migration Deployment Checklist

Use this checklist for staging and production schema changes.

- [ ] Confirm target environment.
- [ ] Confirm safe DB target summary only:
  - host
  - database
  - schema
- [ ] Do not print full DB URL, username, password, query params, or secrets.
- [ ] Confirm migration file names.
- [ ] Review migration SQL before execution.
- [ ] Confirm migration was applied to approved test DB first.
- [ ] Confirm staging apply succeeded before production apply.
- [ ] Take backup before production migration.
- [ ] Confirm restore/recovery path is available.
- [ ] Confirm recent restore rehearsal result is available.
- [ ] Use `npx prisma migrate deploy` only in staging/production.
- [ ] Do not use `prisma migrate dev` in staging/production.
- [ ] Do not use `prisma migrate reset` in staging/production.
- [ ] Do not run seed in production.
- [ ] Run post-migration validation:
  - `npx prisma migrate status`
  - representative application smoke tests
  - tenant isolation spot checks
- [ ] Document migration result and operator.

### Migration Rollback Constraints

- Prisma migrations are forward deployment records, not automatic full data rollback.
- App rollback may be faster than DB rollback for non-destructive migrations.
- Code-only failures may only require app rollback.
- DB rollback requires explicit restore decision by the rollback owner.
- Destructive or data-moving migrations require a specific restore or compensating migration plan before approval.
- If rollback requires restore from backup, identify expected data loss window and approval owner before migration starts.

## Rollback Checklist

- [ ] Identify incident trigger and affected environment.
- [ ] Stop or pause further deploys.
- [ ] Disable live carrier flag if carrier risk is involved:
  - set `YUN_OMS_LIVE_ENABLED=false`
- [ ] Roll back app deployment to previous known-good version.
- [ ] Roll back env changes if they caused the issue.
- [ ] Decide whether DB rollback/restore is required.
- [ ] If DB restore is required, get explicit approval from the incident owner.
- [ ] Keep live carrier flag disabled during rollback unless explicitly approved.
- [ ] Communicate expected downtime or data impact.
- [ ] Verify after rollback:
  - login
  - dashboard
  - tenant isolation
  - portal receive if relevant
  - shipment/preflight live-disabled safety if relevant
- [ ] Record incident notes, root cause, and follow-up tasks.

## Env And Secrets Checklist

Review every environment separately.

- [ ] `APP_ENV` is correct for the target.
- [ ] `APP_URL` is exact and uses the correct scheme/host.
- [ ] `NEXT_PUBLIC_APP_URL` matches the public dashboard origin.
- [ ] `DATABASE_URL` points to the correct environment DB.
- [ ] `DIRECT_URL` points to the correct environment DB.
- [ ] `SESSION_SECRET` is unique per environment and production-grade.
- [ ] `TENANT_API_KEY_PEPPER` is unique per environment and production-grade if used.
- [ ] `YUN_OMS_BASE_URL` is correct for the approved environment.
- [ ] `YUN_OMS_CUSTOMER_NO` is stored only in environment/secret manager.
- [ ] `YUN_OMS_API_SECRET` is stored only in environment/secret manager.
- [ ] `YUN_OMS_LANG` is intentional.
- [ ] `YUN_OMS_LIVE_ENABLED=false` unless a manual live operation is explicitly approved.
- [ ] `YUN_OMS_DEFAULT_SHIPPING_METHOD_CODE` is reviewed.
- [ ] `YUN_OMS_DEFAULT_SOURCE_CODE` is reviewed.
- [ ] `YUN_OMS_DEFAULT_SIZE_UNIT` is reviewed.
- [ ] Future distributed rate limit env is defined before production traffic scaling.
- [ ] Test secrets are never reused in production.
- [ ] Production DB is never used in staging unless explicitly approved for a controlled operation.

## Carrier Live Safety Checklist

- [ ] `YUN_OMS_LIVE_ENABLED=false` by default.
- [ ] Codex/AI is not allowed to trigger `CreateOrderLabel`.
- [ ] User manually triggers any live/sandbox shipment creation from the UI only.
- [ ] Preflight is reviewed before manual execute.
- [ ] First manual live/sandbox test is a single shipment only.
- [ ] No bulk live shipment creation until single flow is verified.
- [ ] Disable live flag after manual test unless continued live access is explicitly approved.
- [ ] Manual test result records:
  - shipment id
  - execute response status
  - shipment status after execution
  - carrier shipment id / waybill if any
  - tracking number if any
  - label URL presence if any
  - safe error if failed
- [ ] Raw carrier response and credentials are not pasted into docs/chat/tickets.

## Remaining Production Blockers

Current known blockers before production GO:

- Dependency audit is currently clean after V2-095 `postcss` override; future audit findings remain a production release gate.
- No backup/restore rehearsal executed and documented yet; see `docs/12_BACKUP_RESTORE_REHEARSAL.md`.
- No browser automation suite.
- No DB integration test suite in CI.
- Tenant-scoped carrier credential model is designed in `docs/13_CARRIER_CREDENTIAL_MODEL.md` but not implemented yet.
- Manual live/sandbox `CreateOrderLabel` result verification is still missing.
- `getTracking`, `getLabel`, `cancelShipment`, `updateWeight`, and rate/fee methods are still not supported.
- In-memory rate limiter is not production-grade for distributed deployments.
- Token-based CSRF is not implemented; current posture is same-origin guard.

## Go / No-Go Record

Before production release, record:

- Release version/commit:
- Environment:
- Go/no-go owner:
- Migration owner:
- Incident owner:
- Backup timestamp:
- Restore rehearsal reference:
- Dependency audit reference:
- Carrier live approval reference:
- Final decision: GO / GO WITH RISKS / HOLD
