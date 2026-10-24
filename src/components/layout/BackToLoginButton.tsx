"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout as logoutRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";

export function BackToLoginButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await logoutRequest();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Không thể xóa phiên làm việc. Vui lòng thử lại.");
      setIsPending(false);
    }
  }

  return (
    <div className="mt-4 grid gap-2 justify-items-center">
      <Button
        disabled={isPending}
        isLoading={isPending}
        onClick={handleClick}
        variant="primary"
      >
        {isPending ? "Đang đăng xuất..." : "Quay lại đăng nhập"}
      </Button>
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
