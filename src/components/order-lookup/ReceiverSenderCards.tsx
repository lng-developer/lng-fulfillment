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
    <section className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        {title}
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
    </section>
  );
}
