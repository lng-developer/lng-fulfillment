"use client";

import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api/base";
import { getMembers } from "@/lib/api/members";
import { can, type Role } from "@/lib/rbac";
import { toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/settings";
import { EditMemberModal } from "./EditMemberModal";

export function MembersTab({
  currentUserId,
  role,
}: {
  currentUserId: string;
  role: Role;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const canManage = can.manageMembers(role);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMembers() {
      setState("loading");
      setLoadError(null);

      try {
        const response = await getMembers(controller.signal);
        setMembers(response);
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
          setState("error");
        }
      }
    }

    loadMembers();

    return () => controller.abort();
  }, [reloadKey]);

  const ownerCount = members.filter(
    (member) => member.role === "OWNER" && getMemberStatus(member) === "ACTIVE",
  ).length;

  const columns = useMemo<Array<DataTableColumn<Member>>>(
    () => [
      {
        key: "email",
        header: "Email",
        render: (row) => (
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white", memberAvatarClass(row))}>
              {getInitials(row.name ?? row.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-[var(--text-primary)]">{row.email}</span>
            </span>
          </span>
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (row) => row.name || <span className="text-[var(--text-muted)]">-</span>,
      },
      {
        key: "role",
        header: "Role",
        render: (row) => <RoleBadge role={row.role} />,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={getMemberStatus(row)} />,
      },
      {
        key: "joined",
        header: "Joined",
        render: (row) => relativeDate(row.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          canManage ? (
            <button
              className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedMember(row);
              }}
              type="button"
            >
              Edit
            </button>
          ) : (
            <span className="text-[var(--text-muted)]">-</span>
          ),
      },
    ],
    [canManage],
  );

  if (state === "loading") {
    return <LoadingSkeleton rows={6} />;
  }

  if (state === "error") {
    return (
      <ErrorState
        message={loadError ?? "Members could not be loaded."}
        retry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Members</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review tenant membership and update access for authorized users.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={members}
        empty={
          <EmptyState
            description="No tenant members are available."
            heading="No members found"
            icon={<Users className="h-6 w-6" aria-hidden />}
          />
        }
        getRowKey={(row) => row.membershipId ?? row.id}
        onPageChange={() => undefined}
        pagination={{
          page: 1,
          pageSize: Math.max(members.length, 1),
          totalItems: members.length,
          totalPages: members.length ? 1 : 0,
        }}
      />

      {selectedMember ? (
        <EditMemberModal
          currentUserId={currentUserId}
          isLastOwner={ownerCount <= 1 && selectedMember.role === "OWNER"}
          member={selectedMember}
          onCancel={() => setSelectedMember(null)}
          onSaved={() => {
            setSelectedMember(null);
            toastSuccess("Member updated.");
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}
    </section>
  );
}

function getMemberStatus(member: Member) {
  return member.membershipStatus ?? member.status ?? "ACTIVE";
}

function memberAvatarClass(member: Member) {
  if (getMemberStatus(member) === "DISABLED" || member.role === "VIEWER") {
    return "bg-[#94a3b8]";
  }

  if (member.role === "OPERATOR") {
    return "bg-gradient-to-br from-[#d97706] to-[#fbbf24]";
  }

  return "bg-gradient-to-br from-[var(--brand)] to-[#a5b4fc]";
}

function getInitials(value: string) {
  const parts = value
    .replace("@", " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function relativeDate(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return "Just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;

  return (
    <time dateTime={value} title={date.toLocaleString()}>
      {new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
      }).format(date)}
    </time>
  );
}
