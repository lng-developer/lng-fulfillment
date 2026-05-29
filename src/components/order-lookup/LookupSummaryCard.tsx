"use client";

import { Copy } from "lucide-react";
import type { YunLookupResponse } from "@/types/order-lookup";
import { copyValue, display } from "./format";

export function LookupSummaryCard({ data }: { data: YunLookupResponse }) {
  const rows = [
    { label: "Mã đã tra cứu", value: data.searchCode, mono: true, copy: true },
    { label: "Mã lấy nhãn", value: data.labelCode, mono: true, copy: true },
    { label: "GetOrder code", value: data.getOrder.code },
    { label: "GetOrder message", value: data.getOrder.message },
    {
      label: "Tìm thấy đơn",
      node: data.getOrder.found ? (
        <span className="badge b-em">Có</span>
      ) : (
        <span className="badge b-am">Không</span>
      ),
    },
    { label: "Label attempted", value: data.label?.attempted ? "Yes" : "No" },
    {
      label: "Có label URL",
      node: data.label?.hasUrl ? (
        <span className="badge b-em">Có</span>
      ) : (
        <span className="text-[11px] text-[var(--text-muted)]">-</span>
      ),
    },
  ];

  return (
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Kết quả tra cứu
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              {row.label}
            </div>
            {"node" in row ? (
              row.node
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`truncate text-xs text-[var(--text-primary)] ${
                    row.mono ? "font-mono text-[var(--brand)]" : ""
                  }`}
                  title={display(row.value)}
                >
                  {display(row.value)}
                </span>
                {row.copy && row.value ? <CopyButton value={row.value} /> : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function CopyButton({ value }: { value: string }) {
  return (
    <button
      aria-label="Copy value"
      className="rounded-xs border border-transparent p-0.5 text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--brand)]"
      onClick={() => void copyValue(value)}
      type="button"
    >
      <Copy className="h-3 w-3" aria-hidden />
    </button>
  );
}
