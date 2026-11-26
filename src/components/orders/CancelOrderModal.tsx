"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "@/lib/api/base";
import { toastSuccess } from "@/lib/toast";
import type { OrderListItem } from "@/types/orders";

export function CancelOrderModal({ order, onClose, onCancelled }: {
  order: OrderListItem; onClose: () => void; onCancelled: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit() {
    if (pending || !reason.trim()) return;
    setPending(true);
    setError("");
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST", body: JSON.stringify({ reason: reason.trim() }),
      });
      toastSuccess("Đã hủy đơn trong Fulfillment.");
      onCancelled();
    } catch (cause) {
      setError(getErrorMessage(cause));
      setPending(false);
    }
  }
  return (
    <dialog ref={dialog} aria-labelledby={titleId}
      className="w-[calc(100%_-_2rem)] max-w-md rounded-lg border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="space-y-4 p-5">
          <h2 id={titleId} className="text-base font-semibold">Hủy đơn trong Fulfillment</h2>
          <p className="text-sm font-medium">#{order.orderNumber || order.externalOrderId}</p>
          <p className="text-sm text-slate-600">Hệ thống giữ lịch sử và dừng tạo vận đơn tự động. Nếu còn vận đơn hiệu lực, bạn cần hủy vận đơn bên hãng và đồng bộ trước.</p>
          <label htmlFor={reasonId} className="block text-sm font-medium">Lý do hủy</label>
          <textarea id={reasonId} autoFocus required maxLength={500} disabled={pending}
            className="w-full rounded-md border border-slate-300 p-2 text-sm" rows={3}
            value={reason} onChange={event => setReason(event.target.value)} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" disabled={pending} onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Đóng</button>
          <button type="submit" disabled={pending || !reason.trim()}
            className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50">
            {pending ? "Đang hủy…" : "Xác nhận hủy đơn"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
