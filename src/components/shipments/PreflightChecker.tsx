"use client";

import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
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
      setError(`Preflight failed: ${getErrorMessage(preflightError)}`);
      setState("error");
    }
  }

  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[var(--brand)]" aria-hidden />
          <h4 className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)]">
            Preflight Check
          </h4>
        </div>
        {state === "idle" || state === "error" ? (
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
            onClick={runPreflight}
            type="button"
          >
            {state === "error" ? "Retry" : "Run Preflight"}
          </button>
        ) : null}
      </div>

      {state === "idle" ? (
        <p className="text-xs text-[var(--text-secondary)]">
          Run checks before executing a carrier shipment.
        </p>
      ) : null}

      {state === "loading" ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Running checks...
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex items-start gap-2 text-xs text-[var(--danger-text)]" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{error ?? "Preflight failed. Try again."}</p>
        </div>
      ) : null}

      {state === "success" && result ? (
        <div className="grid gap-4">
          <div className="grid gap-2 text-xs">
            <CheckLine label="Authentication OK" ok />
            <CheckLine label="Role: permitted" ok />
            <CheckLine label={`Shipment status: ${result.shipmentStatus}`} ok />
            <CheckLine
              label={`Carrier: ${result.carrierCode.toLowerCase()} registered`}
              ok
            />
            <CheckLine
              label={`Credential: ${result.credentialSource}`}
              ok={result.credentialConfigured}
            />
            <CheckLine
              label={`liveEnabled: ${result.liveEnabled ? "TRUE" : "FALSE"}`}
              ok={result.liveEnabled}
              warning={!result.liveEnabled}
            />
          </div>

          <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Mapping Preview
            </h5>
            <dl className="mt-3 grid gap-2 text-xs">
              <PreviewRow
                label="CustomerOrderNumber"
                value={result.mappingPreview.customerOrderNumber}
              />
              <PreviewRow
                label="ShippingMethodCode"
                value={result.mappingPreview.shippingMethodCode}
              />
              <PreviewRow
                label="Receiver"
                value={[
                  result.mappingPreview.receiver.country,
                  result.mappingPreview.receiver.city,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <PreviewRow
                label="Package"
                value={`${result.mappingPreview.package.weight} kg · ${result.mappingPreview.package.packageCount} parcel`}
              />
              <div className="grid gap-1">
                <dt className="text-xs font-medium text-slate-500">Parcels</dt>
                <dd className="grid gap-1">
                  {result.mappingPreview.parcels.map((parcel, index) => (
                    <div
                      className="truncate font-mono text-[11px] text-[var(--text-secondary)]"
                      key={`${parcel.sku}-${index}`}
                    >
                      {parcel.sku} {parcel.eName} x{parcel.quantity}{" "}
                      {parcel.unitWeight} kg ${parcel.unitPrice}
                    </div>
                  ))}
                </dd>
              </div>
              <PreviewRow
                label="SourceCode"
                value={result.mappingPreview.sourceCode}
              />
            </dl>
          </div>

          {result.warnings.length ? (
            <div className="rounded-sm border border-[#fcd34d] bg-[var(--warning-bg)] px-3 py-2 text-[11px] text-[var(--warning-text)]">
              {result.warnings.join(" ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CheckLine({
  label,
  ok,
  warning,
}: {
  label: string;
  ok: boolean;
  warning?: boolean;
}) {
  const color = warning
    ? "text-[var(--warning-text)] font-medium"
    : ok
      ? "text-[var(--text-primary)]"
      : "text-[var(--danger-text)]";

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${warning ? "bg-[var(--warning-bg)] text-[var(--warning)]" : ok ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}>
        <CheckCircle2 className="h-3 w-3" aria-hidden />
      </span>
      <span>{label}</span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3">
      <dt className="truncate text-[11px] font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="truncate font-mono text-[11px] text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
