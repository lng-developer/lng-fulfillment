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
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        Đơn YunExpress
      </h2>
      <div>
        {fields.map((field) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 text-[11px] last:border-b-0"
            key={field.label}
          >
            <span className="shrink-0 text-[var(--text-secondary)]">
              {field.label}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              {field.value ? (
                <>
                  {field.badge ? (
                    <StatusBadge status={String(field.value)} />
                  ) : (
                    <span
                      className={`truncate ${
                        field.mono
                          ? "font-mono text-[var(--brand)]"
                          : "text-[var(--text-primary)]"
                      }`}
                      title={display(field.value)}
                    >
                      {display(field.value)}
                    </span>
                  )}
                  {field.copy && typeof field.value === "string" ? (
                    <CopyButton value={field.value} />
                  ) : null}
                </>
              ) : (
                <span className="text-[var(--text-muted)]">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
