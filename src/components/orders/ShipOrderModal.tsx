"use client";

import { Package, Truck, UserRound, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  OrderDetail,
  OrderDetailItem,
  OrderListItem,
  ShipEnvironment,
  ShipOrderOptions,
  ShipParcelOverride,
} from "@/types/orders";
import { EnvironmentSelector } from "./EnvironmentSelector";

export const SHIPPING_METHOD_OPTIONS = ["VN-YTYCPREC", "VNFZZXR", "VNTHZXR"] as const;
export const PRODUCT_OPTIONS = [
  {
    eName: "Paper napkins",
    cName: "餐巾纸",
    keywords: ["napkin", "napkins"],
  },
  {
    eName: "Wooden decor",
    cName: "木制装饰品",
    keywords: ["wood", "wooden", "decor"],
  },
  {
    eName: "Embroidered shirt",
    cName: "刺绣衬衫",
    keywords: ["embroidered", "embroidery", "shirt", "tee", "t-shirt", "top"],
  },
] as const;

export type ShipmentPreview = {
  customerOrderNumber: string;
  shippingMethodCode: string;
  sourceCode: string;
  receiver: {
    firstName: string;
    lastName: string;
    company: string;
    countryCode: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
  };
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
    sizeUnits: string;
    packageCount: number;
    applicationType: number;
    returnOption: number;
    tariffPrepay: number;
    insuranceOption: number;
  };
  parcels: Array<
    Required<Pick<ShipParcelOverride, "sku" | "eName" | "cName" | "currencyCode" | "remark">> &
      Pick<
        ShipParcelOverride,
        "orderItemId" | "unitPrice" | "unitWeight" | "invoicePart" | "invoiceUsage"
      > & {
        quantity: number;
      }
  >;
};

export type ShipmentReceiverValues = ShipmentPreview["receiver"];

export type ShipOrderSubmitInput = {
  environment: ShipEnvironment;
  options: ShipOrderOptions;
};

