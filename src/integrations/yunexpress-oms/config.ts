export type YunExpressOmsConfig = {
  baseUrl?: string;
  customerNo?: string;
  apiSecret?: string;
  lang: string;
  liveEnabled: boolean;
  defaultShippingMethodCode: string;
  defaultSourceCode: string;
  defaultSizeUnit: string;
  timeoutMs: number;
};

export function getYunExpressOmsConfig(
  env: NodeJS.ProcessEnv = process.env,
): YunExpressOmsConfig {
  return {
    baseUrl: optionalEnv(env.YUN_OMS_BASE_URL),
    customerNo: optionalEnv(env.YUN_OMS_CUSTOMER_NO),
    apiSecret: optionalEnv(env.YUN_OMS_API_SECRET),
    lang: optionalEnv(env.YUN_OMS_LANG) ?? "en-US",
    liveEnabled: optionalEnv(env.YUN_OMS_LIVE_ENABLED)?.toLowerCase() === "true",
    defaultShippingMethodCode:
      optionalEnv(env.YUN_OMS_DEFAULT_SHIPPING_METHOD_CODE) ?? "THZXR",
    defaultSourceCode: optionalEnv(env.YUN_OMS_DEFAULT_SOURCE_CODE) ?? "API",
    defaultSizeUnit: optionalEnv(env.YUN_OMS_DEFAULT_SIZE_UNIT) ?? "cm",
    timeoutMs: parsePositiveInteger(env.YUN_OMS_TIMEOUT_MS, 15000),
  };
}

export function validateYunExpressLiveConfig(
  config: YunExpressOmsConfig,
): string[] {
  const missing: string[] = [];

  if (!config.baseUrl) {
    missing.push("YUN_OMS_BASE_URL");
  }

  if (!config.customerNo) {
    missing.push("YUN_OMS_CUSTOMER_NO");
  }

  if (!config.apiSecret) {
    missing.push("YUN_OMS_API_SECRET");
  }

  return missing;
}

function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
