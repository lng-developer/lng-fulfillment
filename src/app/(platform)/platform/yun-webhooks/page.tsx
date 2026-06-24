import type { Metadata } from "next";
import { PlatformYunWebhooksContent } from "@/components/platform/PlatformYunWebhooksContent";

export const metadata: Metadata = {
  title: "YunExpress Webhooks | Fulfillment Platform",
};

export default function PlatformYunWebhooksPage() {
  return (
    <div className="grid gap-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          YunExpress Webhooks
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage received tracking, fee, and abnormal events from YunExpress OMS.
        </p>
      </header>
      <PlatformYunWebhooksContent />
    </div>
  );
}
