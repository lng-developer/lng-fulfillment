"use client";

import {
  AlertTriangle,
  ClipboardList,
  Copy,
  FilterX,
  InfoIcon,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SafeMetadataViewer } from "@/components/ui/SafeMetadataViewer";
import { getErrorMessage } from "@/lib/api/base";
import {
  getPlatformYunWebhookSetup,
  getPlatformYunWebhookEvent,
  getPlatformYunWebhookEvents,
  reprocessPlatformYunWebhookEvent,
} from "@/lib/api/platform";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  PlatformPagination,
  PlatformYunWebhookEvent,
  PlatformYunWebhookEventDetail,
  PlatformYunWebhookSetup,
  PlatformYunWebhookStats,
  YunWebhookEventCategory,
  YunWebhookEventStatus,
} from "@/types/platform";
import { usePlatformAuth } from "./PlatformAuthContext";

const PAGE_SIZE = 20;
const WEBHOOK_STATUSES: YunWebhookEventStatus[] = [
  "RECEIVED",
  "PROCESSED",
  "DUPLICATE",
  "FAILED",
  "UNMATCHED",
];
const WEBHOOK_CATEGORIES: YunWebhookEventCategory[] = [
  "TRACKING",
  "FEE",
  "ABNORMAL",
  "UNKNOWN",
];

