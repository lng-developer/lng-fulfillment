import { expect, test, type Page } from "@playwright/test";
import { readPlatformRegressionState } from "./test-state";

const ADMIN_EMAIL = "admin@example.com";
const OPERATOR_EMAIL = "operator@example.com";
const VIEWER_EMAIL = "viewer@example.com";
const SENSITIVE_PATTERNS = [
  /passwordHash/i,
  /tokenHash/i,
  /keyHash/i,
  /session token/i,
  /DATABASE_URL/i,
  /apiSecret/i,
  /Authorization/i,
  /encryptedPayload/i,
];

type PlatformAuditLogApiResponse = {
  data?: {
    auditLogs?: { action: string; resourceId?: string | null }[];
  };
  meta?: {
    pagination?: { totalItems?: number };
  };
};

test("unauthenticated platform page redirects to login", async ({ page }) => {
  await page.goto("/platform/tenants");

  await expect(page).toHaveURL(/\/login/);
});

test("platform admin can access platform tenants and tenant detail controls", async ({
  page,
}) => {
  const state = readPlatformRegressionState();
  await login(page, ADMIN_EMAIL, requiredEnv("DEV_ADMIN_PASSWORD"));

  await page.goto("/platform/tenants");
  await expect(page.getByRole("heading", { name: /tenants/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create tenant/i })).toBeVisible();

  await openTenantDetail(page, state.auditTenantId);

  await expect(page.getByRole("heading", { name: /tenant detail/i })).toBeVisible();
  await expect(page.getByText(/edit tenant profile/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /save tenant profile changes/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /add tenant member/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /save member changes for/i }).first()).toBeVisible();

  await expectPageToAvoidSensitiveText(page);
});

test("platform support can view platform pages but cannot see mutation controls", async ({
  page,
}) => {
  const state = readPlatformRegressionState();
  await login(page, state.supportEmail, requiredEnv("DEV_TEST_PASSWORD"));

  await page.goto("/platform/tenants");
  await expect(page.getByRole("heading", { name: /tenants/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create tenant/i })).toHaveCount(0);

  await openTenantDetail(page, state.auditTenantId);

  await expect(
    page.getByText(/Platform Support read-only access/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/read-only support view/i)).toBeVisible();
  await expect(page.getByText(/edit tenant profile/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /add tenant member/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /save tenant profile changes/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /save member changes for/i })).toHaveCount(0);

  await expectPageToAvoidSensitiveText(page);
});

test("platform audit log filters render mutation and denied telemetry safely", async ({
  page,
}) => {
  const state = readPlatformRegressionState();
  await login(page, ADMIN_EMAIL, requiredEnv("DEV_ADMIN_PASSWORD"));

  await page.goto(`/platform/audit-logs?preset=mutations&tenantId=${state.auditTenantId}`);
  await expect(page.getByRole("heading", { name: /audit logs/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^mutations$/i })).toBeVisible();
  await expect(actionDetails(page, "Tenant created").first()).toBeVisible();
  await expect(actionDetails(page, "Tenant member added").first()).toBeVisible();
  await expect(page.getByText(/backend multi-action pagination/i)).toBeVisible();

  await page.goto("/platform/audit-logs?preset=denied&actorType=USER");
  await expect(actionDetails(page, "Platform access denied").first()).toBeVisible();
  await expect(
    actionDetails(page, "Platform support mutation denied").first(),
  ).toBeVisible();

  await page.locator("select").first().selectOption({
    value: "PLATFORM_TENANT_CREATED",
  });
  await page.getByPlaceholder("Tenant, PlatformAccess").fill("Tenant");
  await page.getByPlaceholder("tenant id").fill(state.auditTenantId ?? "");
  await expect(page).toHaveURL(/action=PLATFORM_TENANT_CREATED/);

  const today = new Date().toISOString().slice(0, 10);
  await page.locator('input[type="date"]').nth(0).fill(today);
  await page.locator('input[type="date"]').nth(1).fill(today);

  const firstCreatedLog = actionDetails(page, "Tenant created").first();
  await expect(firstCreatedLog).toBeVisible();
  await firstCreatedLog.locator(":scope > summary").click();
  await expect(firstCreatedLog).toContainText(state.auditMarker);
  await expect(firstCreatedLog).toContainText("longSafeNote");
  await expect(firstCreatedLog).toContainText("...");

  await page.getByRole("button", { name: /clear filters/i }).click();
  await expect(page).toHaveURL(/\/platform\/audit-logs$/);
  await expect(page.getByRole("button", { name: /clear filters/i })).toBeDisabled();

  await expectPageToAvoidSensitiveText(page);
});

