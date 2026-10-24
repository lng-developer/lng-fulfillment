import type { Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<Role, string> = {
  OWNER: "bg-purple-50 text-purple-700 border-purple-200",
  ADMIN: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OPERATOR: "bg-amber-50 text-amber-700 border-amber-200",
  VIEWER: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        ROLE_STYLES[role],
        className,
      )}
    >
      {role}
    </span>
  );
}
