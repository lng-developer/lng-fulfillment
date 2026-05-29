"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SafeMetadataViewer } from "@/components/ui/SafeMetadataViewer";
import { getAuditLogs } from "@/lib/api/audit-logs";
import { getErrorMessage } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types/settings";

const ACTION_OPTIONS = [
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "MEMBER_ROLE_UPDATED",
  "MEMBER_STATUS_UPDATED",
  "CARRIER_ACCOUNT_CREATED",
  "CARRIER_ACCOUNT_UPDATED",
  "CARRIER_ACCOUNT_DISABLED",
  "CREDENTIAL_CREATED",
  "CREDENTIAL_UPDATED",
  "CREDENTIAL_DISABLED",
  "SHIPMENT_DRAFT_CREATED",
  "SHIPMENT_EXECUTED",
  "SHIPMENT_EXECUTION_FAILED",
  "TRACKING_SYNCED",
];

const ACTOR_TYPES = ["USER", "API_KEY", "SYSTEM"];
const RESOURCE_TYPES = [
  "API_KEY",
  "MEMBERSHIP",
  "CARRIER_ACCOUNT",
  "CREDENTIAL",
  "SHIPMENT",
];

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: "",
    actorType: "",
    resourceType: "",
    from: "",
    to: "",
    search: "",
  });
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogs() {
      setState("loading");
      setLoadError(null);

      try {
        const response = await getAuditLogs(
          {
            page: pagination.page,
            pageSize: pagination.pageSize,
            action: filters.action || undefined,
            actorType: filters.actorType || undefined,
            resourceType: filters.resourceType || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
          controller.signal,
        );
        setLogs(response.data);
        setPagination((current) => ({
          ...current,
          page: response.pagination.page,
          pageSize: response.pagination.pageSize,
          totalItems: response.pagination.totalItems,
          totalPages: response.pagination.totalPages,
        }));
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
          setState("error");
        }
      }
    }

    loadLogs();

    return () => controller.abort();
  }, [
    filters.action,
    filters.actorType,
    filters.from,
    filters.resourceType,
    filters.to,
    pagination.page,
    pagination.pageSize,
  ]);

  const visibleLogs = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    if (!query) {
      return logs;
    }

    return logs.filter((log) =>
      [
        log.action,
        log.actorName,
        log.actorEmail,
        log.actorKeyPrefix,
        log.actorUserId,
        log.resourceType,
        log.resourceId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [filters.search, logs]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  if (state === "loading") {
    return <LoadingSkeleton rows={8} />;
  }

  if (state === "error") {
    return (
      <ErrorState
        message={loadError ?? "Audit logs could not be loaded."}
        retry={() =>
          setPagination((current) => ({ ...current, page: current.page }))
        }
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Audit Logs</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review tenant-scoped administrative and shipment events.
        </p>
      </div>

      <div className="grid gap-3 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft lg:grid-cols-[1fr_1fr_1fr_150px_150px_1.3fr]">
        <FilterSelect
          label="Action"
          onChange={(value) => updateFilter("action", value)}
          options={ACTION_OPTIONS}
          value={filters.action}
        />
        <FilterSelect
          label="Actor Type"
          onChange={(value) => updateFilter("actorType", value)}
          options={ACTOR_TYPES}
          value={filters.actorType}
        />
        <FilterSelect
          label="Resource Type"
          onChange={(value) => updateFilter("resourceType", value)}
          options={RESOURCE_TYPES}
          value={filters.resourceType}
        />
        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          From
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case text-[var(--text-secondary)]"
            onChange={(event) => updateFilter("from", event.target.value)}
            type="date"
            value={filters.from}
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          To
          <input
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case text-[var(--text-secondary)]"
            onChange={(event) => updateFilter("to", event.target.value)}
            type="date"
            value={filters.to}
          />
        </label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
          Search
          <span className="flex h-9 items-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3">
            <Search className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
            <input
              className="ml-2 min-w-0 flex-1 bg-transparent text-xs font-normal normal-case text-[var(--text-secondary)] outline-none"
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search current page"
              value={filters.search}
            />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-surface2)]">
              <tr>
                {[
                  "Timestamp",
                  "Action",
                  "Actor",
                  "Resource",
                  "ID",
                  "",
                ].map((header) => (
                  <th
                    className="h-11 border-b border-[var(--border)] px-3.5 py-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]"
                    key={header}
                    scope="col"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
              {visibleLogs.length ? (
                visibleLogs.map((log) => (
                  <AuditLogRows
                    expanded={expandedId === log.id}
                    key={log.id}
                    log={log}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === log.id ? null : log.id,
                      )
                    }
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      description="No audit logs found for the selected filters."
                      heading="No audit logs"
                      icon={
                        <Search className="h-6 w-6" aria-hidden />
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-[11px] text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing page {pagination.totalPages ? pagination.page : 0} of{" "}
            {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
              type="button"
            >
              Prev
            </button>
            <button
              className="h-8 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                pagination.totalPages === 0 ||
                pagination.page >= pagination.totalPages
              }
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.min(current.totalPages, current.page + 1),
                }))
              }
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
      {label}
      <select
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case text-[var(--text-secondary)] hover:border-[var(--brand-mid)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AuditLogRows({
  expanded,
  log,
  onToggle,
}: {
  expanded: boolean;
  log: AuditLog;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="h-11 text-xs text-[var(--text-secondary)] hover:bg-[var(--brand-light)]">
        <td className="px-4">
          <time dateTime={log.createdAt} title={new Date(log.createdAt).toLocaleString()}>
            {relativeDate(log.createdAt)}
          </time>
        </td>
        <td className="px-3.5">
          <span className={cn("rounded-xs px-2 py-0.5 font-mono text-[10px]", actionPillClass(log.action))}>
            {log.action}
          </span>
        </td>
        <td className="px-4">
          {actorLabel(log)}{" "}
          <span className="text-[10px] text-[var(--text-muted)]">({log.actorType})</span>
        </td>
        <td className="px-4 text-[var(--text-secondary)]">{log.resourceType}</td>
        <td className="px-4">
          <span className="block max-w-[180px] truncate font-mono text-[10px] text-[var(--text-secondary)]">
            {log.resourceId}
          </span>
        </td>
        <td className="px-4 text-right">
          <button
            aria-expanded={expanded}
            className={cn(
              "inline-flex h-[26px] w-[26px] items-center justify-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] hover:text-[var(--brand)]",
              expanded ? "bg-[var(--brand-light)] text-[var(--brand)]" : undefined,
            )}
            onClick={onToggle}
            type="button"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">Toggle metadata</span>
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td className="bg-[var(--bg-surface2)] px-4 py-4" colSpan={6}>
            <SafeMetadataViewer data={log.metadata ?? {}} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function actorLabel(log: AuditLog) {
  if (log.actorType === "SYSTEM") {
    return "system";
  }

  if (log.actorType === "API_KEY") {
    return log.actorKeyPrefix ?? "api key";
  }

  return log.actorName ?? log.actorEmail ?? log.actorUserId ?? "user";
}

function actionPillClass(action: string) {
  if (action.startsWith("SHIPMENT_") || action.startsWith("TRACKING_")) {
    return "bg-[var(--brand-light)] text-[var(--brand-dark)]";
  }

  if (action.startsWith("API_KEY_") || action.startsWith("CREDENTIAL_")) {
    return "bg-[var(--warning-bg)] text-[var(--warning-text)]";
  }

  return "bg-[var(--success-bg)] text-[var(--success-text)]";
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

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
