"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getOrder } from "@/lib/api/orders";
import { apiFetch, type ApiSuccessEnvelope } from "@/lib/api/base";
import { getCarrierAccounts } from "@/lib/api/carrier-accounts";
import type { CarrierAccount } from "@/types/settings";
import { safeLabelUrl } from "@/shared/label-url";

type Labels = { labelUrl: string | null; mergeLabelUrl: string | null; requiresAccount: boolean };

export function PrintLabelModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [labels, setLabels] = useState<Labels | null>(null);
  const [mode, setMode] = useState<"single" | "double">("single");
  const [accounts, setAccounts] = useState<CarrierAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [chooseAccount, setChooseAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true); setError(""); setLabels(null); setMode("single");
    void (async () => {
      const order = await getOrder(orderId);
      const shipment = order.shipments?.[0];
      if (!shipment) throw new Error("Đơn chưa có vận đơn để in nhãn.");
      if (shipment.status === "CANCELLED") throw new Error("Vận đơn đã hủy, không in lại để gửi hàng.");
      if (cancelled) return;
      // Keep the existing single label printable if VP is temporarily unavailable.
      setLabels({ labelUrl: safeLabelUrl(shipment.labelUrl), mergeLabelUrl: null, requiresAccount: false });
      const query = accountId ? `?carrierAccountId=${encodeURIComponent(accountId)}` : "";
      const response = await apiFetch<ApiSuccessEnvelope<Labels>>(`/api/shipments/${shipment.id}/labels${query}`, { signal: controller.signal });
      if (cancelled) return;
      setLabels(response.data);
      if (!response.data.labelUrl && response.data.mergeLabelUrl) setMode("double");
      if (response.data.requiresAccount) {
        setChooseAccount(true);
        const available = await getCarrierAccounts(controller.signal);
        if (!cancelled) setAccounts(available.filter(a => a.carrierCode === "VIETTEL_POST" && a.status === "ACTIVE"));
      }
    })().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được nhãn.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [orderId, accountId]);
  const url = safeLabelUrl(mode === "single" ? labels?.labelUrl : labels?.mergeLabelUrl);
  return createPortal(<dialog ref={dialog} aria-labelledby="print-label-title" onCancel={onClose}
    className="m-auto w-[min(95vw,540px)] rounded-lg border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/40">
    <h2 id="print-label-title" className="text-base font-semibold">Chọn nhãn in</h2>
    {chooseAccount && <label className="mt-4 grid gap-2 text-sm">Tài khoản VP đã tạo vận đơn
      <select value={accountId} onChange={e => setAccountId(e.target.value)} className="rounded border p-2">
        <option value="">Chọn tài khoản cũ</option>
        {accounts.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
      </select>
    </label>}
    <fieldset disabled={loading} className="my-5 flex flex-wrap gap-4 text-sm">
      <legend className="sr-only">Loại nhãn</legend>
      <label><input type="radio" name="label-mode" checked={mode === "single"} onChange={() => setMode("single")}
        disabled={!safeLabelUrl(labels?.labelUrl)} /> A6 – Nhãn đơn</label>
      <label><input type="radio" name="label-mode" checked={mode === "double"} onChange={() => setMode("double")}
        disabled={!safeLabelUrl(labels?.mergeLabelUrl)} /> A6 – Nhãn đôi</label>
    </fieldset>
    {loading && <p role="status" className="text-sm">Đang lấy file nhãn…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loading && labels && !labels.mergeLabelUrl && <p className="text-sm text-slate-600">
      {labels.requiresAccount ? "Chọn tài khoản đã tạo vận đơn để lấy nhãn đôi." : "VP chưa trả file nhãn đôi cho vận đơn này."}
    </p>}
    <div className="mt-5 flex justify-end gap-3">
      <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">Đóng</button>
      {url && !loading ? <a href={url} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-700 px-4 py-2 text-sm text-white">Mở nhãn để in</a>
        : <button type="button" disabled className="rounded bg-slate-200 px-4 py-2 text-sm">Mở nhãn để in</button>}
    </div>
  </dialog>, document.body);
}
