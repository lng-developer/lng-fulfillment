"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { YunOrderItem } from "@/types/order-lookup";
import { display } from "./format";
import { CopyButton } from "./LookupSummaryCard";

export function YunOrderCard({ item }: { item?: YunOrderItem }) {
  const dimensions = [item?.Length, item?.Width, item?.Height]
    .filter((value) => value !== undefined && value !== null)
    .join(" x ");
  const fields = [
    { label: "OrderNumber", value: item?.OrderNumber, copy: true, mono: true },
    {
      label: "CustomerOrderNumber",
      value: item?.CustomerOrderNumber,
      copy: true,
      mono: true,
    },
    { label: "WayBillNumber", value: item?.WayBillNumber, copy: true, mono: true },
    {
      label: "TrackingNumber",
      value: item?.TrackingNumber,
      copy: true,
      mono: true,
    },
    { label: "ShippingMethodCode", value: item?.ShippingMethodCode },
    { label: "Trạng thái OMS", value: item?.Status, badge: true },
    { label: "PackageCount", value: item?.PackageCount ?? item?.PackageNumber },
    { label: "Dimensions (cm)", value: dimensions || undefined },
    { label: "Weight (kg)", value: item?.Weight },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">
        Đơn YunExpress
      </h2>
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div
            className="flex items-center justify-between gap-3 py-2 text-xs"
            key={field.label}
          >
            <span className="shrink-0 text-slate-500 font-medium">
              {field.label}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              {field.value ? (
                <>
                  {field.badge ? (
                    <StatusBadge status={field.value} />
                  ) : (
                    <span
                      className={`truncate ${
                        field.mono ? "font-mono font-medium text-indigo-600" : "text-slate-800"
                      }`}
                      title={display(field.value)}
                    >
                      {display(field.value)}
                    </span>
                  )}
                  {field.copy ? <CopyButton value={String(field.value)} /> : null}
                </>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
