"use client";

import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/api/base";
import { getPreflight, type ShipmentCarrierCode } from "@/lib/api/shipments";
import type { ShipOrderOptions } from "@/modules/shipment/types";
import type { PreflightResult } from "@/types/shipments";

type PreflightState = "idle" | "loading" | "success" | "error";

export function PreflightChecker({
  shipmentId,
  carrierCode = "YUNEXPRESS_OMS",
  options,
  onResult,
}: {
  shipmentId: string;
  carrierCode?: ShipmentCarrierCode;
  options?: ShipOrderOptions;
  onResult?: (result: PreflightResult) => void;
}) {
  const [state, setState] = useState<PreflightState>("idle");
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState("idle");
    setResult(null);
    setError(null);
  }, [carrierCode, options]);

  async function runPreflight() {
    setState("loading");
    setError(null);

    try {
      const response = await getPreflight(shipmentId, carrierCode, null, options);
      setResult(response);
      onResult?.(response);
      setState("success");
    } catch (preflightError) {
      setError(`Kiểm tra thất bại: ${getErrorMessage(preflightError)}`);
      setState("error");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-600" aria-hidden />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Kiểm tra Preflight
          </h4>
        </div>
        {state === "idle" || state === "error" ? (
          <Button
            onClick={runPreflight}
            size="sm"
            variant="secondary"
          >
            {state === "error" ? "Thử lại" : "Chạy kiểm tra"}
          </Button>
        ) : null}
      </div>

      {state === "idle" ? (
        <p className="text-xs text-slate-500">
          Chạy các bước xác thực thông tin trước khi đẩy đơn sang hệ thống hãng vận chuyển.
        </p>
      ) : null}

      {state === "loading" ? (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" aria-hidden />
          Đang kiểm tra kết nối và thông số kiện hàng...
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex items-start gap-2 text-xs text-rose-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
          <p>{error ?? "Kiểm tra thất bại. Vui lòng thử lại."}</p>
        </div>
      ) : null}

      {state === "success" && result ? (
        <div className="space-y-3">
          <div className="grid gap-1.5 text-xs">
            <CheckLine label="Xác thực phân quyền OK" ok />
            <CheckLine label={`Trạng thái vận đơn: ${result.shipmentStatus}`} ok />
            <CheckLine
              label={`Hãng vận chuyển: ${result.carrierCode} đã đăng ký`}
              ok
            />
            <CheckLine
              label={`Tài khoản API: ${result.credentialSource}`}
              ok={result.credentialConfigured}
            />
            <CheckLine
              label={`Chế độ Live: ${result.liveEnabled ? "KÍCH HOẠT" : "TẮT (SANDBOX)"}`}
              ok={result.liveEnabled}
              warning={!result.liveEnabled}
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Thông số Mapping
            </h5>
            <dl className="mt-2 grid gap-1.5 text-xs">
              <PreviewRow
                label="Mã đơn khách hàng"
                value={result.mappingPreview.customerOrderNumber}
              />
              <PreviewRow
                label="Mã dịch vụ vận chuyển"
                value={result.mappingPreview.shippingMethodCode}
              />
              <PreviewRow
                label="Địa chỉ người nhận"
                value={`${result.mappingPreview.receiver.city ?? ""}, ${result.mappingPreview.receiver.country ?? ""}`}
              />
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckLine({
  label,
  ok,
  warning = false,
}: {
  label: string;
  ok: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2
          className={`h-3.5 w-3.5 shrink-0 ${
            warning ? "text-amber-500" : "text-emerald-600"
          }`}
          aria-hidden
        />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden />
      )}
      <span
        className={`font-medium ${
          warning
            ? "text-amber-700"
            : ok
              ? "text-slate-800"
              : "text-rose-700"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-900">{value || "-"}</dd>
    </div>
  );
}
