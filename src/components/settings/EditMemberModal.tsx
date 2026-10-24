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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      role="dialog"
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        ref={trapRef}
      >
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            Chỉnh sửa thành viên - {member.email}
          </h2>
        </div>

        <div className="grid gap-4 px-6 py-5">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
            Vai trò (Role)
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
            <legend className="text-xs font-semibold text-slate-700">
              Trạng thái
            </legend>
            <div className="flex gap-6">
              {(["ACTIVE", "DISABLED"] as const).map((option) => (
                <label
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer"
                  key={option}
                >
                  <input
                    checked={status === option}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50"
                    disabled={statusDisabled || isPending}
                    name="member-status"
                    onChange={() => setStatus(option)}
                    type="radio"
                  />
                  {option === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu"}
                </label>
              ))}
            </div>
          </fieldset>

          {isSelf ? (
            <WarningBox message="Bạn không thể vô hiệu hóa tài khoản của chính mình." />
          ) : null}

          {roleDisabled ? (
            <WarningBox message="Không thể thay đổi vai trò của OWNER duy nhất còn lại." />
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-9 rounded-md bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            disabled={isPending}
            onClick={save}
            type="button"
          >
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getMemberStatus(member: Member): "ACTIVE" | "DISABLED" {
  return member.membershipStatus ?? member.status ?? "ACTIVE";
}