export function ShipOrderModal({
  order,
  detail,
  onClose,
  onSubmit,
}: {
  order: OrderListItem;
  detail: OrderDetail | null;
  onClose: () => void;
  onSubmit: (input: ShipOrderSubmitInput) => void;
}) {
  const [environment, setEnvironment] = useState<ShipEnvironment>("live");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const preview = useMemo(() => buildShipmentPreview(order, detail), [detail, order]);
  const [shippingMethodCode, setShippingMethodCode] = useState(
    preview.shippingMethodCode,
  );
  const [receiverValues, setReceiverValues] = useState(preview.receiver);
  const [packageValues, setPackageValues] = useState(preview.package);
  const [parcels, setParcels] = useState(preview.parcels);
  const controlsDisabled = hasSubmitted;

  useEffect(() => {
    setShippingMethodCode(preview.shippingMethodCode);
    setReceiverValues(preview.receiver);
    setPackageValues(preview.package);
    setParcels(preview.parcels);
  }, [preview]);

  const handleSubmit = () => {
    if (hasSubmitted) {
      return;
    }

    const options = buildShipOptions(
      preview,
      shippingMethodCode,
      receiverValues,
      packageValues,
      parcels,
    );

    setHasSubmitted(true);
    onSubmit({ environment, options });
  };

  function updateParcel(index: number, patch: Partial<(typeof parcels)[number]>) {
    setParcels((current) =>
      current.map((parcel, parcelIndex) =>
        parcelIndex === index ? { ...parcel, ...patch } : parcel,
      ),
    );
  }

  function updatePackage(patch: Partial<typeof packageValues>) {
    setPackageValues((current) => ({ ...current, ...patch }));
  }

  function updateReceiver(patch: Partial<typeof receiverValues>) {
    setReceiverValues((current) => ({ ...current, ...patch }));
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--brand-light)] text-[var(--brand)]">
              <Truck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Create YunExpress shipment
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Confirm YunExpress request fields before creating the shipment.
              </p>
            </div>
          </div>
          <button
            aria-label="Close shipment modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(92vh-130px)] overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            <ModalSection icon={<Truck />} title="Thông tin shipment chính">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="CustomerOrderNumber" mono value={preview.customerOrderNumber} />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                    ShippingMethodCode
                  </label>
                  <div>
                    <select
                      className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 font-mono text-[11px] text-[var(--text-primary)]"
                      disabled={controlsDisabled}
                      onChange={(event) => setShippingMethodCode(event.target.value)}
                      value={shippingMethodCode}
                    >
                      {SHIPPING_METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Field label="SourceCode" mono value={preview.sourceCode} />
                <Field
                  label="Order status"
                  value={<StatusBadge status={order.status} />}
                />
              </div>
            </ModalSection>

            <ModalSection icon={<UserRound />} title="Receiver">
              <div className="grid gap-2 md:grid-cols-3">
                <TextInput
                  disabled={controlsDisabled}
                  label="FirstName"
                  onChange={(value) => updateReceiver({ firstName: value })}
                  value={receiverValues.firstName}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="LastName"
                  onChange={(value) => updateReceiver({ lastName: value })}
                  value={receiverValues.lastName}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="Company"
                  onChange={(value) => updateReceiver({ company: value })}
                  value={receiverValues.company}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="CountryCode"
                  onChange={(value) =>
                    updateReceiver({ countryCode: value.toUpperCase() })
                  }
                  value={receiverValues.countryCode}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="Street"
                  onChange={(value) => updateReceiver({ street: value })}
                  value={receiverValues.street}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="City"
                  onChange={(value) => updateReceiver({ city: value })}
                  value={receiverValues.city}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="State"
                  onChange={(value) => updateReceiver({ state: value })}
                  value={receiverValues.state}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="Zip"
                  onChange={(value) => updateReceiver({ zip: value })}
                  value={receiverValues.zip}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="Phone"
                  onChange={(value) => updateReceiver({ phone: value })}
                  value={receiverValues.phone}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="Email"
                  onChange={(value) => updateReceiver({ email: value })}
                  value={receiverValues.email}
                />
              </div>
            </ModalSection>

            <ModalSection icon={<Package />} title="Package">
              <div className="grid gap-2 md:grid-cols-5">
                <NumberInput
                  disabled={controlsDisabled}
                  label="Weight"
                  onChange={(value) => updatePackage({ weight: value ?? 0 })}
                  value={packageValues.weight}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="Length"
                  onChange={(value) => updatePackage({ length: value ?? 0 })}
                  value={packageValues.length}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="Width"
                  onChange={(value) => updatePackage({ width: value ?? 0 })}
                  value={packageValues.width}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="Height"
                  onChange={(value) => updatePackage({ height: value ?? 0 })}
                  value={packageValues.height}
                />
                <TextInput
                  disabled={controlsDisabled}
                  label="SizeUnits"
                  onChange={(value) => updatePackage({ sizeUnits: value })}
                  value={packageValues.sizeUnits}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="PackageCount"
                  onChange={(value) => updatePackage({ packageCount: value ?? 1 })}
                  value={packageValues.packageCount}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="ApplicationType"
                  onChange={(value) => updatePackage({ applicationType: value ?? 0 })}
                  value={packageValues.applicationType}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="ReturnOption"
                  onChange={(value) => updatePackage({ returnOption: value ?? 0 })}
                  value={packageValues.returnOption}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="TariffPrepay"
                  onChange={(value) => updatePackage({ tariffPrepay: value ?? 0 })}
                  value={packageValues.tariffPrepay}
                />
                <NumberInput
                  disabled={controlsDisabled}
                  label="InsuranceOption"
                  onChange={(value) =>
                    updatePackage({ insuranceOption: value ?? 0 })
                  }
                  value={packageValues.insuranceOption}
                />
              </div>
            </ModalSection>
          </div>

          <ModalSection className="mt-3" icon={<Package />} title="Parcels">
            <div className="grid gap-3">
              {parcels.map((parcel, index) => (
                <div
                  className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3"
                  key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
                >
                  <div className="mb-3 grid gap-2 md:grid-cols-[160px_minmax(190px,1fr)_minmax(160px,220px)]">
                    <Field label="SKU" mono value={parcel.sku} />
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                        EName
                      </label>
                      <select
                        className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 text-[11px]"
                        disabled={controlsDisabled}
                        onChange={(event) => {
                          const option = PRODUCT_OPTIONS.find(
                            (item) => item.eName === event.target.value,
                          );
                          if (option) {
                            updateParcel(index, {
                              eName: option.eName,
                              cName: option.cName,
                            });
                          }
                        }}
                        value={parcel.eName}
                      >
                        {PRODUCT_OPTIONS.map((option) => (
                          <option key={option.eName} value={option.eName}>
                            {option.eName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field label="CName" value={parcel.cName} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    <Field label="Quantity" mono value={parcel.quantity} />
                    <NumberInput
                      disabled={controlsDisabled}
                      label="UnitPrice"
                      onChange={(value) => updateParcel(index, { unitPrice: value })}
                      value={parcel.unitPrice}
                    />
                    <NumberInput
                      disabled={controlsDisabled}
                      label="UnitWeight"
                      onChange={(value) => updateParcel(index, { unitWeight: value })}
                      value={parcel.unitWeight}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="CurrencyCode"
                      onChange={(value) =>
                        updateParcel(index, { currencyCode: value.toUpperCase() })
                      }
                      value={parcel.currencyCode}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="InvoicePart"
                      onChange={(value) => updateParcel(index, { invoicePart: value })}
                      value={parcel.invoicePart ?? ""}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="InvoiceUsage"
                      onChange={(value) => updateParcel(index, { invoiceUsage: value })}
                      value={parcel.invoiceUsage ?? ""}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="Remark"
                      onChange={(value) => updateParcel(index, { remark: value })}
                      value={parcel.remark}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ModalSection>

          <ModalSection className="mt-3" icon={<Truck />} title="Environment">
            <EnvironmentSelector
              disabled={controlsDisabled}
              onChange={setEnvironment}
              value={environment}
            />
          </ModalSection>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            type="button"
          >
            Create shipment
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSection({
  children,
  className,
  icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  icon: React.ReactElement;
  title: string;
}) {
  return (
    <section
      className={`rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 ${
        className ?? ""
      }`}
    >
      <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        <span className="text-[var(--brand)]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-2 py-1.5">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`min-h-[17px] truncate text-[11px] text-[var(--text-primary)] ${
          mono ? "font-mono" : ""
        }`}
        title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function TextInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 text-[11px] text-[var(--text-primary)]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function NumberInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: number | undefined) => void;
  value: number | undefined;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 font-mono text-[11px] text-[var(--text-primary)]"
        disabled={disabled}
        min={0}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : undefined);
        }}
        step="0.001"
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

export function buildShipOptions(
  preview: ShipmentPreview,
  shippingMethodCode: string,
  receiverValues: ShipmentReceiverValues,
  packageValues: ShipmentPreview["package"],
  parcels: ShipmentPreview["parcels"],
): ShipOrderOptions {
  return {
    shippingMethodCode,
    sourceCode: preview.sourceCode,
    receiverFirstName: receiverValues.firstName,
    receiverLastName: receiverValues.lastName,
    receiverCompany: receiverValues.company,
    receiverCountryCode: receiverValues.countryCode,
    receiverStreet: receiverValues.street,
    receiverCity: receiverValues.city,
    receiverState: receiverValues.state,
    receiverZip: receiverValues.zip,
    receiverPhone: receiverValues.phone,
    receiverEmail: receiverValues.email,
    weight: packageValues.weight,
    length: packageValues.length,
    width: packageValues.width,
    height: packageValues.height,
    sizeUnits: packageValues.sizeUnits,
    packageCount: packageValues.packageCount,
    applicationType: packageValues.applicationType,
    returnOption: packageValues.returnOption,
    tariffPrepay: packageValues.tariffPrepay,
    insuranceOption: packageValues.insuranceOption,
    parcels: parcels.map((parcel) => ({
      orderItemId: parcel.orderItemId,
      sku: parcel.sku,
      eName: parcel.eName,
      cName: parcel.cName,
      unitPrice: parcel.unitPrice,
      unitWeight: parcel.unitWeight,
      currencyCode: parcel.currencyCode,
      invoicePart: parcel.invoicePart,
      invoiceUsage: parcel.invoiceUsage,
      remark: parcel.remark,
    })),
  };
}

export function buildShipmentPreview(
  order: OrderListItem,
  detail: OrderDetail | null,
): ShipmentPreview {
  const mapping = order.shipMappingPreview;
  const orderNumber = mapping?.customerOrderNumber ?? order.orderNumber ?? order.externalOrderId;
  const address = getAddress(detail?.recipientAddress);
  const fullName = detail?.recipientName ?? order.recipientName ?? "Recipient";
  const name = splitName(fullName);
  const parcels = buildPreviewParcels(order, detail);
  const weight = round(
    parcels.reduce((sum, parcel) => sum + (parcel.unitWeight ?? 0.1) * parcel.quantity, 0),
  );

  return {
    customerOrderNumber: orderNumber,
    shippingMethodCode:
      mapping?.shippingMethodCode && SHIPPING_METHOD_OPTIONS.includes(mapping.shippingMethodCode as never)
        ? mapping.shippingMethodCode
        : "VN-YTYCPREC",
    sourceCode: mapping?.sourceCode ?? "API",
    receiver: {
      firstName: name.firstName,
      lastName: name.lastName,
      company: "",
      countryCode:
        address.country ??
        detail?.destinationCountry ??
        order.destinationCountry ??
        mapping?.receiver.country ??
        "",
      street: address.line1,
      city:
        address.city ??
        detail?.destinationCity ??
        order.destinationCity ??
        mapping?.receiver.city ??
        "",
      state:
        address.state ??
        detail?.destinationState ??
        order.destinationState ??
        mapping?.receiver.state ??
        "",
      zip:
        address.postalCode ??
        detail?.destinationPostalCode ??
        order.destinationPostalCode ??
        mapping?.receiver.postalCode ??
        "",
      phone: detail?.recipientPhone ?? "",
      email: detail?.recipientEmail ?? "",
    },
    package: {
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
    },
    parcels,
  };
}

function buildPreviewParcels(order: OrderListItem, detail: OrderDetail | null) {
  if (detail?.items.length) {
    return detail.items.map((item: OrderDetailItem) => {
      const name = item.title ?? item.name ?? item.sku ?? "Item";
      const product = chooseProductOption(name);
      return {
        orderItemId: item.id,
        sku: item.sku ?? "NO-SKU",
        eName: product.eName,
        cName: product.cName,
        quantity: item.quantity,
        unitPrice: parseNumber(item.declaredValue) ?? parseNumber(item.unitPrice) ?? 1,
        unitWeight: parseNumber(item.weight) ?? 0.1,
        currencyCode: item.currency ?? "USD",
        invoicePart: "cotton",
        invoiceUsage: "wear",
        remark: "",
      };
    });
  }

  if (order.shipMappingPreview?.items?.length) {
    return order.shipMappingPreview.items.map((item) => {
      const product = chooseProductOption(item.name ?? item.sku);
      return {
        orderItemId: undefined,
        sku: item.sku,
        eName: product.eName,
        cName: product.cName,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 1,
        unitWeight: item.unitWeight ?? 0.1,
        currencyCode: "USD",
        invoicePart: "cotton",
        invoiceUsage: "wear",
        remark: "",
      };
    });
  }

  const product = chooseProductOption(order.firstItemName ?? order.firstSku ?? "");
  return [
    {
      orderItemId: undefined,
      sku: order.firstSku ?? "NO-SKU",
      eName: product.eName,
      cName: product.cName,
      quantity: Math.max(order.totalQuantity, 1),
      unitPrice: 1,
      unitWeight: 0.1,
      currencyCode: "USD",
      invoicePart: "cotton",
      invoiceUsage: "wear",
      remark: "",
    },
  ];
}

function chooseProductOption(value: string) {
  const normalized = value.toLowerCase();
  return (
    PRODUCT_OPTIONS.find((option) =>
      option.keywords.some((keyword) => normalized.includes(keyword)),
    ) ?? PRODUCT_OPTIONS[2]
  );
}

function getAddress(value: unknown) {
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

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
