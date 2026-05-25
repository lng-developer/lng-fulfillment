"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <button
      aria-label={label}
      className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] hover:text-[var(--brand)]"
      onClick={copyValue}
      title={label}
      type="button"
    >
      {copied ? (
        <Check className="h-4 w-4 text-[var(--success)]" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
