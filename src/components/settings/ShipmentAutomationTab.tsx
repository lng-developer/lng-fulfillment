"use client";

import { Bot, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { getErrorMessage } from "@/lib/api/base";
import {
  createSkuShippingMethodMapping,
  deleteSkuShippingMethodMapping,
  getShipmentAutomationConfig,
  updateShipmentAutomationSetting,
  updateSkuShippingMethodMapping,
} from "@/lib/api/shipment-automation";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ShipmentAutomationConfig,
  SkuShippingMethodMapping,
} from "@/types/settings";

const SHIPPING_METHOD_OPTIONS = ["VN-YTYCPREC", "VNFZZXR", "VNTHZXR"] as const;

function sortMappings(mappings: SkuShippingMethodMapping[]) {
  return [...mappings].sort((a, b) => a.skuCode.localeCompare(b.skuCode));
}

export function ShipmentAutomationTab({ role }: { role: Role }) {
  const canManage = can.manageShipmentAutomation(role);
  const [config, setConfig] = useState<ShipmentAutomationConfig | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSavingSetting, setIsSavingSetting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConfig() {
      setState("loading");
      setLoadError(null);

      try {
        const data = await getShipmentAutomationConfig(controller.signal);
        setConfig(data);
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getErrorMessage(error));
          setState("error");
        }
      }
    }

    void loadConfig();

    return () => controller.abort();
  }, [reloadKey]);

  async function saveSetting(next: {
    autoCreateEnabled: boolean;
    environment: "test" | "live";
  }) {
    if (!canManage || !config) return;

    const previousSetting = config.setting;
    const optimisticSetting = { ...previousSetting, ...next };
    setIsSavingSetting(true);
    setConfig((current) =>
      current ? { ...current, setting: optimisticSetting } : current,
    );

    try {
      const setting = await updateShipmentAutomationSetting(next);
      setConfig((current) => (current ? { ...current, setting } : current));
      toastSuccess("Shipment automation updated.");
    } catch (error) {
      setConfig((current) =>
        current ? { ...current, setting: previousSetting } : current,
      );
      toastError(getErrorMessage(error));
    } finally {
      setIsSavingSetting(false);
    }
  }

  if (state === "loading") {
    return <LoadingSkeleton rows={4} />;
  }

  if (state === "error" || !config) {
    return (
      <ErrorState
        message={loadError ?? "Shipment automation could not be loaded."}
        retry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Shipment Automation
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Map SKU codes to YunExpress shipping methods for orders received from
          Portal.
        </p>
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--brand-light)] text-[var(--brand)]">
            <Bot size={17} aria-hidden />
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Auto-create shipment after Portal receive
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Orders without a complete SKU mapping are kept for manual ship.
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <ToggleSwitch
              ariaLabel="Toggle auto-create shipment after Portal receive"
              checked={config.setting.autoCreateEnabled}
              disabled={!canManage || isSavingSetting}
              onChange={(checked) =>
                void saveSetting({
                  autoCreateEnabled: checked,
                  environment: config.setting.environment,
                })
              }
            />
            Enabled
          </div>
          <select
            className="rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)]"
            disabled={!canManage || isSavingSetting}
            onChange={(event) =>
              void saveSetting({
                autoCreateEnabled: config.setting.autoCreateEnabled,
                environment: event.target.value === "test" ? "test" : "live",
              })
            }
            value={config.setting.environment}
          >
            <option value="live">Live Production</option>
            <option value="test">Test UAT</option>
          </select>
        </div>
      </div>

      {canManage ? (
        <MappingCreateForm
          onCreated={(mapping) => {
            setConfig((current) =>
              current
                ? {
                    ...current,
                    mappings: sortMappings([...current.mappings, mapping]),
                  }
                : current,
            );
          }}
        />
      ) : null}

      <MappingTable
        canManage={canManage}
        mappings={config.mappings}
        onDeleted={(mappingId) => {
          setConfig((current) =>
            current
              ? {
                  ...current,
                  mappings: current.mappings.filter(
                    (mapping) => mapping.id !== mappingId,
                  ),
                }
              : current,
          );
        }}
        onUpdated={(updatedMapping) => {
          setConfig((current) =>
            current
              ? {
                  ...current,
                  mappings: sortMappings(
                    current.mappings.map((mapping) =>
                      mapping.id === updatedMapping.id
                        ? updatedMapping
                        : mapping,
                    ),
                  ),
                }
              : current,
          );
        }}
      />
    </section>
  );
}

