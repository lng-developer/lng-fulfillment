"use client";

import { Loader2, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, getErrorMessage } from "@/lib/api/base";
import { createMember, getMembers } from "@/lib/api/members";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/settings";
import { EditMemberModal } from "./EditMemberModal";

const TENANT_MEMBER_LIMIT = 10;

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
  const canCreate = role === "OWNER";

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
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white",
                memberAvatarClass(row),
              )}
            >
              {getInitials(row.name ?? row.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-[var(--text-primary)]">
                {row.email}
              </span>
            </span>
          </span>
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (row) =>
          row.name || <span className="text-[var(--text-muted)]">-</span>,
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Members
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Review tenant membership and update access for authorized users.
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {members.length}/{TENANT_MEMBER_LIMIT} accounts
          </div>
        </div>
      </div>

      {canCreate ? (
        <AddTenantMemberForm
          disabled={members.length >= TENANT_MEMBER_LIMIT}
          onCreated={() => {
            toastSuccess("Member added.");
            setReloadKey((value) => value + 1);
          }}
        />
      ) : (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Only tenant owners can create additional tenant accounts.
        </p>
      )}

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

function AddTenantMemberForm({
  disabled,
  onCreated,
}: {
  disabled: boolean;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "OPERATOR" | "VIEWER">("VIEWER");
  const [membershipStatus, setMembershipStatus] = useState<
    "ACTIVE" | "DISABLED"
  >("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setEmail("");
    setName("");
    setPassword("");
    setRole("VIEWER");
    setMembershipStatus("ACTIVE");
    setError(null);
  }

  function close() {
    if (isPending) return;
    resetForm();
    setOpen(false);
  }

  async function submit() {
    if (isPending) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }

    if (name.trim().length > 120) {
      setError("Name must be 120 characters or less.");
      return;
    }

    if (password && (password.length < 12 || password.length > 256)) {
      setError("Password must be 12-256 characters.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      await createMember({
        email: normalizedEmail,
        name: name.trim() || undefined,
        password: password || undefined,
        role,
        membershipStatus,
      });
      resetForm();
      setOpen(false);
      onCreated();
    } catch (error) {
      setPassword("");
      setError(getCreateMemberError(error));
      toastError("Failed to add member.");
    } finally {
      setIsPending(false);
    }
  }

  if (disabled) {
    return (
      <div className="rounded-sm border border-[#fcd34d] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]">
        You has reached the 10 account limit.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className="inline-flex h-9 w-fit items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add tenant account
      </button>
    );
  }

  return (
    <div className="grid gap-3 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
      <div className="rounded-sm border border-[var(--brand-mid)] bg-[var(--brand-light)] p-3 text-xs text-[var(--brand-dark)]">
        Existing users are attached to this tenant. New users are created only
        when a password is provided; if the email does not exist, the server
        will require a password.
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          Email
          <input
            autoComplete="off"
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
            disabled={isPending}
            onChange={(event) => setEmail(event.target.value)}
            ref={emailRef}
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          Name
          <input
            autoComplete="off"
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
            disabled={isPending}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          Password if new
          <input
            autoComplete="new-password"
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
            disabled={isPending}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          Role
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
            disabled={isPending}
            onChange={(event) =>
              setRole(event.target.value as "ADMIN" | "OPERATOR" | "VIEWER")
            }
            value={role}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
          Status
          <select
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]"
            disabled={isPending}
            onChange={(event) =>
              setMembershipStatus(event.target.value as "ACTIVE" | "DISABLED")
            }
            value={membershipStatus}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)]"
          disabled={isPending}
          onClick={close}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex h-8 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : null}
          Add account
        </button>
      </div>
    </div>
  );
}

function getCreateMemberError(error: unknown) {
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    if (error.status === 400 || error.code === "VALIDATION_ERROR") {
      if (message.includes("password is required")) {
        return "Password is required when creating a new user.";
      }

      if (message.includes("password")) {
        return "Password must meet the password length policy.";
      }

      return "Please check the form fields and try again.";
    }

    if (error.status === 409) {
      if (message.includes("limit")) {
        return "You has reached the 10 account limit.";
      }

      return "This user is already attached to the tenant.";
    }
  }

  return getErrorMessage(error);
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
