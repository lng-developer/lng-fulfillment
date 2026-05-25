import { CheckCircle2, Settings, Star, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { can, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { CarrierAccount } from "@/types/settings";

export function CarrierAccountCard({
  account,
  onEditAccount,
  onManageCredential,
  role,
}: {
  account: CarrierAccount;
  onEditAccount: (account: CarrierAccount) => void;
  onManageCredential: (account: CarrierAccount) => void;
  role: Role;
}) {
  const credentialState = getCredentialState(account);
  const canManage = can.manageCarrierAccounts(role);

  return (
    <article className="max-w-[460px] rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--brand)]">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            {account.isDefault ? (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-normal text-[var(--warning-text)]">
                <Star className="h-3 w-3 fill-[var(--warning)]" aria-hidden />
                Default
              </div>
            ) : null}
            <h3 className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              {account.displayName}
            </h3>
            <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
              {account.carrierCode.toLowerCase()}
            </p>
          </div>
        </div>
        <StatusBadge status={account.status} />
      </div>

      <dl className="mt-5 grid gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-2.5 text-xs">
        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
          <dt className="text-[var(--text-secondary)]">Credential</dt>
          <dd
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              credentialState.variant === "danger"
                ? "text-[var(--danger-text)]"
                : credentialState.variant === "warning"
                  ? "text-[var(--warning-text)]"
                  : "text-[var(--success-text)]",
            )}
          >
            {credentialState.variant === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
            ) : null}
            {credentialState.label}
          </dd>
        </div>
        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
          <dt className="text-[var(--text-secondary)]">Last updated</dt>
          <dd className="text-[var(--text-secondary)]">
            {relativeDate(account.credential?.updatedAt ?? account.updatedAt)}
          </dd>
        </div>
      </dl>

      {canManage ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex h-8 items-center gap-2 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            onClick={() => onEditAccount(account)}
            type="button"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Edit Account
          </button>
          <button
            className="h-8 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
            onClick={() => onManageCredential(account)}
            type="button"
          >
            Manage Credential
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getCredentialState(account: CarrierAccount) {
  if (!account.credential) {
    return {
      label: "Warning: Not configured",
      variant: "danger" as const,
    };
  }

  const liveEnabled =
    "liveEnabled" in account.credential
      ? Boolean(account.credential.liveEnabled)
      : false;

  return liveEnabled
    ? {
        label: "Warning: Configured (LIVE MODE)",
        variant: "warning" as const,
      }
    : {
        label: "Configured (sandbox)",
        variant: "success" as const,
      };
}

function relativeDate(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return "Just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;

  return (
    <time dateTime={value} title={date.toLocaleString()}>
      {new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)}
    </time>
  );
}
