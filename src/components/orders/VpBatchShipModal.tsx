"use client";
import {
  VpDeclarationEditor,
  type VpDeclarationState,
} from "./VpDeclarationEditor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { getOrder } from "@/lib/api/orders";
import { getCarrierAccounts } from "@/lib/api/carrier-accounts";
import { stripPhoneExtension } from "@/shared/recipient-phone";
import {
  buildShipmentPreview,
  buildShipOptions,
  type ShipmentPreview,
} from "./ShipOrderModal";
import type { OrderDetail, OrderListItem } from "@/types/orders";
import type { CarrierAccount } from "@/types/settings";
import type { LabelMode, VpSendInput } from "./VpShippingProgress";
type Row = { preview?: ShipmentPreview; detail?: OrderDetail; error?: string };
export function VpBatchShipModal({
  orders,
  initialDetails = {},
  onClose,
  onSubmit,
}: {
  orders: OrderListItem[];
  initialDetails?: Record<string, OrderDetail>;
  onClose: () => void;
  onSubmit: (
    inputs: VpSendInput[],
    autoPrint: boolean,
    mode: LabelMode,
  ) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ready" | "needs">("all");
  const [showCommon, setShowCommon] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lookup, setLookup] = useState<
    Record<string, "loading" | "ready" | "error">
  >({});
  const panelRef = useRef<HTMLElement>(null);
  const [initialOrders] = useState(orders);
  const [cachedDetails] = useState(initialDetails);
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      orders
        .filter((order) => initialDetails[order.id])
        .map((order) => [
          order.id,
          {
            preview: buildShipmentPreview(order, initialDetails[order.id]),
            detail: initialDetails[order.id],
          },
        ]),
    ),
  );
  const [declarations, setDeclarations] = useState<
    Record<string, VpDeclarationState>
  >({});
  const [accounts, setAccounts] = useState<CarrierAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [mode, setMode] = useState<LabelMode>("double");
  const [submitted, setSubmitted] = useState(false);
  const handleEscape = useCallback(() => {
    if (submitted) return;
    if (selectedId) setSelectedId(null);
    else onClose();
  }, [submitted, selectedId, onClose]);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, handleEscape);
  useEffect(() => {
    if (selectedId) panelRef.current?.focus();
  }, [selectedId]);

  const [common, setCommon] = useState({
    weight: "",
    length: "5",
    width: "5",
    height: "2",
  });
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(30000),
    ]);
    for (const order of initialOrders.filter(
      (order) => !cachedDetails[order.id],
    )) {
      void getOrder(order.id, signal)
        .then((detail) => {
          if (!controller.signal.aborted)
            setRows((current) => ({
              ...current,
              [order.id]: {
                preview: buildShipmentPreview(order, detail),
                detail,
              },
            }));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setRows((current) => ({
              ...current,
              [order.id]: {
                error: "Không tải được chi tiết đơn. Đóng rồi mở lại để thử.",
              },
            }));
        });
    }
    void (async () => {
      try {
        const list = (await getCarrierAccounts(signal)).filter(
          (a) => a.carrierCode === "VIETTEL_POST" && a.status === "ACTIVE",
        );
        if (!controller.signal.aborted) {
          setAccounts(list);
          const acc2 = list.filter((a) =>
            /(?:^|\W)acc[\s_-]*2(?:$|\W)/i.test(a.displayName),
          );
          setAccountId(acc2.length === 1 ? acc2[0].id : "");
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Không tải được tài khoản VP. Đóng rồi mở lại để thử.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [initialOrders, cachedDetails]);
  function issue(order: OrderListItem) {
    const row = rows[order.id];
    if (!row?.preview) return row?.error || "Đang tải chi tiết…";
    const phone = stripPhoneExtension(row.preview.receiver.phone);
    const digits = phone.replace(/\D/g, "");
    if (
      !/^\+?[\d\s().-]+$/.test(phone) ||
      digits.length < 7 ||
      digits.length > 15
    )
      return "Thiếu / sai SĐT";
    if (
      ["weight", "length", "width", "height"].some(
        (key) =>
          !Number.isFinite(row.preview!.package[key as "weight"]) ||
          row.preview!.package[key as "weight"] <= 0,
      )
    )
      return "Kiểm tra kiện hàng";
    if (!lookup[order.id] || lookup[order.id] === "loading")
      return "Đang tải khai báo…";
    const declaration = declarations[order.id];
    if (
      !declaration ||
      declaration.country !==
        row.preview.receiver.countryCode.trim().toUpperCase()
    )
      return lookup[order.id] === "error"
        ? "Chưa tải mapping"
        : "Thiếu khai báo";
    return declaration.issue
      ? lookup[order.id] === "error"
        ? "Chưa tải mapping"
        : "Kiểm tra khai báo"
      : null;
  }
  const valid = orders.filter((o) => !issue(o));
  function patch(
    id: string,
    fn: (preview: ShipmentPreview) => ShipmentPreview,
  ) {
    setRows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        preview: current[id]?.preview ? fn(current[id].preview!) : undefined,
      },
    }));
  }

  const visible = orders.filter(
    (order) =>
      filter === "all" ||
      (filter === "ready" ? !issue(order) : Boolean(issue(order))),
  );
  const selected = orders.find((order) => order.id === selectedId);
  const preview = selected ? rows[selected.id]?.preview : undefined;
  const mappingErrors = Object.values(lookup).filter(
    (state) => state === "error",
  ).length;
  const pendingDetails = orders.some(
    (order) => !rows[order.id]?.preview && !rows[order.id]?.error,
  );
  const packageLabels = {
    weight: "Khối lượng (g)",
    length: "Dài (cm)",
    width: "Rộng (cm)",
    height: "Cao (cm)",
  };
  function closePanel() {
    const id = selectedId;
    setSelectedId(null);
    requestAnimationFrame(() =>
      document.getElementById(`vp-row-${id}`)?.focus(),
    );
  }
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Gửi VP hàng loạt"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitted) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-2 sm:p-4"
    >
      <div className="flex h-[min(90vh,760px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="shrink-0 border-b px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Gửi Viettel Post · {orders.length} đơn
            </h2>
            <button
              type="button"
              disabled={submitted}
              aria-label="Đóng gửi VP hàng loạt"
              onClick={onClose}
              className="rounded px-2 py-1 text-slate-500"
            >
              Đóng
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select
              aria-label="Tài khoản Viettel Post"
              disabled={loading || submitted}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="min-w-40 rounded border p-2"
            >
              <option value="">Chọn tài khoản VP</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
            <select
              aria-label="Loại nhãn"
              disabled={submitted}
              value={mode}
              onChange={(e) => setMode(e.target.value as LabelMode)}
              className="rounded border p-2"
            >
              <option value="single">A6 · Nhãn đơn</option>
              <option value="double">A6 · Nhãn đôi</option>
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={submitted}
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
              />
              Mở PDF sau khi gửi
            </label>
            <a
              href="/settings?tab=vp-merchandise"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-indigo-700 underline"
            >
              Quản lý mapping SKU
            </a>
          </div>
        </header>
        <div className="shrink-0 space-y-3 border-b px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" aria-label="Lọc đơn gửi VP">
              {(
                [
                  ["all", `Tất cả ${orders.length}`],
                  ["ready", `Sẵn sàng ${valid.length}`],
                  ["needs", `Cần bổ sung ${orders.length - valid.length}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded px-3 py-2 text-xs ${filter === key ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                disabled={submitted}
                onClick={() => setReloadKey((v) => v + 1)}
                className="text-indigo-700"
              >
                Tải lại mapping
              </button>
              <button
                type="button"
                disabled={submitted}
                aria-expanded={showCommon}
                onClick={() => setShowCommon((v) => !v)}
                className="rounded border px-3 py-2"
              >
                Sửa hàng loạt
              </button>
            </div>
          </div>
          {mappingErrors > 0 && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <span>
                Chưa tải được mapping của {mappingErrors} đơn. Thử lại hoặc nhập
                khai báo trong chi tiết đơn.
              </span>
              <button
                type="button"
                disabled={submitted}
                className="shrink-0 font-semibold underline"
                onClick={() => setReloadKey((v) => v + 1)}
              >
                Thử lại
              </button>
            </div>
          )}
          {showCommon && (
            <fieldset
              disabled={submitted || loading || pendingDetails}
              className="flex flex-wrap items-end gap-2 rounded bg-slate-50 p-3"
            >
              <legend className="sr-only">Thông số chung</legend>
              {(["weight", "length", "width", "height"] as const).map((key) => (
                <label key={key} className="grid gap-1 text-xs">
                  {packageLabels[key]}
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    className="w-24 rounded border p-2"
                    value={common[key]}
                    onChange={(e) =>
                      setCommon({ ...common, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="rounded border bg-white px-3 py-2 text-xs"
                onClick={() =>
                  orders.forEach((order) =>
                    patch(order.id, (p) => ({
                      ...p,
                      package: {
                        ...p.package,
                        ...Object.fromEntries(
                          Object.entries(common)
                            .filter(([, v]) => Number(v) > 0)
                            .map(([k, v]) => [
                              k,
                              Number(v) / (k === "weight" ? 1000 : 1),
                            ]),
                        ),
                      },
                    })),
                  )
                }
              >
                Áp dụng cho tất cả
              </button>
            </fieldset>
          )}
          {(error || orders.length > 10) && (
            <p role="alert" className="text-sm text-red-700">
              {error || "Chọn tối đa 10 đơn mỗi lượt."}
            </p>
          )}
        </div>
        <div className="relative flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {["Đơn hàng", "Khối lượng (g)", "Dài × Rộng × Cao (cm)", "Kiểm tra"].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 font-medium"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const p = rows[order.id]?.preview,
                    problem = issue(order);
                  return (
                    <tr
                      key={order.id}
                      className={`cursor-pointer border-t hover:bg-slate-50 ${selectedId === order.id ? "bg-indigo-50/60" : ""}`}
                      onClick={() => setSelectedId(order.id)}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          id={`vp-row-${order.id}`}
                          aria-label={`Chỉnh đơn ${order.externalOrderId}`}
                          aria-expanded={selectedId === order.id}
                          className="whitespace-nowrap text-left font-medium text-indigo-700"
                          onClick={() => setSelectedId(order.id)}
                        >
                          {order.orderNumber || order.externalOrderId}
                        </button>
                      </td>
                      {([ ["weight"], ["length", "width", "height"] ] as const).map((keys) => (
                        <td key={keys[0]} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {keys.map((key, index) => (
                              <label key={key} className="flex items-center gap-1">
                                {index > 0 && <span aria-hidden="true" className="text-slate-400">×</span>}
                                <input
                                  aria-label={`Sửa nhanh ${packageLabels[key]} ${order.externalOrderId}`}
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  disabled={!p || submitted}
                                  className={`${key === "weight" ? "w-24" : "w-20"} rounded border p-2 text-sm tabular-nums disabled:bg-slate-100`}
                                  value={p ? (Math.round(p.package[key] * (key === "weight" ? 1000 : 1) * 100) / 100 || "") : ""}
                                  onChange={(e) => patch(order.id, (current) => ({
                                    ...current,
                                    package: {
                                      ...current.package,
                                      [key]: Number(e.target.value) / (key === "weight" ? 1000 : 1),
                                    },
                                  }))}
                                />
                              </label>
                            ))}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${problem ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          {problem || "Sẵn sàng"}
                        </span>
                        <span
                          aria-hidden="true"
                          className="ml-2 text-slate-400"
                        >
                          ›
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visible.length && (
              <p className="p-8 text-center text-sm text-slate-500">
                Không có đơn trong nhóm này.
              </p>
            )}
          </div>
          <aside
            ref={panelRef}
            tabIndex={-1}
            aria-label="Chi tiết đơn gửi VP"
            hidden={!selected}
            className="absolute inset-0 z-10 overflow-y-auto border-l bg-white p-4 shadow-lg outline-none md:static md:w-[360px] md:shrink-0 lg:w-[400px]"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {selected?.orderNumber || selected?.externalOrderId}
              </h3>
              <button
                type="button"
                aria-label="Đóng chi tiết đơn"
                className="rounded border px-2 py-1 text-xs"
                onClick={closePanel}
              >
                Xong
              </button>
            </div>
            {selected && preview ? (
              <fieldset disabled={submitted} className="space-y-3">
                <label className="grid gap-1 text-xs">
                  SĐT người nhận
                  <input
                    aria-label={`SĐT ${selected.externalOrderId}`}
                    className="w-full rounded border p-2 text-sm"
                    value={preview.receiver.phone}
                    onChange={(e) =>
                      patch(selected.id, (p) => ({
                        ...p,
                        receiver: { ...p.receiver, phone: e.target.value },
                      }))
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["weight", "length", "width", "height"] as const).map(
                    (key) => (
                      <label key={key} className="grid gap-1 text-xs">
                        {packageLabels[key]}
                        <input
                          aria-label={`${key} ${selected.externalOrderId}`}
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-full rounded border p-2 text-sm"
                          value={
                            preview.package[key] * (key === "weight" ? 1000 : 1)
                          }
                          onChange={(e) =>
                            patch(selected.id, (p) => ({
                              ...p,
                              package: {
                                ...p.package,
                                [key]:
                                  Number(e.target.value) /
                                  (key === "weight" ? 1000 : 1),
                              },
                            }))
                          }
                        />
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-slate-500">
                {selected
                  ? rows[selected.id]?.error || "Đang tải chi tiết…"
                  : ""}
              </p>
            )}
            {orders.map((order) => {
              const row = rows[order.id];
              return row?.detail && row.preview ? (
                <div key={order.id} hidden={order.id !== selectedId}>
                  <VpDeclarationEditor
                    panel
                    reloadKey={reloadKey}
                    key={row.preview.receiver.countryCode}
                    items={row.detail.items}
                    country={row.preview.receiver.countryCode}
                    disabled={submitted}
                    onLookupState={(state) =>
                      setLookup((current) => ({
                        ...current,
                        [order.id]: state,
                      }))
                    }
                    onChange={(value) =>
                      setDeclarations((current) => ({
                        ...current,
                        [order.id]: value,
                      }))
                    }
                  />
                </div>
              ) : null;
            })}
          </aside>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-5 py-4">
          <p className="text-sm text-slate-600" aria-live="polite">
            <strong className="text-slate-900">
              {valid.length} đơn sẵn sàng
            </strong>{" "}
            · {orders.length - valid.length} đơn cần bổ sung
          </p>
          <button
            type="button"
            className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            disabled={
              loading ||
              submitted ||
              !accountId ||
              !valid.length ||
              orders.length > 10
            }
            onClick={() => {
              setSubmitted(true);
              onSubmit(
                valid.map((o) => {
                  const p = rows[o.id].preview!;
                  return {
                    orderId: o.id,
                    orderNumber: o.orderNumber || o.externalOrderId,
                    environment: "live",
                    carrierAccountId: accountId,
                    options: {
                      ...buildShipOptions(
                        p,
                        p.shippingMethodCode,
                        p.receiver,
                        p.package,
                        p.useIoss,
                        p.iossNumber,
                        p.parcels,
                      ),
                      vpDeclarations: declarations[o.id].items,
                    },
                  };
                }),
                autoPrint,
                mode,
              );
            }}
          >
            Gửi {valid.length} đơn &amp; lấy nhãn
          </button>
        </footer>
      </div>
    </div>
  );
}
