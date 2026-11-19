"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { WarningBox } from "@/components/ui/WarningBox";
import { getErrorMessage } from "@/lib/api/base";
import {
  saveCredential,
  saveViettelPostCredential,
} from "@/lib/api/carrier-accounts";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type {
  CarrierAccount,
  CredentialFormValues,
  ViettelPostCredentialFormValues,
} from "@/types/settings";

const EMPTY_FORM: CredentialFormValues = {
  customerNo: "",
  apiSecret: "",
  baseUrl: "http://oms.api.yunexpress.com",
  lang: "en-US",
  shippingMethodCode: "THZXR",
  sourceCode: "API",
  sizeUnit: "cm",
  liveEnabled: false,
};

const EMPTY_VIETTEL_POST_FORM: ViettelPostCredentialFormValues = {
  clientId: "",
  clientSecret: "",
  authUrl: "https://auth-global.viettelpost.vn",
  orderUrl: "https://api-global.viettelpost.vn",
  lineShipId: "VTP_DEFAULT",
  shipFromFirstName: "Fulfillment",
  shipFromLastName: "Kho",
  shipFromPhoneNumber: "0988888888",
  shipFromAddress1: "123 Pham Van Dong",
  shipFromCountry: "VN",
  shipFromState: "Hà Nội",
  shipFromCity: "Hà Nội",
  shipFromZipCode: "100000",
  liveEnabled: false,
};

