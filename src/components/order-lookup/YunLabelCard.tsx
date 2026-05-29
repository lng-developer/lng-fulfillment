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
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        Nhãn YunExpress
      </h2>
      <div>
        {rows.map((row) => (
          <div
            className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 text-[11px] last:border-b-0"
            key={row.label}
          >
            <span className="shrink-0 text-[var(--text-secondary)]">
              {row.label}
            </span>
            <span className="truncate text-right text-[var(--text-primary)]">
              {display(row.value)}
            </span>
          </div>
        ))}
      </div>

      {data.label?.hasUrl && data.labelCode ? (
        <a
          className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-[var(--brand)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--brand-dark)]"
          href={getLabelRedirectUrl(data.labelCode)}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Mở nhãn
        </a>
      ) : (
        <span className="badge b-am mt-3 inline-flex">Chưa có nhãn</span>
      )}
    </section>
  );
}