test("platform audit log API supports backend multi-action pagination", async ({
  page,
}) => {
  const state = readPlatformRegressionState();
  await login(page, ADMIN_EMAIL, requiredEnv("DEV_ADMIN_PASSWORD"));

  const multiActionResponse = await page.request.get(
    `/api/platform/audit-logs?tenantId=${state.auditTenantId}&actions=PLATFORM_TENANT_CREATED,PLATFORM_TENANT_MEMBER_ADDED&page=1&pageSize=20`,
  );
  expect(multiActionResponse.status()).toBe(200);

  const multiActionBody =
    (await multiActionResponse.json()) as PlatformAuditLogApiResponse;
  const multiActionLogs = multiActionBody.data?.auditLogs ?? [];
  expect(multiActionBody.meta?.pagination?.totalItems).toBeGreaterThanOrEqual(2);
  expect(multiActionLogs.length).toBeGreaterThanOrEqual(2);
  expect(new Set(multiActionLogs.map((log) => log.action))).toEqual(
    new Set(["PLATFORM_TENANT_CREATED", "PLATFORM_TENANT_MEMBER_ADDED"]),
  );

  const exactActionResponse = await page.request.get(
    `/api/platform/audit-logs?tenantId=${state.auditTenantId}&action=PLATFORM_TENANT_CREATED&page=1&pageSize=20`,
  );
  expect(exactActionResponse.status()).toBe(200);

  const exactActionBody =
    (await exactActionResponse.json()) as PlatformAuditLogApiResponse;
  const exactActionLogs = exactActionBody.data?.auditLogs ?? [];
  expect(exactActionLogs.length).toBeGreaterThanOrEqual(1);
  expect(exactActionLogs.every((log) => log.action === "PLATFORM_TENANT_CREATED"))
    .toBe(true);

  const invalidActionResponse = await page.request.get(
    "/api/platform/audit-logs?actions=PLATFORM_TENANT_CREATED,UNSAFE_UNKNOWN_ACTION",
  );
  expect(invalidActionResponse.status()).toBe(400);

  await expectPageToAvoidSensitiveText(page);
});

test("platform support can view audit logs and tenant users remain denied", async ({
  page,
}) => {
  const state = readPlatformRegressionState();
  await login(page, state.supportEmail, requiredEnv("DEV_TEST_PASSWORD"));

  await page.goto("/platform/audit-logs?preset=denied");
  await expect(page.getByRole("heading", { name: /audit logs/i })).toBeVisible();
  await expect(actionDetails(page, "Platform access denied").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /create tenant/i })).toHaveCount(0);
  await expectPageToAvoidSensitiveText(page);

  await page.context().clearCookies();
  await login(page, VIEWER_EMAIL, requiredEnv("DEV_TEST_PASSWORD"));
  const response = await page.goto("/platform/audit-logs");
  expect(response?.status()).not.toBe(500);
  expect(response?.status()).toBe(404);
});

test("platform support and tenant users are denied by platform mutation/read APIs", async ({
  page,
  baseURL,
}) => {
  const state = readPlatformRegressionState();
  await login(page, state.supportEmail, requiredEnv("DEV_TEST_PASSWORD"));
  const supportMutation = await page.request.post("/api/platform/tenants", {
    headers: { Origin: baseURL ?? "http://127.0.0.1:3000" },
    data: {
      name: "Blocked Browser Regression Tenant",
      slug: "blocked-browser-regression-tenant",
      type: "CLIENT",
      status: "ACTIVE",
      ownerEmail: "blocked-browser-regression-owner@example.com",
      ownerPassword: requiredEnv("DEV_TEST_PASSWORD"),
    },
  });
  expect(supportMutation.status()).toBe(403);
  await page.context().clearCookies();

  await login(page, OPERATOR_EMAIL, requiredEnv("DEV_TEST_PASSWORD"));
  const operatorRead = await page.request.get("/api/platform/tenants");
  expect(operatorRead.status()).toBe(403);
  const operatorPage = await page.goto("/platform/tenants");
  expect(operatorPage?.status()).not.toBe(500);
  expect(operatorPage?.status()).toBe(404);
});

test("tenant viewer cannot render platform console", async ({ page }) => {
  await login(page, VIEWER_EMAIL, requiredEnv("DEV_TEST_PASSWORD"));

  const response = await page.goto("/platform/tenants");

  expect(response?.status()).not.toBe(500);
  expect(response?.status()).toBe(404);
});

async function login(page: Page, email: string, password: string) {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/orders/);
}

async function openTenantDetail(page: Page, tenantId?: string) {
  if (!tenantId) {
    throw new Error("BLOCKED: audit tenant id is missing from platform test state.");
  }

  await page.goto(`/platform/tenants/${tenantId}`);
  await expect(page).toHaveURL(/\/platform\/tenants\/[^/]+$/);
}

function actionDetails(page: Page, label: string) {
  return page.locator("details").filter({ hasText: label });
}

async function expectPageToAvoidSensitiveText(page: Page) {
  const content = await page.locator("body").innerText();
  for (const pattern of SENSITIVE_PATTERNS) {
    expect(content).not.toMatch(pattern);
  }
}

function requiredEnv(name: "DEV_ADMIN_PASSWORD" | "DEV_TEST_PASSWORD") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`BLOCKED: ${name} is missing.`);
  }

  return value;
}
