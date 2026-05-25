import type {
  ApiSuccess,
  CarrierAccount,
  CredentialFormValues,
} from "@/types/settings";
import { apiFetch } from "./base";

export async function getCarrierAccounts(
  signal?: AbortSignal,
): Promise<CarrierAccount[]> {
  const response = await apiFetch<ApiSuccess<{ carrierAccounts: CarrierAccount[] }>>(
    "/api/tenants/current/carrier-accounts",
    { signal },
  );

  return response.data.carrierAccounts;
}

export async function listCarrierAccounts(signal?: AbortSignal) {
  const carrierAccounts = await getCarrierAccounts(signal);
  return { success: true as const, data: { carrierAccounts } };
}

export async function updateCarrierAccount(
  carrierAccountId: string,
  input: {
    displayName?: string;
    status?: "ACTIVE" | "DISABLED";
    isDefault?: boolean;
  },
): Promise<CarrierAccount> {
  const response = await apiFetch<ApiSuccess<{ carrierAccount: CarrierAccount }>>(
    `/api/tenants/current/carrier-accounts/${carrierAccountId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data.carrierAccount;
}

export async function saveCredential(
  carrierAccountId: string,
  values: CredentialFormValues,
) {
  await apiFetch<ApiSuccess<unknown>>(
    `/api/tenants/current/carrier-accounts/${carrierAccountId}/credentials`,
    {
      method: "POST",
      body: JSON.stringify({
        credentialType: "YUNEXPRESS_OMS",
        mode: "encryptedPayload",
        credentials: {
          customerNo: values.customerNo,
          apiSecret: values.apiSecret,
          baseUrl: values.baseUrl,
          lang: values.lang,
          defaultShippingMethodCode: values.shippingMethodCode,
          defaultSourceCode: values.sourceCode,
          defaultSizeUnit: values.sizeUnit,
          liveEnabled: values.liveEnabled,
        },
      }),
    },
  );
}

export async function saveCarrierCredential(
  carrierAccountId: string,
  values: CredentialFormValues,
) {
  await saveCredential(carrierAccountId, values);
  return { success: true as const, data: {} };
}

export async function disableCredential(
  carrierAccountId: string,
  credentialId: string,
): Promise<void> {
  await apiFetch<ApiSuccess<unknown>>(
    `/api/tenants/current/carrier-accounts/${carrierAccountId}/credentials/${credentialId}/disable`,
    { method: "PATCH" },
  );
}
