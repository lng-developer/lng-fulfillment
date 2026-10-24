"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { WarningBox } from "@/components/ui/WarningBox";
import { getErrorMessage } from "@/lib/api/base";
import { saveCredential } from "@/lib/api/carrier-accounts";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { CarrierAccount, CredentialFormValues } from "@/types/settings";

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

export function CredentialForm({
  account,
  onCancel,
  onSaved,
}: {
  account: CarrierAccount;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<CredentialFormValues>(EMPTY_FORM);
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
      await saveCredential(account.id, values);
      setValues(EMPTY_FORM);
      onSaved();
    } catch (error) {
      setValues((current) => ({ ...current, apiSecret: "" }));
      setError(getErrorMessage(error));
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
