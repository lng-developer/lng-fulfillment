import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantBadge({
  name,
  slug,
  className,
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1",
        className,
      )}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
      <span className="flex min-w-0 items-center gap-1.5 leading-tight">
        <span className="truncate text-xs font-medium text-slate-800">{name}</span>
        <span className="truncate font-mono text-[10px] text-slate-500">
          ({slug})
        </span>
      </span>
    </span>
  );
}
