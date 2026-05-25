"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function AppError({ reset }: { reset: () => void }) {
  return <ErrorScreen onRefresh={reset} />;
}
