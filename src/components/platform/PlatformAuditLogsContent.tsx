"use client";

import {
  AlertTriangle,
  ClipboardList,
  FilterX,
  Search,
  ShieldAlert,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SafeMetadataViewer } from "@/components/ui/SafeMetadataViewer";
import { getErrorMessage } from "@/lib/api/base";
import { getPlatformAuditLogs } from "@/lib/api/platform";
import type {
  PlatformAuditLog,
  PlatformPagination,
} from "@/types/platform";

const PAGE_SIZE = 20;

const PLATFORM_ACTIONS = [
  {
    value: "PLATFORM_TENANT_CREATED",
    label: "Tenant created",
    description: "A platform admin created a tenant.",
    group: "mutation",
  },
  {
    value: "PLATFORM_TENANT_UPDATED",
    label: "Tenant updated",
    description: "A platform admin updated tenant profile fields.",
    group: "mutation",
  },
  {
    value: "PLATFORM_TENANT_MEMBER_ADDED",
    label: "Tenant member added",
    description: "A platform admin added a tenant member.",
    group: "mutation",
  },
  {
    value: "PLATFORM_TENANT_MEMBER_UPDATED",
    label: "Tenant member updated",
    description: "A platform admin updated a tenant member.",
    group: "mutation",
  },
  {
    value: "PLATFORM_ACCESS_DENIED",
    label: "Platform access denied",
    description: "An authenticated non-platform user hit a Platform API.",
    group: "denied",
  },
  {
    value: "PLATFORM_MUTATION_DENIED",
    label: "Platform support mutation denied",
    description: "A Platform Support user attempted a mutation.",
    group: "denied",
  },
] as const;

type ActionPreset = "all" | "mutations" | "denied";

const MUTATION_ACTIONS = PLATFORM_ACTIONS
  .filter((action) => action.group === "mutation")
  .map((action) => action.value);

const DENIED_ACTIONS = PLATFORM_ACTIONS
  .filter((action) => action.group === "denied")
  .map((action) => action.value);

const ACTION_BY_VALUE: Map<string, (typeof PLATFORM_ACTIONS)[number]> = new Map(
  PLATFORM_ACTIONS.map((action) => [action.value, action]),
);

