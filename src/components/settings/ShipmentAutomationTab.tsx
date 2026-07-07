"use client";

import {
  Download,
  BadgeCheck,
  Bot,
  Globe2,
  Plus,
  Route,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
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
import {
  buildSkuMappingImportTemplateCsv,
  findExactSkuMappingImportMapping,
  formatSkuMappingImportApiError,
  isSkuMappingImportConflictError,
  parseSkuMappingImportCsv,
  resolveSkuMappingImportAction,
} from "@/lib/shipment-automation-import";
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

function mergeMappings(
  config: ShipmentAutomationConfig,
  mappings: SkuShippingMethodMapping[],
): ShipmentAutomationConfig {
  const byId = new Map(
    config.mappings.map((mapping) => [mapping.id, mapping] as const),
  );

  mappings.forEach((mapping) => {
    byId.set(mapping.id, mapping);
  });

  return {
    ...config,
    mappings: sortMappings([...byId.values()]),
  };
}

function mergeImportKnownMappings(
  mappings: SkuShippingMethodMapping[],
  mapping: SkuShippingMethodMapping,
) {
  const byId = new Map(mappings.map((item) => [item.id, item] as const));
  byId.set(mapping.id, mapping);
  return [...byId.values()];
}

export function ShipmentAutomationTab({ role }: { role: Role }) {
  const canManage = can.manageShipmentAutomation(role);
  const [config, setConfig] = useState<ShipmentAutomationConfig | null>(null);
  const [iossSetting, setIossSetting] = useState<TenantYunIossSetting | null>(
    null,
  );
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
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Shipment Automation
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Map SKU codes to YunExpress shipping methods for orders received
            from Portal.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
          <Route size={12} aria-hidden />
          {config.mappings.length} mappings
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Automation controls
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div className="text-[11px] text-[var(--text-muted)]">
            Portal receive -&gt; Yun shipment
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
          <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
            <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
              <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--brand)]">
                <Bot size={18} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Auto-create shipment
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Orders without a complete SKU-country mapping stay manual.
                </div>
              </div>
              <StatusPill active={config.setting.autoCreateEnabled}>
                {config.setting.autoCreateEnabled
                  ? "Automation on"
                  : "Manual mode"}
              </StatusPill>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Runtime control
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Auto-create after Portal receive
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      Uses active mappings only; unmapped orders wait for manual
                      ship.
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
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
                    {config.setting.autoCreateEnabled ? "On" : "Off"}
                  </div>
                </div>
              </div>

              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Environment
                </div>
                <div className="flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-surface)] p-1">
                  {(["live", "test"] as const).map((environment) => {
                    const isActive = config.setting.environment === environment;
                    return (
                      <button
                        aria-label={`Set shipment automation environment to ${
                          environment === "live"
                            ? "Live Production"
                            : "Test UAT"
                        }`}
                        aria-pressed={isActive}
                        className={cn(
                          "h-9 flex-1 rounded-[var(--r-sm)] px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:cursor-not-allowed disabled:opacity-50",
                          isActive
                            ? "bg-[var(--brand)] text-white shadow-sm"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface2)] hover:text-[var(--text-primary)]",
                        )}
                        disabled={!canManage || isSavingSetting}
                        key={environment}
                        onClick={() =>
                          void saveSetting({
                            autoCreateEnabled: config.setting.autoCreateEnabled,
                            environment,
                          })
                        }
                        type="button"
                      >
                        {environment === "live"
                          ? "Live Production"
                          : "Test UAT"}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                  The selected mode is used only by automatic shipment creation.
                </div>
              </div>
            </div>
          </div>

          {iossSetting ? (
            <YunIossCard
              canManage={canManage}
              setting={iossSetting}
              onUpdated={setIossSetting}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            SKU mapping library
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div className="text-[11px] text-[var(--text-muted)]">
            {config.mappings.length} configured
          </div>
        </div>

        {canManage ? (
          <div className="grid gap-4">
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
            <MappingImportPanel
              existingMappings={config.mappings}
              onImported={(mappings) => {
                setConfig((current) =>
                  current ? mergeMappings(current, mappings) : current,
                );
              }}
            />
          </div>
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
      </div>
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
  const [status, setStatus] = useState<TenantYunIossSetting["status"]>(
    setting.status,
  );
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
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-emerald-200 bg-emerald-50 text-emerald-600">
          <ShieldCheck size={18} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
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
      <div className="grid gap-4 p-5">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            <Globe2 size={12} aria-hidden />
            EU tax code
          </div>
          <div className="grid gap-3">
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
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <BadgeCheck size={12} className="text-emerald-600" aria-hidden />
            Default:
            <span className="font-mono text-[var(--text-secondary)]">
              IOSS261841515582105977183
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-10 w-fit items-center gap-2 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-surface2)] px-3 text-xs font-semibold text-[var(--text-secondary)]">
            <ToggleSwitch
              ariaLabel="Toggle YunExpress IOSS"
              checked={status === "ACTIVE"}
              disabled={!canManage || isSaving}
              onChange={(checked) => setStatus(checked ? "ACTIVE" : "DISABLED")}
            />
            Active
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={!canManage || isSaving}
            leftIcon={<Save size={14} aria-hidden />}
            onClick={() => void save()}
            variant="primary"
          >
            Save
          </Button>
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
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
      className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft"
      onSubmit={submit}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--brand)]">
          <Route size={18} aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Add SKU shipping route
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Match SKU code and destination country to a YunExpress service.
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LabeledField label="SKU code">
            <input
              className="h-10 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
              onChange={(event) => setSkuCode(event.target.value)}
              placeholder="NK"
              value={skuCode}
            />
          </LabeledField>
          <LabeledField label="Country">
            <select
              className="h-10 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
              onChange={(event) =>
                setDestinationCountryCode(event.target.value)
              }
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
              className="h-10 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 font-mono text-[12px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
              onChange={(event) =>
                setShippingMethodCode(
                  event.target
                    .value as (typeof SHIPPING_METHOD_OPTIONS)[number],
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
              className="h-10 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
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
              className="h-10 w-full rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional note"
              value={description}
            />
          </LabeledField>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={isPending}
              leftIcon={<Plus size={14} aria-hidden />}
              type="submit"
              variant="primary"
            >
              Add mapping
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MappingImportPanel({
  existingMappings,
  onImported,
}: {
  existingMappings: SkuShippingMethodMapping[];
  onImported: (mappings: SkuShippingMethodMapping[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  function downloadTemplate() {
    const csv = `\uFEFF${buildSkuMappingImportTemplateCsv()}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sku-shipping-method-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    setIsImporting(true);
    setImportSummary(null);
    setImportErrors([]);

    try {
      const text = await file.text();
      const parsed = parseSkuMappingImportCsv(text);

      if (parsed.errors.length > 0) {
        setImportErrors(
          parsed.errors.map(
            (error) => `Row ${error.rowNumber}: ${error.message}`,
          ),
        );
        toastError("Import file has validation errors.");
        return;
      }

      if (parsed.rows.length === 0) {
        setImportErrors(["No valid mapping rows found in the import file."]);
        toastError("No mappings found to import.");
        return;
      }

      const importedMappings: SkuShippingMethodMapping[] = [];
      const importNotes: string[] = [];
      let createdCount = 0;
      let overwrittenCount = 0;
      let knownMappings = [...existingMappings];

      for (const row of parsed.rows) {
        const action = resolveSkuMappingImportAction(row, knownMappings);
        if (action.type === "conflict") {
          importNotes.push(
            `${action.row.skuCode}/${action.row.destinationCountryCode}: ${action.message}`,
          );
          continue;
        }

        try {
          const mapping =
            action.type === "overwrite"
              ? await updateSkuShippingMethodMapping(action.mapping.id, {
                  shippingMethodCode: action.row.shippingMethodCode,
                  eName: action.row.eName,
                  cName: action.row.cName,
                  description: action.row.description,
                })
              : await createSkuShippingMethodMapping(action.row);

          importedMappings.push(mapping);
          knownMappings = mergeImportKnownMappings(knownMappings, mapping);
          if (action.type === "overwrite") {
            overwrittenCount += 1;
          } else {
            createdCount += 1;
          }
        } catch (error) {
          if (
            action.type === "create" &&
            isSkuMappingImportConflictError(error)
          ) {
            try {
              const latestConfig = await getShipmentAutomationConfig();
              const exactMapping = findExactSkuMappingImportMapping(
                action.row,
                latestConfig.mappings,
              );

              knownMappings = latestConfig.mappings;

              if (exactMapping) {
                const mapping = await updateSkuShippingMethodMapping(
                  exactMapping.id,
                  {
                    shippingMethodCode: action.row.shippingMethodCode,
                    eName: action.row.eName,
                    cName: action.row.cName,
                    description: action.row.description,
                  },
                );

                importedMappings.push(mapping);
                knownMappings = mergeImportKnownMappings(
                  knownMappings,
                  mapping,
                );
                overwrittenCount += 1;
                continue;
              }
            } catch (recoveryError) {
              importNotes.push(
                `${action.row.skuCode}/${action.row.destinationCountryCode}: ${formatSkuMappingImportApiError(recoveryError)}`,
              );
              continue;
            }
          }

          importNotes.push(
            `${action.row.skuCode}/${action.row.destinationCountryCode}: ${formatSkuMappingImportApiError(error)}`,
          );
        }
      }

      if (importedMappings.length > 0) {
        onImported(importedMappings);
      }

      setImportErrors(importNotes);
      setImportSummary(
        `Processed ${importedMappings.length}/${parsed.rows.length} mappings. Created ${createdCount}, overwritten ${overwrittenCount}, skipped ${importNotes.length}.`,
      );

      if (importNotes.length > 0) {
        toastError("Some SKU mappings could not be imported.");
      } else {
        toastSuccess("SKU mappings imported.");
      }
    } catch (error) {
      const message = formatSkuMappingImportApiError(error);
      setImportErrors([message]);
      toastError(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--brand)]">
          <Upload size={18} aria-hidden />
        </div>
        <div className="min-w-[240px] flex-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Import SKU mappings
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Download the Excel-compatible CSV template, fill it in, then import
            it back here.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            leftIcon={<Download size={14} aria-hidden />}
            onClick={downloadTemplate}
            size="sm"
            variant="secondary"
          >
            Download template
          </Button>
          <Button
            disabled={isImporting}
            isLoading={isImporting}
            leftIcon={<Upload size={14} aria-hidden />}
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="primary"
          >
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <input
            accept=".csv,text/csv"
            className="hidden"
            disabled={isImporting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>
      <div className="grid gap-3 p-5 text-xs">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-3 leading-relaxed text-[var(--text-secondary)]">
          Required columns: SKU Code, Country Code, Shipping Method Code, EName,
          CName. Description is optional. Supported shipping methods:
          VN-YTYCPREC, VNFZZXR, VNTHZXR.
        </div>
        {importSummary ? (
          <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
            {importSummary}
          </div>
        ) : null}
        {importErrors.length > 0 ? (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <div className="mb-1 font-semibold">Import notes</div>
            <ul className="list-disc space-y-1 pl-4">
              {importErrors.slice(0, 8).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
            {importErrors.length > 8 ? (
              <div className="mt-1 text-[11px]">
                {importErrors.length - 8} more errors hidden.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
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
      <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              SKU mappings
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Configure route rules before enabling full automation.
            </div>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            0 configured
          </span>
        </div>
        <EmptyState
          description="Orders with unmapped SKU codes will wait for manual shipment."
          heading="No SKU mappings configured."
          icon={<Bot className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            SKU mappings
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Active rows are used by automatic shipment creation.
          </div>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
          {mappings.length} configured
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-[var(--bg-surface2)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                SKU Code
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                Country
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                Shipping Method
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                Product
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                Status
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-[0.05em]">
                Description
              </th>
              <th className="px-4 py-3 text-right font-semibold uppercase tracking-[0.05em]">
                Actions
              </th>
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
    <tr className="border-t border-[var(--border)] transition-colors hover:bg-[var(--brand-light)]">
      <td className="px-4 py-3 align-middle">
        <span className="inline-flex rounded-md bg-[var(--brand-light)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--brand-dark)]">
          {mapping.skuCode}
        </span>
      </td>
      <td className="px-4 py-3 align-middle text-[13px] font-semibold text-[var(--text-primary)]">
        {formatCountry(mapping.destinationCountryCode)}
      </td>
      <td className="px-4 py-3 align-middle font-mono text-[12px] text-[var(--text-primary)]">
        {mapping.shippingMethodCode}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="text-[13px] font-medium text-[var(--text-primary)]">
          {mapping.eName || "-"}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          {mapping.cName || "-"}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <ToggleSwitch
          ariaLabel={`${mapping.status === "ACTIVE" ? "Disable" : "Enable"} mapping ${mapping.skuCode}`}
          checked={mapping.status === "ACTIVE"}
          disabled={!canManage || isPending}
          onChange={() => void toggleStatus()}
        />
      </td>
      <td className="max-w-[260px] px-4 py-3 align-middle text-[12px] text-[var(--text-secondary)]">
        {mapping.description || "-"}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex justify-end gap-2">
          <Button
            aria-label={`Delete mapping ${mapping.skuCode}`}
            disabled={!canManage || isPending}
            onClick={remove}
            size="icon-sm"
            variant="danger"
          >
            <Trash2 size={13} aria-hidden />
          </Button>
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
        "relative h-5 w-9 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:cursor-not-allowed disabled:opacity-50",
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
