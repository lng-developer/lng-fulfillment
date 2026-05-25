import type { Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<Role, string> = {
  OWNER: "bg-[#f5f3ff] text-[#4c1d95]",
  ADMIN: "bg-[#f5f3ff] text-[#7c3aed]",
  OPERATOR: "bg-[#fffbeb] text-[#92400e]",
  VIEWER: "bg-[#f1f5f9] text-[#475569]",
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold",
        ROLE_STYLES[role],
        className,
      )}
    >
      {role}
    </span>
  );
}
