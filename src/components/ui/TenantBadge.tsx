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
        "inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--brand-mid)] bg-[var(--brand-light)] px-2.5 py-[3px]",
        className,
      )}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden />
      <span className="grid min-w-0 leading-tight">
        <span className="truncate text-xs font-medium text-[var(--brand-dark)]">{name}</span>
        <span className="truncate font-mono text-[10px] font-normal text-[#818cf8]">
          {slug}
        </span>
      </span>
    </span>
  );
}
