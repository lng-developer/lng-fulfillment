"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { WarningBox } from "@/components/ui/WarningBox";
import { getErrorMessage } from "@/lib/api/base";
import { saveCredential } from "@/lib/api/carrier-accounts";
import { toastError } from "@/lib/toast";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { CarrierAccount, CredentialFormValues } from "@/types/settings";

const EMPTY_FORM: CredentialFormValues = {
  customerNo: "",
  apiSecret: "",
  baseUrl: "http://oms.api.yunexpress.com",
  lang: "en-US",
  shippingMethodCode: "THZXR",
  sourceCode: "API",
  sizeUnit: "cm",
  liveEnabled: false,
};

export function CredentialForm({
  account,
  onCancel,
  onSaved,
}: {
  account: CarrierAccount;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<CredentialFormValues>(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLFormElement>(
    true,
    isPending ? undefined : onCancel,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      await saveCredential(account.id, values);
      setValues(EMPTY_FORM);
      onSaved();
    } catch (error) {
      setValues((current) => ({ ...current, apiSecret: "" }));
      setError(getErrorMessage(error));
      toastError("Failed to save credential.");
      setIsPending(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
    >
      <form
        autoComplete="off"
        className="max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-y-auto rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-md"
        onSubmit={submit}
        ref={trapRef}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {account.displayName} - Manage Credential
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Customer No *
            <input
              autoComplete="off"
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  customerNo: event.target.value,
                }))
              }
              required
              value={values.customerNo}
            />
          </label>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            API Secret *
            <span className="flex">
              <input
                autoComplete="off"
                className="h-9 min-w-0 flex-1 rounded-l-sm border border-r-0 border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    apiSecret: event.target.value,
                  }))
                }
                required
                spellCheck={false}
                type={showSecret ? "text" : "password"}
                value={values.apiSecret}
              />
              <button
                className="inline-flex h-9 items-center gap-2 rounded-r-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
                onClick={() => setShowSecret((value) => !value)}
                type="button"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
                {showSecret ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Base URL
            <input
              autoComplete="off"
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  baseUrl: event.target.value,
                }))
              }
              value={values.baseUrl}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
              Language
              <select
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    lang: event.target.value,
                  }))
                }
                value={values.lang}
              >
                <option value="en-US">en-US</option>
                <option value="zh-CN">zh-CN</option>
              </select>
            </label>

            <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
              Size Unit
              <select
                className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    sizeUnit: event.target.value as "cm" | "inch",
                  }))
                }
                value={values.sizeUnit}
              >
                <option value="cm">cm</option>
                <option value="inch">inch</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Shipping Method Code
            <input
              autoComplete="off"
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  shippingMethodCode: event.target.value,
                }))
              }
              value={values.shippingMethodCode}
            />
          </label>

          <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            Source Code
            <input
              autoComplete="off"
              className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  sourceCode: event.target.value,
                }))
              }
              value={values.sourceCode}
            />
          </label>

          <div className="border-t border-[var(--border)] pt-4">
            <label className="flex items-center gap-3 text-xs font-semibold text-[var(--text-primary)]">
              <input
                checked={values.liveEnabled}
                className="h-4 w-4 rounded border-[var(--border-strong)]"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    liveEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Enable live mode
            </label>
            {values.liveEnabled ? (
              <div className="mt-3">
                <WarningBox
                  message="WARNING - LIVE MODE: Enabling live mode will send REAL orders to YunExpress OMS. Only enable after credentials are verified against the production system."
                  variant="danger"
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-sm border border-[#fca5a5] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-[11px]">
          <button
            className="h-9 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : "Save Credential"}
          </button>
        </div>
      </form>
    </div>
  );
}
