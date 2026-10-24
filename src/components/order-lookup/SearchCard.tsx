"use client";

import { Loader2, Search, X } from "lucide-react";

export function SearchCard({
  isLoading,
  onChange,
  onSearch,
  query,
}: {
  isLoading: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  query: string;
}) {
  const trimmed = query.trim();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <label
        className="mb-2 block text-xs font-semibold text-slate-700"
        htmlFor="yun-lookup-code"
      >
        Mã tra cứu
      </label>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <input
            autoComplete="off"
            autoFocus
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 pr-9 font-mono text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            id="yun-lookup-code"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && trimmed && !isLoading) {
                onSearch();
              }
              if (event.key === "Escape") {
                onChange("");
              }
            }}
            placeholder="Nhập OrderNumber, WayBillNumber hoặc TrackingNumber"
            spellCheck={false}
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => onChange("")}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          disabled={!trimmed || isLoading}
          onClick={onSearch}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Đang tra cứu...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" aria-hidden />
              Tìm kiếm
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Có thể dùng mã đơn Portal, mã đơn Yun, waybill hoặc tracking number.
      </p>
    </section>
  );
}