function MappingCreateForm({
  onCreated,
}: {
  onCreated: (mapping: SkuShippingMethodMapping) => void;
}) {
  const [skuCode, setSkuCode] = useState("");
  const [shippingMethodCode, setShippingMethodCode] =
    useState<(typeof SHIPPING_METHOD_OPTIONS)[number]>("VN-YTYCPREC");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!skuCode.trim()) return;

    setIsPending(true);
    try {
      const mapping = await createSkuShippingMethodMapping({
        skuCode: skuCode.trim().toUpperCase(),
        shippingMethodCode,
        description: description.trim() || null,
      });
      setSkuCode("");
      setDescription("");
      toastSuccess("SKU mapping created.");
      onCreated(mapping);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="grid gap-2 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft md:grid-cols-[1fr_180px_1fr_auto]"
      onSubmit={submit}
    >
      <input
        className="rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
        onChange={(event) => setSkuCode(event.target.value)}
        placeholder="SKU code, e.g. NK"
        value={skuCode}
      />
      <select
        className="rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
        onChange={(event) =>
          setShippingMethodCode(
            event.target.value as (typeof SHIPPING_METHOD_OPTIONS)[number],
          )
        }
        value={shippingMethodCode}
      >
        {SHIPPING_METHOD_OPTIONS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
      <input
        className="rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
        value={description}
      />
      <button className="btn btn-primary" disabled={isPending} type="submit">
        <Plus size={13} /> Add
      </button>
    </form>
  );
}

function MappingTable({
  canManage,
  mappings,
  onDeleted,
  onUpdated,
}: {
  canManage: boolean;
  mappings: SkuShippingMethodMapping[];
  onDeleted: (mappingId: string) => void;
  onUpdated: (mapping: SkuShippingMethodMapping) => void;
}) {
  if (!mappings.length) {
    return (
      <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <EmptyState
          description="Orders with unmapped SKU codes will wait for manual shipment."
          heading="No SKU mappings configured."
          icon={<Bot className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <table className="w-full text-left text-xs">
        <thead className="bg-[var(--bg-surface2)] text-[var(--text-muted)]">
          <tr>
            <th className="px-3 py-2 font-semibold">SKU Code</th>
            <th className="px-3 py-2 font-semibold">Shipping Method</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Description</th>
            <th className="px-3 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <MappingRow
              canManage={canManage}
              key={mapping.id}
              mapping={mapping}
              onDeleted={onDeleted}
              onUpdated={onUpdated}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MappingRow({
  canManage,
  mapping,
  onDeleted,
  onUpdated,
}: {
  canManage: boolean;
  mapping: SkuShippingMethodMapping;
  onDeleted: (mappingId: string) => void;
  onUpdated: (mapping: SkuShippingMethodMapping) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  async function toggleStatus() {
    const optimisticMapping: SkuShippingMethodMapping = {
      ...mapping,
      status: mapping.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
    };

    setIsPending(true);
    onUpdated(optimisticMapping);

    try {
      const updatedMapping = await updateSkuShippingMethodMapping(mapping.id, {
        status: optimisticMapping.status,
      });
      toastSuccess("SKU mapping updated.");
      onUpdated(updatedMapping);
    } catch (error) {
      onUpdated(mapping);
      toastError(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  async function remove() {
    setIsPending(true);
    try {
      await deleteSkuShippingMethodMapping(mapping.id);
      toastSuccess("SKU mapping deleted.");
      onDeleted(mapping.id);
    } catch (error) {
      toastError(getErrorMessage(error));
      setIsPending(false);
    }
  }

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-3 py-2 font-mono font-semibold text-[var(--brand)]">
        {mapping.skuCode}
      </td>
      <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
        {mapping.shippingMethodCode}
      </td>
      <td className="px-3 py-2">
        <ToggleSwitch
          ariaLabel={`${mapping.status === "ACTIVE" ? "Disable" : "Enable"} mapping ${mapping.skuCode}`}
          checked={mapping.status === "ACTIVE"}
          disabled={!canManage || isPending}
          onChange={() => void toggleStatus()}
        />
      </td>
      <td className="px-3 py-2 text-[var(--text-secondary)]">
        {mapping.description || "-"}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
          <button
            aria-label={`Delete mapping ${mapping.skuCode}`}
            className="btn btn-sm text-[var(--danger)]"
            disabled={!canManage || isPending}
            onClick={remove}
            type="button"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ToggleSwitch({
  ariaLabel,
  checked,
  disabled,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cn(
        "relative h-5 w-9 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-emerald-300 bg-emerald-100"
          : "border-[var(--border)] bg-[var(--bg-surface2)]",
      )}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
