"use client";

import {
  AlertTriangle,
  PackageSearch,
  Radio,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { getErrorMessage } from "@/lib/api/base";
import { lookupYunOrder } from "@/lib/api/order-lookup";
import type { LookupState, YunLookupResponse } from "@/types/order-lookup";
import { display } from "./format";
import { LookupSummaryCard } from "./LookupSummaryCard";
import { ContactCard } from "./ReceiverSenderCards";
import { SearchCard } from "./SearchCard";
import { YunLabelCard } from "./YunLabelCard";
import { YunOrderCard } from "./YunOrderCard";

export default function OrderLookupPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });

  async function handleSearch() {
    if (!query.trim()) {
      return;
    }

    setState({ status: "loading" });
    try {
      const data = await lookupYunOrder(query);
      setState({
        status: data.getOrder.found ? "success" : "not_found",
        data,
      });
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-[var(--text-primary)]">
            Tra cứu vận đơn
          </h1>
          <p className="mt-1 max-w-[560px] text-[13px] leading-6 text-[var(--text-secondary)]">
            {/* Kiểm tra dữ liệu vận đơn trực tiếp trên YunExpress OMS, độc lập với
            dữ liệu đang lưu trong Fulfillment Platform. */}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--brand-mid)] bg-[var(--brand-light)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand-dark)]">
          <Radio className="h-3 w-3" aria-hidden />
          OMS Direct Lookup
        </span>
      </div>

      <SearchCard
        isLoading={state.status === "loading"}
        onChange={setQuery}
        onSearch={handleSearch}
        query={query}
      />

      <LookupResults onRetry={handleSearch} state={state} />
    </div>
  );
}

function LookupResults({
  onRetry,
  state,
}: {
  onRetry: () => void;
  state: LookupState;
}) {
  switch (state.status) {
    case "idle":
      return (
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] py-16 text-[var(--text-muted)] shadow-soft">
          <PackageSearch className="mb-3 h-10 w-10 opacity-50" aria-hidden />
          <p className="text-[13px]">Nhập mã đơn để tra cứu trực tiếp.</p>
        </div>
      );

    case "loading":
      return <LookupSkeleton />;

    case "error":
      return (
        <div className="flex items-start gap-3 rounded border border-red-200 bg-[var(--danger-bg)] p-5">
          <XCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]"
            aria-hidden
          />
          <div>
            <div className="mb-1 text-sm font-semibold text-[var(--danger-text)]">
              Lỗi khi tra cứu
            </div>
            <p className="mb-3 text-xs text-[var(--danger-text)]">
              {state.message}
            </p>
            <button
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)]"
              onClick={onRetry}
              type="button"
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              Thử lại
            </button>
          </div>
        </div>
      );

    case "not_found":
      return (
        <div className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden
          />
          <div>
            <div className="mb-3 text-sm font-semibold text-amber-800">
              YunExpress chưa trả về thông tin đơn
            </div>
            <div className="grid gap-2 text-xs md:grid-cols-3">
              <NotFoundInfo
                label="Mã đã tra cứu"
                value={state.data.searchCode}
              />
              <NotFoundInfo label="Code" value={state.data.getOrder.code} />
              <NotFoundInfo
                label="Message"
                value={state.data.getOrder.message}
              />
            </div>
          </div>
        </div>
      );

    case "success":
      return <LookupSuccess data={state.data} />;
  }
}

function LookupSuccess({ data }: { data: YunLookupResponse }) {
  const item = data.getOrder.item;

  return (
    <div className="grid gap-4">
      <LookupSummaryCard data={data} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <YunOrderCard item={item} />
        <YunLabelCard data={data} />
      </div>

      {item?.Receiver || item?.Sender ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {item?.Receiver ? (
            <ContactCard contact={item.Receiver} title="Receiver" />
          ) : null}
          {item?.Sender ? (
            <ContactCard contact={item.Sender} title="Sender" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function LookupSkeleton() {
  return (
    <div className="grid gap-4 animate-pulse" aria-label="Loading results...">
      <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="mb-4 h-4 w-32 rounded bg-[var(--border)]" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="grid gap-1.5" key={index}>
              <div className="h-2.5 w-24 rounded bg-[var(--border)]" />
              <div className="h-4 w-32 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            className="grid gap-3 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5"
            key={item}
          >
            <div className="h-4 w-28 rounded bg-[var(--border)]" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex justify-between" key={index}>
                <div className="h-3 w-28 rounded bg-[var(--border)]" />
                <div className="h-3 w-32 rounded bg-[var(--border)]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFoundInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-amber-200 bg-white/60 px-3 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-700">
        {label}
      </div>
      <div className="truncate text-xs text-amber-950" title={display(value)}>
        {display(value)}
      </div>
    </div>
  );
}
