"use client";
import { useEffect, useRef, useState } from "react";
import { shipOrder } from "@/lib/api/orders";
import { getShipment, syncTracking } from "@/lib/api/shipments";
import { apiFetch, type ApiSuccessEnvelope } from "@/lib/api/base";
import { runVpJobs, type VpJob } from "@/lib/shipment/vp-ship-jobs";
import type { ShipOrderOptions, ShipEnvironment } from "@/types/orders";
export type VpSendInput = {
  orderId: string;
  orderNumber: string;
  options: ShipOrderOptions;
  environment: ShipEnvironment;
  carrierAccountId: string | null;
};
export type LabelMode = "single" | "double";
function reservePrintWindow() {
  const tab = window.open("", "_blank");
  if (tab) {
    tab.opener = null;
    tab.document.title = "Nhãn Viettel Post";
    tab.document.body.textContent =
      "Đang chuẩn bị nhãn. Có thể quay lại màn hình đơn hàng để tiếp tục làm việc.";
  }
  return tab;
}
export async function openVpLabels(
  ids: string[],
  mode: LabelMode,
  tab: Window | null,
) {
  try {
    if (!tab || tab.closed)
      throw new Error("Trình duyệt chặn cửa sổ in. Bấm In nhãn để mở lại.");
    const response = await fetch("/api/shipments/labels/batch", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentIds: ids, mode }),
      signal: AbortSignal.timeout(240000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error?.message || "Không tải được nhãn in.");
    }
    const url = URL.createObjectURL(await response.blob());
    tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (error) {
    if (tab && !tab.closed) tab.close();
    throw error;
  }
}
export function useVpShipping(onChanged: () => void) {
  const [jobs, setJobs] = useState<VpJob[]>([]);
  const [running, setRunning] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<LabelMode>("single");
  const busy = useRef(false);
  const pendingPrintWindow = useRef<Window | null>(null);
  const lifetime = useRef(new AbortController());
  const changed = useRef(onChanged);
  changed.current = onChanged;
  useEffect(() => {
    lifetime.current = new AbortController();
    return () => {
      lifetime.current.abort();
      pendingPrintWindow.current?.close();
    };
  }, []);
  async function run(
    rows: VpJob[],
    inputs: VpSendInput[],
    autoPrint: boolean,
    chosenMode: LabelMode,
  ) {
    if (busy.current) return;
    if (!rows.length || rows.length > 10) {
      setError("Chọn 1–10 đơn mỗi lượt.");
      return;
    }
    busy.current = true;
    setRunning(true);
    setError("");
    setMode(chosenMode);
    const printTab = autoPrint ? reservePrintWindow() : null;
    pendingPrintWindow.current = printTab;
    const signal = lifetime.current.signal;
    setJobs(rows);
    try {
      const result = await runVpJobs(rows, {
        signal,
        create: async (orderId) => {
          const input = inputs.find((i) => i.orderId === orderId);
          if (!input) throw Error("Missing submission");
          const response = await shipOrder(
            orderId,
            input.environment,
            input.options,
            "VIETTEL_POST",
            input.carrierAccountId,
            AbortSignal.any([signal, AbortSignal.timeout(120000)]),
          );
          if (!signal.aborted) changed.current();
          return response.shipment ?? {};
        },
        read: (id, pollSignal) =>
          getShipment(
            id,
            AbortSignal.any([pollSignal, AbortSignal.timeout(20000)]),
          ),
        sync: (id, pollSignal) =>
          syncTracking(
            id,
            AbortSignal.any([pollSignal, AbortSignal.timeout(20000)]),
          ),
        label: async (id, pollSignal) => {
          const response = await apiFetch<
            ApiSuccessEnvelope<{
              labelUrl: string | null;
              mergeLabelUrl: string | null;
              requiresAccount: boolean;
            }>
          >(`/api/shipments/${id}/labels`, {
            signal: AbortSignal.any([pollSignal, AbortSignal.timeout(20000)]),
          });
          return chosenMode === "double"
            ? response.data.mergeLabelUrl
            : response.data.labelUrl;
        },
        update: (job) =>
          setJobs((current) =>
            current.map((j) => (j.orderId === job.orderId ? job : j)),
          ),
        pause: () =>
          new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = setTimeout(finish, 12000);
            signal.addEventListener("abort", finish, { once: true });
          }),
      });
      if (signal.aborted) {
        printTab?.close();
        return;
      }
      changed.current();
      const ready = result
        .filter((j) => j.state === "ready" && j.shipmentId)
        .map((j) => j.shipmentId!);
      if (autoPrint && ready.length) {
        setPrinting(true);
        await openVpLabels(ready, chosenMode, printTab);
        pendingPrintWindow.current = null;
      } else if (autoPrint) {
        printTab?.close();
        setError("Chưa có nhãn sẵn sàng. Tiến độ vẫn được giữ bên dưới.");
      }
    } catch (err) {
      printTab?.close();
      if (!signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Không hoàn tất được lượt xử lý.",
        );
    } finally {
      pendingPrintWindow.current = null;
      busy.current = false;
      if (!signal.aborted) {
        setRunning(false);
        setPrinting(false);
        changed.current();
      }
    }
  }
  return {
    jobs,
    running,
    printing,
    error,
    mode,
    start: (
      inputs: VpSendInput[],
      autoPrint = true,
      chosenMode: LabelMode = "single",
    ) =>
      run(
        inputs.map((i) => ({
          orderId: i.orderId,
          orderNumber: i.orderNumber,
          state: "queued",
        })),
        inputs,
        autoPrint,
        chosenMode,
      ),
    resume: (rows: VpJob[], chosenMode: LabelMode = mode, autoPrint = false) =>
      run(
        rows.map((j) =>
          j.shipmentId
            ? { ...j, state: "waiting", message: undefined }
            : { ...j, state: "review" },
        ),
        [],
        autoPrint,
        chosenMode,
      ),
    print: async () => {
      if (printing) return;
      const tab = reservePrintWindow();
      setPrinting(true);
      setError("");
      try {
        await openVpLabels(
          jobs
            .filter((j) => j.state === "ready" && j.shipmentId)
            .map((j) => j.shipmentId!),
          mode,
          tab,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không in được nhãn.");
      } finally {
        setPrinting(false);
      }
    },
    clear: () => {
      if (!busy.current) setJobs([]);
    },
  };
}
export function VpShippingProgress({
  flow,
}: {
  flow: ReturnType<typeof useVpShipping>;
}) {
  const [filter, setFilter] = useState<string>("all");
  if (!flow.jobs.length) return null;
  const ready = flow.jobs.filter((j) => j.state === "ready");
  const waiting = flow.jobs.filter(
    (j) => j.state === "waiting" && j.shipmentId,
  );
  const labels = {
    queued: "Chờ gửi",
    sending: "Đang gửi VP",
    waiting: flow.running ? "Đang lấy nhãn" : "Chờ nhãn",
    ready: "Sẵn sàng in",
    review: "Cần kiểm tra",
  };
  return (
    <section
      className="rounded-lg border border-indigo-200 bg-white p-4"
      aria-label="Tiến độ gửi VP"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          Gửi VP và in nhãn · {ready.length}/{flow.jobs.length} sẵn sàng
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!ready.length || flow.printing}
            onClick={() => void flow.print()}
            className="rounded bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            {flow.printing
              ? "Đang gom PDF…"
              : `In nhãn sẵn sàng (${ready.length})`}
          </button>
          {!flow.running && waiting.length > 0 && (
            <button
              type="button"
              onClick={() => void flow.resume(flow.jobs)}
              className="rounded border px-3"
            >
              Tiếp tục lấy nhãn
            </button>
          )}
          {!flow.running && (
            <button
              type="button"
              onClick={flow.clear}
              className="rounded border px-3"
            >
              Đóng tiến độ
            </button>
          )}
        </div>
      </div>
      <p className="my-2 text-xs text-slate-500">
        Tự lấy nhãn khi màn hình này đang mở. Không tự gửi lại đơn. Nhãn{" "}
        {flow.mode === "double" ? "đôi" : "đơn"} A6.
      </p>
      <div className="mb-2 flex flex-wrap gap-3 text-sm">
        <label>
          Lọc lượt xử lý{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded border p-1"
          >
            <option value="all">Tất cả</option>
            <option value="queued">Chờ gửi</option>
            <option value="sending">Đang gửi</option>
            <option value="waiting">Chờ nhãn</option>
            <option value="ready">Sẵn sàng in</option>
            <option value="review">Cần xử lý</option>
          </select>
        </label>
        <label>
          Loại nhãn{" "}
          <select
            value={flow.mode}
            aria-label="Loại nhãn"
            disabled={flow.running || !flow.jobs.some((j) => j.shipmentId)}
            onChange={(e) =>
              void flow.resume(flow.jobs, e.target.value as LabelMode)
            }
            className="rounded border p-1"
          >
            <option value="single">A6 – Nhãn đơn</option>
            <option value="double">A6 – Nhãn đôi</option>
          </select>
        </label>
      </div>
      {flow.error && (
        <p role="alert" className="text-sm text-red-700">
          {flow.error}
        </p>
      )}
      <ul aria-live="polite" className="divide-y">
        {flow.jobs
          .filter((job) => filter === "all" || job.state === filter)
          .map((job) => (
            <li
              key={job.orderId}
              className="flex flex-wrap justify-between gap-2 py-2 text-sm"
            >
              <span>{job.orderNumber}</span>
              <span
                className={
                  job.state === "ready"
                    ? "text-emerald-700"
                    : job.state === "review"
                      ? "text-red-700"
                      : "text-amber-700"
                }
              >
                {labels[job.state]}
                {job.message && ` · ${job.message}`}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}
