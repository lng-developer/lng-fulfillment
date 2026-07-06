"use client";

import { ChevronDown, ShieldCheck, Truck, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
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
  PRODUCT_OPTIONS,
  SHIPPING_METHOD_OPTIONS,
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
  const [tenantIossNumber, setTenantIossNumber] = useState(
    DEFAULT_YUN_IOSS_NUMBER,
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editsByOrderId, setEditsByOrderId] = useState<
    Record<string, BatchOrderShipEditState>
  >({});
  const hasMissingIoss = hasMissingBatchIossNumber(
    orders,
    detailsByOrderId,
    editsByOrderId,
    tenantIossNumber,
  );
  const canSubmit =
    orders.length > 0 && orders.length <= 10 && !hasMissingIoss;

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
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-[980px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--brand-light)] text-[var(--brand)]">
              <Truck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Create YunExpress shipments
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {`You are about to create shipments for ${orders.length} orders.`}
              </p>
            </div>
          </div>
          <button
            aria-label="Close batch shipment modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[calc(90vh-130px)] overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
              YunExpress batch limit: 10 orders.
            </div>
            {hasMissingIoss ? (
              <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                IOSS number is required for orders with Use IOSS enabled.
              </div>
            ) : null}
            <div className="overflow-hidden rounded-sm border border-[var(--border)]">
              {orders.map((order) => (
                <div
                  className="border-b border-[var(--border)] last:border-b-0"
                  key={order.id}
                >
                  <div className="grid grid-cols-[24px_150px_1fr_70px] items-center gap-3 px-3 py-2 text-xs">
                    <button
                      aria-label={
                        expandedOrderId === order.id
                          ? "Collapse order details"
                          : "Expand order details"
                      }
                      className="inline-flex h-6 w-6 items-center justify-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)]"
                      onClick={() =>
                        setExpandedOrderId((current) =>
                          current === order.id ? null : order.id,
                        )
                      }
                      type="button"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          expandedOrderId === order.id ? "rotate-180" : "",
                        )}
                        aria-hidden
                      />
                    </button>
                    <button
                      className="truncate text-left font-mono text-[var(--brand)] hover:underline"
                      onClick={() =>
                        setExpandedOrderId((current) =>
                          current === order.id ? null : order.id,
                        )
                      }
                      type="button"
                    >
                      {order.orderNumber ?? order.externalOrderId}
                    </button>
                    <span className="truncate text-[var(--text-secondary)]">
                      {order.recipientName ?? "No recipient"}
                    </span>
                    <span className="text-right text-[var(--text-muted)]">
                      {order.itemCount} items
                    </span>
                  </div>
                  {expandedOrderId === order.id ? (
                    <BatchOrderDetails
                      disabled={false}
                      detail={detailsByOrderId[order.id] ?? null}
                      edit={editsByOrderId[order.id]}
                      onEditChange={(edit) =>
                        setEditsByOrderId((current) => ({
                          ...current,
                          [order.id]: edit,
                        }))
                      }
                      order={order}
                      tenantIossNumber={tenantIossNumber}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <EnvironmentSelector
              disabled={false}
              onChange={setEnvironment}
              value={environment}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            Create shipments
          </button>
        </div>
      </div>
    </div>
  );
}

export function buildBatchOptionsByOrderId(
  orders: OrderListItem[],
  detailsByOrderId: Record<string, OrderDetail | undefined>,
  editsByOrderId: Record<string, BatchOrderShipEditState> = {},
  defaultIossNumber = DEFAULT_YUN_IOSS_NUMBER,
): Record<string, ShipOrderOptions> {
  return Object.fromEntries(
    orders.map((order) => {
      const detail = detailsByOrderId[order.id] ?? null;
      const preview = buildShipmentPreview(order, detail, defaultIossNumber);
      const edit = resolveBatchEditState(preview, editsByOrderId[order.id]);

      return [
        order.id,
        buildShipOptions(
          preview,
          edit.shippingMethodCode,
          edit.receiverValues,
          edit.packageValues,
          edit.useIoss,
          edit.iossNumber,
          edit.parcels,
        ),
      ];
    }),
  );
}

export function hasMissingBatchIossNumber(
  orders: OrderListItem[],
  detailsByOrderId: Record<string, OrderDetail | undefined>,
  editsByOrderId: Record<string, BatchOrderShipEditState> = {},
  defaultIossNumber = DEFAULT_YUN_IOSS_NUMBER,
): boolean {
  return orders.some((order) => {
    const detail = detailsByOrderId[order.id] ?? null;
    const preview = buildShipmentPreview(order, detail, defaultIossNumber);
    const edit = resolveBatchEditState(preview, editsByOrderId[order.id]);

    return edit.useIoss && !edit.iossNumber.trim();
  });
}

function BatchOrderDetails({
  disabled,
  order,
  detail,
  edit,
  onEditChange,
  tenantIossNumber,
}: {
  disabled: boolean;
  order: OrderListItem;
  detail: OrderDetail | null;
  edit?: BatchOrderShipEditState;
  onEditChange: (edit: BatchOrderShipEditState) => void;
  tenantIossNumber: string;
}) {
  const preview = buildShipmentPreview(order, detail, tenantIossNumber);
  const values = resolveBatchEditState(preview, edit);

  function updateEdit(patch: Partial<BatchOrderShipEditState>) {
    onEditChange({ ...values, ...patch });
  }

  function updatePackage(patch: Partial<ShipmentPreview["package"]>) {
    updateEdit({
      packageValues: {
        ...values.packageValues,
        ...patch,
      },
    });
  }

  function updateReceiver(patch: Partial<ShipmentReceiverValues>) {
    updateEdit({
      receiverValues: {
        ...values.receiverValues,
        ...patch,
      },
    });
  }

  function updateParcel(
    index: number,
    patch: Partial<ShipmentPreview["parcels"][number]>,
  ) {
    updateEdit({
      parcels: values.parcels.map((parcel, parcelIndex) =>
        parcelIndex === index ? { ...parcel, ...patch } : parcel,
      ),
    });
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-3">
      <div className="grid gap-2 md:grid-cols-3">
        <Info label="Order ID" mono value={order.id} />
        <Info label="Order #" mono value={order.orderNumber ?? order.externalOrderId} />
        <Info label="Status" value={<StatusBadge status={order.status} />} />
        <Info label="Recipient" value={order.recipientName ?? "-"} />
        <Info
          label="Destination"
          value={[
            order.destinationCity,
            order.destinationState,
            order.destinationPostalCode,
            order.destinationCountry,
          ]
            .filter(Boolean)
            .join(", ") || "-"}
        />
        <Info label="Shipping type" value={order.shippingType ?? order.shippingService ?? "-"} />
        <Info label="Items" value={`${order.itemCount} items / ${order.totalQuantity} qty`} />
        <Info label="First SKU" mono value={order.firstSku ?? "-"} />
        <Info label="First item" value={order.firstItemName ?? "-"} />
        <Info label="Shipping method" mono value={preview.shippingMethodCode} />
        <Info
          label="IOSS"
          mono
          value={values.useIoss ? values.iossNumber || "-" : "Not used"}
        />
        <Info
          label="Package"
          mono
          value={`${preview.package.weight}kg · ${preview.package.length}x${preview.package.width}x${preview.package.height}${preview.package.sizeUnits}`}
        />
        <Info label="Parcels" value={`${preview.parcels.length} rows`} />
      </div>
      {preview.parcels.length ? (
        <div className="mt-2 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]">
          {preview.parcels.map((parcel, index) => (
            <div
              className="grid grid-cols-[130px_1fr_80px] gap-2 border-b border-[var(--border)] px-2 py-1.5 text-[11px] last:border-b-0"
              key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
            >
              <span className="truncate font-mono text-[var(--brand)]">
                {parcel.sku}
              </span>
              <span className="truncate text-[var(--text-secondary)]">
                {parcel.eName} / {parcel.cName}
              </span>
              <span className="text-right text-[var(--text-muted)]">
                Qty {parcel.quantity}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Editable receiver
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <BatchTextInput
              disabled={disabled}
              label="FirstName"
              onChange={(value) => updateReceiver({ firstName: value })}
              value={values.receiverValues.firstName}
            />
            <BatchTextInput
              disabled={disabled}
              label="LastName"
              onChange={(value) => updateReceiver({ lastName: value })}
              value={values.receiverValues.lastName}
            />
            <BatchTextInput
              disabled={disabled}
              label="Company"
              onChange={(value) => updateReceiver({ company: value })}
              value={values.receiverValues.company}
            />
            <BatchTextInput
              disabled={disabled}
              label="CountryCode"
              onChange={(value) =>
                updateReceiver({ countryCode: value.toUpperCase() })
              }
              value={values.receiverValues.countryCode}
            />
            <BatchTextInput
              disabled={disabled}
              label="Street"
              onChange={(value) => updateReceiver({ street: value })}
              value={values.receiverValues.street}
            />
            <BatchTextInput
              disabled={disabled}
              label="City"
              onChange={(value) => updateReceiver({ city: value })}
              value={values.receiverValues.city}
            />
            <BatchTextInput
              disabled={disabled}
              label="State"
              onChange={(value) => updateReceiver({ state: value })}
              value={values.receiverValues.state}
            />
            <BatchTextInput
              disabled={disabled}
              label="Zip"
              onChange={(value) => updateReceiver({ zip: value })}
              value={values.receiverValues.zip}
            />
            <BatchTextInput
              disabled={disabled}
              label="Phone"
              onChange={(value) => updateReceiver({ phone: value })}
              value={values.receiverValues.phone}
            />
            <BatchTextInput
              disabled={disabled}
              label="Email"
              onChange={(value) => updateReceiver({ email: value })}
              value={values.receiverValues.email}
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(170px,220px)_1fr]">
          <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              ShippingMethodCode
            </span>
            <select
              className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 font-mono text-[11px] text-[var(--text-primary)]"
              disabled={disabled}
              onChange={(event) =>
                updateEdit({ shippingMethodCode: event.target.value })
              }
              value={values.shippingMethodCode}
            >
              {SHIPPING_METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <BatchIossInput
            disabled={disabled}
            euDetected={preview.iossEuDetected}
            onChange={(value) => updateEdit({ iossNumber: value })}
            onToggle={(value) => updateEdit({ useIoss: value })}
            useIoss={values.useIoss}
            value={values.iossNumber}
          />
          <div className="grid gap-2 md:grid-cols-5">
            <BatchNumberInput
              disabled={disabled}
              label="Weight"
              onChange={(value) => updatePackage({ weight: value ?? 0 })}
              value={values.packageValues.weight}
            />
            <BatchNumberInput
              disabled={disabled}
              label="Length"
              onChange={(value) => updatePackage({ length: value ?? 0 })}
              value={values.packageValues.length}
            />
            <BatchNumberInput
              disabled={disabled}
              label="Width"
              onChange={(value) => updatePackage({ width: value ?? 0 })}
              value={values.packageValues.width}
            />
            <BatchNumberInput
              disabled={disabled}
              label="Height"
              onChange={(value) => updatePackage({ height: value ?? 0 })}
              value={values.packageValues.height}
            />
            <BatchTextInput
              disabled={disabled}
              label="SizeUnits"
              onChange={(value) => updatePackage({ sizeUnits: value })}
              value={values.packageValues.sizeUnits}
            />
            <BatchNumberInput
              disabled={disabled}
              label="PackageCount"
              onChange={(value) => updatePackage({ packageCount: value ?? 1 })}
              value={values.packageValues.packageCount}
            />
            <BatchNumberInput
              disabled={disabled}
              label="ApplicationType"
              onChange={(value) => updatePackage({ applicationType: value ?? 0 })}
              value={values.packageValues.applicationType}
            />
            <BatchNumberInput
              disabled={disabled}
              label="ReturnOption"
              onChange={(value) => updatePackage({ returnOption: value ?? 0 })}
              value={values.packageValues.returnOption}
            />
            <BatchNumberInput
              disabled={disabled}
              label="TariffPrepay"
              onChange={(value) => updatePackage({ tariffPrepay: value ?? 0 })}
              value={values.packageValues.tariffPrepay}
            />
            <BatchNumberInput
              disabled={disabled}
              label="InsuranceOption"
              onChange={(value) =>
                updatePackage({ insuranceOption: value ?? 0 })
              }
              value={values.packageValues.insuranceOption}
            />
          </div>
        </div>

        {values.parcels.length ? (
          <div className="grid gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Editable parcels
            </div>
            {values.parcels.map((parcel, index) => (
              <div
                className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-2"
                key={`${parcel.orderItemId ?? parcel.sku}-${index}`}
              >
                <div className="mb-2 grid gap-2 md:grid-cols-[130px_minmax(150px,1fr)_minmax(120px,180px)]">
                  <Info label="SKU" mono value={parcel.sku} />
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                      EName
                    </span>
                    <select
                      className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 text-[11px] text-[var(--text-primary)]"
                      disabled={disabled}
                      onChange={(event) => {
                        const option = PRODUCT_OPTIONS.find(
                          (item) => item.eName === event.target.value,
                        );
                        if (option) {
                          updateParcel(index, {
                            eName: option.eName,
                            cName: option.cName,
                          });
                        }
                      }}
                      value={parcel.eName}
                    >
                      {PRODUCT_OPTIONS.map((option) => (
                        <option key={option.eName} value={option.eName}>
                          {option.eName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Info label="CName" value={parcel.cName} />
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <Info label="Quantity" mono value={parcel.quantity} />
                  <BatchNumberInput
                    disabled={disabled}
                    label="UnitPrice"
                    onChange={(value) => updateParcel(index, { unitPrice: value })}
                    value={parcel.unitPrice}
                  />
                  <BatchNumberInput
                    disabled={disabled}
                    label="UnitWeight"
                    onChange={(value) =>
                      updateParcel(index, { unitWeight: value })
                    }
                    value={parcel.unitWeight}
                  />
                  <BatchTextInput
                    disabled={disabled}
                    label="CurrencyCode"
                    onChange={(value) =>
                      updateParcel(index, { currencyCode: value.toUpperCase() })
                    }
                    value={parcel.currencyCode}
                  />
                  <BatchTextInput
                    disabled={disabled}
                    label="InvoicePart"
                    onChange={(value) =>
                      updateParcel(index, { invoicePart: value })
                    }
                    value={parcel.invoicePart ?? ""}
                  />
                  <BatchTextInput
                    disabled={disabled}
                    label="InvoiceUsage"
                    onChange={(value) =>
                      updateParcel(index, { invoiceUsage: value })
                    }
                    value={parcel.invoiceUsage ?? ""}
                  />
                  <BatchTextInput
                    disabled={disabled}
                    label="Remark"
                    onChange={(value) => updateParcel(index, { remark: value })}
                    value={parcel.remark}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolveBatchEditState(
  preview: ShipmentPreview,
  edit?: BatchOrderShipEditState,
): BatchOrderShipEditState {
  return (
    edit ?? {
      shippingMethodCode: preview.shippingMethodCode,
      receiverValues: preview.receiver,
      packageValues: preview.package,
      useIoss: preview.useIoss,
      iossNumber: preview.iossNumber,
      parcels: preview.parcels,
    }
  );
}

function BatchTextInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 text-[11px] text-[var(--text-primary)]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function BatchIossInput({
  disabled,
  euDetected,
  onChange,
  onToggle,
  useIoss,
  value,
}: {
  disabled: boolean;
  euDetected: boolean;
  onChange: (value: string) => void;
  onToggle: (value: boolean) => void;
  useIoss: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-700">
          <ShieldCheck size={12} aria-hidden />
          IOSS
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
            {euDetected ? "EU detected" : "Optional"}
          </span>
          <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800">
            <input
              checked={useIoss}
              className="accent-emerald-600"
              disabled={disabled}
              onChange={(event) => onToggle(event.target.checked)}
              type="checkbox"
            />
            Use IOSS
          </label>
        </div>
      </div>
      {useIoss ? (
        <>
          <input
            className="h-8 w-full rounded-sm border border-emerald-200 bg-white px-2 font-mono text-[11px] text-[var(--text-primary)] outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          />
          {!value.trim() ? (
            <div className="mt-1 text-[10px] font-medium text-amber-700">
              IOSS number is required when Use IOSS is enabled.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function BatchNumberInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: number | undefined) => void;
  value: number | undefined;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className="h-8 w-full rounded-sm border border-[var(--border)] bg-white px-2 font-mono text-[11px] text-[var(--text-primary)]"
        disabled={disabled}
        min={0}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : undefined);
        }}
        step="0.001"
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

function Info({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[11px] text-[var(--text-primary)]",
          mono ? "font-mono" : "",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
