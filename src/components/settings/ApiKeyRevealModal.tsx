"use client";

import { Check, Clipboard, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function ApiKeyRevealModal({
  plaintext,
  onClose,
}: {
  plaintext: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  async function copyKey() {
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(26,29,58,0.4)] p-4 backdrop-blur-[2px]"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        ref={trapRef}
      >
        <div className="flex items-start gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-[var(--success-bg)] text-[var(--success)]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              API Key Created
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              This key is visible only once.
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-sm border border-[#fcd34d] bg-[var(--warning-bg)] p-4 text-xs text-[var(--warning-text)]">
            <p className="font-semibold">Copy this key now</p>
            <p className="mt-1">
              It will not be shown again after you close this dialog.
            </p>
          </div>

          <div className="select-all break-all rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] p-3 font-mono text-xs text-[var(--text-primary)]">
            {plaintext}
          </div>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            onClick={copyKey}
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[var(--success)]" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" aria-hidden />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 w-full rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
            onClick={onClose}
            type="button"
          >
            I have copied this key - Close
          </button>
        </div>
      </div>
    </div>
  );
}
