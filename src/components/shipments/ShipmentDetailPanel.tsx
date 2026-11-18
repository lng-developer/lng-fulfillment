"use client";

import {
  Clock,
  ExternalLink,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
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
  type ShipmentCarrierCode,
} from "@/lib/api/shipments";
import type { ShipOrderOptions } from "@/modules/shipment/types";
import { canSyncShipmentTracking } from "@/lib/shipment/tracking-sync-policy";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import type { PreflightResult, ShipmentDetail } from "@/types/shipments";
import { cn } from "@/lib/utils";
import { LiveActionConfirmation } from "./LiveActionConfirmation";
import { getCarrierPresentation } from "./carrier-presentation";
import { PreflightChecker } from "./PreflightChecker";
import { ShipmentTimeline } from "./ShipmentTimeline";
import {
  TrackingResultPanel,
  type TrackingResultPanelData,
} from "./TrackingResultPanel";

const EXECUTABLE_STATUSES = new Set(["DRAFT", "FAILED_CREATE"]);

function getCarrierInfo(code?: string | null) {
  if (code === "VIETTEL_POST") {
    return {
      name: "Viettel Post",
      tag: "Logistek API",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  if (code === "YUNEXPRESS_OMS" || code === "YUNEXPRESS") {
    return {
      name: "YunExpress",
      tag: "YunExpress OMS",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  return {
    name: code || "Chưa xác định",
    tag: "Carrier",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

function getTrackingUrl(trackingNumber: string) {
  if (!trackingNumber) return null;
  const clean = trackingNumber.trim();
  if (/^9\d{19,21}$/.test(clean) || /^\d{20,22}$/.test(clean)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${clean}`;
  }
  if (/^EPK/i.test(clean)) {
    return `https://global.viettelpost.vn/`;
  }
  return `https://t.17track.net/en#nums=${clean}`;
}

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
  const [carrierCode, setCarrierCode] = useState<ShipmentCarrierCode>("YUNEXPRESS_OMS");
  const [carrierOptions, setCarrierOptions] = useState<ShipOrderOptions>({});
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
    setShowLiveConfirmation(false);
    setCarrierOptions({});
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
  const trackingSyncComplete =
    shipment?.actualShipAt && shipment.portalTrackingSyncState === "SYNCED";
  const presentation = getCarrierPresentation(carrierCode);
  const carrierInfo = getCarrierInfo(shipment?.carrierCode);
  const trackingUrl = shipment?.trackingNumber ? getTrackingUrl(shipment.trackingNumber) : null;

  function updateCarrierOption(key: keyof ShipOrderOptions, value: string) {
    setCarrierOptions((current) => ({
      ...current,
      [key]: key === "hsCode" ? value : (value === "" ? undefined : Number(value)),
    }));
    setPreflight(null);
    setShowLiveConfirmation(false);
  }

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
      toastSuccess("Đồng bộ tracking thành công.");
    } catch (error) {
      setTrackingError(getErrorMessage(error));
      toastError("Lỗi đồng bộ tracking.");
    } finally {
      setIsTrackingSyncing(false);
    }
  }

  if (!shipmentId) {
    return null;
  }

  const orderIdentifier = shipment?.orderNumber ?? shipment?.externalOrderId;

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Đóng chi tiết vận đơn"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
        type="button"
      />
      <aside
        aria-label="Chi tiết vận đơn"
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl md:max-w-[500px]"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-xs">
          <button
            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            onClick={handleClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Đóng</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {orderIdentifier ? `Đơn #${orderIdentifier}` : "Chi tiết vận đơn"}
              </h2>
            </div>
            <p className="truncate font-mono text-[11px] text-slate-400">
              {shipment ? `ID: ${shipment.id}` : ""}
            </p>
          </div>
          {shipment ? <StatusBadge status={shipment.status} /> : null}
        </header>

        {/* Content */}
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
              {/* Vận chuyển & Nhãn in */}
              <PanelSection icon={<Truck className="h-4 w-4" />} title="Thông tin vận chuyển">
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Hãng vận chuyển</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
                        carrierInfo.badgeClass,
                      )}
                    >
                      {carrierInfo.name}
                    </span>
                  </div>

                  {shipment.trackingNumber ? (
                    <div className="grid gap-1 pt-2.5 border-t border-slate-200/70">
                      <span className="text-[11px] text-slate-500 font-medium">Mã tra cứu (Tracking Number)</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 tracking-wide select-all">
                          {shipment.trackingNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          <CopyButton
                            label="Sao chép mã tracking"
                            value={shipment.trackingNumber}
                          />
                          {trackingUrl ? (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Tra cứu hành trình"
                              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {shipment.carrierShipmentId && shipment.carrierShipmentId !== shipment.trackingNumber ? (
                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200/70">
                      <span className="text-slate-500 font-medium">Mã vận đơn đối tác</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {shipment.carrierShipmentId}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200/70">
                    <span className="text-slate-500 font-medium">Đồng bộ Portal</span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded",
                        trackingSyncComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {trackingSyncComplete ? "Đã đồng bộ" : "Chưa sync"}
                    </span>
                  </div>
                </div>

                {/* Quick Action: In nhãn & Sync */}
                <div className="grid gap-2 pt-1">
                  {shipment.labelUrl ? (
                    <a
                      href={shipment.labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Printer className="h-4 w-4" />
                      <span>In nhãn vận đơn (PDF)</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                    </a>
                  ) : null}

                  {canSyncTracking ? (
                    <button
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 transition"
                      disabled={isTrackingSyncing}
                      onClick={syncTracking}
                      type="button"
                    >
                      {isTrackingSyncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      {isTrackingSyncing ? "Đang đồng bộ..." : "Đồng bộ hành trình"}
                    </button>
                  ) : null}
                </div>

                {trackingError ? (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200" role="alert">
                    {trackingError}
                  </p>
                ) : null}
                <TrackingResultPanel result={trackingResult} />
              </PanelSection>

              {/* Sản phẩm trong kiện */}
              <PanelSection icon={<Package className="h-4 w-4" />} title="Sản phẩm trong kiện">
                <div className="grid gap-2">
                  {shipment.items.length ? (
                    shipment.items.map((item) => (
                      <div
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                                {item.sku ?? "NO-SKU"}
                              </span>
                              <span className="font-semibold text-slate-800">
                                x {item.quantity}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                              {item.name ?? "Sản phẩm"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">
                      Không có sản phẩm nào.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Mã đơn gốc:</span>
                  {shipment.orderId ? (
                    <Link
                      href={`/orders?search=${encodeURIComponent(orderIdentifier ?? "")}`}
                      className="font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {orderIdentifier}
                    </Link>
                  ) : (
                    <span className="font-mono font-semibold text-slate-800">
                      {orderIdentifier}
                    </span>
                  )}
                </div>
              </PanelSection>

              {/* Chỉ hiển thị Preflight & Execute khi đơn ở trạng thái DRAFT hoặc FAILED_CREATE */}
              {canShowExecute ? (
                <>
                  <PanelSection icon={<ShieldCheck className="h-4 w-4" />} title="Kiểm tra Preflight">
                    <div className="grid gap-3">
                      <label className="grid gap-1 text-xs text-slate-600 font-medium">
                        Hãng vận chuyển
                        <select
                          aria-label="Carrier"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                          onChange={(event) => {
                            setCarrierCode(event.target.value as ShipmentCarrierCode);
                            setCarrierOptions({});
                            setPreflight(null);
                            setShowLiveConfirmation(false);
                          }}
                          value={carrierCode}
                        >
                          <option value="YUNEXPRESS_OMS">YunExpress OMS</option>
                          <option value="VIETTEL_POST">Viettel Post</option>
                        </select>
                      </label>
                      {carrierCode === "VIETTEL_POST" ? (
                        <div className="grid gap-2.5 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                          <p className="text-xs font-semibold text-slate-800">Thông số kiện hàng (Viettel Post)</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(["weight", "length", "width", "height"] as const).map((field) => (
                              <label className="grid gap-1 text-[11px] text-slate-500" key={field}>
                                {field} {field === "weight" ? "(kg)" : "(cm)"}
                                <input
                                  aria-label={`Viettel Post ${field}`}
                                  className="h-8 rounded border border-slate-200 bg-white px-2"
                                  min="0"
                                  onChange={(event) => updateCarrierOption(field, event.target.value)}
                                  type="number"
                                  value={carrierOptions[field] ?? ""}
                                />
                              </label>
                            ))}
                          </div>
                          <label className="grid gap-1 text-[11px] text-slate-500">
                            HS Code
                            <input
                              aria-label="Viettel Post HS code"
                              className="h-8 rounded border border-slate-200 bg-white px-2 font-mono"
                              onChange={(event) => updateCarrierOption("hsCode", event.target.value)}
                              value={carrierOptions.hsCode ?? ""}
                            />
                          </label>
                        </div>
                      ) : null}
                      <PreflightChecker carrierCode={carrierCode} options={carrierOptions} shipmentId={shipment.id} onResult={setPreflight} />
                    </div>
                  </PanelSection>

                  <PanelSection icon={<Truck className="h-4 w-4" />} title="Thực thi tạo đơn">
                    {!preflight ? (
                      <p className="text-xs text-slate-500">
                        Chạy kiểm tra preflight ở trên trước khi bấm tạo đơn.
                      </p>
                    ) : null}

                    {preflight && preflight.liveEnabled === false ? (
                      <div className="grid gap-3">
                        <WarningBox
                          message="CHẾ ĐỘ LIVE ĐANG TẮT. Tài khoản đang ở chế độ sandbox."
                          variant="warning"
                        />
                        <button
                          className="flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-3 text-xs font-medium text-slate-400"
                          disabled
                          type="button"
                        >
                          Tạo vận đơn {presentation.name}
                        </button>
                      </div>
                    ) : null}

                    {preflight && preflight.liveEnabled ? (
                      <div className="grid gap-3">
                        <WarningBox
                          message={`CHẾ ĐỘ LIVE ĐANG BẬT. Vận đơn thật sẽ được gửi sang ${presentation.name}.`}
                          variant="danger"
                        />
                        <button
                          className="h-9 rounded-lg border border-rose-700 bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 transition"
                          onClick={() => setShowLiveConfirmation(true)}
                          type="button"
                        >
                          Tạo vận đơn {presentation.name}
                        </button>
                      </div>
                    ) : null}
                  </PanelSection>
                </>
              ) : null}

              {/* Lịch sử hành trình */}
              <PanelSection icon={<Clock className="h-4 w-4" />} title="Lịch sử hành trình">
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
            toastSuccess(`Đã gửi vận đơn sang ${presentation.name}.`);
          }}
          carrierCode={carrierCode}
          options={carrierOptions}
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
    <section className="grid gap-3 border-b border-slate-200/80 pb-5 last:border-0">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="text-indigo-600">{icon}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
