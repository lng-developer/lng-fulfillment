"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const LIVE_CONFIRM_TEXT = "SHIP YUNEXPRESS LIVE";

export function LiveConfirmInput({
  onMatch,
  disabled = false,
}: {
  onMatch: (matched: boolean) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const matched = value === LIVE_CONFIRM_TEXT;

  useEffect(() => {
    onMatch(matched);
  }, [matched, onMatch]);

  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
        Type to confirm:
      </div>
      <div className="mb-2 select-all rounded border border-[var(--border)] bg-[var(--bg-surface2)] px-2 py-1 font-mono text-[11px] text-[var(--text-muted)]">
        {LIVE_CONFIRM_TEXT}
      </div>
      <input
        autoComplete="off"
        className={cn(
          "w-full rounded-sm border bg-[var(--bg-surface)] px-3 py-2 font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.2)] disabled:cursor-not-allowed disabled:opacity-60",
          matched
            ? "border-[var(--success)] text-[var(--success)]"
            : "border-[var(--border-strong)] text-[var(--text-primary)]",
        )}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type confirmation text..."
        spellCheck={false}
        type="text"
        value={value}
      />
      {value.length > 0 && !matched ? (
        <div className="mt-1 text-[10px] text-[var(--danger)]">
          Text does not match
        </div>
      ) : null}
    </div>
  );
}
