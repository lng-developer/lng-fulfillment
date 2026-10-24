"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/api/base";
import { executeShipment, type ShipmentCarrierCode } from "@/lib/api/shipments";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { getCarrierPresentation } from "./carrier-presentation";
import type { ShipOrderOptions } from "@/modules/shipment/types";

export function LiveActionConfirmation({
  shipmentId,
  carrierCode = "YUNEXPRESS_OMS",
  carrierAccountId = null,
  options,
  onSuccess,
  onCancel,
}: {
  shipmentId: string;
  carrierCode?: ShipmentCarrierCode;
  carrierAccountId?: string | null;
  options?: ShipOrderOptions;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presentation = getCarrierPresentation(carrierCode);

  useEffect(() => {
    setChecked(false);
    setTypedValue("");
    setHasSubmitted(false);
    setError(null);
  }, [carrierAccountId, carrierCode, options]);

  const canConfirm =
    checked && typedValue === presentation.confirmationText && !isSubmitting && !hasSubmitted;
  const trapRef = useFocusTrap<HTMLDivElement>(
    true,
    isSubmitting ? undefined : onCancel,
  );

  async function confirm() {
    if (!canConfirm) {
      return;
    }

    setIsSubmitting(true);
    setHasSubmitted(true);
    setError(null);

    try {
      await executeShipment(shipmentId, carrierCode, carrierAccountId, options);
      onSuccess();
    } catch (executionError) {
      const safeMessage = getErrorMessage(executionError);
      setError(
        "Thực thi vận đơn thất bại. Vui lòng kiểm tra lại trạng thái hoặc xác nhận lại.",
      );
      toastError(`Thực thi thất bại: ${safeMessage}`);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div
        className="w-full max-w-[500px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        ref={trapRef}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                XÁC NHẬN TẠO VẬN ĐƠN THẬT (LIVE)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {presentation.liveWarning}
              </p>
            </div>
          </div>
          <button
            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Đóng</span>
          </button>
        </header>

        <div className="grid gap-3.5 px-5 py-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 leading-relaxed">
            <p className="font-semibold">Lưu ý rủi ro:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">
              <li>Lệnh vận chuyển sẽ được gửi trực tiếp đến hệ thống {presentation.name}</li>
              <li>Không thể tự động hoàn tác sau khi tạo thành công</li>
              <li>Có thể phát sinh cước phí vận chuyển thực tế</li>
            </ul>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-700">
            <input
              checked={checked}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              disabled={isSubmitting || hasSubmitted}
              onChange={(event) => setChecked(event.target.checked)}
              type="checkbox"
            />
            <span>Tôi hiểu đây là thao tác thật với đối tác vận chuyển</span>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Nhập chữ xác nhận:{" "}
            <span className="font-mono text-xs text-rose-700 font-semibold">
              {presentation.confirmationText}
            </span>
            <input
              className="h-9 rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              disabled={isSubmitting || hasSubmitted}
              onChange={(event) => setTypedValue(event.target.value)}
              value={typedValue}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2.5 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <Button
            disabled={isSubmitting}
            onClick={onCancel}
            variant="secondary"
          >
            Hủy
          </Button>
          <Button
            disabled={!canConfirm}
            isLoading={isSubmitting}
            onClick={confirm}
            variant="danger"
          >
            {isSubmitting ? "Đang gửi lệnh..." : "Xác nhận tạo vận đơn thật"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
