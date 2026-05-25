# 08 Codex Prompts

Tài liệu này chứa prompt templates dùng lại cho Codex. Khi dùng, thay các placeholder trong dấu `{...}`.

## Bootstrap Task Template

```text
Task:
{TASK_ID} — Bootstrap Fulfillment Platform v2

Goal:
Initialize the application scaffold according to AGENTS.md and docs/.

Scope:
- Define package manager, Next.js setup, lint/test baseline and folder structure.
- Do not implement business features.
- Do not create production migrations.
- Do not call live carrier APIs.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Files changed
3. Bootstrap decisions
4. Commands run
5. Tests/verification
6. Next recommended task
```

## Audit Task Template

```text
Task:
{TASK_ID} — Audit {AREA}

Goal:
Audit {AREA} against the project governance docs.

Scope:
- Read AGENTS.md and relevant docs in docs/.
- Inspect only these areas: {FILES_OR_MODULES}.
- Do not modify files.
- Do not call APIs.
- Do not run migrations.

Return:
1. Status: PASS / FAIL
2. Findings ordered by severity with file references
3. Missing tests or verification gaps
4. Assumptions
5. Recommended next task
```

## Implementation Task Template

```text
Task:
{TASK_ID} — Implement {FEATURE}

Goal:
Implement {FEATURE} according to AGENTS.md and relevant docs.

Allowed files:
- {ALLOWED_FILES}

Rules:
- Do not expand scope.
- Keep route handlers thin.
- Put business logic in services.
- Put database access in repositories.
- Ensure all business data is tenant-scoped.
- Do not call live carrier APIs.
- Do not expose secrets.
- Do not run production migrations.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Files changed
3. Summary
4. Tests/verification
5. Assumptions
6. Next recommended task
```

## Review Task Template

```text
Task:
{TASK_ID} — Review {CHANGE}

Goal:
Review the current implementation for correctness, security, tenant isolation and maintainability.

Scope:
- Review files: {FILES}
- Prioritize bugs, regressions, security risks and missing tests.
- Do not rewrite code unless explicitly asked.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Findings first, ordered by severity
3. Open questions
4. Test gaps
5. Recommended fixes
```

## Tenant Isolation Audit Template

```text
Task:
{TASK_ID} — Tenant Isolation Audit

Goal:
Audit tenant isolation for {AREA_OR_MODULE}.

Scope:
- Read AGENTS.md, docs/02_ARCHITECTURE.md and docs/06_SECURITY_AND_TENANCY.md.
- Verify business data queries require tenant context.
- Verify dashboard tenant comes from session and portal tenant comes from API key.
- Verify no module imports another module's internal repositories directly.
- Do not modify files unless explicitly requested.

Return:
1. Status: PASS / FAIL
2. Findings ordered by severity
3. Cross-tenant access risks
4. Missing tests
5. Recommended fixes
```

## Security Review Template

```text
Task:
{TASK_ID} — Security Review

Goal:
Review {AREA_OR_CHANGE} for auth, authorization, secret handling and abuse risks.

Scope:
- Check session handling, API key hashing, timing-safe comparison, rate limits and audit logs.
- Confirm no plaintext secrets are stored, logged or exposed to client.
- Confirm platform admin cross-tenant access is audited.
- Do not call live APIs.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Findings ordered by severity
3. Secret handling risks
4. Abuse/rate-limit gaps
5. Required fixes
```

## Carrier Adapter Implementation Template

```text
Task:
{TASK_ID} — Implement {CARRIER_NAME} CarrierAdapter

Goal:
Implement {CARRIER_NAME} behind the CarrierAdapter abstraction.

Rules:
- UI must not call carrier APIs directly.
- Route handlers must not call carrier APIs directly.
- Carrier credentials must not be logged or exposed.
- Adapter maps domain inputs to carrier requests and normalizes responses.
- Use sandbox/test credentials only unless explicit approval allows otherwise.
- Do not run production migrations.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Files changed
3. Adapter behavior summary
4. Error mapping
5. Tests/verification
6. Any carrier API assumptions
```

## Fix Task Template

```text
Task:
{TASK_ID} — Fix {BUG_OR_FINDING}

Goal:
Fix {BUG_OR_FINDING} with the smallest safe change.

Allowed files:
- {ALLOWED_FILES}

Rules:
- Preserve existing user changes.
- Do not refactor unrelated code.
- Add or update tests if risk justifies it.
- Do not call live carrier APIs.
- Do not run production migrations.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Files changed
3. Fix summary
4. Tests/verification
5. Residual risks
```

## Migration Task Template

```text
Task:
{TASK_ID} — Migration {MIGRATION_NAME}

Goal:
Prepare or run migration work for {MIGRATION_NAME}.

Rules:
- Read docs/09_DEPLOYMENT_AND_ENV.md and docs/10_MIGRATION_FROM_MVP.md.
- Test DB first.
- Do not run production migrations without explicit approval.
- Do not copy MVP schema blindly.
- Include rollback or recovery notes.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Migration files or docs changed
3. Verification database/environment
4. Rollback notes
5. Approval needed before production
```

## Deployment Task Template

```text
Task:
{TASK_ID} — Deploy {TARGET_ENV}

Goal:
Prepare deployment to {TARGET_ENV}.

Rules:
- Read docs/09_DEPLOYMENT_AND_ENV.md.
- Confirm target environment.
- Confirm env vars are configured securely.
- Do not deploy production without explicit approval.
- Do not run production migrations without explicit approval.

Return:
1. Status: PASS / FAIL / PASS WITH FIXES
2. Target environment
3. Deployment steps performed
4. Verification
5. Rollback notes
6. Required follow-up
```