export function PlatformAuditLogsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [pagination, setPagination] = useState<PlatformPagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(() =>
    parsePositivePage(searchParams.get("page")),
  );
  const [preset, setPreset] = useState<ActionPreset>(() =>
    parsePreset(searchParams.get("preset")),
  );
  const [action, setAction] = useState(() => searchParams.get("action") ?? "");
  const [actorType, setActorType] = useState(
    () => searchParams.get("actorType") ?? "",
  );
  const [resourceType, setResourceType] = useState(
    () => searchParams.get("resourceType") ?? "",
  );
  const [tenantId, setTenantId] = useState(
    () => searchParams.get("tenantId") ?? "",
  );
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupedActions = useMemo(() => {
    if (action) return [action];
    if (preset === "mutations") return MUTATION_ACTIONS;
    if (preset === "denied") return DENIED_ACTIONS;
    return [];
  }, [action, preset]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (page > 1) query.set("page", String(page));
    if (preset !== "all") query.set("preset", preset);
    if (action) query.set("action", action);
    if (actorType) query.set("actorType", actorType);
    if (resourceType.trim()) query.set("resourceType", resourceType.trim());
    if (tenantId.trim()) query.set("tenantId", tenantId.trim());
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const nextUrl = query.toString() ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    action,
    actorType,
    from,
    page,
    pathname,
    preset,
    resourceType,
    router,
    tenantId,
    to,
  ]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseParams = {
        actorType,
        resourceType: resourceType.trim(),
        tenantId: tenantId.trim(),
        from: from ? `${from}T00:00:00.000` : "",
        to: to ? `${to}T23:59:59.999` : "",
        sortOrder: "desc" as const,
      };

      const result = await getPlatformAuditLogs({
        ...baseParams,
        page,
        pageSize: PAGE_SIZE,
        action: groupedActions.length === 1 ? groupedActions[0] : "",
        actions: groupedActions.length > 1 ? groupedActions : undefined,
      });
      setLogs(result.data);
      setPagination(result.pagination);
    } catch (fetchError) {
      setLogs([]);
      setError(getErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [actorType, from, groupedActions, page, resourceType, tenantId, to]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const hasFilters =
    preset !== "all" ||
    action ||
    actorType ||
    resourceType.trim() ||
    tenantId.trim() ||
    from ||
    to;

  return (
    <div className="grid gap-4">
      <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Platform audit review
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Filter successful platform mutations and denied access telemetry.
            </p>
          </div>
          <button
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasFilters}
            onClick={() => {
              setPreset("all");
              setAction("");
              setActorType("");
              setResourceType("");
              setTenantId("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
            type="button"
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        </div>

        <div className="grid gap-3 px-4 py-3">
          <div className="flex flex-wrap gap-2" aria-label="Audit event presets">
            <PresetButton
              active={preset === "all" && !action}
              label="All"
              onClick={() => {
                setPreset("all");
                setAction("");
                setPage(1);
              }}
            />
            <PresetButton
              active={preset === "mutations" && !action}
              label="Mutations"
              onClick={() => {
                setPreset("mutations");
                setAction("");
                setPage(1);
              }}
            />
            <PresetButton
              active={preset === "denied" && !action}
              label="Denied Access"
              onClick={() => {
                setPreset("denied");
                setAction("");
                setPage(1);
              }}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(140px,1fr))]">
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              Action
              <select
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                onChange={(event) => {
                  setAction(event.target.value);
                  setPreset(event.target.value ? "all" : preset);
                  setPage(1);
                }}
                value={action}
              >
                <option value="">Any action</option>
                {PLATFORM_ACTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              Actor type
              <select
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                onChange={(event) => {
                  setActorType(event.target.value);
                  setPage(1);
                }}
                value={actorType}
              >
                <option value="">Any actor</option>
                <option value="USER">User</option>
                <option value="API_KEY">API key</option>
                <option value="SYSTEM">System</option>
              </select>
            </label>

            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              Resource type
              <input
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                onChange={(event) => {
                  setResourceType(event.target.value);
                  setPage(1);
                }}
                placeholder="Tenant, PlatformAccess"
                value={resourceType}
              />
            </label>

            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              Tenant ID
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-8 pr-3 font-mono text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                  onChange={(event) => {
                    setTenantId(event.target.value);
                    setPage(1);
                  }}
                  placeholder="tenant id"
                  value={tenantId}
                />
              </div>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(160px,220px)_minmax(160px,220px)_1fr]">
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              From
              <input
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={from}
              />
            </label>
            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              To
              <input
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={to}
              />
            </label>
            {groupedActions.length > 1 ? (
              <div className="rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] px-3 py-2 text-xs text-[var(--brand-dark)]">
                Preset uses backend multi-action pagination for{" "}
                {groupedActions.length} event types.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isLoading ? <LoadingSkeleton rows={8} /> : null}
      {!isLoading && error ? <ErrorState message={error} retry={fetchLogs} /> : null}
      {!isLoading && !error ? (
        <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          {logs.length ? (
            <div className="divide-y divide-[var(--border)]">
              {logs.map((log) => (
                <details className="group" key={log.id}>
                  <summary className="grid cursor-pointer gap-3 px-4 py-3 text-xs hover:bg-[var(--bg-surface2)] md:grid-cols-[150px_1.4fr_minmax(120px,0.8fr)_minmax(120px,0.8fr)]">
                    <time className="text-[var(--text-muted)]" dateTime={log.createdAt}>
                      {formatDate(log.createdAt)}
                    </time>
                    <span className="min-w-0">
                      <ActionPill action={log.action} />
                      <span className="mt-1 block truncate text-[11px] text-[var(--text-secondary)]">
                        {getActionDescription(log.action)}
                      </span>
                    </span>
                    <span className="truncate text-[var(--text-secondary)]">
                      {log.tenantSlug ?? "system"}
                    </span>
                    <span className="truncate text-[var(--text-secondary)]">
                      {formatActor(log)}
                    </span>
                  </summary>
                  <div className="grid gap-3 bg-[var(--bg-surface2)] px-4 pb-4">
                    <div className="grid gap-2 text-xs md:grid-cols-3">
                      <Info
                        label="Resource"
                        value={`${log.resourceType}:${log.resourceId ?? "-"}`}
                      />
                      <Info label="Tenant" value={log.tenantName ?? "System"} />
                      <Info label="Actor" value={formatActor(log)} />
                    </div>
                    {log.metadata ? (
                      <SafeMetadataViewer data={log.metadata} />
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        No metadata.
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <EmptyState
              description={
                hasFilters
                  ? "No platform audit logs found for the selected filters."
                  : "Platform audit events will appear here after admin mutations or denied platform API attempts."
              }
              heading={hasFilters ? "No matching audit logs" : "No audit logs"}
              icon={<ClipboardList className="h-6 w-6" aria-hidden />}
            />
          )}
          {logs.length ? (
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
              <span>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} -{" "}
                {pagination.totalItems} logs
              </span>
              <div className="flex gap-2">
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((value) =>
                      Math.min(Math.max(pagination.totalPages, 1), value + 1),
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "rounded-full border border-[var(--brand-mid)] bg-[var(--brand-light)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)]"
          : "rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)]"
      }
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ActionPill({ action }: { action: string }) {
  const actionInfo = ACTION_BY_VALUE.get(action);
  const isDenied = actionInfo?.group === "denied";
  const isMutation = actionInfo?.group === "mutation";

  return (
    <span
      className={
        isDenied
          ? "inline-flex max-w-full items-center gap-1 rounded bg-[var(--danger-bg)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--danger-text)]"
          : isMutation
            ? "inline-flex max-w-full items-center gap-1 rounded bg-[var(--brand-light)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--brand-dark)]"
            : "inline-flex max-w-full items-center gap-1 rounded bg-[var(--bg-surface2)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text-secondary)]"
      }
      title={action}
    >
      {isDenied ? <ShieldAlert className="h-3 w-3" aria-hidden /> : null}
      {isMutation ? <ClipboardList className="h-3 w-3" aria-hidden /> : null}
      <span className="truncate">{actionInfo?.label ?? action}</span>
      {isDenied ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getActionDescription(action: string) {
  return ACTION_BY_VALUE.get(action)?.description ?? "Audit event";
}

function formatActor(log: PlatformAuditLog) {
  if (log.actorType === "SYSTEM") {
    return "System";
  }

  if (log.actorType === "API_KEY") {
    return "API key";
  }

  return log.actorName ?? log.actorEmail ?? log.actorUserId ?? "User";
}

function parsePositivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parsePreset(value: string | null): ActionPreset {
  if (value === "mutations" || value === "denied") return value;
  return "all";
}
