"use client";

import { Boxes, Package, ShieldCheck, Truck, UserRound, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getCarrierAccounts } from "@/lib/api/carrier-accounts";
import { getTenantYunIossSetting } from "@/lib/api/shipment-automation";
import { cn } from "@/lib/utils";
import type {
  OrderDetail,
  OrderDetailItem,
  OrderListItem,
  ShipEnvironment,
  ShipOrderOptions,
  ShipParcelOverride,
} from "@/types/orders";
import type { CarrierAccount } from "@/types/settings";
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
  carrierCode?: "YUNEXPRESS_OMS" | "VIETTEL_POST";
  carrierAccountId?: string | null;
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
  const [carrierCode, setCarrierCode] = useState<"YUNEXPRESS_OMS" | "VIETTEL_POST">("VIETTEL_POST");
  const [carrierAccounts, setCarrierAccounts] = useState<CarrierAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
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
  const phoneInvalid = carrierCode === "VIETTEL_POST" &&
    (!/^\+?[\d\s().-]+$/.test(receiverValues.phone.trim()) ||
      receiverValues.phone.replace(/\D/g, "").length < 7 ||
      receiverValues.phone.replace(/\D/g, "").length > 15);
  const iossMissing = carrierCode === "YUNEXPRESS_OMS" && useIoss && !iossNumber.trim();

  const viettelPostAccounts = useMemo(
    () => carrierAccounts.filter((a) => a.carrierCode === "VIETTEL_POST"),
    [carrierAccounts],
  );

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

  useEffect(() => {
    const controller = new AbortController();
    setLoadingAccounts(true);

    getCarrierAccounts(controller.signal)
      .then((accounts) => {
        setCarrierAccounts(accounts);
        const vpAccounts = accounts.filter(
          (a) => a.carrierCode === "VIETTEL_POST" && a.status === "ACTIVE",
        );
        const defaultVp = vpAccounts.find((a) => a.isDefault) || vpAccounts[0];
        if (defaultVp) {
          setSelectedAccountId(defaultVp.id);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingAccounts(false);
      });

    return () => controller.abort();
  }, []);

  const handleSelectCarrier = (code: "YUNEXPRESS_OMS" | "VIETTEL_POST") => {
    setCarrierCode(code);
    if (code === "VIETTEL_POST" && !selectedAccountId) {
      const active = viettelPostAccounts.find((a) => a.status === "ACTIVE");
      if (active) {
        setSelectedAccountId(active.id);
      } else if (viettelPostAccounts.length > 0) {
        setSelectedAccountId(viettelPostAccounts[0].id);
      }
    }
  };

  const handleSubmit = () => {
    if (
      hasSubmitted ||
      phoneInvalid ||
      (carrierCode === "YUNEXPRESS_OMS" && iossMissing) ||
      (carrierCode === "VIETTEL_POST" && !selectedAccountId && viettelPostAccounts.length > 0)
    ) {
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
    onSubmit({
      environment,
      carrierCode,
      carrierAccountId: carrierCode === "VIETTEL_POST" ? selectedAccountId : null,
      options,
    });
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
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg border shadow-sm",
                carrierCode === "VIETTEL_POST"
                  ? "bg-rose-50 text-rose-600 border-rose-200/60"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200/60",
              )}
            >
              {carrierCode === "VIETTEL_POST" ? (
                <Package className="h-4 w-4" aria-hidden />
              ) : (
                <Truck className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Đóng gói & Tạo vận đơn {carrierCode === "VIETTEL_POST" ? "(Viettel Post)" : "(YunExpress)"}
                </h2>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold px-2 py-0.5 rounded border",
                    carrierCode === "VIETTEL_POST"
                      ? "text-rose-700 bg-rose-50 border-rose-200"
                      : "text-indigo-700 bg-indigo-50 border-indigo-200",
                  )}
                >
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
          {/* Carrier Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Hãng vận chuyển (Carrier)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-semibold transition-all border",
                  carrierCode === "VIETTEL_POST"
                    ? "bg-white text-rose-700 border-rose-300 shadow-sm ring-2 ring-rose-500/20"
                    : "bg-slate-100/60 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900",
                )}
                disabled={controlsDisabled}
                onClick={() => handleSelectCarrier("VIETTEL_POST")}
                type="button"
              >
                <Package className="h-4 w-4" />
                <span>Viettel Post (Logistek)</span>
              </button>

              <button
                className="flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-semibold border bg-slate-100/40 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                disabled={true}
                title="Kết nối YunExpress đã bị tắt"
                type="button"
              >
                <Truck className="h-4 w-4" />
                <span>YunExpress (Đã tắt)</span>
              </button>
            </div>

            {carrierCode === "VIETTEL_POST" && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    Tài khoản kết nối Viettel Post:
                  </label>
                  <span className="text-[11px] font-medium text-rose-700">
                    Cổng Logistek API
                  </span>
                </div>

                <select
                  className="h-9 w-full rounded-md border border-rose-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  disabled={controlsDisabled || loadingAccounts}
                  onChange={(e) => setSelectedAccountId(e.target.value || null)}
                  value={selectedAccountId ?? ""}
                >
                  {viettelPostAccounts.length === 0 ? (
                    <option value="">(Chưa có tài khoản Viettel Post nào)</option>
                  ) : (
                    viettelPostAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName} {acc.isDefault ? "★ (Mặc định)" : ""} ({acc.status})
                      </option>
                    ))
                  )}
                </select>

                {selectedAccountId === "cmwjc0l9q0001iq1sse3mzemj" && (
                  <div className="mt-2 rounded-md bg-amber-50 border border-amber-300 p-2 text-[11px] font-medium text-amber-800 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span><strong>Tài khoản TEST STAGING:</strong> Bạn đang chọn cổng thử nghiệm. Mã tracking tạo ra sẽ không được chuyển phát thật!</span>
                  </div>
                )}

                {viettelPostAccounts.length === 0 && !loadingAccounts && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-600">
                    Chưa tìm thấy tài khoản Viettel Post nào. Vui lòng thêm tài khoản Viettel Post trong Cài đặt hãng vận chuyển.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Packaging Specs */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
                  carrierCode === "VIETTEL_POST" ? "text-rose-900" : "text-slate-800",
                )}
              >
                <Package
                  className={cn(
                    "h-4 w-4",
                    carrierCode === "VIETTEL_POST" ? "text-rose-600" : "text-indigo-600",
                  )}
                />
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
                onChange={(value) => updatePackage({ length: value ?? 5 })}
                value={packageValues.length}
              />
              <NumberInput
                disabled={controlsDisabled}
                label="Rộng (cm)"
                onChange={(value) => updatePackage({ width: value ?? 5 })}
                value={packageValues.width}
              />
              <NumberInput
                disabled={controlsDisabled}
                label="Cao (cm)"
                onChange={(value) => updatePackage({ height: value ?? 2 })}
                value={packageValues.height}
              />
            </div>

            {carrierCode === "YUNEXPRESS_OMS" ? (
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
            ) : null}
          </section>

          {/* Customs declaration & SKU */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
                  carrierCode === "VIETTEL_POST" ? "text-rose-900" : "text-slate-800",
                )}
              >
                <Boxes
                  className={cn(
                    "h-4 w-4",
                    carrierCode === "VIETTEL_POST" ? "text-rose-600" : "text-indigo-600",
                  )}
                />
                Khai báo hàng hóa ({parcels.length} sản phẩm)
              </span>
            </div>
            <div className="space-y-3">
              {parcels.map((parcel, index) => (
                <div
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
                >
                  <div
                    className={cn(
                      "grid gap-2",
                      carrierCode === "VIETTEL_POST" ? "sm:grid-cols-2" : "sm:grid-cols-3",
                    )}
                  >
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">Mã SKU</span>
                      <div className="h-8 flex items-center font-mono text-xs font-semibold text-slate-800">
                        {parcel.sku}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        Tên sản phẩm khai báo (EName)
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
                    {carrierCode === "YUNEXPRESS_OMS" && (
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500">Tên tiếng Trung (CName)</span>
                        <div className="h-8 flex items-center text-xs text-slate-700">
                          {parcel.cName}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      "mt-2 grid gap-2",
                      carrierCode === "VIETTEL_POST" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
                    )}
                  >
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
                    {carrierCode === "YUNEXPRESS_OMS" && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EU IOSS Panel (Only relevant for YunExpress) */}
          {carrierCode === "YUNEXPRESS_OMS" && preview.iossEuDetected && (
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
            <span
              className={cn(
                "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
                carrierCode === "VIETTEL_POST" ? "text-rose-900" : "text-slate-800",
              )}
            >
              <UserRound
                className={cn(
                  "h-4 w-4",
                  carrierCode === "VIETTEL_POST" ? "text-rose-600" : "text-indigo-600",
                )}
              />
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
            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Số điện thoại người nhận{carrierCode === "VIETTEL_POST" ? " *" : ""}
              <input
                type="tel"
                autoComplete="tel"
                value={receiverValues.phone}
                disabled={controlsDisabled}
                required={carrierCode === "VIETTEL_POST"}
                aria-invalid={phoneInvalid}
                aria-describedby="recipient-phone-help"
                placeholder="Nhập SĐT kèm mã quốc gia"
                onChange={(event) => setReceiverValues((current) => ({ ...current, phone: event.target.value }))}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-3 font-normal focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <p id="recipient-phone-help" className={cn("mt-1 text-xs", phoneInvalid ? "text-red-600" : "text-slate-500")}>
              {phoneInvalid
                ? "Viettel Post yêu cầu SĐT gồm 7–15 chữ số. Vui lòng nhập số liên hệ giao hàng hợp lệ."
                : "Số này được dùng cho vận đơn đang tạo; không thay đổi thông tin đơn gốc."}
            </p>
          </section>

          {/* Environment (Only for YunExpress; Viettel Post uses dedicated Carrier Accounts) */}
          {carrierCode === "YUNEXPRESS_OMS" && (
            <EnvironmentSelector
              disabled={controlsDisabled}
              onChange={setEnvironment}
              value={environment}
            />
          )}
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
            className={
              carrierCode === "VIETTEL_POST"
                ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white"
                : undefined
            }
            disabled={
              controlsDisabled ||
              phoneInvalid ||
              (carrierCode === "YUNEXPRESS_OMS" && iossMissing) ||
              (carrierCode === "VIETTEL_POST" && !selectedAccountId && viettelPostAccounts.length > 0)
            }
            isLoading={hasSubmitted}
            leftIcon={
              carrierCode === "VIETTEL_POST" ? (
                <Package className="h-4 w-4" />
              ) : (
                <Truck className="h-4 w-4" />
              )
            }
            onClick={handleSubmit}
            variant="primary"
          >
            {hasSubmitted
              ? carrierCode === "VIETTEL_POST"
                ? "Đang gửi đơn sang Viettel Post..."
                : "Đang tạo vận đơn & nhãn..."
              : carrierCode === "VIETTEL_POST"
                ? "Tạo vận đơn Viettel Post"
                : "Xác nhận đóng hàng & Lấy nhãn"}
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
    receiverPhone: receiverValues.phone.trim(),
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
      length: 5,
      width: 5,
      height: 2,
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

function normalizeUnitPrice(value: number | undefined): number {
  if (value === undefined || value === null || !Number.isFinite(value)) return 1;
  // If price is stored in cents (e.g. 2785 cents = $27.85), convert to dollars
  if (value > 100) {
    return Math.round((value / 100) * 100) / 100;
  }
  return value;
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
        unitPrice: normalizeUnitPrice(parseNumber(item.declaredValue) ?? parseNumber(item.unitPrice)),
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
        unitPrice: normalizeUnitPrice(item.unitPrice),
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
  const firstName = parts[0] ?? "Recipient";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
  return {
    firstName,
    lastName,
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
