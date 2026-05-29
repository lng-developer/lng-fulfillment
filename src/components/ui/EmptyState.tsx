import type { ReactNode } from "react";

export function EmptyState({
  icon,
  heading,
  description,
  cta,
}: {
  icon: ReactNode;
  heading: string;
  description: string;
  cta?: ReactNode;
}) {
  return (
    <div className="grid min-h-30 place-items-center rounded-sm border border-dashed border-[var(--border)] bg-[var(--bg-surface2)] px-6 py-6 text-center">
      <div className="mx-auto grid max-w-sm justify-items-center ">
        <div className="grid h-12 w-12 place-items-center rounded-sm text-[var(--text-muted)]">
          {icon}
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text-secondary)]">
            {heading}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        </div>
        {cta ? <div className="mt-2">{cta}</div> : null}
      </div>
    </div>
  );
}
