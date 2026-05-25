# 13 Carrier Credential Model

This document designs the future tenant-scoped carrier credential model and service boundary for Fulfillment Platform v2.

It is design-only. It does not create Prisma schema, migrations, APIs, UI, encryption utilities, or credential storage.

## Goals

- Carrier credentials are tenant-scoped.
- No plaintext credential is stored in the database.
- No plaintext credential is returned by API responses.
- Credential access and changes are audited.
- Carrier adapters receive credentials only through a controlled service boundary.
- Live carrier use remains explicitly controlled.
- A tenant can have multiple carrier accounts.
- A tenant can select one default carrier account per carrier.
- Existing env-based YunExpress OMS configuration remains temporary compatibility until a credential model is implemented.

## Future Data Model

### CarrierAccount

Represents a tenant-owned carrier account, not the secret itself.

Suggested fields:

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

Suggested enum:

```prisma
enum CarrierAccountStatus {
  ACTIVE
  DISABLED
}
```

Suggested constraints and indexes:

- Index `tenantId`.
- Index `tenantId + carrierCode`.
- Index `tenantId + carrierCode + status`.
- Unique default should be enforced so a tenant has at most one default active account per carrier. This may require a partial unique index in SQL if Prisma cannot express the intended constraint directly.

### CarrierCredential

Represents credential storage metadata for a carrier account. It stores either a secret reference or ciphertext, never plaintext.

Suggested fields:

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

Suggested enums:

```prisma
enum CarrierCredentialStatus {
  ACTIVE
  DISABLED
  ROTATED
  EXPIRED
}

enum CarrierCredentialType {
  SECRET_REF
  ENCRYPTED_PAYLOAD
}
```

Rules:

- `tenantId` must match the related `CarrierAccount.tenantId`.
- Only one active credential per carrier account should be used by resolver.
- `keyPrefix` is safe metadata only, such as a short prefix of a public account id or vault key label. It must not be sufficient to authenticate.
- `encryptedPayload` and `secretRef` must not be returned in default API responses.
- `createdBy` and `updatedBy` should reference the actor user when available.

## Credential Storage Strategy

### A. secretRef Mode

Production-preferred mode.

- Database stores only `secretRef` and safe metadata.
- `secretRef` points to a secret manager, platform secret, external vault, or provider-managed secret location.
- Carrier credential service resolves the secret server-side only.
- Secret manager access policy is outside Prisma and must be environment-specific.
- Secret values are not copied into application logs, audit metadata, API responses, or UI.

Use this mode for production where a secret manager is available.

### B. encryptedPayload Mode

Optional fallback mode.

- Database stores ciphertext only.
- Plaintext is encrypted before persistence.
- Requires `encryptionVersion` and `keyVersion`.
- Requires an approved encryption utility and key management decision before implementation.
- Decryption happens only server-side inside credential service.
- Decrypted values live only in memory for the minimum time needed to call an adapter.

Use this mode only after V2-097 implements encryption utilities and operational key handling.

## Hard Security Rules

- No plaintext credential storage.
- No decrypted credential API response.
- No plaintext secrets in `AuditLog`.
- No plaintext secrets in error messages.
- No plaintext secrets in console logs.
- No carrier credentials in frontend bundles.
- No carrier credentials in browser storage.
- No raw carrier response containing secrets in default API/UI payload.

## Encryption And Key Management

Two acceptable future approaches:

### Secret Manager

- Store credential payload in an external secret manager.
- Store only `secretRef` in DB.
- Rotate secrets in the secret manager.
- Audit application-level metadata changes, not secret values.
- Resolver retrieves secret server-side at execution time.

### Envelope Encryption

- Generate or obtain a data encryption key for credential payload encryption.
- Encrypt credential payload into `encryptedPayload`.
- Protect the data key using an environment master key or KMS.
- Store `encryptionVersion` and `keyVersion`.
- Support re-encryption for key rotation.

Future env placeholder if envelope encryption is chosen:

- `CARRIER_CREDENTIAL_MASTER_KEY`

Rules:

- Master key must never be committed or printed.
- Production master key must be unique per environment.
- Key rotation must allow old credentials to remain decryptable until migrated.
- If key is missing or cannot decrypt, resolver returns controlled `CARRIER_ERROR` and does not call carrier.

## Credential Rotation

Credential rotation should:

- Create or update a new active credential version.
- Set old credential to `ROTATED` or `DISABLED`.
- Record `rotatedAt`.
- Audit safe metadata only.
- Avoid service interruption by validating the new credential before switching default if practical.

No rotation workflow should reveal old or new secret values after save.

## Disaster Recovery Considerations

- Backups include carrier credential rows but not external secret manager values unless that provider has its own backup/recovery process.
- For `secretRef` mode, restore requires both DB and secret manager continuity.
- For `encryptedPayload` mode, restore requires the correct key version material.
- Missing secret or missing key material must fail closed with controlled `CARRIER_ERROR`.
- Recovery docs must not contain plaintext carrier secrets.

## Future Service Boundaries

Future carrier credential service functions:

- `listCarrierAccounts(tenantId)`
- `getCarrierAccountSummary(tenantId, accountId)`
- `createCarrierAccount(input, actor)`
- `updateCarrierAccount(tenantId, accountId, input, actor)`
- `disableCarrierAccount(tenantId, accountId, actor)`
- `saveCarrierCredential(tenantId, carrierAccountId, input, actor)`
- `rotateCarrierCredential(tenantId, carrierAccountId, input, actor)`
- `validateCarrierCredential(tenantId, carrierAccountId, actor)`
- `resolveCarrierCredentials(tenantId, carrierCode, carrierAccountId?)`

