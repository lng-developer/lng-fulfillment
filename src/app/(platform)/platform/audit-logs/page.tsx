import type { Metadata } from "next";
import { PlatformAuditLogsContent } from "@/components/platform/PlatformAuditLogsContent";

export const metadata: Metadata = {
  title: "Platform Audit Logs | Fulfillment Platform",
};

export default function PlatformAuditLogsPage() {
  return (
    <div className="grid gap-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review cross-tenant platform administration activity.
        </p>
      </header>
      <PlatformAuditLogsContent />
    </div>
  );
}
