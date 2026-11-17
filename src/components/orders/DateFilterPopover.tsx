"use client";

import { useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateFilterPopoverProps = {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
};

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(ymd: string): string {
  if (!ymd) return "...";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function DateFilterPopover({
  fromDate,
  toDate,
  onChange,
}: DateFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(fromDate);
  const [customTo, setCustomTo] = useState(toDate);

  const now = new Date();
  const today = formatYMD(now);
  const yesterday = formatYMD(new Date(now.getTime() - 86400000));
  const sevenDaysAgo = formatYMD(new Date(now.getTime() - 6 * 86400000));
  const thirtyDaysAgo = formatYMD(new Date(now.getTime() - 29 * 86400000));
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const PRESETS = [
    { label: "Hôm nay", from: today, to: today },
    { label: "Hôm qua", from: yesterday, to: yesterday },
    { label: "7 ngày qua", from: sevenDaysAgo, to: today },
    { label: "30 ngày qua", from: thirtyDaysAgo, to: today },
    { label: "Tháng này", from: firstDayOfMonth, to: today },
  ];

  // Detect active preset
  let activePresetLabel: string | null = null;
  for (const preset of PRESETS) {
    if (fromDate === preset.from && toDate === preset.to) {
      activePresetLabel = preset.label;
      break;
    }
  }

  const hasFilter = Boolean(fromDate || toDate);

  function handleSelectPreset(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    onChange(from, to);
    setIsOpen(false);
  }

  function handleApplyCustom() {
    onChange(customFrom, customTo);
    setIsOpen(false);
  }

  function handleClear() {
    setCustomFrom("");
    setCustomTo("");
    onChange("", "");
    setIsOpen(false);
  }

  // Label to show on the button trigger
  let triggerLabel = "Lọc ngày";
  if (activePresetLabel) {
    triggerLabel = activePresetLabel;
  } else if (fromDate && toDate) {
    triggerLabel = `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;
  } else if (fromDate) {
    triggerLabel = `Từ ${formatDisplayDate(fromDate)}`;
  } else if (toDate) {
    triggerLabel = `Đến ${formatDisplayDate(toDate)}`;
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <div
        className={cn(
          "inline-flex items-center gap-2 h-9 rounded-md border px-3 text-xs font-medium shadow-sm transition-colors cursor-pointer select-none",
          hasFilter
            ? "border-indigo-300 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/70"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        )}
        onClick={() => {
          setCustomFrom(fromDate);
          setCustomTo(toDate);
          setIsOpen(!isOpen);
        }}
      >
        <Calendar
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            hasFilter ? "text-indigo-600" : "text-slate-400",
          )}
        />
        <span>{triggerLabel}</span>
        {hasFilter ? (
          <button
            className="rounded p-0.5 hover:bg-indigo-200/60 text-indigo-600 ml-0.5"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Xóa lọc ngày"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown className="h-3 w-3 text-slate-400" />
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 sm:right-auto z-40 mt-1.5 w-80 rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-dropdown animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-2.5 font-semibold text-slate-800 flex items-center justify-between">
              <span>Khoảng thời gian</span>
              {hasFilter && (
                <button
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-normal"
                  onClick={handleClear}
                  type="button"
                >
                  Đặt lại
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {PRESETS.map((p) => {
                const isActive = fromDate === p.from && toDate === p.to;
                return (
                  <button
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                    )}
                    key={p.label}
                    onClick={() => handleSelectPreset(p.from, p.to)}
                    type="button"
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                className={cn(
                  "rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors",
                  !hasFilter
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                )}
                onClick={handleClear}
                type="button"
              >
                Tất cả
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                Tùy chọn khoảng ngày
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Từ ngày
                  </label>
                  <input
                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => setCustomFrom(e.target.value)}
                    type="date"
                    value={customFrom}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Đến ngày
                  </label>
                  <input
                    className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => setCustomTo(e.target.value)}
                    type="date"
                    value={customTo}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Đóng
                </button>
                <button
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  onClick={handleApplyCustom}
                  type="button"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
