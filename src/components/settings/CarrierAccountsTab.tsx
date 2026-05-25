"use client";

import { Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { getErrorMessage } from "@/lib/api/base";
import {
  getCarrierAccounts,
  updateCarrierAccount,
} from "@/lib/api/carrier-accounts";
import { toastError, toastSuccess } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { Role } from "@/lib/rbac";
import type { CarrierAccount } from "@/types/settings";
import { CarrierAccountCard } from "./CarrierAccountCard";
import { CredentialForm } from "./CredentialForm";

export function CarrierAccountsTab({ role }: { role: Role }) {
  const [accounts, setAccounts] = useState<CarrierAccount[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAccount, setSelectedAccount] =
    useState<CarrierAccount | null>(null);
  const [editingAccount, setEditingAccount] =
    useState<CarrierAccount | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAccounts() {
      setState("loading");
      setLoadError(null);

      try {
        const response = await getCarrierAccounts(controller.signal);
        setAccounts(response);
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
          setState("error");
        }
      }
    }

    loadAccounts();

    return () => controller.abort();
  }, [reloadKey]);

  if (state === "loading") {
    return <LoadingSkeleton rows={4} />;
  }

  if (state === "error") {
    return (
      <ErrorState
        message={loadError ?? "Carrier accounts could not be loaded."}
        retry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Carrier Accounts
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure tenant carrier accounts and encrypted YunExpress
          credentials.
        </p>
      </div>

      {accounts.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {accounts.map((account) => (
            <CarrierAccountCard
              account={account}
              key={account.id}
              onEditAccount={setEditingAccount}
              onManageCredential={setSelectedAccount}
              role={role}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          <EmptyState
            description="Add one to start creating shipments."
            heading="No carrier accounts configured."
            icon={<Truck className="h-6 w-6" aria-hidden />}
          />
        </div>
      )}

      {selectedAccount ? (
        <CredentialForm
          account={selectedAccount}
          onCancel={() => setSelectedAccount(null)}
          onSaved={() => {
            setSelectedAccount(null);
            toastSuccess("Credential saved.");
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}

      {editingAccount ? (
        <EditCarrierAccountModal
          account={editingAccount}
          onCancel={() => setEditingAccount(null)}
          onSaved={() => {
            setEditingAccount(null);
            toastSuccess("Carrier account updated.");
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}
    </section>
  );
}

function EditCarrierAccountModal({
  account,
  onCancel,
  onSaved,
}: {
  account: CarrierAccount;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(
    account.status === "DISABLED" ? "DISABLED" : "ACTIVE",
  );
  const [isDefault, setIsDefault] = useState(account.isDefault);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLFormElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setIsPending(true);
    try {
      await updateCarrierAccount(account.id, {
        displayName: displayName.trim(),
        status,
        isDefault,
      });
      onSaved();
    } catch (error) {
      setError(getErrorMessage(error));
      toastError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
    >
      <form
        className="w-full max-w-[460px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        onSubmit={save}
        ref={trapRef}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Edit Carrier Account
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Display Name
            <input
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Status
            <select
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) =>
                setStatus(event.target.value as "ACTIVE" | "DISABLED")
              }
              value={status}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-xs font-medium text-[var(--text-secondary)]">
            <input
              checked={isDefault}
              className="h-4 w-4 rounded border-[var(--border-strong)]"
              onChange={(event) => setIsDefault(event.target.checked)}
              type="checkbox"
            />
            Set as default account
          </label>

          {error ? (
            <div className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
