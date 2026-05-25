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
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-[var(--border)]">
          <thead className="bg-[var(--bg-surface2)]">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    "border-b border-[var(--border)] px-3.5 py-[9px] text-[11px] tracking-[0.04em] text-[var(--text-muted)]",
                    column.className,
                  )}
                  key={column.key}
                  scope="col"
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                      <span aria-hidden>
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
          <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
            {data.length ? (
              data.map((row, index) => (
                <tr
                  className={cn(
                    "h-11 text-xs text-[var(--text-secondary)]",
                    onRowClick
                      ? "cursor-pointer hover:bg-[var(--brand-light)]"
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
                        "border-b border-[var(--border)] px-3.5 py-2.5 align-middle text-xs",
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
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-3.5 py-[11px] text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {start}-{end} of {pagination.totalItems}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-1 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Prev
          </button>
          <span className="min-w-20 text-center text-[11px] text-[var(--text-muted)]">
            {pagination.totalPages ? pagination.page : 0} /{" "}
            {pagination.totalPages}
          </span>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-mid)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
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
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
