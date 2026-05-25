"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <ErrorScreen
      backHref="/orders"
      backLabel="Back to Orders"
      onRefresh={reset}
    />
  );
}
