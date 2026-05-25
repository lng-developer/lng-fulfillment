"use client";

import { KeyRound, Plus, ShieldOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createApiKey, getApiKeys, revokeApiKey } from "@/lib/api/api-keys";
import { getErrorMessage } from "@/lib/api/base";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";
import type { ApiKey } from "@/types/settings";
import { ApiKeyRevealModal } from "./ApiKeyRevealModal";

const SCOPE_OPTIONS = [
  "orders:read",
  "orders:write",
  "tracking:read",
  "tracking:write",
];

export function ApiKeysTab({ role }: { role: Role }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  const canManage = can.manageApiKeys(role);

  useEffect(() => {
    const controller = new AbortController();

    async function loadKeys() {
      setState("loading");
      setLoadError(null);

      try {
        const response = await getApiKeys(controller.signal);
        setApiKeys(response);
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
          setState("error");
        }
      }
    }

    loadKeys();

    return () => controller.abort();
  }, [reloadKey]);

  const columns = useMemo<Array<DataTableColumn<ApiKey>>>(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <span className="font-medium text-[var(--text-primary)]">{row.name}</span>
        ),
      },
      {
        key: "prefix",
        header: "Prefix",
        render: (row) => (
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {row.keyPrefix}
          </span>
        ),
      },
      {
        key: "scopes",
        header: "Scopes",
        className: "w-[260px]",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.scopes.map((scope) => (
              <span
                className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 font-mono text-[10px] text-[var(--brand-dark)]"
                key={scope}
              >
                {scope}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "expires",
        header: "Expires",
        render: (row) => <ExpiryCell expiresAt={row.expiresAt} />,
      },
      {
        key: "lastUsed",
        header: "Last Used",
        render: (row) => relativeDate(row.lastUsedAt),
      },
      {
        key: "created",
        header: "Created",
        render: (row) => relativeDate(row.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          canManage ? (
            <button
              className="h-8 rounded-sm border border-[#fca5a5] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={row.status === "REVOKED"}
              onClick={(event) => {
                event.stopPropagation();
                setKeyToRevoke(row);
              }}
              type="button"
            >
              Revoke
            </button>
          ) : (
            <span className="text-[var(--text-muted)]">-</span>
          ),
      },
    ],
    [canManage],
  );

  async function confirmRevoke() {
    if (!keyToRevoke) {
      return;
    }

    try {
      await revokeApiKey(keyToRevoke.id);
      setKeyToRevoke(null);
      toastSuccess("API key revoked.");
      setReloadKey((value) => value + 1);
    } catch {
      toastError("Something went wrong. Please try again.");
    }
  }

  if (state === "loading") {
    return <LoadingSkeleton rows={6} />;
  }

  if (state === "error") {
    return (
      <ErrorState
        message={loadError ?? "API keys could not be loaded."}
        retry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">API Keys</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage tenant API keys for integrations.
          </p>
        </div>
        {canManage ? (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create API Key
          </button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={apiKeys}
        empty={
          <EmptyState
            description="Create one to integrate with the Portal."
            heading="No API keys."
            icon={<KeyRound className="h-6 w-6" aria-hidden />}
          />
        }
        getRowKey={(row) => row.id}
        onPageChange={() => undefined}
        pagination={{
          page: 1,
          pageSize: Math.max(apiKeys.length, 1),
          totalItems: apiKeys.length,
          totalPages: apiKeys.length ? 1 : 0,
        }}
      />

      {showCreateModal ? (
        <CreateApiKeyModal
          onCancel={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}

      {keyToRevoke ? (
        <ConfirmationModal
          confirmLabel="Revoke Key"
          description="This key will stop working immediately. Any services using it will fail."
          onCancel={() => setKeyToRevoke(null)}
          onConfirm={confirmRevoke}
          title={`Revoke "${keyToRevoke.name}"?`}
          variant="danger"
        />
      ) : null}
    </section>
  );
}

function CreateApiKeyModal({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["orders:read"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [revealPlaintext, setRevealPlaintext] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLFormElement>(
    true,
    isPending ? undefined : onCancel,
  );

  const validationError = getCreateValidationError(name, scopes, expiresAt);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPending(true);
    try {
      const response = await createApiKey({
        name: name.trim(),
        scopes,
        expiresAt: expiresAt
          ? new Date(`${expiresAt}T00:00:00`).toISOString()
          : null,
      });
      setRevealPlaintext(response.plaintext);
      toastSuccess("API key created.");
    } catch {
      setError("The API key could not be created. Try again.");
      toastError();
      setIsPending(false);
    }
  }

  if (revealPlaintext) {
    return (
      <ApiKeyRevealModal
        onClose={() => {
          setRevealPlaintext(null);
          onCreated();
        }}
        plaintext={revealPlaintext}
      />
    );
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
    >
      <form
        autoComplete="off"
        className="w-full max-w-[460px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        onSubmit={submit}
        ref={trapRef}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Create API Key
          </h2>
        </div>

        <div className="grid gap-4 px-4 py-5">
          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Name *
            <input
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
              placeholder='e.g. "portal-integration"'
              value={name}
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium text-[var(--text-secondary)]">
              Scopes *
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCOPE_OPTIONS.map((scope) => (
                <label
                  className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                  key={scope}
                >
                  <input
                    checked={scopes.includes(scope)}
                    className="h-4 w-4 rounded border-[var(--border-strong)]"
                    onChange={(event) => {
                      setScopes((current) =>
                        event.target.checked
                          ? [...current, scope]
                          : current.filter((item) => item !== scope),
                      );
                    }}
                    type="checkbox"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Expires (optional)
            <input
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setExpiresAt(event.target.value)}
              type="date"
              value={expiresAt}
            />
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              Leave empty for no expiry.
            </span>
          </label>

          {error ? (
            <div className="flex gap-2 rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
              <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
            disabled={isPending || Boolean(validationError)}
            type="submit"
          >
            {isPending ? "Creating..." : "Create Key"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExpiryCell({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return <span>Never</span>;
  }

  const isExpired = new Date(expiresAt).getTime() < Date.now();

  return (
    <span className={cn(isExpired ? "font-medium text-[var(--danger-text)]" : undefined)}>
      {formatDate(expiresAt)}
    </span>
  );
}

function getCreateValidationError(
  name: string,
  scopes: string[],
  expiresAt: string,
) {
  if (!name.trim()) {
    return "Name is required.";
  }

  if (name.trim().length > 64) {
    return "Name must be 64 characters or fewer.";
  }

  if (!scopes.length) {
    return "Select at least one scope.";
  }

  if (expiresAt && new Date(`${expiresAt}T00:00:00`).getTime() <= Date.now()) {
    return "Expiry date must be in the future.";
  }

  return null;
}

function relativeDate(value: string | null) {
  if (!value) {
    return "Never";
  }

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
      {formatDate(value)}
    </time>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
