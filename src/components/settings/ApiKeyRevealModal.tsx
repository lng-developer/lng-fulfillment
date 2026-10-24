"use client";

import { Check, Clipboard, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function ApiKeyRevealModal({
  plaintext,
  onClose,
}: {
  plaintext: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  async function copyKey() {
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        ref={trapRef}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Khởi tạo API Key thành công
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              API key này chỉ được hiển thị một lần duy nhất.
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
            <p className="font-semibold">Hãy sao chép và lưu trữ mã khóa này ngay</p>
            <p className="mt-0.5 text-amber-800">
              Mã khóa sẽ bị mã hóa và không bao giờ hiển thị lại sau khi bạn đóng hộp thoại này.
            </p>
          </div>

          <div className="select-all break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs font-semibold text-slate-800">
            {plaintext}
          </div>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            onClick={copyKey}
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                Đã sao chép vào bộ nhớ tạm
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4 text-slate-500" aria-hidden />
                Sao chép API Key
              </>
            )}
          </button>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            className="h-9 w-full rounded-md bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            onClick={onClose}
            type="button"
          >
            Tôi đã sao chép khóa - Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