Boundary rules:

- Repository stores only `secretRef`, `encryptedPayload`, and safe metadata.
- Repository never receives decrypted credentials except as already-encrypted values from service.
- Service handles encryption, decryption, secret manager resolution, and validation orchestration.
- Adapter receives decrypted credentials only in memory.
- UI never receives secrets after save.
- Shipment execution should call `resolveCarrierCredentials`, not read carrier env directly, once credential model is implemented.
- Route handlers stay thin and must not handle plaintext carrier credentials except passing create/update body to service.

## Runtime Resolver Behavior

Future resolver: `resolveCarrierCredentials(tenantId, carrierCode, carrierAccountId?)`.

Behavior:

1. Normalize `carrierCode`.
2. If `carrierAccountId` is provided, load tenant-scoped account by id.
3. Otherwise find default `ACTIVE` account for `tenantId + carrierCode`.
4. Find active credential for the account.
5. If credential type is `SECRET_REF`, resolve secret through approved secret provider.
6. If credential type is `ENCRYPTED_PAYLOAD`, decrypt server-side.
7. Validate the resolved payload shape.
8. Return credentials only to server-side caller.
9. Return controlled `CARRIER_ERROR` if missing, disabled, expired, malformed, or unresolvable.
10. Do not call carrier when credentials cannot be resolved.

Env fallback:

- Allowed temporarily for internal/staging compatibility.
- Should be disabled for production multi-tenant use after tenant credentials are implemented and verified.
- Must not auto-migrate env secrets into DB.

## YunExpress OMS Credential Shape

Future server-side credential payload for `YUNEXPRESS_OMS`:

```ts
type YunExpressOmsCredentialPayload = {
  customerNo: string;
  apiSecret: string;
  baseUrl: string;
  lang?: string;
  defaultShippingMethodCode?: string;
  defaultSourceCode?: string;
  defaultSizeUnit?: string;
  liveEnabled?: boolean;
};
```

Rules:

- `customerNo` and `apiSecret` are secrets or sensitive identifiers and must never be returned to UI.
- `baseUrl` may be configuration but should still be treated as server-side carrier config.
- `liveEnabled` defaults to `false`.
- `liveEnabled` should not be casually user-editable.
- Any UI that enables live execution must show strong warnings and require user-controlled confirmation.
- `CreateOrderLabel` live execution remains manual from UI and must not be triggered by Codex/AI or automated tests.

## Credential Validation Policy

Future credential validation must be safe:

- Must never create a shipment.
- Must never call `CreateOrderLabel`.
- May call a safe non-creating carrier endpoint only if approved, such as `GetCountry` or `GetShippingMethods`.
- Must return safe validation status only.
- Must not return raw response by default.
- Must not log authorization headers, customer number, API secret, request body with PII, or raw response containing secrets.
- Must rate-limit validation attempts.
- Must audit validation result with safe metadata.

## RBAC

- `OWNER` and `ADMIN` can create, update, disable, rotate, and validate carrier accounts/credentials.
- `OPERATOR` cannot view or manage secrets.
- `VIEWER` cannot view or manage secrets.
- `OPERATOR` may view carrier account summaries if needed for shipment operations, such as display name, carrier code, status, and default marker.
- Client-side role checks are UX only; server APIs remain source of truth.
- All mutations must be tenant-scoped.

## Audit Events

Future audit events:

- `CARRIER_ACCOUNT_CREATED`
- `CARRIER_ACCOUNT_UPDATED`
- `CARRIER_ACCOUNT_DISABLED`
- `CARRIER_CREDENTIAL_CREATED`
- `CARRIER_CREDENTIAL_UPDATED`
- `CARRIER_CREDENTIAL_ROTATED`
- `CARRIER_CREDENTIAL_DISABLED`
- `CARRIER_CREDENTIAL_VALIDATED`

Safe audit metadata only:

- `carrierAccountId`
- `carrierCode`
- `status`
- `keyPrefix`
- `credentialType`
- `validationStatus`

Audit metadata must not include:

- plaintext secret values
- decrypted payload
- `secretRef` if it reveals secret manager path details
- `encryptedPayload`
- authorization header
- raw carrier response
- carrier request body with PII/secrets

## Migration Path From Current Env Credentials

Current V2 state:

- `YUNEXPRESS_OMS` reads `YUN_OMS_*` environment variables.
- Env path is guarded by `YUN_OMS_LIVE_ENABLED=false` by default.

Planned migration:

1. Keep env fallback until carrier credential schema/API is implemented.
2. Do not auto-migrate env secrets into DB.
3. Add tenant credential setup workflow later.
4. Validate tenant credentials using safe non-creating validation.
5. Update shipment execution to prefer tenant credential resolver.
6. Keep env fallback only for internal/staging compatibility.
7. Deprecate env fallback for production after tenant credentials are verified.
8. Production multi-tenant should not rely on global shared YunExpress credentials unless explicitly approved as an operational exception.

## Risks And Open Questions

- Encryption implementation choice: external secret manager vs envelope encryption.
- Secret manager provider choice and local/staging parity.
- How to safely rotate credentials without interrupting shipment operations.
- Whether `secretRef` itself is sensitive enough to omit from all APIs and most audit metadata.
- Recovery path when `secretRef` is missing after DB restore.
- Recovery path when encryption key material is unavailable.
- Tenant-specific live flag policy and approval workflow.
- Whether some carrier credentials are global internal accounts or always tenant-specific.
- Whether validation endpoint should call a carrier safe endpoint or only validate local shape/config.
- Whether `CarrierAccount.isDefault` requires database partial unique index outside Prisma schema.
