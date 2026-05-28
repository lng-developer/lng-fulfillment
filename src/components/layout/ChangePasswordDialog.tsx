"use client";

import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/base";
import { toastError, toastSuccess } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const trapRef = useFocusTrap<HTMLFormElement>(
    true,
    isPending ? undefined : onClose,
  );

  function clearPasswordFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all password fields.");
      return;
    }

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    setIsPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      clearPasswordFields();
      toastSuccess("Password changed.");
      onClose();
    } catch (error) {
      clearPasswordFields();
      setError(getErrorMessage(error));
      toastError("Failed to change password.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <form
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        className="w-full max-w-[440px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        noValidate
        onSubmit={submit}
        ref={trapRef}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Change password
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <PasswordField
            disabled={isPending}
            id={currentPasswordId}
            label="Current password"
            onChange={setCurrentPassword}
            show={showPasswords}
            value={currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            disabled={isPending}
            id={newPasswordId}
            label="New password"
            onChange={setNewPassword}
            show={showPasswords}
            value={newPassword}
          />
          <PasswordField
            autoComplete="new-password"
            disabled={isPending}
            id={confirmPasswordId}
            label="Confirm new password"
            onChange={setConfirmPassword}
            show={showPasswords}
            value={confirmPassword}
          />
          <button
            className="inline-flex w-fit items-center gap-2 text-xs font-medium text-[var(--brand)] hover:text-[var(--brand-dark)]"
            disabled={isPending}
            onClick={() => setShowPasswords((value) => !value)}
            type="button"
          >
            {showPasswords ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>

          {error ? (
            <div
              className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]"
              id={errorId}
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            disabled={isPending}
            onClick={() => {
              clearPasswordFields();
              onClose();
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : "Save password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
  autoComplete = "current-password",
  disabled,
  id,
  label,
  onChange,
  show,
  value,
}: {
  autoComplete?: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  show: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
      {label}
      <input
        autoComplete={autoComplete}
        className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:bg-[var(--bg-surface2)]"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={show ? "text" : "password"}
        value={value}
      />
    </label>
  );
}
