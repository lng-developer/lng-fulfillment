"use client";

import { ChevronDown, Truck, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getTenantYunIossSetting } from "@/lib/api/shipment-automation";
import { cn } from "@/lib/utils";
import type {
  OrderDetail,
  OrderListItem,
  ShipEnvironment,
  ShipOrderOptions,
} from "@/types/orders";
import { EnvironmentSelector } from "./EnvironmentSelector";
import {
  buildShipmentPreview,
  buildShipOptions,
  DEFAULT_YUN_IOSS_NUMBER,
  type ShipmentReceiverValues,
  type ShipmentPreview,
} from "./ShipOrderModal";

export type BatchOrderShipEditState = {
  shippingMethodCode: string;
  receiverValues: ShipmentReceiverValues;
  packageValues: ShipmentPreview["package"];
  useIoss: boolean;
  iossNumber: string;
  parcels: ShipmentPreview["parcels"];
};

export type BatchShipSubmitInput = {
  orderIds: string[];
  environment: ShipEnvironment;
  optionsByOrderId: Record<string, ShipOrderOptions>;
};

export function BatchShipModal({
  orders,
  detailsByOrderId,
  onClose,
  onSubmit,
}: {
  orders: OrderListItem[];
  detailsByOrderId: Record<string, OrderDetail | undefined>;
  onClose: () => void;
  onSubmit: (input: BatchShipSubmitInput) => void;
}) {
  const [environment, setEnvironment] = useState<ShipEnvironment>("live");
  const [tenantIossNumber, setTenantIossNumber] = useState(DEFAULT_YUN_IOSS_NUMBER);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editsByOrderId] = useState<
    Record<string, BatchOrderShipEditState>
  >({});
  const hasMissingIoss = hasMissingBatchIossNumber(
    orders,
    detailsByOrderId,
    editsByOrderId,
    tenantIossNumber,
  );
  const canSubmit = orders.length > 0 && orders.length <= 10 && !hasMissingIoss;

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

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const optionsByOrderId = buildBatchOptionsByOrderId(
      orders,
      detailsByOrderId,
      editsByOrderId,
      tenantIossNumber,
    );
    onSubmit({
      orderIds: orders.map((order) => order.id),
      environment,
      optionsByOrderId,
    });
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
      <div className="max-h-[90vh] w-full max-w-[860px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm">
              <Truck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Đóng gói hàng loạt ({orders.length} đơn hàng)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tạo vận đơn và nhãn in cùng lúc cho các đơn hàng đã chọn (tối đa 10 đơn).
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng popup đóng gói hàng loạt"
            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {hasMissingIoss ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              Vui lòng nhập đầy đủ mã IOSS cho các đơn hàng gửi đi Châu Âu (EU).
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Danh sách đơn đóng gói
            </div>
            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const detail = detailsByOrderId[order.id] ?? null;
                const preview = buildShipmentPreview(order, detail, tenantIossNumber);
                const editState = editsByOrderId[order.id] ?? {
                  shippingMethodCode: preview.shippingMethodCode,
                  receiverValues: preview.receiver,
                  packageValues: preview.package,
                  useIoss: preview.useIoss,
                  iossNumber: preview.iossNumber,
                  parcels: preview.parcels,
                };

                return (
                  <div key={order.id} className="transition-colors hover:bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-slate-400 hover:text-slate-700"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          type="button"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "")} />
                        </button>
                        <span className="font-mono font-bold text-slate-900">
                          #{order.orderNumber ?? order.externalOrderId}
                        </span>
                        <span className="text-slate-500">{order.recipientName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {order.destinationCountry}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/80 p-4 text-xs space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <span className="text-[11px] text-slate-500 block">Trọng lượng (kg)</span>
                            <span className="font-mono font-semibold text-slate-800">{editState.packageValues.weight}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Kích thước (cm)</span>
                            <span className="font-mono text-slate-800">{editState.packageValues.length} x {editState.packageValues.width} x {editState.packageValues.height}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Dịch vụ</span>
                            <span className="font-mono text-slate-800">{editState.shippingMethodCode}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">IOSS</span>
                            <span className="font-mono text-slate-800">{editState.useIoss ? (editState.iossNumber || "Thiếu") : "Không dùng"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <EnvironmentSelector
            onChange={setEnvironment}
            value={environment}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <Button onClick={onClose} variant="secondary">
            Hủy bỏ
          </Button>
          <Button
            disabled={!canSubmit}
            leftIcon={<Truck className="h-4 w-4" />}
            onClick={handleSubmit}
            variant="primary"
          >
            Xác nhận tạo vận đơn ({orders.length} đơn)
          </Button>
        </div>
      </div>
    </div>
  );
}

export function buildBatchOptionsByOrderId(
  orders: OrderListItem[],
  detailsByOrderId: Record<string, OrderDetail | undefined>,
  editsByOrderId: Record<string, BatchOrderShipEditState>,
  defaultIossNumber = DEFAULT_YUN_IOSS_NUMBER,
): Record<string, ShipOrderOptions> {
  const result: Record<string, ShipOrderOptions> = {};

  orders.forEach((order) => {
    const detail = detailsByOrderId[order.id] ?? null;
    const preview = buildShipmentPreview(order, detail, defaultIossNumber);
    const edit = editsByOrderId[order.id];

    result[order.id] = buildShipOptions(
      preview,
      edit?.shippingMethodCode ?? preview.shippingMethodCode,
      edit?.receiverValues ?? preview.receiver,
      edit?.packageValues ?? preview.package,
      edit?.useIoss ?? preview.useIoss,
      edit?.iossNumber ?? preview.iossNumber,
      edit?.parcels ?? preview.parcels,
    );
  });

  return result;
}

export function hasMissingBatchIossNumber(
  orders: OrderListItem[],
  detailsByOrderId: Record<string, OrderDetail | undefined>,
  editsByOrderId: Record<string, BatchOrderShipEditState>,
  defaultIossNumber = DEFAULT_YUN_IOSS_NUMBER,
): boolean {
  return orders.some((order) => {
    const detail = detailsByOrderId[order.id] ?? null;
    const preview = buildShipmentPreview(order, detail, defaultIossNumber);
    const edit = editsByOrderId[order.id];
    const useIoss = edit?.useIoss ?? preview.useIoss;
    const iossNumber = edit?.iossNumber ?? preview.iossNumber;

    return useIoss && !iossNumber.trim();
  });
}
