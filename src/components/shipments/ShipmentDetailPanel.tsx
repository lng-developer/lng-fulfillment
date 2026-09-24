"use client";

import {
  Loader2,
  Package,
  Radio,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WarningBox } from "@/components/ui/WarningBox";
import { getErrorMessage } from "@/lib/api/base";
import {
  getShipment,
  syncTracking as syncTrackingRequest,
} from "@/lib/api/shipments";
import { canSyncShipmentTracking } from "@/lib/shipment/tracking-sync-policy";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import type { PreflightResult, ShipmentDetail } from "@/types/shipments";
import { LiveActionConfirmation } from "./LiveActionConfirmation";
import { PreflightChecker } from "./PreflightChecker";
import { ShipmentTimeline } from "./ShipmentTimeline";
import {
  TrackingResultPanel,
  type TrackingResultPanelData,
} from "./TrackingResultPanel";

const EXECUTABLE_STATUSES = new Set(["DRAFT", "FAILED_CREATE"]);

export function ShipmentDetailPanel({
  shipmentId,
  role,
  onChanged,
  onClose,
}: {
  shipmentId: string | null;
  role: Role;
  onChanged?: () => void;
  onClose: () => void;
}) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showLiveConfirmation, setShowLiveConfirmation] = useState(false);
  const [isTrackingSyncing, setIsTrackingSyncing] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingResult, setTrackingResult] =
    useState<TrackingResultPanelData | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, [onClose]);

  useEffect(() => {
    if (!shipmentId) {
      setShipment(null);
      setPreflight(null);
      setTrackingResult(null);
      setTrackingError(null);
      return;
    }

    setPreflight(null);
    setTrackingResult(null);
    setTrackingError(null);
    const currentShipmentId = shipmentId;
    const controller = new AbortController();

    async function loadShipment() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getShipment(currentShipmentId, controller.signal);
        setShipment(result);
      } catch (loadError) {
        setShipment(null);
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadShipment();

    return () => controller.abort();
  }, [reloadKey, shipmentId]);

  useEffect(() => {
    if (!shipmentId) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, shipmentId]);

  const title = shipment?.id ?? shipmentId ?? "Shipment detail";
  const latestStatus = shipment?.statusHistory[0]?.status ?? shipment?.status;
  const canShowExecute =
    shipment && can.executeShipment(role) && EXECUTABLE_STATUSES.has(shipment.status);
  const hasTrackingLookup = Boolean(
    shipment?.carrierCode &&
      (shipment.carrierShipmentId ||
        shipment.trackingNumber ||
        shipment.orderNumber ||
        shipment.externalOrderId),
  );
  const canSyncTracking =
    shipment &&
    canSyncShipmentTracking(role, hasTrackingLookup);

  async function syncTracking() {
    if (!shipment || !canSyncTracking) {
      return;
    }

    setIsTrackingSyncing(true);
    setTrackingError(null);

    try {
      const response = await syncTrackingRequest(shipment.id);
      const latestEvent = response.tracking.latestEvent;

      setTrackingResult({
        eventsCount: response.tracking.eventsCount,
        latestEvent: latestEvent
          ? [latestEvent.message, latestEvent.location].filter(Boolean).join(" - ")
          : null,
        status: response.tracking.status ?? response.shipment.status,
        trackingNumber: response.shipment.trackingNumber,
      });
      setReloadKey((value) => value + 1);
      onChanged?.();
      toastSuccess("Tracking synced.");
    } catch (error) {
      setTrackingError(getErrorMessage(error));
      toastError("Failed to sync tracking.");
    } finally {
      setIsTrackingSyncing(false);
    }
  }

  if (!shipmentId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close shipment detail"
        className="absolute inset-0 bg-[rgba(26,29,58,0.4)] backdrop-blur-[2px]"
        onClick={handleClose}
        type="button"
      />
      <aside
        aria-label="Shipment detail"
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-drawer md:max-w-[520px]"
      >
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <button
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
            onClick={handleClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-mono text-[13px] font-bold text-[var(--text-primary)]">
              {title}
            </h2>
          </div>
          {shipment ? <StatusBadge status={shipment.status} /> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? <LoadingSkeleton rows={6} /> : null}
          {!isLoading && error ? (
            <ErrorState
              message={error}
              retry={() => setReloadKey((value) => value + 1)}
            />
          ) : null}
          {!isLoading && !error && shipment ? (
            <div className="grid gap-5">
              <PanelSection icon={<Package />} title="Items in Shipment">
                <div className="grid gap-2">
                  {shipment.items.length ? (
                    shipment.items.map((item) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text-primary)]">
                            {item.sku ?? "NO-SKU"} x {item.quantity}
                          </p>
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {item.name ?? "Unnamed item"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      No shipment items found.
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs text-[var(--text-secondary)]">
                  Order:{" "}
                  <span className="font-mono font-semibold text-[var(--brand)]">
                    {shipment.orderNumber ?? shipment.externalOrderId}
                  </span>
                </p>
              </PanelSection>

              <PanelSection icon={<ShieldCheck />} title="Preflight Check">
                <PreflightChecker shipmentId={shipment.id} onResult={setPreflight} />
              </PanelSection>

              <PanelSection icon={<Truck />} title="Execute">
                {!preflight ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Run preflight check before executing.
                  </p>
                ) : null}

                {preflight && preflight.liveEnabled === false ? (
                  <div className="grid gap-3">
                    <WarningBox
                      message="LIVE MODE DISABLED. Carrier is in sandbox mode. Enable live mode in Carrier Account settings to proceed."
                      variant="warning"
                    />
                    <button
                      className="flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-sm border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface2)] px-3 text-xs font-medium text-[var(--text-muted)]"
                      disabled
                      type="button"
                    >
                      Create YunExpress Shipment
                    </button>
                  </div>
                ) : null}

                {preflight && preflight.liveEnabled && canShowExecute ? (
                  <div className="grid gap-3">
                    <WarningBox
                      message="LIVE MODE ACTIVE. This will send a REAL order to YunExpress OMS."
                      variant="danger"
                    />
                    <button
                      className="h-9 rounded-sm border border-[#b91c1c] bg-[var(--danger)] px-3 text-xs font-medium text-white hover:bg-[#b91c1c]"
                      onClick={() => setShowLiveConfirmation(true)}
                      type="button"
                    >
                      Create YunExpress Shipment
                    </button>
                  </div>
                ) : null}
              </PanelSection>

              <PanelSection icon={<Radio />} title="Tracking">
                <div className="grid gap-3">
                  <InfoRow
                    label="Tracking #"
                    value={
                      shipment.trackingNumber ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-mono">
                            {shipment.trackingNumber}
                          </span>
                          <CopyButton
                            label="Copy tracking number"
                            value={shipment.trackingNumber}
                          />
                        </span>
                      ) : (
                        "-"
                      )
                    }
                  />
                  <InfoRow label="Status" value={latestStatus ?? "-"} />
                  {!hasTrackingLookup ? (
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Tracking sync requires a waybill, tracking number, or customer order number.
                    </p>
                  ) : null}
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:border-[var(--border-strong)] disabled:bg-[var(--bg-surface2)] disabled:text-[var(--text-muted)]"
                    disabled={!canSyncTracking || isTrackingSyncing}
                    onClick={syncTracking}
                    type="button"
                  >
                    {isTrackingSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {isTrackingSyncing ? "Syncing..." : "Sync Tracking"}
                  </button>
                  {trackingError ? (
                    <p className="text-sm text-red-700" role="alert">
                      {trackingError}
                    </p>
                  ) : null}
                  <TrackingResultPanel result={trackingResult} />
                </div>
              </PanelSection>

              <PanelSection icon={<ShieldCheck />} title="Timeline">
                <ShipmentTimeline
                  events={shipment.statusHistory.map((event) => ({
                    note: event.note,
                    status: event.status,
                    timestamp: event.createdAt,
                  }))}
                />
              </PanelSection>
            </div>
          ) : null}
        </div>
      </aside>
      {showLiveConfirmation && shipment ? (
        <LiveActionConfirmation
          onCancel={() => setShowLiveConfirmation(false)}
          onSuccess={() => {
            setShowLiveConfirmation(false);
            setPreflight(null);
            setReloadKey((value) => value + 1);
            onChanged?.();
            toastSuccess("Shipment submitted to YunExpress.");
          }}
          shipmentId={shipment.id}
        />
      ) : null}
    </div>
  );
}

function PanelSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-b border-[var(--border)] pb-5 last:border-0">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <span className="text-[var(--brand)]">{icon}</span>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.07em]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3 text-sm">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="min-w-0 text-xs text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
