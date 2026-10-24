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
    <div className="mx-auto grid max-w-[1100px] gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tra cứu vận đơn
          </h1>
          <p className="mt-1 max-w-[560px] text-xs leading-5 text-slate-500">
            Tra cứu trực tiếp dữ liệu vận đơn trên hệ thống YunExpress OMS theo thời gian thực.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Radio className="h-3.5 w-3.5" aria-hidden />
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-slate-400 shadow-sm">
          <PackageSearch className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-xs font-medium text-slate-500">
            Nhập mã đơn, waybill hoặc tracking để tra cứu thông tin vận chuyển.
          </p>
        </div>
      );

    case "loading":
      return <LookupSkeleton />;

    case "error":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <XCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
            aria-hidden
          />
          <div>
            <div className="mb-1 text-xs font-semibold text-rose-800">
              Lỗi khi tra cứu
            </div>
            <p className="mb-3 text-xs text-rose-700">
              {state.message}
            </p>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
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
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden
          />
          <div>
            <div className="mb-3 text-xs font-semibold text-amber-800">
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
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-4 w-32 rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="grid gap-1.5" key={index}>
              <div className="h-2.5 w-24 rounded bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={item}
          >
            <div className="h-4 w-28 rounded bg-slate-200" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex justify-between" key={index}>
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-200" />
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
    <div className="rounded border border-amber-200 bg-white/70 px-3 py-2">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
        {label}
      </div>
      <div className="truncate text-xs font-medium text-amber-950" title={display(value)}>
        {display(value)}
      </div>
    </div>
  );
}
