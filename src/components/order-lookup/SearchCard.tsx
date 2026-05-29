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
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-soft">
      <label
        className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]"
        htmlFor="yun-lookup-code"
      >
        Mã tra cứu
      </label>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <input
            autoComplete="off"
            autoFocus
            className="h-10 w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 pr-9 font-mono text-[13px] text-[var(--text-primary)] transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/15"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              onClick={() => onChange("")}
              type="button"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-5 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!trimmed || isLoading}
          onClick={onSearch}
          type="button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Đang tra cứu...
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" aria-hidden />
              Tìm kiếm
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        Có thể dùng mã đơn Portal, mã đơn Yun, waybill hoặc tracking number.
      </p>
    </section>
  );
}
