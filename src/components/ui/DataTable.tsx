import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  sortable?: boolean;
  render: (row: T, index: number) => ReactNode;
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type DataTableSort = {
  key: string;
  direction: "asc" | "desc";
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pagination,
  onPageChange,
  onRowClick,
  onSortChange,
  sort,
  empty,
}: {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  getRowKey: (row: T) => string;
  pagination: DataTablePagination;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  onSortChange?: (sort: DataTableSort) => void;
  sort?: DataTableSort;
  empty?: ReactNode;
}) {
  const start =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalItems,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    "border-b border-slate-200 px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500",
                    column.className,
                  )}
                  key={column.key}
                  scope="col"
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 rounded hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={() =>
                        onSortChange?.({
                          key: column.key,
                          direction:
                            sort?.key === column.key &&
                            sort.direction === "desc"
                              ? "asc"
                              : "desc",
                        })
                      }
                      type="button"
                    >
                      <span>{column.header}</span>
                      <span aria-hidden className="text-slate-400">
                        {sort?.key === column.key
                          ? sort.direction === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length ? (
              data.map((row, index) => (
                <tr
                  className={cn(
                    "h-10 text-[13px] text-slate-600 transition-colors",
                    onRowClick
                      ? "cursor-pointer hover:bg-slate-50/80"
                      : undefined,
                  )}
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {columns.map((column) => (
                    <td
                      className={cn(
                        "px-3.5 py-2 align-middle text-[13px]",
                        column.className,
                      )}
                      key={column.key}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-sm text-slate-500">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Hiển thị <span className="font-medium text-slate-800">{start}</span>–<span className="font-medium text-slate-800">{end}</span> trong <span className="font-medium text-slate-800">{pagination.totalItems}</span> mục
        </span>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            type="button"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Trước
          </button>
          <span className="min-w-16 text-center text-xs text-slate-600">
            Trang {pagination.totalPages ? pagination.page : 0} /{" "}
            {pagination.totalPages}
          </span>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              pagination.totalPages === 0 ||
              pagination.page >= pagination.totalPages
            }
            onClick={() =>
              onPageChange(
                Math.min(pagination.totalPages, pagination.page + 1),
              )
            }
            type="button"
          >
            Sau
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
