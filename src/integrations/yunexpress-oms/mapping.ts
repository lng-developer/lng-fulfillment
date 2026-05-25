import type { CreateCarrierShipmentInput } from "@/modules/carrier/types";
import type { YunExpressOmsConfig } from "./config";
import type { YunExpressCreateOrderLabelPayload } from "./types";

export function mapCreateShipmentToYunExpressPayload(
  input: CreateCarrierShipmentInput,
  config: YunExpressOmsConfig,
): YunExpressCreateOrderLabelPayload {
  const packageCount = Math.max(input.items.length, 1);
  const receiverName = splitReceiverName(input.recipient?.name);

  return {
    CustomerOrderNumber:
      input.orderNumber ?? input.externalOrderId ?? input.shipmentId,
    ShippingMethodCode: config.defaultShippingMethodCode,
    TrackingNumber: null,
    TransactionNumber: null,
    SizeUnits: config.defaultSizeUnit,
    Length: metadataNumber(input.metadata, "length", 1),
    Width: metadataNumber(input.metadata, "width", 1),
    Height: metadataNumber(input.metadata, "height", 1),
    PackageCount: packageCount,
    Weight: calculateShipmentWeight(input),
    ApplicationType: metadataNumber(input.metadata, "applicationType", 1),
    ReturnOption: metadataNumber(input.metadata, "returnOption", 0),
    TariffPrepay: metadataNumber(input.metadata, "tariffPrepay", 0),
    InsuranceOption: metadataNumber(input.metadata, "insuranceOption", 0),
    SourceCode: config.defaultSourceCode,
    Receiver: {
      CountryCode: input.recipient?.country ?? input.destinationCountry ?? undefined,
      FirstName: receiverName.firstName,
      LastName: receiverName.lastName,
      Company: metadataString(input.metadata, "receiverCompany", ""),
      Street: input.recipient?.line1,
      City: input.recipient?.city,
      State: input.recipient?.state,
      Zip: input.recipient?.postalCode,
      Phone: input.recipient?.phone,
      Email: input.recipient?.email,
    },
    Parcels: input.items.map((item) => ({
      SKU: item.sku ?? item.externalItemId ?? item.orderItemId,
      EName: item.name || item.sku || "Item",
      CName:
        metadataString(input.metadata, "defaultCName", item.name || item.sku || "货物") ??
        "货物",
      HSCode: metadataNullableString(input.metadata, "hsCode"),
      Quantity: item.quantity,
      UnitPrice: item.declaredValue ?? metadataNumber(input.metadata, "unitPrice", 1),
      UnitWeight: item.weight ?? metadataNumber(input.metadata, "unitWeight", 0.1),
      Remark: item.name || item.sku || "Item",
      CurrencyCode: metadataString(input.metadata, "currencyCode", "USD") ?? "USD",
      InvoicePart: metadataString(input.metadata, "invoicePart", undefined),
      InvoiceUsage: metadataString(input.metadata, "invoiceUsage", undefined),
    })),
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
  const trimmed = name?.trim();
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

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
