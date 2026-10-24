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
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
          Có
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
          Không
        </span>
      ),
    },
    { label: "Label attempted", value: data.label?.attempted ? "Yes" : "No" },
    {
      label: "Có label URL",
      node: data.label?.hasUrl ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
          Có
        </span>
      ) : (
        <span className="text-xs text-slate-400">-</span>
      ),
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">
        Kết quả tra cứu
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
        {rows.map((row) => (
          <div className="min-w-0" key={row.label}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {row.label}
            </div>
            {"node" in row ? (
              row.node
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`truncate text-xs ${
                    row.mono ? "font-mono font-medium text-indigo-600" : "text-slate-800"
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
      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      onClick={() => void copyValue(value)}
      type="button"
    >
      <Copy className="h-3 w-3" aria-hidden />
    </button>
  );
}
