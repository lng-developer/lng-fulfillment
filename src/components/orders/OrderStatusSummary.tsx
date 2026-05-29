"use client";

import { CheckCircle, Loader2, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/types/orders";

type CountData = {
  total: number;
  fulfilled: number;
  inProcessing: number;
  shippedOrCancelled: number;
};

export function OrderStatusSummary({
  orders,
  totalItems,
  isLoading = false,
}: {
  orders: OrderListItem[];
  totalItems: number;
  isLoading?: boolean;
}) {
  const counts: CountData = {
    total: totalItems || orders.length,
    fulfilled: orders.filter((order) =>
      ["FULFILLED", "READY_TO_SHIP"].includes(order.status),
    ).length,
    inProcessing: orders.filter((order) => order.status === "IN_PROCESSING")
      .length,
    shippedOrCancelled: orders.filter((order) =>
      ["SHIPPED", "CANCELLED"].includes(order.status),
    ).length,
  };

  const cards = [
    {
      label: "Total Orders",
      count: counts.total,
      color: "var(--text-primary)",
      Icon: Package,
    },
    {
      label: "Fulfilled",
      count: counts.fulfilled,
      color: "var(--success)",
      Icon: CheckCircle,
    },
    {
      label: "In Processing",
      count: counts.inProcessing,
      color: "var(--brand)",
      Icon: Loader2,
    },
    {
      label: "Shipped / Cancelled",
      count: counts.shippedOrCancelled,
      color: "var(--text-muted)",
      Icon: Truck,
    },
  ];

  return (
    <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, count, color, Icon }) => (
        <div
          className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-soft"
          key={label}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <Icon
              className={cn(
                "h-[13px] w-[13px]",
                label === "In Processing" && isLoading ? "animate-spin" : "",
              )}
              aria-hidden
            />
            {label}
          </div>
          <div
            className="text-[22px] font-semibold tracking-[-0.01em]"
            style={{ color }}
          >
            {isLoading && !orders.length ? "..." : count}
          </div>
        </div>
      ))}
    </section>
  );
}
