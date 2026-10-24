import type { YunContact } from "@/types/order-lookup";
import { contactRows, display } from "./format";

export function ContactCard({
  contact,
  title,
}: {
  contact: YunContact;
  title: "Receiver" | "Sender";
}) {
  const rows = contactRows(contact);

  if (!rows.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">
        {title}
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
    </section>
  );
}
