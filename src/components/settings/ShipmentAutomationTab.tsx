"use client";

import {
  BadgeCheck,
  Bot,
  Globe2,
  Plus,
  Route,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { getErrorMessage } from "@/lib/api/base";
import {
  createSkuShippingMethodMapping,
  deleteSkuShippingMethodMapping,
  getShipmentAutomationConfig,
  getTenantYunIossSetting,
  updateShipmentAutomationSetting,
  updateSkuShippingMethodMapping,
  updateTenantYunIossSetting,
} from "@/lib/api/shipment-automation";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { EU_COUNTRY_OPTIONS } from "@/shared/eu-countries";
import { YUN_PRODUCT_OPTIONS } from "@/shared/yun-product-options";
import type {
  ShipmentAutomationConfig,
  SkuShippingMethodMapping,
  TenantYunIossSetting,
} from "@/types/settings";

const SHIPPING_METHOD_OPTIONS = ["VN-YTYCPREC", "VNFZZXR", "VNTHZXR"] as const;
const COUNTRY_OPTIONS = [
  { code: "US", label: "Mỹ" },
  { code: "GB", label: "Anh" },
  { code: "CA", label: "Canada" },
  ...EU_COUNTRY_OPTIONS,
] as const;

function sortMappings(mappings: SkuShippingMethodMapping[]) {
  return [...mappings].sort(
    (a, b) =>
      a.skuCode.localeCompare(b.skuCode) ||
      a.destinationCountryCode.localeCompare(b.destinationCountryCode),
  );
}

function formatCountry(code: string) {
  const country = COUNTRY_OPTIONS.find((option) => option.code === code);
  return country ? `${country.label} (${country.code})` : code;
}

export function ShipmentAutomationTab({ role }: { role: Role }) {
  const canManage = can.manageShipmentAutomation(role);
  const [config, setConfig] = useState<ShipmentAutomationConfig | null>(null);
  const [iossSetting, setIossSetting] =
    useState<TenantYunIossSetting | null>(null);
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
        const [data, ioss] = await Promise.all([
          getShipmentAutomationConfig(controller.signal),
          getTenantYunIossSetting(controller.signal),
        ]);
        setConfig(data);
        setIossSetting(ioss);
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

      <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--brand)]">
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
          <StatusPill active={config.setting.autoCreateEnabled}>
            {config.setting.autoCreateEnabled ? "Automation on" : "Manual mode"}
          </StatusPill>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Runtime control
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Auto-create after Portal receive
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Uses active SKU-country mappings only; unmapped orders stay manual.
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
            </div>
          </div>
          <label className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-2.5">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Environment
            </span>
            <select
              className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-primary)]"
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
          </label>
        </div>
      </div>

      {iossSetting ? (
        <YunIossCard
          canManage={canManage}
          setting={iossSetting}
          onUpdated={setIossSetting}
        />
      ) : null}

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

function YunIossCard({
  canManage,
  setting,
  onUpdated,
}: {
  canManage: boolean;
  setting: TenantYunIossSetting;
  onUpdated: (setting: TenantYunIossSetting) => void;
}) {
  const [iossNumber, setIossNumber] = useState(setting.iossNumber ?? "");
  const [status, setStatus] =
    useState<TenantYunIossSetting["status"]>(setting.status);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIossNumber(setting.iossNumber ?? "");
    setStatus(setting.status);
  }, [setting]);

  async function save() {
    if (!canManage || isSaving) return;

    setIsSaving(true);
    try {
      const updated = await updateTenantYunIossSetting({
        iossNumber: iossNumber.trim() || null,
        status,
      });
      onUpdated(updated);
      toastSuccess("YunExpress IOSS updated.");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-emerald-200 bg-emerald-50 text-emerald-600">
          <ShieldCheck size={17} aria-hidden />
        </div>
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Etsy EU IOSS
            </div>
            <StatusPill active={status === "ACTIVE"}>
              {status === "ACTIVE" ? "Active" : "Disabled"}
            </StatusPill>
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Used only for Etsy orders shipped to EU countries. Amazon/manual
            orders are not blocked by this setting.
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface2)] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <Globe2 size={12} aria-hidden />
            EU tax code
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_auto]">
            <label className="grid gap-1 text-xs font-medium text-[var(--text-secondary)]">
              IOSS number
              <input
                className="h-10 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
                disabled={!canManage || isSaving}
                onChange={(event) => setIossNumber(event.target.value)}
                placeholder="IOSS261841515582105977183"
                value={iossNumber}
              />
            </label>
            <div className="flex items-end gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <div className="flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-3">
                <ToggleSwitch
                  ariaLabel="Toggle YunExpress IOSS"
                  checked={status === "ACTIVE"}
                  disabled={!canManage || isSaving}
                  onChange={(checked) => setStatus(checked ? "ACTIVE" : "DISABLED")}
                />
                Active
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <BadgeCheck size={12} className="text-emerald-600" aria-hidden />
            Default:
            <span className="font-mono text-[var(--text-secondary)]">
              IOSS261841515582105977183
            </span>
          </div>
        </div>
        <div className="flex items-end">
          <button
            className="btn btn-primary inline-flex h-10 items-center gap-1.5 px-4"
            disabled={!canManage || isSaving}
            onClick={() => void save()}
            type="button"
          >
            <Save size={13} aria-hidden />
            Save IOSS
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-[var(--text-muted)]",
        )}
      />
      {children}
    </span>
  );
}

