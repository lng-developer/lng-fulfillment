"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <ErrorScreen onRefresh={reset} />
      </body>
    </html>
  );
}
