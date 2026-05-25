import type { Metadata } from "next";
import { ShipmentsPageContent } from "@/components/shipments/ShipmentsPageContent";

export const metadata: Metadata = {
  title: "Shipments | Fulfillment Platform",
};

export default function ShipmentsPage() {
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Operations
        </p>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
            Shipments
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review shipments, run preflight checks, and trigger manual shipment
            operations.
          </p>
        </div>
      </header>

      <ShipmentsPageContent />
    </div>
  );
}
