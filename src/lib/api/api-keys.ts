import type {
  ApiKey,
  ApiKeyCreateResponse,
  ApiSuccess,
} from "@/types/settings";
import { apiFetch } from "./base";

export type CreateApiKeyInput = {
  name: string;
  scopes: string[];
  expiresAt?: string | null;
};

export async function getApiKeys(signal?: AbortSignal): Promise<ApiKey[]> {
  const response = await apiFetch<ApiSuccess<{ apiKeys: ApiKey[] }>>(
    "/api/tenants/current/api-keys",
    { signal },
  );

  return response.data.apiKeys;
}

export async function listApiKeys(signal?: AbortSignal) {
  const apiKeys = await getApiKeys(signal);
  return { success: true as const, data: { apiKeys } };
}

export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<ApiKeyCreateResponse & { plaintext: string }> {
  const response = await apiFetch<ApiSuccess<ApiKeyCreateResponse>>(
    "/api/tenants/current/api-keys",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return { ...response.data, plaintext: response.data.apiKey };
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  await apiFetch<ApiSuccess<{ apiKey: ApiKey }>>(
    `/api/tenants/current/api-keys/${apiKeyId}`,
    { method: "DELETE" },
  );
}
