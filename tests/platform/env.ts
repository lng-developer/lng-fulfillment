import { loadEnvConfig } from "@next/env";
import { MIN_PASSWORD_LENGTH } from "../../src/shared/security";

const APPROVED_DB_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "aws-1-ap-northeast-1.pooler.supabase.com",
  "db.dnwethyafmoldxcyeemi.supabase.co",
]);

export type SafeDbTarget = {
  host: string;
  database: string;
  schema: string;
};

export function loadPlatformTestEnv() {
  loadEnvConfig(process.cwd());
}

export function requirePlatformTestEnv() {
  loadPlatformTestEnv();

  const appEnv = process.env.APP_ENV;
  if (appEnv !== "local" && appEnv !== "test") {
    throw new Error("BLOCKED: APP_ENV must be local or test for platform browser regression.");
  }

  const databaseTarget = parseSafeDbTarget("DATABASE_URL");
  const directTarget = process.env.DIRECT_URL
    ? parseSafeDbTarget("DIRECT_URL")
    : undefined;

  assertValidPasswordEnv("DEV_ADMIN_PASSWORD");
  assertValidPasswordEnv("DEV_TEST_PASSWORD");

  return {
    databaseTarget,
    directTarget,
  };
}

export function printSafeDbSummary(input: {
  databaseTarget: SafeDbTarget;
  directTarget?: SafeDbTarget;
}) {
  console.log(
    `Safe DB target DATABASE_URL: host=${input.databaseTarget.host}, database=${input.databaseTarget.database}, schema=${input.databaseTarget.schema}`,
  );

  if (input.directTarget) {
    console.log(
      `Safe DB target DIRECT_URL: host=${input.directTarget.host}, database=${input.directTarget.database}, schema=${input.directTarget.schema}`,
    );
  }

  console.log("Required platform test password env vars are present.");
}

function parseSafeDbTarget(envName: "DATABASE_URL" | "DIRECT_URL"): SafeDbTarget {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`BLOCKED: ${envName} is missing.`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`BLOCKED: ${envName} is not a valid URL.`);
  }

  if (!APPROVED_DB_HOSTS.has(url.hostname)) {
    throw new Error(`BLOCKED: ${envName} host is not approved for local/test browser regression.`);
  }

  const database = url.pathname.replace(/^\//, "").split("/")[0] || "unknown";
  const schema = url.searchParams.get("schema") || "public";

  return {
    host: url.hostname,
    database,
    schema,
  };
}

function assertValidPasswordEnv(name: "DEV_ADMIN_PASSWORD" | "DEV_TEST_PASSWORD") {
  const value = process.env[name];
  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`BLOCKED: ${name} is missing or below password policy.`);
  }
}
