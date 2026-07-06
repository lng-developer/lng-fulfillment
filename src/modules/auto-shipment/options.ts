import type { ShipOrderOptions } from "@/modules/shipment/types";
import { extractSkuCode } from "./sku";
import type { AutoShipmentProductDeclaration } from "./types";

const DEFAULT_PHONE = "0123456789";

export type AutoShipmentOptionsOrder = {
  id: string;
  externalOrderId: string | null;
  orderNumber: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  recipientAddress: unknown;
  destinationCountry: string | null;
  destinationState?: string | null;
  destinationCity?: string | null;
  destinationPostalCode?: string | null;
  items: Array<{
    id: string;
    sku: string | null;
    name: string | null;
    title: string | null;
    quantity: number;
    weight: unknown;
    declaredValue: unknown;
    unitPrice?: unknown;
    currency?: string | null;
  }>;
};

export function buildAutoShipmentShipOrderOptions(
  order: AutoShipmentOptionsOrder,
  resolution: {
    shippingMethodCode: string;
    productDeclarations: AutoShipmentProductDeclaration[];
  },
): ShipOrderOptions {
  const address = readAddress(order.recipientAddress);
  const name = splitName(order.recipientName ?? "Recipient");
  const declarationBySkuCode = new Map(
    resolution.productDeclarations.map((declaration) => [
      declaration.skuCode,
      declaration,
    ]),
  );
  const receiverCountryCode = normalizeCountryCode(
    address.country ?? order.destinationCountry ?? "",
  );

  const parcels = order.items.map((item) => {
    const skuCode = extractSkuCode(item.sku);
    const declaration = skuCode ? declarationBySkuCode.get(skuCode) : undefined;

    return {
      orderItemId: item.id,
      sku: item.sku ?? "NO-SKU",
      eName: declaration?.eName,
      cName: declaration?.cName,
      unitPrice:
        decimalToNumber(item.declaredValue) ??
        decimalToNumber(item.unitPrice) ??
        1,
      unitWeight: decimalToNumber(item.weight) ?? 0.1,
      currencyCode: item.currency ?? "USD",
      invoicePart: "cotton",
      invoiceUsage: "wear",
      remark: "",
    };
  });
  const weight = round(
    order.items.reduce(
      (sum, item) =>
        sum + (decimalToNumber(item.weight) ?? 0.1) * Math.max(item.quantity, 1),
      0,
    ),
  );

  return {
    shippingMethodCode: resolution.shippingMethodCode,
    sourceCode: "API",
    receiverFirstName: name.firstName,
    receiverLastName: name.lastName,
    receiverCompany: "",
    receiverCountryCode,
    receiverStreet: address.line1,
    receiverCity: address.city ?? order.destinationCity ?? "",
    receiverState: address.state ?? order.destinationState ?? "",
    receiverZip: address.postalCode ?? order.destinationPostalCode ?? "",
    receiverPhone: order.recipientPhone?.trim() || DEFAULT_PHONE,
    receiverEmail: order.recipientEmail ?? "",
    weight: Math.max(weight, 0.1),
    length: 20,
    width: 15,
    height: 5,
    sizeUnits: "cm",
    packageCount: 1,
    applicationType: 4,
    returnOption: 0,
    tariffPrepay: 0,
    insuranceOption: 0,
    parcels,
  };
}

function readAddress(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      line1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    };
  }

  const record = value as Record<string, unknown>;
  return {
    line1: readString(record.line1) ?? readString(record.address) ?? "",
    city: readString(record.city) ?? "",
    state: readString(record.state) ?? "",
    postalCode: readString(record.postalCode) ?? readString(record.zip) ?? "",
    country: readString(record.country) ?? "",
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "Recipient",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const numberValue = value.toNumber();
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function normalizeCountryCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "USA" || normalized === "UNITED STATES") return "US";
  if (normalized === "CANADA") return "CA";
  if (
    normalized === "UK" ||
    normalized === "UNITED KINGDOM" ||
    normalized === "GREAT BRITAIN" ||
    normalized === "ENGLAND"
  ) {
    return "GB";
  }

  return normalized;
}
