"use client";
import { useEffect, useState } from "react";
import {
  apiFetch,
  getErrorMessage,
  type ApiSuccessEnvelope,
} from "@/lib/api/base";
import { Button } from "@/components/ui/Button";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { dismissOnBackdrop } from "@/lib/modal-backdrop";
import { toastSuccess, toastError } from "@/lib/toast";
import {
  vpDeclarationIssue,
  type VpSkuMapping,
} from "@/shared/vp-declarations";
const endpoint = "/api/tenants/current/vp-merchandise";
export function VpMerchandiseTab({
  initialSearch = "",
}: {
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch),
    [country, setCountry] = useState("");
  const [filter, setFilter] = useState({ search: initialSearch, country: "" });
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ mappings: VpSkuMapping[]; total: number }>(
    { mappings: [], total: 0 },
  );
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [editor, setEditor] = useState<{
    mapping: VpSkuMapping;
    isNew: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState<VpSkuMapping | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      manage: "1",
      search: filter.search,
      country: filter.country,
      page: String(page),
    });
    void apiFetch<
      ApiSuccessEnvelope<{ mappings: VpSkuMapping[]; total: number }>
    >(`${endpoint}?${query}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.data);
          if (page > 1 && !result.data.mappings.length) setPage(page - 1);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không tải được danh sách mapping. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter, page, revision]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Khai báo hàng hóa VP theo SKU
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo nước đến: ưu tiên SKU đầy đủ, sau đó đến nhóm SKU (ví dụ ACO).
          </p>
        </div>
        <Button
          onClick={() =>
            setEditor({
              isNew: true,
              mapping: {
                mappingType: "SKU",
                skuCode: search.trim(),
                destinationCountryCode: country || "US",
                declarationName: "",
                merchandiseCode: "",
              },
            })
          }
        >
          Thêm mapping
        </Button>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setFilter({ search: search.trim(), country });
        }}
      >
        <input
          aria-label="Tìm mapping"
          className="min-w-64 rounded border px-3 py-2 text-sm"
          placeholder="Tìm SKU, nhóm, tên khai báo, mã HS"
          value={search}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          aria-label="Lọc nước đến"
          className="w-32 rounded border px-3 py-2 text-sm"
          placeholder="Nước đến: US"
          maxLength={2}
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />
        <Button type="submit" variant="secondary">
          Tìm kiếm
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setRevision((v) => v + 1)}
        >
          Làm mới
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải mapping…</p>
      ) : (
        !error && (
          <>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Loại",
                      "SKU / nhóm",
                      "Nước đến",
                      "Tên khai báo",
                      "Mã merchandise/HS",
                      "Thao tác",
                    ].map((title) => (
                      <th key={title} className="p-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.mappings.map((mapping) => (
                    <tr
                      key={`${mapping.mappingType ?? "SKU"}:${mapping.skuCode}:${mapping.destinationCountryCode}`}
                      className="border-t"
                    >
                      <td className="p-3">
                        {mapping.mappingType === "GROUP"
                          ? "Nhóm SKU"
                          : "SKU đầy đủ"}
                      </td>
                      <td className="p-3 font-mono">{mapping.skuCode}</td>
                      <td className="p-3">{mapping.destinationCountryCode}</td>
                      <td className="p-3">{mapping.declarationName}</td>
                      <td className="p-3 font-mono">
                        {mapping.merchandiseCode}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditor({ isNew: false, mapping })}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(mapping)}
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!data.mappings.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-slate-500"
                      >
                        Chưa có mapping phù hợp. Thêm mapping để khai báo SKU
                        này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>
                {data.total} mapping · Trang {page}/
                {Math.max(1, Math.ceil(data.total / 20))}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )
      )}
      {editor && (
        <MappingForm
          mapping={editor.mapping}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setRevision((v) => v + 1);
            toastSuccess("Đã lưu mapping VP.");
          }}
        />
      )}
      {deleting && (
        <ConfirmationModal
          title="Xóa mapping VP"
          description={`Xóa ${deleting.mappingType === "GROUP" ? "nhóm" : "SKU"} ${deleting.skuCode} / ${deleting.destinationCountryCode}? Các đơn gửi sau sẽ cần khai báo lại. Vận đơn đã tạo không thay đổi.`}
          confirmLabel="Xóa mapping"
          variant="danger"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await apiFetch(endpoint, {
                method: "DELETE",
                body: JSON.stringify(deleting),
              });
              setDeleting(null);
              setRevision((v) => v + 1);
              toastSuccess("Đã xóa mapping VP.");
            } catch (cause) {
              toastError(getErrorMessage(cause));
            }
          }}
        />
      )}
    </section>
  );
}
function MappingForm({
  mapping,
  isNew,
  onClose,
  onSaved,
}: {
  mapping: VpSkuMapping;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(mapping),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const ref = useFocusTrap<HTMLFormElement>(
    true,
    pending ? undefined : onClose,
  );
  const groupInvalid =
    value.mappingType === "GROUP" &&
    !/^[A-Za-z0-9]{1,50}$/.test(value.skuCode.trim());
  const issue = vpDeclarationIssue([
    {
      orderItemId: "mapping",
      declarationName: value.declarationName,
      merchandiseCode: value.merchandiseCode,
    },
  ]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      pending ||
      issue ||
      groupInvalid ||
      !value.skuCode.trim() ||
      !/^[A-Z]{2}$/.test(value.destinationCountryCode)
    )
      return;
    setPending(true);
    setError("");
    try {
      await apiFetch(endpoint, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(value),
      });
      onSaved();
    } catch (cause) {
      setError(getErrorMessage(cause));
      setPending(false);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? "Thêm mapping VP" : "Sửa mapping VP"}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={(e) => dismissOnBackdrop(e, onClose, pending)}
    >
      <form
        ref={ref}
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold">
          {isNew ? "Thêm" : "Sửa"} mapping VP
        </h3>
        <label className="block text-sm">
          Áp dụng cho
          <select
            aria-label="Loại mapping"
            className="mt-1 w-full rounded border p-2"
            disabled={pending || !isNew}
            value={value.mappingType ?? "SKU"}
            onChange={(e) =>
              setValue({
                ...value,
                mappingType: e.target.value as "SKU" | "GROUP",
                skuCode: "",
              })
            }
          >
            <option value="SKU">SKU đầy đủ</option>
            <option value="GROUP">Nhóm SKU</option>
          </select>
        </label>
        {value.mappingType === "GROUP" && (
          <p className="text-xs text-slate-500">
            Ví dụ J2605-ACO-13112026-A11 thuộc nhóm ACO. Mapping SKU đầy đủ được
            ưu tiên hơn nhóm.
          </p>
        )}
        {(
          [
            {
              key: "skuCode",
              label: value.mappingType === "GROUP" ? "Mã nhóm SKU" : "SKU",
              max: value.mappingType === "GROUP" ? 50 : 200,
            },
            { key: "destinationCountryCode", label: "Nước đến", max: 2 },
            { key: "declarationName", label: "Tên khai báo", max: 200 },
            { key: "merchandiseCode", label: "Mã merchandise/HS", max: 12 },
          ] as const
        ).map((field) => (
          <label key={field.key} className="block text-sm">
            {field.label}
            <input
              required
              maxLength={field.max}
              disabled={pending}
              readOnly={
                !isNew &&
                ["skuCode", "destinationCountryCode"].includes(field.key)
              }
              className="mt-1 w-full rounded border p-2 read-only:bg-slate-100"
              value={value[field.key]}
              onChange={(e) =>
                setValue({
                  ...value,
                  [field.key]:
                    field.key === "destinationCountryCode" ||
                    (field.key === "skuCode" && value.mappingType === "GROUP")
                      ? e.target.value.toUpperCase()
                      : e.target.value,
                })
              }
            />
          </label>
        ))}
        <p className="text-xs text-slate-500">
          Dùng mã từ danh mục VP và tên hàng đúng thực tế. Mã được kiểm tra với
          VP khi gửi đơn.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              Boolean(issue) ||
              groupInvalid ||
              !value.skuCode.trim() ||
              !/^[A-Z]{2}$/.test(value.destinationCountryCode)
            }
          >
            {pending ? "Đang lưu…" : "Lưu mapping"}
          </Button>
        </div>
      </form>
    </div>
  );
}
