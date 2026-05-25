"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function ShipmentsError({ reset }: { reset: () => void }) {
  return (
    <ErrorScreen
      backHref="/shipments"
      backLabel="Back to Shipments"
      onRefresh={reset}
    />
  );
}
