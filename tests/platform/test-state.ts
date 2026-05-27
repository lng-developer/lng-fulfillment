import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PLATFORM_SUPPORT_EMAIL_PREFIX } from "./test-data";

const statePath = join(
  process.cwd(),
  "test-results",
  "platform-regression-state.json",
);

type PlatformRegressionState = {
  auditMarker: string;
  supportEmail: string;
  testStartedAt: string;
  auditTenantId?: string;
};

export function createPlatformRegressionState(): PlatformRegressionState {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const state = {
    auditMarker: `PLATFORM-AUDIT-RUNTIME-${suffix}`,
    supportEmail: `${PLATFORM_SUPPORT_EMAIL_PREFIX}-${suffix}@example.com`,
    testStartedAt: new Date().toISOString(),
  };

  writePlatformRegressionState(state);

  return state;
}

export function readPlatformRegressionState(): PlatformRegressionState {
  return JSON.parse(readFileSync(statePath, "utf8")) as PlatformRegressionState;
}

export function writePlatformRegressionState(state: PlatformRegressionState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state), "utf8");
}
