import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const PASSWORD_HASH_VERSION = "v1";
const PASSWORD_ALGORITHM = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const SESSION_TOKEN_BYTES = 32;
const TENANT_API_KEY_BYTES = 32;
const TENANT_API_KEY_PREFIX = "lngfp";
const TENANT_API_KEY_PREFIX_SEGMENTS = 2;

function assertPasswordLength(password: string) {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new RangeError(
      `Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
}

async function derivePasswordKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAXMEM,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordLength(password);

  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const key = await derivePasswordKey(password, salt);

  return [
    PASSWORD_ALGORITHM,
    PASSWORD_HASH_VERSION,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  const parts = passwordHash.split("$");
  if (parts.length !== 7) {
    return false;
  }

  const [algorithm, version, n, r, p, saltValue, keyValue] = parts;
  if (
    algorithm !== PASSWORD_ALGORITHM ||
    version !== PASSWORD_HASH_VERSION ||
    Number(n) !== SCRYPT_N ||
    Number(r) !== SCRYPT_R ||
    Number(p) !== SCRYPT_P
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expectedKey = Buffer.from(keyValue, "base64url");
    const actualKey = await derivePasswordKey(password, salt);

    return safeCompareBuffers(actualKey, expectedKey);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateTenantApiKey(): string {
  return `${TENANT_API_KEY_PREFIX}_${randomBytes(TENANT_API_KEY_BYTES).toString("base64url")}`;
}

export function hashTenantApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function getTenantApiKeyPrefix(rawKey: string): string {
  return rawKey.split("_").slice(0, TENANT_API_KEY_PREFIX_SEGMENTS).join("_");
}

export function verifyTenantApiKey(
  rawKey: string,
  keyHash: string,
): boolean {
  return safeCompare(hashTenantApiKey(rawKey), keyHash);
}

export function safeCompare(a: string, b: string): boolean {
  const aHash = createHash("sha256").update(a, "utf8").digest();
  const bHash = createHash("sha256").update(b, "utf8").digest();

  return timingSafeEqual(aHash, bHash);
}

function safeCompareBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    const aHash = createHash("sha256").update(a).digest();
    const bHash = createHash("sha256").update(b).digest();
    timingSafeEqual(aHash, bHash);
    return false;
  }

  return timingSafeEqual(a, b);
}
