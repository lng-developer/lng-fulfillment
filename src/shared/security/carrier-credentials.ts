import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { AppError } from "@/shared/errors";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;
const DEFAULT_ENCRYPTION_VERSION = "v1";
const DEFAULT_KEY_VERSION = "v1";
const MAX_PREFIX_HASH_INPUT_BYTES = 16_384;

export type EncryptedCarrierCredentialPayload = {
  algorithm: typeof ALGORITHM;
  encryptionVersion: string;
  keyVersion: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getConfiguredEncryptionVersion(): string {
  return process.env.CARRIER_CREDENTIAL_ENCRYPTION_VERSION || DEFAULT_ENCRYPTION_VERSION;
}

function getConfiguredKeyVersion(): string {
  return process.env.CARRIER_CREDENTIAL_KEY_VERSION || DEFAULT_KEY_VERSION;
}

function parseMasterKey(rawKey: string | undefined): Buffer {
  if (!rawKey) {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier credential encryption is not configured.",
      503,
    );
  }

  const trimmed = rawKey.trim();
  const candidates: Buffer[] = [];

  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    candidates.push(Buffer.from(trimmed, "hex"));
  }

  try {
    candidates.push(fromBase64Url(trimmed));
  } catch {
    // Ignore malformed base64url candidate.
  }

  candidates.push(Buffer.from(trimmed, "utf8"));

  const key = candidates.find((candidate) => candidate.length === KEY_LENGTH_BYTES);
  if (!key) {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier credential encryption key is invalid.",
      503,
    );
  }

  return key;
}

function serializePayload(payload: unknown): Buffer {
  try {
    return Buffer.from(JSON.stringify(payload), "utf8");
  } catch {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier credential payload could not be encrypted.",
      500,
    );
  }
}

function assertEncryptedPayloadShape(
  encryptedPayload: unknown,
): asserts encryptedPayload is EncryptedCarrierCredentialPayload {
  if (
    !encryptedPayload ||
    typeof encryptedPayload !== "object" ||
    Array.isArray(encryptedPayload)
  ) {
    throw new AppError("CARRIER_ERROR", "Carrier credential payload is invalid.", 500);
  }

  const candidate = encryptedPayload as Partial<EncryptedCarrierCredentialPayload>;
  if (
    candidate.algorithm !== ALGORITHM ||
    typeof candidate.encryptionVersion !== "string" ||
    typeof candidate.keyVersion !== "string" ||
    typeof candidate.iv !== "string" ||
    typeof candidate.authTag !== "string" ||
    typeof candidate.ciphertext !== "string"
  ) {
    throw new AppError("CARRIER_ERROR", "Carrier credential payload is invalid.", 500);
  }
}

export function assertCarrierCredentialEncryptionConfigured(): void {
  parseMasterKey(process.env.CARRIER_CREDENTIAL_MASTER_KEY);
}

export function encryptCarrierCredentialPayload(
  payload: unknown,
): EncryptedCarrierCredentialPayload {
  const key = parseMasterKey(process.env.CARRIER_CREDENTIAL_MASTER_KEY);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  const plaintext = serializePayload(payload);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    encryptionVersion: getConfiguredEncryptionVersion(),
    keyVersion: getConfiguredKeyVersion(),
    iv: toBase64Url(iv),
    authTag: toBase64Url(authTag),
    ciphertext: toBase64Url(ciphertext),
  };
}

export function decryptCarrierCredentialPayload(encryptedPayload: unknown): unknown {
  assertEncryptedPayloadShape(encryptedPayload);

  const key = parseMasterKey(process.env.CARRIER_CREDENTIAL_MASTER_KEY);
  const decipher = createDecipheriv(ALGORITHM, key, fromBase64Url(encryptedPayload.iv), {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  decipher.setAuthTag(fromBase64Url(encryptedPayload.authTag));

  try {
    const plaintext = Buffer.concat([
      decipher.update(fromBase64Url(encryptedPayload.ciphertext)),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext);
  } catch {
    throw new AppError(
      "CARRIER_ERROR",
      "Carrier credential payload could not be decrypted.",
      500,
    );
  }
}

export function buildCredentialKeyPrefix(payload: unknown): string {
  const serialized = serializePayload(payload);
  const bounded = serialized.subarray(0, MAX_PREFIX_HASH_INPUT_BYTES);
  const digest = createHash("sha256").update(bounded).digest("hex").slice(0, 12);
  return `cred_${digest}`;
}
