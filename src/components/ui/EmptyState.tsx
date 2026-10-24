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
    <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <div className="mx-auto grid max-w-sm justify-items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm mb-3">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {heading}
          </h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
        {cta ? <div className="mt-4">{cta}</div> : null}
      </div>
    </div>
  );
}
