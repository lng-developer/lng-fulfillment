"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { WarningBox } from "./WarningBox";

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  variant = "default",
  requireTypedConfirmation,
  requireCheckbox,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger" | "live";
  requireTypedConfirmation?: string;
  requireCheckbox?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [typedValue, setTypedValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const canConfirm =
    (!requireTypedConfirmation ||
      typedValue === requireTypedConfirmation) &&
    (!requireCheckbox || checked) &&
    !isPending;
  const trapRef = useFocusTrap<HTMLDivElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function confirm() {
    if (!canConfirm || pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        ref={trapRef}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex gap-3">
            {variant !== "default" ? (
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                  variant === "danger"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-amber-50 text-amber-600 border-amber-200",
                )}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button
            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Đóng</span>
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4">
          {variant === "live" ? (
            <WarningBox
              message="Thao tác này sẽ gọi trực tiếp hệ thống đối tác vận chuyển. Vui lòng kiểm tra kỹ trước khi xác nhận."
              variant="danger"
            />
          ) : null}

          {requireCheckbox ? (
            <label className="flex items-start gap-2.5 text-xs text-slate-600">
              <input
                checked={checked}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                onChange={(event) => setChecked(event.target.checked)}
                type="checkbox"
              />
              <span>{requireCheckbox}</span>
            </label>
          ) : null}

          {requireTypedConfirmation ? (
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Nhập chữ{" "}
              <span className="font-mono text-xs text-indigo-700 font-semibold">
                {requireTypedConfirmation}
              </span>
              <input
                className="h-9 rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onChange={(event) => setTypedValue(event.target.value)}
                value={typedValue}
              />
            </label>
          ) : null}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <button
            autoFocus
            className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            data-autofocus="true"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Hủy bỏ
          </button>
          <button
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-4 text-xs font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
              variant === "danger" || variant === "live"
                ? "border-rose-600 bg-rose-600 hover:bg-rose-700"
                : "border-indigo-600 bg-indigo-600 hover:bg-indigo-700",
            )}
            disabled={!canConfirm}
            onClick={confirm}
            type="button"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {isPending ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
