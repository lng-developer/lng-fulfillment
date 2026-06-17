import type { CreateCarrierShipmentInput } from "@/modules/carrier/types";
import type { YunExpressOmsConfig } from "./config";
import type { YunExpressCreateOrderLabelPayload } from "./types";

export function mapCreateShipmentToYunExpressPayload(
  input: CreateCarrierShipmentInput,
  config: YunExpressOmsConfig,
): YunExpressCreateOrderLabelPayload {
  const receiverName = splitReceiverName(input.recipient?.name);
  const shippingMethodCode =
    metadataString(
      input.metadata,
      "shippingMethodCode",
      config.defaultShippingMethodCode,
    ) ?? config.defaultShippingMethodCode;
  const sourceCode =
    metadataString(input.metadata, "sourceCode", config.defaultSourceCode) ??
    config.defaultSourceCode;
  const sizeUnits =
    metadataString(input.metadata, "sizeUnits", config.defaultSizeUnit) ??
    config.defaultSizeUnit;

  return {
    CustomerOrderNumber:
      input.orderNumber ?? input.externalOrderId ?? input.shipmentId,
    ShippingMethodCode: shippingMethodCode,
    TrackingNumber: null,
    TransactionNumber: null,
    SizeUnits: sizeUnits,
    Length: metadataNumber(input.metadata, "length", 20),
    Width: metadataNumber(input.metadata, "width", 15),
    Height: metadataNumber(input.metadata, "height", 5),
    PackageCount: metadataNumber(input.metadata, "packageCount", 1),
    Weight: metadataNumber(input.metadata, "weight", calculateShipmentWeight(input)),
    ApplicationType: metadataNumber(input.metadata, "applicationType", 4),
    ReturnOption: metadataNumber(input.metadata, "returnOption", 0),
    TariffPrepay: metadataNumber(input.metadata, "tariffPrepay", 0),
    InsuranceOption: metadataNumber(input.metadata, "insuranceOption", 0),
    SourceCode: sourceCode,
    Receiver: {
      CountryCode: normalizeCountryCode(
        input.recipient?.country ?? input.destinationCountry,
      ),
      FirstName: receiverName.firstName,
      LastName: receiverName.lastName,
      Company: sanitizeReceiverText(metadataString(input.metadata, "receiverCompany", "")),
      Street: sanitizeReceiverText(input.recipient?.line1),
      City: sanitizeReceiverText(input.recipient?.city),
      State: sanitizeReceiverText(input.recipient?.state),
      Zip: sanitizeReceiverText(input.recipient?.postalCode),
      Phone: normalizeReceiverPhone(input.recipient?.phone),
      Email: sanitizeReceiverText(input.recipient?.email),
    },
    Parcels: input.items.map((item) => {
      const defaultName = item.name || item.sku || "Item";

      return {
        SKU: item.sku ?? item.externalItemId ?? item.orderItemId,
        EName: item.eName || defaultName,
        CName:
          item.cName ||
          metadataString(input.metadata, "defaultCName", defaultName) ||
          "Goods",
        HSCode: metadataNullableString(input.metadata, "hsCode"),
        Quantity: item.quantity,
        UnitPrice:
          item.declaredValue ?? metadataNumber(input.metadata, "unitPrice", 1),
        UnitWeight: item.weight ?? metadataNumber(input.metadata, "unitWeight", 0.1),
        Remark: item.remark ?? "",
        CurrencyCode:
          item.currencyCode ??
          metadataString(input.metadata, "currencyCode", "USD") ??
          "USD",
        InvoicePart:
          item.invoicePart ??
          metadataString(input.metadata, "invoicePart", "cotton"),
        InvoiceUsage:
          item.invoiceUsage ??
          metadataString(input.metadata, "invoiceUsage", "wear"),
      };
    }),
  };
}

function calculateShipmentWeight(input: CreateCarrierShipmentInput) {
  const totalWeight = input.items.reduce((sum, item) => {
    return sum + (item.weight ?? 0.1) * item.quantity;
  }, 0);

  return Math.max(round(totalWeight), 0.1);
}

function metadataNumber(
  metadata: CreateCarrierShipmentInput["metadata"],
  key: string,
  fallback: number,
) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function metadataString(
  metadata: CreateCarrierShipmentInput["metadata"],
  key: string,
  fallback: string | undefined,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function metadataNullableString(
  metadata: CreateCarrierShipmentInput["metadata"],
  key: string,
) {
  const value = metadataString(metadata, key, undefined);
  return value ?? null;
}

function splitReceiverName(name: string | undefined) {
  const trimmed = sanitizeReceiverText(name);
  if (!trimmed) {
    return {
      firstName: "Recipient",
      lastName: undefined,
    };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

function sanitizeReceiverText(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^A-Za-z0-9 .,/#'()@+_-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || undefined;
}

function normalizeReceiverPhone(phone: string | undefined) {
  const trimmed = phone?.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutExtension = trimmed.split(/\b(?:ext|extension|x)\b/i)[0] ?? trimmed;
  const digits = withoutExtension.replace(/\D/g, "");

  return digits || trimmed;
}

function normalizeCountryCode(country: string | undefined | null) {
  const trimmed = country?.trim();
  if (!trimmed) {
    return undefined;
  }

  const upper = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  const compact = upper.replace(/[^A-Z]/g, "");
  const countryNameMap: Record<string, string> = {
    AMERICA: "US",
    UNITEDSTATES: "US",
    UNITEDSTATESOFAMERICA: "US",
    USA: "US",
    US: "US",
    VIETNAM: "VN",
    VN: "VN",
    UNITEDKINGDOM: "GB",
    UK: "GB",
    GREATBRITAIN: "GB",
    ENGLAND: "GB",
    CANADA: "CA",
    AUSTRALIA: "AU",
    GERMANY: "DE",
    FRANCE: "FR",
    ITALY: "IT",
    SPAIN: "ES",
    JAPAN: "JP",
    KOREA: "KR",
    SOUTHKOREA: "KR",
    REPUBLICOFKOREA: "KR",
    CHINA: "CN",
  };

  return countryNameMap[compact] ?? upper;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
