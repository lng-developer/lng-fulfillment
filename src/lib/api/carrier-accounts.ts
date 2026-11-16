import type {
  ApiSuccess,
  CarrierAccount,
  CredentialFormValues,
  ViettelPostCredentialFormValues,
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

export async function createCarrierAccount(input: {
  carrierCode: string;
  displayName: string;
  isDefault?: boolean;
}): Promise<CarrierAccount> {
  const response = await apiFetch<ApiSuccess<{ carrierAccount: CarrierAccount }>>(
    "/api/tenants/current/carrier-accounts",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data.carrierAccount;
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

export async function saveViettelPostCredential(
  carrierAccountId: string,
  values: ViettelPostCredentialFormValues,
) {
  await apiFetch<ApiSuccess<unknown>>(
    `/api/tenants/current/carrier-accounts/${carrierAccountId}/credentials`,
    {
      method: "POST",
      body: JSON.stringify({
        credentialType: "VIETTEL_POST",
        mode: "encryptedPayload",
        credentials: {
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          authUrl: values.authUrl,
          orderUrl: values.orderUrl,
          lineShipId: values.lineShipId,
          shipFromFirstName: values.shipFromFirstName,
          shipFromLastName: values.shipFromLastName,
          shipFromPhoneNumber: values.shipFromPhoneNumber,
          shipFromAddress1: values.shipFromAddress1,
          shipFromCountry: values.shipFromCountry,
          shipFromState: values.shipFromState,
          shipFromCity: values.shipFromCity,
          shipFromZipCode: values.shipFromZipCode,
          liveEnabled: values.liveEnabled,
        },
      }),
    },
  );
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