export function CredentialForm({
  account,
  onCancel,
  onSaved,
}: {
  account: CarrierAccount;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isViettelPost = account.carrierCode === "VIETTEL_POST";
  const isStagingAccount =
    account.displayName.toLowerCase().includes("staging") ||
    account.displayName.toLowerCase().includes("dev");

  const existingConfig = account.credential?.safeConfig as
    | Record<string, unknown>
    | undefined;

  const [values, setValues] = useState<CredentialFormValues>(() => ({
    ...EMPTY_FORM,
    ...(typeof existingConfig?.customerNo === "string" ? { customerNo: existingConfig.customerNo } : {}),
    ...(typeof existingConfig?.baseUrl === "string" ? { baseUrl: existingConfig.baseUrl } : {}),
    ...(typeof existingConfig?.shippingMethodCode === "string" ? { shippingMethodCode: existingConfig.shippingMethodCode } : {}),
    ...(typeof existingConfig?.liveEnabled === "boolean" ? { liveEnabled: existingConfig.liveEnabled } : {}),
  }));
  const [vpValues, setVpValues] = useState<ViettelPostCredentialFormValues>(() => {
    const isStaging =
      isStagingAccount ||
      (typeof existingConfig?.orderUrl === "string" && existingConfig.orderUrl.includes("staging"));
    return {
      ...EMPTY_VIETTEL_POST_FORM,
      lineShipId:
        typeof existingConfig?.lineShipId === "string" && existingConfig.lineShipId
          ? existingConfig.lineShipId
          : isStaging
            ? "LS494228"
            : "LS485343",
      authUrl:
        typeof existingConfig?.authUrl === "string" && existingConfig.authUrl
          ? existingConfig.authUrl
          : isStaging
            ? "https://auth-staging.logistek.com.vn"
            : "https://auth-global.viettelpost.vn",
      orderUrl:
        typeof existingConfig?.orderUrl === "string" && existingConfig.orderUrl
          ? existingConfig.orderUrl
          : isStaging
            ? "https://order-staging.logistek.com.vn"
            : "https://api-global.viettelpost.vn",
      clientId:
        typeof existingConfig?.clientId === "string"
          ? existingConfig.clientId
          : "",
      shipFromFirstName:
        typeof existingConfig?.shipFromFirstName === "string"
          ? existingConfig.shipFromFirstName
          : "Fulfillment",
      shipFromLastName:
        typeof existingConfig?.shipFromLastName === "string"
          ? existingConfig.shipFromLastName
          : "Kho",
      shipFromPhoneNumber:
        typeof existingConfig?.shipFromPhoneNumber === "string"
          ? existingConfig.shipFromPhoneNumber
          : "0988888888",
      shipFromAddress1:
        typeof existingConfig?.shipFromAddress1 === "string"
          ? existingConfig.shipFromAddress1
          : "123 Pham Van Dong",
      shipFromCity:
        typeof existingConfig?.shipFromCity === "string"
          ? existingConfig.shipFromCity
          : "Hà Nội",
      shipFromState:
        typeof existingConfig?.shipFromState === "string"
          ? existingConfig.shipFromState
          : "Hà Nội",
      shipFromCountry:
        typeof existingConfig?.shipFromCountry === "string"
          ? existingConfig.shipFromCountry
          : "VN",
      shipFromZipCode:
        typeof existingConfig?.shipFromZipCode === "string"
          ? existingConfig.shipFromZipCode
          : "100000",
      liveEnabled:
        typeof existingConfig?.liveEnabled === "boolean"
          ? existingConfig.liveEnabled
          : false,
    };
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLFormElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      if (isViettelPost) {
        const payloadToSave: ViettelPostCredentialFormValues = {
          ...vpValues,
          lineShipId: vpValues.lineShipId.trim() || "VTP_DEFAULT",
          shipFromFirstName: vpValues.shipFromFirstName.trim() || "Hoàng",
          shipFromLastName: vpValues.shipFromLastName.trim() || "Nguyễn",
          shipFromPhoneNumber: vpValues.shipFromPhoneNumber.trim() || "0988888888",
          shipFromAddress1: vpValues.shipFromAddress1.trim() || "Kho Viettel Post",
          shipFromCity: vpValues.shipFromCity.trim() || "Hà Nội",
          shipFromState: vpValues.shipFromState.trim() || "Hà Nội",
          shipFromCountry: vpValues.shipFromCountry.trim() || "VN",
          shipFromZipCode: vpValues.shipFromZipCode.trim() || "100000",
        };
        await saveViettelPostCredential(account.id, payloadToSave);
        setVpValues(EMPTY_VIETTEL_POST_FORM);
      } else {
        await saveCredential(account.id, values);
        setValues(EMPTY_FORM);
      }
      onSaved();
    } catch (err) {
      if (isViettelPost) {
        setVpValues((cur) => ({ ...cur, clientSecret: "" }));
      } else {
        setValues((cur) => ({ ...cur, apiSecret: "" }));
      }
      setError(getErrorMessage(err));
      toastError("Failed to save credential.");
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      role="dialog"
    >
      <form
        autoComplete="off"
        className="max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
        onSubmit={submit}
        ref={trapRef}
      >
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {account.displayName} - Thiết lập thông tin kết nối
          </h2>
        </div>

        {isViettelPost ? (
          <div className="grid gap-4 px-6 py-5">
            {account.credential && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Đang sử dụng cấu hình đã lưu ({account.credential.keyPrefix ?? "Active"})</span>
                </div>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Thông tin kết nối trước đó đã được lưu và mã hóa an toàn trên máy chủ. Bạn chỉ cần điền lại nếu muốn thay đổi thông tin kết nối mới.
                </p>
              </div>
            )}

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Môi trường Viettel Post (Gateway Environment) *
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                onChange={(e) => {
                  if (e.target.value === "staging") {
                    setVpValues((cur) => ({
                      ...cur,
                      authUrl: "https://auth-staging.logistek.com.vn",
                      orderUrl: "https://order-staging.logistek.com.vn",
                      lineShipId: "LS494228",
                    }));
                  } else {
                    setVpValues((cur) => ({
                      ...cur,
                      authUrl: "https://auth-global.viettelpost.vn",
                      orderUrl: "https://api-global.viettelpost.vn",
                      lineShipId: "LS485343",
                    }));
                  }
                }}
                value={
                  vpValues.orderUrl.includes("staging")
                    ? "staging"
                    : "production"
                }
              >
                <option value="production">Production (api-global.viettelpost.vn)</option>
                <option value="staging">Staging / Test Sandbox (order-staging.logistek.com.vn)</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Client ID *
              <input
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                onChange={(event) =>
                  setVpValues((current) => ({
                    ...current,
                    clientId: event.target.value,
                  }))
                }
                placeholder="Nhập Client ID từ Viettel Post"
                required
                value={vpValues.clientId}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Client Secret *
              <span className="flex">
                <input
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="h-9 min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                  onChange={(event) =>
                    setVpValues((current) => ({
                      ...current,
                      clientSecret: event.target.value,
                    }))
                  }
                  placeholder="Nhập Client Secret"
                  required
                  spellCheck={false}
                  type={showSecret ? "text" : "password"}
                  value={vpValues.clientSecret}
                />
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-r-md border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  onClick={() => setShowSecret((value) => !value)}
                  type="button"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                  {showSecret ? "Ẩn" : "Hiện"}
                </button>
              </span>
            </label>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Line Ship ID (Gói tuyến vận chuyển Viettel Post)
              </label>
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                onChange={(event) =>
                  setVpValues((current) => ({
                    ...current,
                    lineShipId: event.target.value,
                  }))
                }
                value={vpValues.lineShipId}
              >
                {vpValues.orderUrl.includes("staging") ? (
                  <>
                    <option value="LS494228">LS494228 - LINE NHANH TEST (Chặng cuối USPS - Mặc định)</option>
                    <option value="LS946787">LS946787 - LINE TIẾT KIỆM TEST (US)</option>
                    <option value="VTP_DEFAULT">VTP_DEFAULT (Tự động map)</option>
                  </>
                ) : (
                  <>
                    <option value="LS485343">LS485343 - LINE NHANH PROD (Chặng cuối USPS - Mặc định)</option>
                    <option value="LS220769">LS220769 - LINE TIẾT KIỆM PROD (US)</option>
                    <option value="VTP_DEFAULT">VTP_DEFAULT (Tự động map)</option>
                  </>
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                {vpValues.orderUrl.includes("staging")
                  ? "Staging hiện có 2 line: LS494228 (Line Nhanh) và LS946787 (Line Tiết kiệm)."
                  : "Production hiện có 2 line: LS485343 (Line Nhanh) và LS220769 (Line Tiết kiệm)."}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h3 className="mb-1 text-xs font-bold text-slate-900">
                Thông tin kho / Người gửi hàng (Tùy chọn)
              </h3>
              <p className="mb-3 text-[11px] text-slate-500">
                Viettel Post đã lưu hồ sơ của bạn. Bạn có thể để trống hoặc tùy chỉnh nếu gửi từ kho khác.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Họ người gửi
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromLastName: e.target.value,
                      }))
                    }
                    placeholder="Nguyễn"
                    value={vpValues.shipFromLastName}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Tên người gửi
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromFirstName: e.target.value,
                      }))
                    }
                    placeholder="Hoàng"
                    value={vpValues.shipFromFirstName}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Số điện thoại người gửi
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromPhoneNumber: e.target.value,
                      }))
                    }
                    placeholder="0988888888"
                    value={vpValues.shipFromPhoneNumber}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Mã Zip Code
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromZipCode: e.target.value,
                      }))
                    }
                    placeholder="100000"
                    value={vpValues.shipFromZipCode}
                  />
                </label>
              </div>

              <label className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-700">
                Địa chỉ kho gửi
                <input
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  onChange={(e) =>
                    setVpValues((cur) => ({
                      ...cur,
                      shipFromAddress1: e.target.value,
                    }))
                  }
                  placeholder="Địa chỉ kho hàng"
                  value={vpValues.shipFromAddress1}
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Thành phố
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromCity: e.target.value,
                      }))
                    }
                    placeholder="Hà Nội"
                    value={vpValues.shipFromCity}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Tỉnh / Bang
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromState: e.target.value,
                      }))
                    }
                    placeholder="Hà Nội"
                    value={vpValues.shipFromState}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Quốc gia
                  <input
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    onChange={(e) =>
                      setVpValues((cur) => ({
                        ...cur,
                        shipFromCountry: e.target.value,
                      }))
                    }
                    placeholder="VN"
                    value={vpValues.shipFromCountry}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 cursor-pointer">
                <input
                  checked={vpValues.liveEnabled}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  onChange={(event) =>
                    setVpValues((current) => ({
                      ...current,
                      liveEnabled: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Bật chế độ Live (gọi trực tiếp carrier)
              </label>
              {vpValues.liveEnabled ? (
                <div className="mt-3">
                  <WarningBox
                    message="CẢNH BÁO LIVE MODE: Đơn hàng sẽ được gửi trực tiếp đến hệ thống Viettel Post thật. Chỉ bật sau khi credentials đã được xác thực an toàn."
                    variant="danger"
                  />
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 px-6 py-5">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Customer No *
            <input
              autoComplete="off"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  customerNo: event.target.value,
                }))
              }
              required
              value={values.customerNo}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            API Secret *
            <span className="flex">
              <input
                autoComplete="off"
                className="h-9 min-w-0 flex-1 rounded-l-md border border-r-0 border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    apiSecret: event.target.value,
                  }))
                }
                required
                spellCheck={false}
                type={showSecret ? "text" : "password"}
                value={values.apiSecret}
              />
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-r-md border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setShowSecret((value) => !value)}
                type="button"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
                {showSecret ? "Ẩn" : "Hiện"}
              </button>
            </span>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Base URL
            <input
              autoComplete="off"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              value={values.baseUrl}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Ngôn ngữ
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    lang: event.target.value,
                  }))
                }
                value={values.lang}
              >
                <option value="en-US">en-US</option>
                <option value="zh-CN">zh-CN</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Đơn vị kích thước
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    sizeUnit: event.target.value as "cm" | "inch",
                  }))
                }
                value={values.sizeUnit}
              >
                <option value="cm">cm</option>
                <option value="inch">inch</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Mã phương thức vận chuyển (Shipping Method)
            <input
              autoComplete="off"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  shippingMethodCode: event.target.value,
                }))
              }
              value={values.shippingMethodCode}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Mã nguồn (Source Code)
            <input
              autoComplete="off"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  sourceCode: event.target.value,
                }))
              }
              value={values.sourceCode}
            />
          </label>

          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 cursor-pointer">
              <input
                checked={values.liveEnabled}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    liveEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Bật chế độ Live (gọi trực tiếp carrier)
            </label>
            {values.liveEnabled ? (
              <div className="mt-3">
                <WarningBox
                  message="CẢNH BÁO LIVE MODE: Đơn hàng sẽ được gửi trực tiếp đến hệ thống YunExpress OMS thật. Chỉ bật sau khi credentials đã được xác thực an toàn."
                  variant="danger"
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      )}

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-9 rounded-md bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </form>
    </div>
  );
}
