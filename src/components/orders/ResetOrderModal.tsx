"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { getCarrierAccounts } from "@/lib/api/carrier-accounts";
import type { CarrierAccount } from "@/types/settings";
import { RotateCcw, X } from "lucide-react";
import type { OrderListItem } from "@/types/orders";

export function ResetOrderModal({
  order,
  onClose,
  onSubmit,
}: {
  order: OrderListItem;
  onClose: () => void;
  onSubmit: (oldCarrierAccountId?: string) => void;
}) {
  const [accounts, setAccounts] = useState<CarrierAccount[]>([]);
  const [oldAccount, setOldAccount] = useState(order.latestCarrierAccountId || "");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void getCarrierAccounts(controller.signal).then(setAccounts).catch(() => {
      if (!controller.signal.aborted) setError("Không tải được tài khoản carrier. Vui lòng mở lại hộp thoại.");
    });
    return () => controller.abort();
  }, []);
  const needsOldAccount = Boolean(order.latestCarrierCode) && !order.latestCarrierAccountId;
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-[var(--brand-light)] text-[var(--brand)]">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Reset để gửi lại
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Xác minh hủy vận đơn cũ trước khi cho phép gửi lại.
              </p>
            </div>
          </div>
          <button
            aria-label="Close reset order modal"
            className="h-[26px] w-[26px] rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-[var(--text-muted)] hover:border-[#fca5a5] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
            Hãy hủy vận đơn trên hãng trước. Hệ thống chỉ kiểm tra việc hủy, giữ lịch sử và dừng job tự động cũ. Sau reset, chọn tài khoản mới ở bước Ship; hệ thống không tự gửi lại.
          </div>
          <label className="grid gap-1 text-xs text-[var(--text-primary)]">
            Tài khoản cũ dùng để xác minh (không phải tài khoản gửi lại)
            <select className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2"
              disabled={Boolean(order.latestCarrierAccountId)} value={oldAccount}
              onChange={(event) => setOldAccount(event.target.value)}>
              <option value="">Chọn tài khoản cũ</option>
              {accounts.filter(a => !order.latestCarrierCode || a.carrierCode === order.latestCarrierCode)
                .map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="grid gap-2 text-xs">
            <InfoRow label="Order #" mono value={order.orderNumber ?? order.externalOrderId} />
            <InfoRow label="Current status" value={order.status} />
            <InfoRow label="Next status" value="FULFILLED (Sẵn sàng ship)" />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            autoFocus
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] disabled:opacity-50"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(error) || (needsOldAccount && !oldAccount)}
            onClick={() => onSubmit(oldAccount || undefined)}
            type="button"
          >
            Xác minh và reset
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2 last:border-b-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={mono ? "text-right font-mono text-[11px]" : "text-right"}>
        {value}
      </span>
    </div>
  );
}
