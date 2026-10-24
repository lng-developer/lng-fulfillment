import { ExternalLink } from "lucide-react";
import { getLabelRedirectUrl } from "@/lib/api/order-lookup";
import type { YunLookupResponse } from "@/types/order-lookup";
import { display } from "./format";

export function YunLabelCard({ data }: { data: YunLookupResponse }) {
  const rows = [
    { label: "Mã dùng để lấy nhãn", value: data.labelCode },
    { label: "Code", value: data.label?.code },
    { label: "Message", value: data.label?.message },
    { label: "Label type", value: data.label?.labelType },
    { label: "Có URL nhãn", value: data.label?.hasUrl ? "Có" : "Không" },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">
        Nhãn YunExpress
      </h2>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            className="flex items-center justify-between gap-3 py-2 text-xs"
            key={row.label}
          >
            <span className="shrink-0 text-slate-500 font-medium">
              {row.label}
            </span>
            <span className="truncate text-right font-medium text-slate-800">
              {display(row.value)}
            </span>
          </div>
        ))}
      </div>

      {data.label?.hasUrl && data.labelCode ? (
        <a
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          href={getLabelRedirectUrl(data.labelCode)}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Mở nhãn PDF
        </a>
      ) : (
        <span className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
          Chưa có nhãn
        </span>
      )}
    </section>
  );
}
