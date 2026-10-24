"use client";

import { Boxes, Package, ShieldCheck, Truck, UserRound, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getTenantYunIossSetting } from "@/lib/api/shipment-automation";
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
export const DEFAULT_YUN_IOSS_NUMBER = "IOSS261841515582105977183";
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

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES",
  "FI", "FR", "GR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

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
  iossNumber: string;
  iossEuDetected: boolean;
  useIoss: boolean;
  parcels: Array<
    Required<Pick<ShipParcelOverride, "sku" | "eName" | "cName" | "currencyCode" | "remark">> &
      Pick<
        ShipParcelOverride,
        | "orderItemId"
        | "unitPrice"
        | "unitWeight"
        | "invoicePart"
        | "invoiceUsage"
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
  const [tenantIossNumber, setTenantIossNumber] = useState(DEFAULT_YUN_IOSS_NUMBER);
  const preview = useMemo(
    () => buildShipmentPreview(order, detail, tenantIossNumber),
    [detail, order, tenantIossNumber],
  );
  const [shippingMethodCode, setShippingMethodCode] = useState(preview.shippingMethodCode);
  const [receiverValues, setReceiverValues] = useState(preview.receiver);
  const [packageValues, setPackageValues] = useState(preview.package);
  const [useIoss, setUseIoss] = useState(preview.useIoss);
  const [iossNumber, setIossNumber] = useState(preview.iossNumber);
  const [parcels, setParcels] = useState(preview.parcels);
  const controlsDisabled = hasSubmitted;
  const iossMissing = useIoss && !iossNumber.trim();

  useEffect(() => {
    setShippingMethodCode(preview.shippingMethodCode);
    setReceiverValues(preview.receiver);
    setPackageValues(preview.package);
    setUseIoss(preview.useIoss);
    setIossNumber(preview.iossNumber);
    setParcels(preview.parcels);
  }, [preview]);

  useEffect(() => {
    const controller = new AbortController();

    getTenantYunIossSetting(controller.signal)
      .then((setting) => {
        setTenantIossNumber(
          setting.status === "ACTIVE"
            ? setting.iossNumber ?? DEFAULT_YUN_IOSS_NUMBER
            : "",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTenantIossNumber(DEFAULT_YUN_IOSS_NUMBER);
        }
      });

    return () => controller.abort();
  }, []);

  const handleSubmit = () => {
    if (hasSubmitted || iossMissing) {
      return;
    }

    const options = buildShipOptions(
      preview,
      shippingMethodCode,
      receiverValues,
      packageValues,
      useIoss,
      iossNumber,
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

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-[800px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-sm">
              <Truck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Đóng gói & Tạo vận đơn
                </h2>
                <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  #{order.orderNumber ?? order.externalOrderId}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Kiểm tra thông số đóng gói và xác nhận tạo nhãn in với hãng vận chuyển.
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng popup đóng gói"
            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Packaging Specs */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wide">
                <Package className="h-4 w-4 text-indigo-600" />
                Thông số kiện hàng (Trọng lượng & Kích thước)
              </span>
              <span className="text-xs text-slate-400 font-medium">Đơn vị: kg / cm</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberInput
                disabled={controlsDisabled}
                label="Trọng lượng (kg)"
                onChange={(value) => updatePackage({ weight: value ?? 0.1 })}
                value={packageValues.weight}
              />
              <NumberInput
                disabled={controlsDisabled}
                label="Dài (cm)"
                onChange={(value) => updatePackage({ length: value ?? 15 })}
                value={packageValues.length}
              />
              <NumberInput
                disabled={controlsDisabled}
                label="Rộng (cm)"
                onChange={(value) => updatePackage({ width: value ?? 10 })}
                value={packageValues.width}
              />
              <NumberInput
                disabled={controlsDisabled}
                label="Cao (cm)"
                onChange={(value) => updatePackage({ height: value ?? 5 })}
                value={packageValues.height}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Dịch vụ vận chuyển (Carrier Method)
                </label>
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={controlsDisabled}
                  onChange={(event) => setShippingMethodCode(event.target.value)}
                  value={shippingMethodCode}
                >
                  {SHIPPING_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} {option === "VN-YTYCPREC" ? "(YunExpress Tiêu chuẩn)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Quốc gia đến
                </label>
                <div className="flex h-9 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800">
                  <span className="font-mono">{receiverValues.countryCode || "-"}</span>
                  {preview.iossEuDetected && (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Châu Âu (EU)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Customs declaration & SKU */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wide">
                <Boxes className="h-4 w-4 text-indigo-600" />
                Khai báo hải quan & Hàng hóa ({parcels.length} sản phẩm)
              </span>
            </div>
            <div className="space-y-3">
              {parcels.map((parcel, index) => (
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
                >
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">Mã SKU</span>
                      <div className="h-8 flex items-center font-mono text-xs font-semibold text-slate-800">
                        {parcel.sku}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        Tên tiếng Anh (EName)
                      </label>
                      <select
                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 shadow-sm"
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
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">Tên tiếng Trung (CName)</span>
                      <div className="h-8 flex items-center text-xs text-slate-700">
                        {parcel.cName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">Số lượng</span>
                      <div className="h-8 flex items-center font-mono text-xs font-bold text-slate-800">
                        {parcel.quantity}
                      </div>
                    </div>
                    <NumberInput
                      disabled={controlsDisabled}
                      label="Đơn giá (USD)"
                      onChange={(value) => updateParcel(index, { unitPrice: value })}
                      value={parcel.unitPrice}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="Chất liệu (InvoicePart)"
                      onChange={(value) => updateParcel(index, { invoicePart: value })}
                      value={parcel.invoicePart ?? "cotton"}
                    />
                    <TextInput
                      disabled={controlsDisabled}
                      label="Ghi chú (Remark)"
                      onChange={(value) => updateParcel(index, { remark: value })}
                      value={parcel.remark}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EU IOSS Panel */}
          {preview.iossEuDetected && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">
                    Mã số thuế IOSS (Đơn gửi đi Châu Âu)
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <input
                    checked={useIoss}
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    disabled={controlsDisabled}
                    onChange={(event) => setUseIoss(event.target.checked)}
                    type="checkbox"
                  />
                  Sử dụng IOSS
                </label>
              </div>
              {useIoss && (
                <div className="mt-2">
                  <input
                    className="h-9 w-full rounded-md border border-emerald-300 bg-white px-3 font-mono text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    disabled={controlsDisabled}
                    onChange={(event) => setIossNumber(event.target.value)}
                    placeholder="Nhập mã IOSS..."
                    value={iossNumber}
                  />
                  {iossMissing && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      Vui lòng nhập mã IOSS hợp lệ khi kích hoạt tùy chọn này.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Receiver preview */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wide">
              <UserRound className="h-4 w-4 text-indigo-600" />
              Người nhận & Địa chỉ giao hàng
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 block text-[11px]">Họ tên:</span>
                <span className="font-semibold text-slate-800">{receiverValues.firstName} {receiverValues.lastName}</span>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                <span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
                <span className="font-medium text-slate-700">{receiverValues.street}, {receiverValues.city}, {receiverValues.state} {receiverValues.zip}</span>
              </div>
            </div>
          </section>

          {/* Environment */}
          <EnvironmentSelector
            disabled={controlsDisabled}
            onChange={setEnvironment}
            value={environment}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <Button
            disabled={controlsDisabled}
            onClick={onClose}
            variant="secondary"
          >
            Hủy bỏ
          </Button>
          <Button
            disabled={controlsDisabled || iossMissing}
            isLoading={hasSubmitted}
            leftIcon={<Truck className="h-4 w-4" />}
            onClick={handleSubmit}
            variant="primary"
          >
            {hasSubmitted ? "Đang tạo vận đơn & nhãn..." : "Xác nhận đóng hàng & Lấy nhãn"}
          </Button>
        </div>
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
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
      <span className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 font-mono text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
  useIoss: boolean,
  iossNumber: string,
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
    ...(useIoss && iossNumber.trim() ? { iossNumber: iossNumber.trim() } : {}),
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
  defaultIossNumber = DEFAULT_YUN_IOSS_NUMBER,
): ShipmentPreview {
  const mapping = order.shipMappingPreview;
  const orderNumber = mapping?.customerOrderNumber ?? order.orderNumber ?? order.externalOrderId;
  const address = getAddress(detail?.recipientAddress);
  const fullName = detail?.recipientName ?? order.recipientName ?? "Recipient";
  const name = splitName(fullName);
  const destinationCountry =
    address.country ||
    detail?.destinationCountry ||
    order.destinationCountry ||
    mapping?.receiver.country ||
    "";
  const parcels = buildPreviewParcels(order, detail);
  const iossEuDetected = isEuCountry(destinationCountry);
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
      countryCode: destinationCountry,
      street: address.line1,
      city:
        address.city ||
        detail?.destinationCity ||
        order.destinationCity ||
        mapping?.receiver.city ||
        "",
      state:
        address.state ||
        detail?.destinationState ||
        order.destinationState ||
        mapping?.receiver.state ||
        "",
      zip:
        address.postalCode ||
        detail?.destinationPostalCode ||
        order.destinationPostalCode ||
        mapping?.receiver.postalCode ||
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
    iossNumber: defaultIossNumber,
    iossEuDetected,
    useIoss: iossEuDetected,
    parcels,
  };
}

function isEuCountry(countryCode: string | null | undefined) {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized) return false;

  return EU_COUNTRY_CODES.has(normalized);
}

function buildPreviewParcels(
  order: OrderListItem,
  detail: OrderDetail | null,
) {
  const defaultCurrency = "USD";

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
        currencyCode: item.currency ?? defaultCurrency,
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
        currencyCode: defaultCurrency,
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
      currencyCode: defaultCurrency,
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
