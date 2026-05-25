"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function SettingsError({ reset }: { reset: () => void }) {
  return (
    <ErrorScreen
      backHref="/settings"
      backLabel="Back to Settings"
      onRefresh={reset}
    />
  );
}
