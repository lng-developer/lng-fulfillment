import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";

export const metadata: Metadata = {
  title: "Settings | Fulfillment Platform",
};

export default function SettingsPage() {
  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Administration
        </p>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage tenant profile, access, carrier credentials, and audit
            records.
          </p>
        </div>
      </header>

      <SettingsShell />
    </div>
  );
}
