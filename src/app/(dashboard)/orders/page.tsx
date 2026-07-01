import type { Metadata } from "next";
import { OrdersTable } from "@/components/orders/OrdersTable";

export const metadata: Metadata = {
  title: "Orders | Fulfillment Platform",
};

export default function OrdersPage() {
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Operations
        </p>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
            Orders
          </h1>
          {/* <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review received orders and create draft shipments.
          </p> */}
        </div>
      </header>

      <OrdersTable />
    </div>
  );
}
