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
      setError("Vui lòng điền đầy đủ các trường mật khẩu.");
      return;
    }

    if (newPassword.length < 12) {
      setError("Mật khẩu mới phải có ít nhất 12 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setIsPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      clearPasswordFields();
      toastSuccess("Đổi mật khẩu thành công.");
      onClose();
    } catch (error) {
      clearPasswordFields();
      setError(getErrorMessage(error));
      toastError("Đổi mật khẩu thất bại.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        className="w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        noValidate
        onSubmit={submit}
        ref={trapRef}
      >
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Đổi mật khẩu
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Mật khẩu mới phải có độ dài tối thiểu 12 ký tự.
          </p>
        </div>

        <div className="grid gap-3.5 px-5 py-5">
          <PasswordField
            disabled={isPending}
            id={currentPasswordId}
            label="Mật khẩu hiện tại"
            onChange={setCurrentPassword}
            show={showPasswords}
            value={currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            disabled={isPending}
            id={newPasswordId}
            label="Mật khẩu mới"
            onChange={setNewPassword}
            show={showPasswords}
            value={newPassword}
          />
          <PasswordField
            autoComplete="new-password"
            disabled={isPending}
            id={confirmPasswordId}
            label="Xác nhận mật khẩu mới"
            onChange={setConfirmPassword}
            show={showPasswords}
            value={confirmPassword}
          />
          <button
            className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            disabled={isPending}
            onClick={() => setShowPasswords((value) => !value)}
            type="button"
          >
            {showPasswords ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )}
            {showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </button>

          {error ? (
            <div
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              id={errorId}
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <button
            className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Đang cập nhật..." : "Lưu mật khẩu"}
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
    <label className="grid gap-1.5 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={show ? "text" : "password"}
        value={value}
      />
    </label>
  );
}
