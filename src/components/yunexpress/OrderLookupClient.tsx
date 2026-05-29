"use client";

import { AlertTriangle, ExternalLink, Loader2, PackageSearch, Search } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type LookupResponse = ApiSuccess<{ lookup: YunLookupResult }> | ApiFailure;

type YunLookupResult = {
  searchedOrderNumber: string;
  labelLookupNumber: string | null;
  getOrder: {
    code: string | null;
    message: string | null;
    found: boolean;
    item: Record<string, unknown> | null;
    raw: Record<string, unknown>;
  };
  labelPrint: {
    attempted: boolean;
    lookupNumber: string | null;
    code: string | null;
    message: string | null;
    labelType: string | null;
    labelUrl: string | null;
    hasLabelUrl: boolean;
    orderInfos: Array<Record<string, unknown>>;
    raw: Record<string, unknown> | null;
    error: string | null;
  };
};

export function OrderLookupClient() {
  const [input, setInput] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const [lookup, setLookup] = useState<YunLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedInput = input.trim();
  const item = lookup?.getOrder.item ?? null;
  const receiver = useMemo(() => readObject(item?.Receiver), [item]);
  const sender = useMemo(() => readObject(item?.Sender), [item]);
  const parcels = useMemo(() => readArray(item?.Parcels), [item]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedInput || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setLookup(null);
    setSearchedCode(trimmedInput);

    try {
      const response = await fetch(
        `/api/yunexpress-oms/order-lookup?orderNumber=${encodeURIComponent(
          trimmedInput,
        )}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as LookupResponse;

      if (!payload.success) {
        setError(payload.error.message);
        return;
      }

      setLookup(payload.data.lookup);
    } catch {
      setError("Không thể tra cứu YunExpress OMS lúc này.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid max-w-6xl gap-5 text-[var(--text-primary)]">
        <header className="flex flex-col gap-3 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-soft md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--brand-mid)] bg-[var(--brand-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--brand)]">
              <PackageSearch className="h-3.5 w-3.5" aria-hidden />
              YunExpress OMS
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Tra cứu vận đơn YunExpress
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Tra cứu trực tiếp trên OMS bằng OrderNumber, WayBillNumber hoặc
              TrackingNumber. Trang này không đọc hoặc cập nhật dữ liệu
              Fulfillment.
            </p>
          </div>
          <a
            className="inline-flex h-9 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            href="/orders"
          >
            Về Orders
          </a>
        </header>

        <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
            <label className="grid flex-1 gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                OrderNumber, WayBillNumber hoặc TrackingNumber
              </span>
              <input
                className="h-10 rounded-sm border border-[var(--border-strong)] bg-white px-3 font-mono text-sm text-[var(--text-primary)]"
                onChange={(event) => setInput(event.target.value)}
                placeholder="VD: YTxxxxxxxx hoặc customer order number"
                value={input}
              />
            </label>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-4 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50 md:self-end"
              disabled={!trimmedInput || isLoading}
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Search className="h-4 w-4" aria-hidden />
              )}
              Tìm
            </button>
          </form>
        </section>

        {!searchedCode && !lookup && !error ? (
          <EmptyPanel message="Nhập mã YunExpress để tra cứu trực tiếp trên OMS." />
        ) : null}

        {error ? (
          <WarningPanel
            title="Không thể tra cứu"
            rows={[
              ["Mã đã tra cứu", searchedCode || "-"],
              ["Thông báo", error],
            ]}
          />
        ) : null}

        {lookup && !lookup.getOrder.found ? (
          <WarningPanel
            title="YunExpress chưa trả về thông tin đơn"
            rows={[
              ["Mã đã tra cứu", lookup.searchedOrderNumber],
              ["Mã phản hồi", lookup.getOrder.code ?? "-"],
              ["Thông báo", lookup.getOrder.message ?? "-"],
            ]}
          />
        ) : null}

        {lookup ? (
          <div className="grid gap-5">
            <LookupSummaryCard item={item} lookup={lookup} />
            <LabelCard lookup={lookup} />
            <JsonSections
              parcels={parcels}
              receiver={receiver}
              sender={sender}
            />
          </div>
        ) : null}
    </div>
  );
}

function LookupSummaryCard({
  item,
  lookup,
}: {
  item: Record<string, unknown> | null;
  lookup: YunLookupResult;
}) {
  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <SectionTitle title="Đơn YunExpress từ GetOrder" />
      <div className="grid gap-2 md:grid-cols-3">
        <Info label="Mã đã tra cứu" mono value={lookup.searchedOrderNumber} />
        <Info label="Mã phản hồi" mono value={lookup.getOrder.code ?? "-"} />
        <Info label="Thông báo" value={lookup.getOrder.message ?? "-"} />
        <Info label="OrderNumber" mono value={readText(item?.OrderNumber)} />
        <Info
          label="CustomerOrderNumber"
          mono
          value={readText(item?.CustomerOrderNumber)}
        />
        <Info label="WayBillNumber" mono value={readText(item?.WayBillNumber)} />
        <Info label="TrackingNumber" mono value={readText(item?.TrackingNumber)} />
        <Info
          label="ShippingMethodCode"
          mono
          value={readText(item?.ShippingMethodCode)}
        />
        <Info label="Trạng thái OMS" mono value={readText(item?.Status)} />
        <Info
          label="Số kiện"
          mono
          value={readText(item?.PackageNumber ?? item?.PackageCount)}
        />
        <Info label="Dài" mono value={readText(item?.Length)} />
        <Info label="Rộng" mono value={readText(item?.Width)} />
        <Info label="Cao" mono value={readText(item?.Height)} />
        <Info label="Nặng" mono value={readText(item?.Weight)} />
      </div>
    </section>
  );
}

function LabelCard({ lookup }: { lookup: YunLookupResult }) {
  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SectionTitle title="Nhãn YunExpress từ Label/Print" />
        {lookup.labelPrint.labelUrl ? (
          <a
            className="inline-flex h-8 items-center justify-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)]"
            href={lookup.labelPrint.labelUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Mở nhãn
          </a>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Info
          label="Mã dùng để lấy nhãn"
          mono
          value={lookup.labelPrint.lookupNumber ?? lookup.labelLookupNumber ?? "-"}
        />
        <Info label="Mã phản hồi" mono value={lookup.labelPrint.code ?? "-"} />
        <Info
          label="Thông báo hoặc lỗi"
          value={lookup.labelPrint.error ?? lookup.labelPrint.message ?? "-"}
        />
        <Info label="Loại nhãn" value={lookup.labelPrint.labelType ?? "-"} />
        <Info
          label="Có URL nhãn"
          value={lookup.labelPrint.hasLabelUrl ? "Có" : "Không"}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-sm border border-[var(--border)]">
        <div className="grid grid-cols-[1fr_100px_1.2fr] bg-[var(--bg-surface2)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
          <span>CustomerOrderNumber</span>
          <span>Code</span>
          <span>Thông báo / lỗi</span>
        </div>
        {lookup.labelPrint.orderInfos.length ? (
          lookup.labelPrint.orderInfos.map((row, index) => (
            <div
              className="grid grid-cols-[1fr_100px_1.2fr] border-t border-[var(--border)] px-3 py-2 text-xs"
              key={index}
            >
              <span className="truncate font-mono">
                {readText(row.CustomerOrderNumber)}
              </span>
              <span className="font-mono">{readText(row.Code)}</span>
              <span className="truncate text-[var(--text-secondary)]">
                {readText(row.Error)}
              </span>
            </div>
          ))
        ) : (
          <div className="border-t border-[var(--border)] px-3 py-3 text-xs text-[var(--text-muted)]">
            YunExpress chưa trả về OrderInfos.
          </div>
        )}
      </div>
    </section>
  );
}

function JsonSections({
  receiver,
  sender,
  parcels,
}: {
  receiver: Record<string, unknown> | null;
  sender: Record<string, unknown> | null;
  parcels: unknown[];
}) {
  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <SectionTitle title="Khối JSON từ YunExpress" />
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <JsonBlock title="Người nhận từ YunExpress" value={receiver ?? {}} />
        <JsonBlock title="Người gửi từ YunExpress" value={sender ?? {}} />
        <JsonBlock title="Parcels từ YunExpress" value={parcels} />
      </div>
    </section>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {title}
      </div>
      <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-[11px] leading-5 text-[var(--text-secondary)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function WarningPanel({
  rows,
  title,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {title}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {rows.map(([label, value]) => (
          <Info key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <section className="grid min-h-[220px] place-items-center rounded border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 text-center shadow-soft">
      <div>
        <PackageSearch className="mx-auto h-8 w-8 text-[var(--text-muted)]" aria-hidden />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold tracking-normal text-[var(--text-primary)]">
      {title}
    </h2>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`truncate text-xs text-[var(--text-primary)] ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function readText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function readObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}
