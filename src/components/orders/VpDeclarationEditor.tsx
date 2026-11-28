"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch, type ApiSuccessEnvelope } from "@/lib/api/base";
import {
  vpDeclarationIssue,
  type VpDeclaration,
  type VpSkuMapping,
} from "@/shared/vp-declarations";

export type VpDeclarationState = {
  country: string;
  items: VpDeclaration[];
  issue: string | null;
};
type Item = {
  id: string;
  sku: string | null;
  name?: string | null;
  title?: string | null;
  quantity: number;
};
export function VpDeclarationEditor({
  items,
  country,
  disabled = false,
  onChange,
  panel = false,
  reloadKey = 0,
  onLookupState,
}: {
  items: Item[];
  country: string;
  disabled?: boolean;
  panel?: boolean;
  reloadKey?: number;
  onLookupState?: (state: "loading" | "ready" | "error") => void;
  onChange: (state: VpDeclarationState) => void;
}) {
  const signature = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.title ?? i.name,
      quantity: i.quantity,
    })),
  );
  const [rows, setRows] = useState<Record<string, VpDeclaration>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const dirty = useRef(new Set<string>());
  const notify = useRef(onChange);
  notify.current = onChange;
  const lookupNotify = useRef(onLookupState);
  lookupNotify.current = onLookupState;
  const sourceKey = useRef("");
  const countryCode = country.trim().toUpperCase();
  useEffect(() => {
    const controller = new AbortController();
    const source: Item[] = JSON.parse(signature);
    const key = signature + countryCode;
    if (sourceKey.current !== key) {
      dirty.current = new Set();
      setRows({});
      setSources({});
      sourceKey.current = key;
    }
    setMessage("");
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      lookupNotify.current?.("ready");
      return () => controller.abort();
    }
    lookupNotify.current?.("loading");
    const query = new URLSearchParams({ country: countryCode });
    [
      ...new Set(source.flatMap((i) => (i.sku?.trim() ? [i.sku.trim()] : []))),
    ].forEach((s) => query.append("sku", s));
    void apiFetch<ApiSuccessEnvelope<{ mappings: VpSkuMapping[] }>>(
      `/api/tenants/current/vp-merchandise?${query}`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        lookupNotify.current?.("ready");
        const mappings = new Map(
          result.data.mappings.map((m) => [m.skuCode, m]),
        );
        setSources(
          Object.fromEntries(
            source.map((item) => {
              const mapping = mappings.get(item.sku?.trim() ?? "");
              return [
                item.id,
                mapping?.mappingType === "GROUP"
                  ? `Nhóm ${mapping.matchedKey ?? ""}`
                  : mapping
                    ? "SKU đầy đủ"
                    : "",
              ];
            }),
          ),
        );
        setRows((current) => {
          const next = { ...current };
          for (const item of source) {
            const mapping = mappings.get(item.sku?.trim() ?? "");
            if (!dirty.current.has(item.id))
              next[item.id] = {
                orderItemId: item.id,
                declarationName: mapping?.declarationName ?? "",
                merchandiseCode: mapping?.merchandiseCode ?? "",
              };
          }
          return next;
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          lookupNotify.current?.("error");
          setMessage("Chưa tải được mapping. Mở màn quản lý hoặc thử tải lại.");
        }
      });
    return () => controller.abort();
  }, [signature, countryCode, revision, reloadKey]);
  const declarations = items.map(
    (i) =>
      rows[i.id] ?? {
        orderItemId: i.id,
        declarationName: "",
        merchandiseCode: "",
      },
  );
  const issue = /^[A-Z]{2}$/.test(countryCode)
    ? vpDeclarationIssue(declarations)
    : "Thiếu mã nước đến.";
  useEffect(() => {
    notify.current({
      country: countryCode,
      items: JSON.parse(JSON.stringify(declarations)),
      issue,
    });
  }, [JSON.stringify(declarations), countryCode, issue]); // eslint-disable-line react-hooks/exhaustive-deps
  function update(id: string, patch: Partial<VpDeclaration>) {
    dirty.current.add(id);
    setRows((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          orderItemId: id,
          declarationName: "",
          merchandiseCode: "",
        }),
        ...patch,
      },
    }));
  }
  async function save(item: Item, value: VpDeclaration) {
    if (!item.sku || saving || vpDeclarationIssue([value])) return;
    setSaving(item.id);
    setMessage("");
    try {
      await apiFetch("/api/tenants/current/vp-merchandise", {
        method: "PUT",
        body: JSON.stringify({
          mappingType: "SKU",
          skuCode: item.sku,
          destinationCountryCode: countryCode,
          declarationName: value.declarationName,
          merchandiseCode: value.merchandiseCode,
        }),
      });
      setMessage(
        `Đã lưu mapping ${item.sku} → ${countryCode}. Mã sẽ được xác minh trên VP khi gửi.`,
      );
    } catch {
      setMessage(
        "Không lưu được mapping. Kiểm tra quyền truy cập hoặc thử lại.",
      );
    } finally {
      setSaving(null);
    }
  }
  return (
    <fieldset
      disabled={disabled}
      className="my-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2"
    >
      <legend className="text-sm font-semibold">
        Khai báo hàng hóa VP · {countryCode || "Chưa có nước đến"}
      </legend>
      {!panel && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={issue ? "text-amber-800" : "text-emerald-700"}>
            {issue
              ? "Cần bổ sung/kiểm tra khai báo"
              : `Đủ khai báo · ${items.length} item`}
          </span>
          <div className="flex gap-3">
            <a
              className="text-indigo-700 underline"
              href={`/settings?tab=vp-merchandise&sku=${encodeURIComponent(items.find((i) => i.sku)?.sku ?? "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Quản lý mapping SKU
            </a>
            <button
              type="button"
              className="text-indigo-700"
              onClick={() => setRevision((v) => v + 1)}
            >
              Tải lại mapping
            </button>
          </div>
        </div>
      )}
      {message && (!panel || !message.startsWith("Chưa tải")) && (
        <p role="status" className="mt-1 text-xs">
          {message}
        </p>
      )}
      <details className="mt-2" open={panel || undefined}>
        <summary
          className={
            panel
              ? "hidden"
              : "cursor-pointer text-xs font-medium text-slate-600"
          }
        >
          Chỉnh riêng lần gửi này
        </summary>
        {!panel && (
          <p className="my-2 text-xs text-slate-600">
            Điền tên hàng thực tế và mã merchandise/HS từ danh mục VP. Sửa áp
            dụng cho lần gửi này; bấm Lưu mapping để dùng cho các đơn sau. Không
            tự phân loại từ tên listing.
          </p>
        )}
        {items.map((item, index) => {
          const value = declarations[index];
          return (
            <div
              key={item.id}
              className={
                panel
                  ? "mb-3 grid gap-3 rounded border bg-white p-3"
                  : "mb-2 grid gap-2 rounded border bg-white p-2 sm:grid-cols-[1fr_1fr_140px_auto]"
              }
            >
              <div className="text-xs">
                <strong>{item.sku || "Không có SKU"}</strong>
                {sources[item.id] && (
                  <p className="text-indigo-700">
                    {dirty.current.has(item.id)
                      ? "Chỉnh riêng lần gửi này"
                      : `Mapping: ${sources[item.id]}`}
                  </p>
                )}
                <p>{item.title ?? item.name}</p>
                <span>Số lượng: {item.quantity}</span>
              </div>
              <label className="text-xs">
                Tên khai báo
                <input
                  aria-label={`Tên khai báo VP ${item.id}`}
                  maxLength={200}
                  className="mt-1 w-full rounded border p-2"
                  value={value.declarationName}
                  onChange={(e) =>
                    update(item.id, { declarationName: e.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                Mã merchandise/HS
                <input
                  aria-label={`Mã merchandise VP ${item.id}`}
                  inputMode="numeric"
                  maxLength={12}
                  className="mt-1 w-full rounded border p-2"
                  value={value.merchandiseCode}
                  onChange={(e) =>
                    update(item.id, { merchandiseCode: e.target.value.trim() })
                  }
                />
              </label>
              <button
                type="button"
                disabled={
                  !item.sku ||
                  Boolean(saving) ||
                  Boolean(vpDeclarationIssue([value])) ||
                  !/^[A-Z]{2}$/.test(countryCode)
                }
                onClick={() => void save(item, value)}
                className="self-end rounded border px-2 py-2 text-xs disabled:opacity-40"
              >
                {saving === item.id ? "Đang lưu…" : "Lưu mapping"}
              </button>
            </div>
          );
        })}
        {issue && <p className="text-xs text-amber-800">{issue}</p>}
      </details>
    </fieldset>
  );
}