export function PlatformYunWebhooksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canManage } = usePlatformAuth();
  const [events, setEvents] = useState<PlatformYunWebhookEvent[]>([]);
  const [setup, setSetup] = useState<PlatformYunWebhookSetup | null>(null);
  const [stats, setStats] = useState<PlatformYunWebhookStats>({
    total: 0,
    failed: 0,
    unmatched: 0,
    needsAttention: 0,
    processed: 0,
    tracking: 0,
    fee: 0,
    abnormal: 0,
  });
  const [pagination, setPagination] = useState<PlatformPagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(() =>
    parsePositivePage(searchParams.get("page")),
  );
  const [status, setStatus] = useState<YunWebhookEventStatus | "">(
    () => parseStatus(searchParams.get("status")),
  );
  const [attention, setAttention] = useState(
    () => searchParams.get("attention") === "true",
  );
  const [eventCategory, setEventCategory] = useState<
    YunWebhookEventCategory | ""
  >(() => parseCategory(searchParams.get("eventCategory")));
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [waybillNumber, setWaybillNumber] = useState(
    () => searchParams.get("waybillNumber") ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState(
    () => searchParams.get("trackingNumber") ?? "",
  );
  const [customerOrderNumber, setCustomerOrderNumber] = useState(
    () => searchParams.get("customerOrderNumber") ?? "",
  );
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformYunWebhookEventDetail | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (page > 1) query.set("page", String(page));
    if (attention) query.set("attention", "true");
    if (status) query.set("status", status);
    if (eventCategory) query.set("eventCategory", eventCategory);
    if (search.trim()) query.set("search", search.trim());
    if (waybillNumber.trim()) query.set("waybillNumber", waybillNumber.trim());
    if (trackingNumber.trim()) query.set("trackingNumber", trackingNumber.trim());
    if (customerOrderNumber.trim()) {
      query.set("customerOrderNumber", customerOrderNumber.trim());
    }
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const nextUrl = query.toString() ? `${pathname}?${query}` : pathname;
    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    attention,
    customerOrderNumber,
    eventCategory,
    from,
    page,
    pathname,
    router,
    search,
    searchParams,
    status,
    to,
    trackingNumber,
    waybillNumber,
  ]);

  const hasFilters =
    status ||
    attention ||
    eventCategory ||
    search.trim() ||
    waybillNumber.trim() ||
    trackingNumber.trim() ||
    customerOrderNumber.trim() ||
    from ||
    to;

  const attentionCount = stats.needsAttention;

  useEffect(() => {
    const controller = new AbortController();
    void getPlatformYunWebhookSetup({ signal: controller.signal })
      .then(setSetup)
      .catch((setupError) => {
        if (!isAbortError(setupError)) setSetup(null);
      });

    return () => controller.abort();
  }, []);

  const fetchEvents = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPlatformYunWebhookEvents(
        {
          page,
          pageSize: PAGE_SIZE,
          attention,
          status,
          eventCategory,
          search: search.trim(),
          waybillNumber: waybillNumber.trim(),
          trackingNumber: trackingNumber.trim(),
          customerOrderNumber: customerOrderNumber.trim(),
          from: from ? `${from}T00:00:00.000` : "",
          to: to ? `${to}T23:59:59.999` : "",
          sortOrder: "desc",
        },
        { signal },
      );
      setEvents(result.data);
      setPagination(result.pagination);
      setStats(result.stats);
      if (selectedId && !result.data.some((event) => event.id === selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      setEvents([]);
      setError(getErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [
    attention,
    customerOrderNumber,
    eventCategory,
    from,
    page,
    search,
    selectedId,
    status,
    to,
    trackingNumber,
    waybillNumber,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchEvents(controller.signal);
    return () => controller.abort();
  }, [fetchEvents]);

  const loadDetail = useCallback(async (eventId: string) => {
    setSelectedId(eventId);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const event = await getPlatformYunWebhookEvent(eventId);
      setDetail(event);
    } catch (detailFetchError) {
      setDetail(null);
      setDetailError(getErrorMessage(detailFetchError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function handleReprocess(eventId: string) {
    setReprocessingId(eventId);
    try {
      const event = await reprocessPlatformYunWebhookEvent(eventId);
      setDetail(event);
      toastSuccess("Webhook event reprocessed.");
      await fetchEvents();
    } catch (reprocessError) {
      toastError(getErrorMessage(reprocessError));
    } finally {
      setReprocessingId(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4">
        <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Webhook setup
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Register this receiver manually in Yuntu/YunExpress Console.
              </p>
            </div>
            <SetupStatusBadges setup={setup} />
          </div>
          <div className="grid gap-3 px-4 py-3">
            {setup ? (
              <>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                    Webhook URL
                  </div>
                  <div className="flex gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                      {setup.webhookUrl}
                    </code>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)]"
                      onClick={() => void copyToClipboard(setup.webhookUrl)}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copy
                    </button>
                  </div>
                </div>
                {setup.warnings.length ? (
                  <div className="grid gap-1 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {setup.warnings.map((warning) => (
                      <div className="flex gap-2" key={warning}>
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <InfoIcon className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
                      Yuntu Console checklist
                    </div>
                    <ol className="grid gap-1.5 text-xs text-[var(--text-secondary)]">
                      {setup.checklist.map((item, index) => (
                        <li className="flex gap-2" key={item}>
                          <span className="font-mono text-[var(--text-muted)]">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
                      Expected request shape
                    </div>
                    <div className="grid gap-2 text-xs text-[var(--text-secondary)]">
                      <InfoRow label="Mode" value="Manual registration" />
                      <InfoRow label="Path" value={setup.receiverPath} mono />
                      <InfoRow label="Headers" value={setup.requiredHeaders.join(", ")} />
                      <InfoRow label="Body" value='{ "encrypt": "BASE64_ENCRYPTED_PAYLOAD" }' mono />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <LoadingSkeleton rows={3} />
            )}
          </div>
        </section>

        <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Webhook inbox
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Review received YunExpress tracking, fee, and abnormal events.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {attentionCount ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  {attentionCount} need attention
                </span>
              ) : null}
              <button
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasFilters}
                onClick={() => {
                  setAttention(false);
                  setStatus("");
                  setEventCategory("");
                  setSearch("");
                  setWaybillNumber("");
                  setTrackingNumber("");
                  setCustomerOrderNumber("");
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
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] px-4 py-3 md:grid-cols-4 xl:grid-cols-7">
            <StatButton
              active={!attention && !status && !eventCategory}
              label="Total"
              onClick={() => {
                setAttention(false);
                setStatus("");
                setEventCategory("");
                setPage(1);
              }}
              value={stats.total}
            />
            <StatButton
              active={attention}
              label="Needs attention"
              onClick={() => {
                setAttention(true);
                setStatus("");
                setEventCategory("");
                setPage(1);
              }}
              tone="warning"
              value={stats.needsAttention}
            />
            <StatButton
              active={status === "FAILED"}
              label="Failed"
              onClick={() => {
                setAttention(false);
                setStatus("FAILED");
                setEventCategory("");
                setPage(1);
              }}
              tone="danger"
              value={stats.failed}
            />
            <StatButton
              active={status === "UNMATCHED"}
              label="Unmatched"
              onClick={() => {
                setAttention(false);
                setStatus("UNMATCHED");
                setEventCategory("");
                setPage(1);
              }}
              tone="warning"
              value={stats.unmatched}
            />
            <StatButton
              active={eventCategory === "TRACKING"}
              label="Tracking"
              onClick={() => {
                setAttention(false);
                setStatus("");
                setEventCategory("TRACKING");
                setPage(1);
              }}
              value={stats.tracking}
            />
            <StatButton
              active={eventCategory === "FEE"}
              label="Fee"
              onClick={() => {
                setAttention(false);
                setStatus("");
                setEventCategory("FEE");
                setPage(1);
              }}
              value={stats.fee}
            />
            <StatButton
              active={eventCategory === "ABNORMAL"}
              label="Abnormal"
              onClick={() => {
                setAttention(false);
                setStatus("");
                setEventCategory("ABNORMAL");
                setPage(1);
              }}
              value={stats.abnormal}
            />
          </div>

          <div className="grid gap-3 px-4 py-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                Status
                <select
                  className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                  onChange={(event) => {
                    setAttention(false);
                    setStatus(parseStatus(event.target.value));
                    setPage(1);
                  }}
                  value={status}
                >
                  <option value="">Any status</option>
                  {WEBHOOK_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                Category
                <select
                  className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                  onChange={(event) => {
                    setAttention(false);
                    setEventCategory(parseCategory(event.target.value));
                    setPage(1);
                  }}
                  value={eventCategory}
                >
                  <option value="">Any category</option>
                  {WEBHOOK_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)] md:col-span-2">
                Search
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    className="h-9 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-8 pr-3 font-mono text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
                    onChange={(event) => {
                      setAttention(false);
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="event id, order, waybill, tracking"
                    value={search}
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <TextFilter
                label="Waybill"
                onChange={(value) => {
                  setAttention(false);
                  setWaybillNumber(value);
                  setPage(1);
                }}
                value={waybillNumber}
              />
              <TextFilter
                label="Tracking"
                onChange={(value) => {
                  setAttention(false);
                  setTrackingNumber(value);
                  setPage(1);
                }}
                value={trackingNumber}
              />
              <TextFilter
                label="Customer order"
                onChange={(value) => {
                  setAttention(false);
                  setCustomerOrderNumber(value);
                  setPage(1);
                }}
                value={customerOrderNumber}
              />
              <DateFilter label="From" onChange={setFromAndReset} value={from} />
              <DateFilter label="To" onChange={setToAndReset} value={to} />
            </div>
          </div>
        </section>

        {isLoading ? <LoadingSkeleton rows={8} /> : null}
        {!isLoading && error ? (
          <ErrorState message={error} retry={fetchEvents} />
        ) : null}
        {!isLoading && !error ? (
          <section className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
            {events.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] bg-[var(--bg-surface2)] text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Received</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Category</th>
                      <th className="px-3 py-2.5 font-semibold">Order</th>
                      <th className="px-3 py-2.5 font-semibold">Waybill</th>
                      <th className="px-3 py-2.5 font-semibold">Tracking</th>
                      <th className="px-3 py-2.5 font-semibold">Shipment</th>
                      <th className="px-3 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {events.map((event) => (
                      <tr
                        className={
                          selectedId === event.id
                            ? "bg-[var(--brand-light)]"
                            : "hover:bg-[var(--bg-surface2)]"
                        }
                        key={event.id}
                      >
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">
                          {formatDate(event.receivedAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill status={event.status} />
                        </td>
                        <td className="px-3 py-2.5">
                          <CategoryPill category={event.eventCategory} />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)]">
                          {event.customerOrderNumber ?? event.shipmentOrderNumber ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">
                          {event.waybillNumber ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">
                          {event.trackingNumber ?? "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          {event.shipmentId ? (
                            <span className="font-mono text-[11px] text-[var(--brand)]">
                              {event.shipmentId}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            className="inline-flex h-7 items-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)]"
                            onClick={() => void loadDetail(event.id)}
                            type="button"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                description={
                  hasFilters
                    ? "No YunExpress webhook events match the selected filters."
                    : "YunExpress webhook events will appear here after the receiver accepts carrier events."
                }
                heading={hasFilters ? "No matching webhook events" : "No webhook events"}
                icon={<ClipboardList className="h-6 w-6" aria-hidden />}
              />
            )}
            {events.length ? (
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
                <span>
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)} -{" "}
                  {pagination.totalItems} events
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

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <DetailPanel
          canManage={canManage}
          detail={detail}
          detailError={detailError}
          isLoading={detailLoading}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
            setDetailError(null);
          }}
          onReprocess={handleReprocess}
          reprocessing={reprocessingId === detail?.id}
        />
      </aside>
    </div>
  );

  function setFromAndReset(value: string) {
    setAttention(false);
    setFrom(value);
    setPage(1);
  }

  function setToAndReset(value: string) {
    setAttention(false);
    setTo(value);
    setPage(1);
  }
}

function DetailPanel({
  canManage,
  detail,
  detailError,
  isLoading,
  onClose,
  onReprocess,
  reprocessing,
}: {
  canManage: boolean;
  detail: PlatformYunWebhookEventDetail | null;
  detailError: string | null;
  isLoading: boolean;
  onClose: () => void;
  onReprocess: (eventId: string) => Promise<void>;
  reprocessing: boolean;
}) {
  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Event detail
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Sanitized webhook payload and processing metadata.
          </p>
        </div>
        {detail || detailError ? (
          <button
            aria-label="Close detail"
            className="grid h-7 w-7 place-items-center rounded-xs border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 p-4">
        {isLoading ? <LoadingSkeleton rows={5} /> : null}
        {!isLoading && detailError ? (
          <p className="rounded-sm border border-red-200 bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
            {detailError}
          </p>
        ) : null}
        {!isLoading && !detail && !detailError ? (
          <p className="text-xs text-[var(--text-muted)]">
            Select a webhook event to inspect its safe payload.
          </p>
        ) : null}
        {!isLoading && detail ? (
          <>
            <div className="grid gap-2 text-xs">
              <Info label="Status" value={formatStatus(detail.status)} />
              <Info label="Category" value={formatStatus(detail.eventCategory)} />
              <Info label="Event ID" value={detail.eventId ?? "-"} mono />
              <Info label="Type" value={detail.eventType ?? "-"} />
              <Info label="Signature" value={detail.signatureHeaderMasked ?? "-"} mono />
              <Info label="Tenant" value={detail.tenantSlug ?? detail.tenantId ?? "-"} />
              <Info label="Shipment" value={detail.shipmentId ?? "-"} mono />
              <Info label="Shipment Cost" value={detail.shipmentCostId ?? "-"} mono />
              {detail.errorMessage ? (
                <Info label="Error" value={detail.errorMessage} />
              ) : null}
            </div>

            {canManage && detail.canReprocess ? (
              <button
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xs border border-[var(--brand-mid)] bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={reprocessing}
                onClick={() => void onReprocess(detail.id)}
                type="button"
              >
                {reprocessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                )}
                Reprocess
              </button>
            ) : null}

            {detail.safeMetadata ? (
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
                  Safe metadata
                </h3>
                <SafeMetadataViewer data={detail.safeMetadata} />
              </div>
            ) : null}

            {detail.decryptedPayload ? (
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
                  Decrypted payload
                </h3>
                <div className="max-h-[420px] overflow-auto">
                  <SafeMetadataViewer data={detail.decryptedPayload} />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function TextFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
      {label}
      <input
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function DateFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
      {label}
      <input
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function SetupStatusBadges({ setup }: { setup: PlatformYunWebhookSetup | null }) {
  if (!setup) {
    return (
      <span className="inline-flex h-8 items-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-muted)]">
        Loading setup...
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex h-8 items-center rounded-xs border px-3 text-xs font-semibold ${
          setup.enabled
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-[var(--danger-bg)] text-[var(--danger-text)]"
        }`}
      >
        Receiver {setup.enabled ? "enabled" : "disabled"}
      </span>
      <span
        className={`inline-flex h-8 items-center rounded-xs border px-3 text-xs font-semibold ${
          setup.encryptionKeyConfigured
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        Encrypt key {setup.encryptionKeyConfigured ? "configured" : "missing"}
      </span>
    </div>
  );
}

function StatButton({
  active,
  label,
  onClick,
  tone = "default",
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "warning" | "danger";
  value: number;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--danger-text)]"
      : tone === "warning"
        ? "text-amber-800"
        : "text-[var(--text-primary)]";

  return (
    <button
      className={`rounded-sm border px-3 py-2 text-left transition-colors ${
        active
          ? "border-[var(--brand-mid)] bg-[var(--brand-light)]"
          : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--brand-mid)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </button>
  );
}

function InfoRow({
  label,
  mono,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className={`break-all text-xs text-[var(--text-primary)] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toastSuccess("Webhook URL copied.");
  } catch {
    toastError("Could not copy webhook URL.");
  }
}

function StatusPill({ status }: { status: YunWebhookEventStatus }) {
  const className =
    status === "PROCESSED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "FAILED"
        ? "bg-[var(--danger-bg)] text-[var(--danger-text)] border-red-200"
        : status === "UNMATCHED"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-[var(--bg-surface2)] text-[var(--text-secondary)] border-[var(--border)]";

  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {formatStatus(status)}
    </span>
  );
}

function CategoryPill({ category }: { category: YunWebhookEventCategory }) {
  return (
    <span className="inline-flex rounded border border-[var(--brand-mid)] bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-dark)]">
      {formatStatus(category)}
    </span>
  );
}

function Info({
  label,
  mono,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 break-all text-xs text-[var(--text-primary)] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function parsePositivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | null): YunWebhookEventStatus | "" {
  return WEBHOOK_STATUSES.includes(value as YunWebhookEventStatus)
    ? (value as YunWebhookEventStatus)
    : "";
}

function parseCategory(value: string | null): YunWebhookEventCategory | "" {
  return WEBHOOK_CATEGORIES.includes(value as YunWebhookEventCategory)
    ? (value as YunWebhookEventCategory)
    : "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