function MappingCreateForm({
  onCreated,
}: {
  onCreated: (mapping: SkuShippingMethodMapping) => void;
}) {
  const [skuCode, setSkuCode] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("US");
  const [shippingMethodCode, setShippingMethodCode] =
    useState<(typeof SHIPPING_METHOD_OPTIONS)[number]>("VN-YTYCPREC");
  const [productEName, setProductEName] = useState<string>(
    YUN_PRODUCT_OPTIONS[2].eName,
  );
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const selectedProduct =
    YUN_PRODUCT_OPTIONS.find((option) => option.eName === productEName) ??
    YUN_PRODUCT_OPTIONS[2];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!skuCode.trim()) return;

    setIsPending(true);
    try {
      const mapping = await createSkuShippingMethodMapping({
        skuCode: skuCode.trim().toUpperCase(),
        destinationCountryCode: destinationCountryCode.trim().toUpperCase(),
        shippingMethodCode,
        eName: selectedProduct.eName,
        cName: selectedProduct.cName,
        description: description.trim() || null,
      });
      setSkuCode("");
      setDestinationCountryCode("US");
      setProductEName(YUN_PRODUCT_OPTIONS[2].eName);
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
      className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft"
      onSubmit={submit}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--brand)]">
          <Route size={17} aria-hidden />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Add SKU shipping route
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Match SKU code and destination country to a YunExpress service.
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_150px_170px_190px_1fr_auto]">
        <LabeledField label="SKU code">
          <input
            className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
            onChange={(event) => setSkuCode(event.target.value)}
            placeholder="NK"
            value={skuCode}
          />
        </LabeledField>
        <LabeledField label="Country">
          <select
            className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
            onChange={(event) => setDestinationCountryCode(event.target.value)}
            value={destinationCountryCode}
          >
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Ship method">
          <select
            className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-[12px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
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
        </LabeledField>
        <LabeledField label="Product">
          <select
            className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
            onChange={(event) => setProductEName(event.target.value)}
            value={productEName}
          >
            {YUN_PRODUCT_OPTIONS.map((product) => (
              <option key={product.eName} value={product.eName}>
                {product.eName}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Description">
          <input
            className="h-9 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional note"
            value={description}
          />
        </LabeledField>
        <div className="flex items-end">
          <button
            className="btn btn-primary inline-flex h-9 w-full items-center justify-center gap-1.5 px-4 xl:w-auto"
            disabled={isPending}
            type="submit"
          >
            <Plus size={13} aria-hidden /> Add mapping
          </button>
        </div>
      </div>
    </form>
  );
}

function LabeledField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
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
            <th className="px-3 py-2 font-semibold">Country</th>
            <th className="px-3 py-2 font-semibold">Shipping Method</th>
            <th className="px-3 py-2 font-semibold">Product</th>
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
      <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">
        {formatCountry(mapping.destinationCountryCode)}
      </td>
      <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
        {mapping.shippingMethodCode}
      </td>
      <td className="px-3 py-2">
        <div className="text-[var(--text-primary)]">{mapping.eName || "-"}</div>
        <div className="text-[10px] text-[var(--text-muted)]">
          {mapping.cName || "-"}
        </div>
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
