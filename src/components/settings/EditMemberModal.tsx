"use client";

import { useState } from "react";
import { WarningBox } from "@/components/ui/WarningBox";
import { getErrorMessage } from "@/lib/api/base";
import { updateMember } from "@/lib/api/members";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { Role } from "@/lib/rbac";
import type { Member } from "@/types/settings";

const ROLE_OPTIONS: Role[] = ["OWNER", "ADMIN", "OPERATOR", "VIEWER"];

export function EditMemberModal({
  currentUserId,
  isLastOwner,
  member,
  onCancel,
  onSaved,
}: {
  currentUserId: string;
  isLastOwner: boolean;
  member: Member;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<Role>(member.role);
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(
    getMemberStatus(member),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isSelf = member.userId === currentUserId;
  const memberId = member.membershipId ?? member.id;
  const roleDisabled = isLastOwner && member.role === "OWNER";
  const statusDisabled = isSelf;
  const trapRef = useFocusTrap<HTMLDivElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function save() {
    setError(null);
    setIsPending(true);

    try {
      await updateMember(memberId, {
        role: roleDisabled ? undefined : role,
        status: statusDisabled ? undefined : status,
      });
      onSaved();
    } catch (error) {
      setError(getErrorMessage(error));
      toastError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        ref={trapRef}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Edit Member - {member.email}
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Role
            <select
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] disabled:cursor-not-allowed disabled:bg-[var(--bg-surface2)] disabled:text-[var(--text-muted)]"
              disabled={roleDisabled || isPending}
              onChange={(event) => setRole(event.target.value as Role)}
              value={role}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium text-[var(--text-secondary)]">
              Status
            </legend>
            <div className="flex gap-4">
              {(["ACTIVE", "DISABLED"] as const).map((option) => (
                <label
                  className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                  key={option}
                >
                  <input
                    checked={status === option}
                    disabled={statusDisabled || isPending}
                    name="member-status"
                    onChange={() => setStatus(option)}
                    type="radio"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          {isSelf ? (
            <WarningBox message="You cannot disable your own account. Status toggle disabled." />
          ) : null}

          {roleDisabled ? (
            <WarningBox message="Cannot change role of the last OWNER. Role dropdown disabled." />
          ) : null}

          {error ? (
            <div className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={save}
            type="button"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getMemberStatus(member: Member): "ACTIVE" | "DISABLED" {
  return member.membershipStatus ?? member.status ?? "ACTIVE";
}
