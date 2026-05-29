"use client";

/* eslint-disable @next/next/no-img-element -- Portal image URLs are external and not pre-whitelisted for next/image. */

import {
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, formatStatus } from "@/components/ui/StatusBadge";
import { createDraftShipment } from "@/lib/api/shipments";
import { can, type Role } from "@/lib/rbac";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  OrderDetail,
  OrderDetailItem,
  PortalCostCenterSummary,
  PortalCustomizationOption,
  PortalFileLinks,
  PortalItemTrackingInfo,
  PortalListingSummary,
  PortalPersonSummary,
} from "@/types/orders";

type RecipientAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export function OrderExpandPanel({
  order,
  isLoading = false,
  onDraftCreated,
  role,
}: {
  order: OrderDetail | null;
  isLoading?: boolean;
  onDraftCreated: () => void;
  role: Role;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading || !order) {
    return <OrderExpandSkeleton />;
  }

  const canCreate = can.createShipment(role);
  const shipments = order.shipments ?? [];
  const hasSellerOrScaler =
    hasPerson(order.portalMetadata?.seller) ||
    hasPerson(order.portalMetadata?.scaledBy);

  return (
    <div className="bg-[var(--brand-light)] px-3 pb-3 pt-0 sm:pl-12 sm:pr-3.5">
      <div className="grid gap-3 pt-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <OrderSummaryCard order={order} />
          <RecipientCard order={order} />
          {hasSellerOrScaler ? (
            <SellerScalerCard order={order} />
          ) : (
            <StatusHistoryCard order={order} />
          )}
        </div>

        {hasSellerOrScaler ? <StatusHistoryCard order={order} /> : null}

        <PanelCard icon={<ShoppingCart />} title="Items">
          <div className="grid gap-3">
            {order.items.map((item) => (
              <ItemCard item={item} key={item.id} />
            ))}
          </div>
        </PanelCard>

        <PanelCard icon={<Truck />} title="Shipments">
          <div className="flex flex-wrap items-center gap-2">
            {shipments.length ? (
              shipments.map((shipment) => (
                <div
                  className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)] px-2 py-1 text-[11px]"
                  key={shipment.id}
                >
                  <StatusBadge status={shipment.status} />
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                    {shipment.id}
                  </span>
                  {shipment.trackingNumber ? (
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {shipment.trackingNumber}
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                description="No shipments yet."
                heading="No related shipments"
                icon={<Truck className="h-6 w-6" aria-hidden />}
              />
            )}
            {canCreate ? (
              <button
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-2.5 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)]"
                onClick={() => setShowCreateForm(true)}
                type="button"
              >
                <Plus className="h-3 w-3" aria-hidden />
                {shipments.length ? "Add Shipment" : "Create Draft Shipment"}
              </button>
            ) : null}
          </div>

          {showCreateForm ? (
            <CreateDraftShipmentForm
              items={order.items}
              onCancel={() => setShowCreateForm(false)}
              onCreated={() => {
                setShowCreateForm(false);
                onDraftCreated();
              }}
              orderId={order.id}
            />
          ) : null}
        </PanelCard>
      </div>
    </div>
  );
}

function OrderSummaryCard({ order }: { order: OrderDetail }) {
  const metadata = order.portalMetadata;
  const rows = [
    { label: "Order #", value: order.orderNumber ?? order.externalOrderId, mono: true },
    { label: "External status", value: order.externalStatus },
    { label: "Shop", value: order.shopName },
    { label: "Marketplace", value: order.marketplace },
    { label: "Shipping type", value: order.shippingType ?? order.shippingService },
    { label: "Purchased", value: formatDate(order.purchaseAt) },
    { label: "Portal created", value: formatDateTime(metadata?.portalCreatedAt ?? null) },
    { label: "Base cost", value: formatCurrency(metadata?.baseCost ?? null, order.currency) },
  ].filter((row) => hasText(row.value));

  return (
    <PanelCard icon={<Store />} title="Order summary">
      {rows.map((row) => (
        <KeyValue
          key={row.label}
          label={row.label}
          mono={row.mono}
          value={row.value}
        />
      ))}
      {metadata?.addressValidation !== null &&
      metadata?.addressValidation !== undefined ? (
        <KeyValue
          label="Address"
          value={
            <SmallBadge
              tone={metadata.addressValidation ? "success" : "warning"}
              value={metadata.addressValidation ? "VALID" : "UNVERIFIED"}
            />
          }
        />
      ) : null}
      {metadata?.scaleOverallStatus ? (
        <KeyValue
          label="Scale status"
          value={
            <SmallBadge
              tone={
                metadata.scaleOverallStatus.toUpperCase() === "SCALED" ||
                metadata.scaleOverallStatus.toUpperCase() === "SENT"
                  ? "success"
                  : "neutral"
              }
              value={metadata.scaleOverallStatus}
            />
          }
        />
      ) : null}
    </PanelCard>
  );
}

function RecipientCard({ order }: { order: OrderDetail }) {
  const address = getRecipientAddress(order.recipientAddress);
  const city = address?.city ?? order.destinationCity;
  const state = address?.state ?? order.destinationState;
  const postalCode = address?.postalCode ?? order.destinationPostalCode;
  const country = address?.country ?? order.destinationCountry;
  const rows = [
    { label: "Name", value: order.recipientName },
    { label: "Email", value: order.recipientEmail },
    { label: "Phone", value: order.recipientPhone },
    { label: "Address", value: address?.line1 },
    { label: "Address 2", value: address?.line2 },
    { label: "City", value: city },
    { label: "State", value: state },
    { label: "Postal", value: postalCode },
    {
      label: "Country",
      value: country ? `${countryFlag(country)} ${country}`.trim() : null,
    },
  ].filter((row) => hasText(row.value));

  return (
    <PanelCard icon={<UserRound />} title="Recipient">
      {rows.length ? (
        rows.map((row) => (
          <KeyValue key={row.label} label={row.label} value={row.value} />
        ))
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">
          Recipient details are not provided.
        </p>
      )}
    </PanelCard>
  );
}

function SellerScalerCard({ order }: { order: OrderDetail }) {
  const seller = order.portalMetadata?.seller;
  const scaledBy = order.portalMetadata?.scaledBy;

  return (
    <PanelCard icon={<UsersRound />} title="Seller & scaler">
      {hasPerson(seller) ? <PersonBlock label="Seller" person={seller} /> : null}
      {hasPerson(scaledBy) ? (
        <PersonBlock label="Scaled by" person={scaledBy} />
      ) : null}
    </PanelCard>
  );
}

function PersonBlock({
  label,
  person,
}: {
  label: string;
  person: PortalPersonSummary | null | undefined;
}) {
  if (!person) {
    return null;
  }

  return (
    <div className="border-b border-[var(--border)] py-2 first:pt-0 last:border-b-0 last:pb-0">
      <div className="section-label-xs mb-1.5">{label}</div>
      {person.name ? <KeyValue label="Name" value={person.name} /> : null}
      {person.email ? <KeyValue label="Email" value={person.email} /> : null}
    </div>
  );
}

function StatusHistoryCard({ order }: { order: OrderDetail }) {
  return (
    <PanelCard icon={<CheckCircle2 />} title="Status history">
      {order.statusHistory.length ? (
        <ol className="grid gap-2">
          {order.statusHistory
            .slice()
            .sort(
              (first, second) =>
                new Date(second.createdAt).getTime() -
                new Date(first.createdAt).getTime(),
            )
            .map((entry, index, entries) => (
              <li className="relative flex gap-2" key={entry.id}>
                {index < entries.length - 1 ? (
                  <span className="absolute left-[5px] top-4 h-full border-l border-[var(--border)]" />
                ) : null}
                <span
                  className={cn(
                    "relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                    statusDotClass(entry.status),
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                    {formatStatus(entry.status)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatShortDate(entry.createdAt)}
                  </p>
                  {entry.note ? (
                    <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
        </ol>
      ) : (
        <p className="text-[11px] text-[var(--text-muted)]">
          No status history.
        </p>
      )}
    </PanelCard>
  );
}

function ItemCard({ item }: { item: OrderDetailItem }) {
  return (
    <article className="rounded-sm border border-[var(--border)] bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <SkuBadge value={item.sku ?? "NO-SKU"} />
            <span className="min-w-0 text-[12px] font-medium text-[var(--text-primary)]">
              {item.title ?? item.name ?? "Unnamed item"}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              x{item.quantity}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
            {item.asin ? (
              <span>
                ASIN: <span className="font-mono">{item.asin}</span>
              </span>
            ) : null}
            {item.listingId ? (
              <span>
                Listing: <span className="font-mono">{item.listingId}</span>
              </span>
            ) : null}
            {item.scaleStatus ? (
              <StatusBadge className="px-1.5 py-0 text-[9px]" status={item.scaleStatus} />
            ) : null}
            {item.productionStatus ? (
              <StatusBadge
                className="px-1.5 py-0 text-[9px]"
                status={item.productionStatus}
              />
            ) : null}
          </div>
          {item.qcNote ? (
            <div className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              QC: {item.qcNote}
            </div>
          ) : null}
          <PricingRow item={item} />
        </div>
        <ItemImages item={item} />
      </div>

      <CustomizationOptions options={item.customizationOptions ?? []} />
      <FulfillmentFiles files={item.fulfillmentFiles ?? {}} />
      {item.costCenter ? <CostCenterInfo costCenter={item.costCenter} /> : null}
      {item.listing ? <ListingInfoPanel listing={item.listing} /> : null}
      {item.trackingInfo ? <PortalTrackingInfo info={item.trackingInfo} /> : null}
    </article>
  );
}

function PricingRow({ item }: { item: OrderDetailItem }) {
  const rows = [
    { label: "Unit price", value: formatCurrency(item.unitPrice, item.currency) },
    {
      label: "Total customization",
      value: formatCurrency(item.totalCustomizationPrice, item.currency),
    },
  ].filter((row) => hasText(row.value));

  if (!rows.length) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
      {rows.map((row) => (
        <span key={row.label}>
          <span className="text-[var(--text-muted)]">{row.label} </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {row.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function ItemImages({ item }: { item: OrderDetailItem }) {
  const images = [
    { label: "Product", url: item.listing?.productImageUrl },
    { label: "Base", url: item.baseImageUrl },
    { label: "Preview", url: item.snapshotImageUrl },
  ].filter((image): image is { label: string; url: string } => hasText(image.url));

  if (!images.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      {images.map((image) => (
        <div className="flex flex-col items-center gap-1" key={image.label}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)]">
            <img
              alt={image.label}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement?.classList.add("broken-img");
              }}
              src={image.url}
            />
          </div>
          <span className="text-[9px] text-[var(--text-muted)]">
            {image.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomizationOptions({
  options,
}: {
  options: PortalCustomizationOption[];
}) {
  if (!options.length) {
    return null;
  }

  return (
    <ItemSubsection icon={<FileText />} title="Customization options">
      <div className="space-y-0.5">
        {options.map((option, index) => (
          <div
            className="flex justify-between gap-3 border-b border-[var(--border)] py-1 text-[11px] last:border-b-0"
            key={`${option.label}-${index}`}
          >
            <span className="max-w-[55%] text-[var(--text-secondary)]">
              {option.label || "-"}
            </span>
            <span className="max-w-[60%] break-words text-right font-medium text-[var(--text-primary)] md:max-w-[40%]">
              {option.value || "-"}
            </span>
          </div>
        ))}
      </div>
    </ItemSubsection>
  );
}

function FulfillmentFiles({ files }: { files: PortalFileLinks }) {
  const entries = Object.entries(files).filter(([, url]) => hasText(url));
  if (!entries.length) {
    return null;
  }

  return (
    <ItemSubsection icon={<ExternalLink />} title="Fulfillment files">
      <div className="flex flex-wrap gap-2">
        {entries.map(([side, url]) => (
          <a
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)]"
            href={url}
            key={side}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3 w-3 text-[var(--brand)]" aria-hidden />
            {side}
          </a>
        ))}
      </div>
    </ItemSubsection>
  );
}

function CostCenterInfo({
  costCenter,
}: {
  costCenter: PortalCostCenterSummary;
}) {
  const rows = [
    { label: "Vendor product", value: costCenter.vendorProductDisplayName },
    { label: "Vendor SKU", value: costCenter.vendorProductSKU },
    { label: "Size", value: costCenter.sizeValue },
    { label: "Color", value: costCenter.colorValue },
    { label: "Vendor ID", value: costCenter.vendorProductId },
  ].filter((row) => hasText(row.value));

  if (!rows.length) {
    return null;
  }

  return (
    <ItemSubsection icon={<Package />} title="Cost center">
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div
            className="flex justify-between gap-3 border-b border-[var(--border)] py-1 text-[11px] last:border-b-0"
            key={row.label}
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="text-right font-mono text-[10px] text-[var(--text-primary)]">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </ItemSubsection>
  );
}

function ListingInfoPanel({ listing }: { listing: PortalListingSummary }) {
  const hasData =
    hasText(listing.asinType) ||
    hasText(listing.productImageUrl) ||
    Boolean(listing.psd);
  if (!hasData) {
    return null;
  }

  return (
    <ItemSubsection icon={<ImageIcon />} title="Listing / PSD">
      <div className="flex items-start gap-3">
        {listing.productImageUrl ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface2)]">
            <img
              alt="Product"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement?.classList.add("broken-img");
              }}
              src={listing.productImageUrl}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1 text-[11px]">
          {listing.asinType ? (
            <InlinePair label="ASIN type" value={listing.asinType} />
          ) : null}
          {listing.psd?.status ? (
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">PSD status</span>
              <StatusBadge
                className="px-1.5 py-0 text-[9px]"
                status={listing.psd.status}
              />
            </div>
          ) : null}
          {listing.psd?.fileName ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[var(--text-secondary)]">File</span>
              <span className="max-w-[160px] truncate font-mono text-[10px] text-[var(--text-primary)]">
                {listing.psd.fileName}
              </span>
              {listing.psd.size ? (
                <span className="text-[var(--text-muted)]">
                  ({listing.psd.size})
                </span>
              ) : null}
            </div>
          ) : null}
          {listing.psd?.url ? (
            <a
              className="mt-0.5 inline-flex items-center gap-1 font-medium text-[var(--brand)] hover:underline"
              href={listing.psd.url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-2.5 w-2.5" aria-hidden />
              Open PSD
            </a>
          ) : null}
        </div>
      </div>
    </ItemSubsection>
  );
}

function PortalTrackingInfo({ info }: { info: PortalItemTrackingInfo }) {
  const rows = [
    { label: "Provider", value: info.fulfillment },
    { label: "Status", value: info.status },
    { label: "Tracking #", value: info.tracking },
    { label: "Note", value: info.note },
  ].filter((row) => hasText(row.value));

  if (!rows.length) {
    return null;
  }

  return (
    <ItemSubsection icon={<Truck />} title="Portal tracking info">
      <div className="mb-2 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
        Portal only - not official shipment tracking
      </div>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div
            className="flex justify-between gap-3 border-b border-[var(--border)] py-1 text-[11px] last:border-b-0"
            key={row.label}
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="text-right font-mono text-[10px] text-[var(--text-primary)]">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </ItemSubsection>
  );
}

function ItemSubsection({
  icon,
  title,
  children,
}: {
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <div className="section-label-xs mb-1.5 flex items-center gap-1">
        <span className="text-[var(--brand)]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function InlinePair({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!hasText(value)) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function CreateDraftShipmentForm({
  orderId,
  items,
  onCancel,
  onCreated,
}: {
  orderId: string;
  items: OrderDetailItem[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const initialSelection = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          { checked: true, quantity: Math.max(1, item.quantity) },
        ]),
      ) as Record<string, { checked: boolean; quantity: number }>,
    [items],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const selectedItems = items
    .map((item) => ({
      orderItemId: item.id,
      quantity: selection[item.id]?.quantity ?? 0,
      checked: selection[item.id]?.checked ?? false,
      max: item.quantity,
    }))
    .filter((item) => item.checked && item.quantity > 0 && item.quantity <= item.max);

  async function submitDraft() {
    setError(null);

    if (!selectedItems.length) {
      setError("Select at least one valid item quantity.");
      return;
    }

    setIsPending(true);
    try {
      await createDraftShipment(
        orderId,
        selectedItems.map(({ orderItemId, quantity }) => ({
          orderItemId,
          quantity,
        })),
      );
      toastSuccess("Draft shipment created.");
      onCreated();
    } catch {
      setError("Failed to create shipment. Please try again.");
      toastError("Failed to create shipment. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <div className="mb-3 text-[11px] font-semibold text-[var(--text-primary)]">
        Select items
      </div>
      <div className="grid gap-1">
        {items.map((item) => {
          const row = selection[item.id] ?? {
            checked: true,
            quantity: Math.max(1, item.quantity),
          };

          return (
            <label
              className="flex items-center gap-2 border-b border-[var(--border)] py-2 text-xs last:border-b-0"
              key={item.id}
            >
              <input
                checked={row.checked}
                className="h-4 w-4 rounded border-[var(--border-strong)]"
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    [item.id]: { ...row, checked: event.target.checked },
                  }))
                }
                type="checkbox"
              />
              <SkuBadge value={item.sku ?? "NO-SKU"} />
              <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                {item.title ?? item.name ?? "Unnamed item"}
              </span>
              <input
                aria-label={`Quantity for ${item.sku ?? item.id}`}
                className="h-7 w-14 rounded-xs border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1 text-center text-xs"
                max={item.quantity}
                min={1}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSelection((current) => ({
                    ...current,
                    [item.id]: {
                      ...row,
                      quantity: Number.isInteger(value) ? value : row.quantity,
                    },
                  }));
                }}
                type="number"
                value={row.quantity}
              />
              <span className="text-[var(--text-muted)]">/ {item.quantity}</span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-[11px] text-[var(--danger-text)]">{error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          className="h-8 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)]"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[var(--brand-dark)] bg-[var(--brand)] px-3 text-xs font-medium text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          disabled={isPending}
          onClick={submitDraft}
          type="button"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          Create Draft
        </button>
      </div>
    </div>
  );
}

function OrderExpandSkeleton() {
  return (
    <div className="bg-[var(--brand-light)] px-3 py-4 sm:px-12">
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            className="h-32 animate-pulse rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]"
            key={item}
          />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-sm border border-[var(--border)] bg-[var(--bg-surface)]" />
    </div>
  );
}

function PanelCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-soft">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <span className="text-[var(--brand)]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (!hasNodeValue(value)) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-1.5 last:border-b-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span
        className={cn(
          "max-w-[65%] text-right text-[11px] text-[var(--text-primary)]",
          mono ? "font-mono" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SkuBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-dark)]">
      {value}
    </span>
  );
}

function SmallBadge({
  value,
  tone,
}: {
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-[var(--success-bg)] text-[var(--success-text)]"
      : tone === "warning"
        ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
        : "bg-[#f1f5f9] text-[#475569]";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {value}
    </span>
  );
}

function getRecipientAddress(value: unknown): RecipientAddress | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    line1: readString(record.line1) ?? readString(record.address),
    line2: readString(record.line2) ?? readString(record.address2),
    city: readString(record.city),
    state: readString(record.state),
    postalCode: readString(record.postalCode) ?? readString(record.zip),
    country: readString(record.country),
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasPerson(person: PortalPersonSummary | null | undefined) {
  return Boolean(person?.name || person?.email || person?.id);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNodeValue(value: React.ReactNode) {
  if (value === null || value === undefined || value === false) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function countryFlag(countryCode: string | null | undefined) {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
    return "";
  }

  const base = 127397;
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + base))
    .join("");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: string | null | undefined, currency?: string | null) {
  if (!hasText(value)) {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return currency ? `${value} ${currency}` : value;
  }

  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  return `$${amount.toFixed(2)}`;
}

function statusDotClass(status: string) {
  if (["READY_TO_SHIP", "DELIVERED"].includes(status)) {
    return "bg-[var(--success)] shadow-[0_0_0_3px_var(--success-bg)]";
  }

  if (["IN_TRANSIT", "CREATED"].includes(status)) {
    return "bg-[var(--info)] shadow-[0_0_0_3px_var(--info-bg)]";
  }

  if (["EXCEPTION", "FAILED_CREATE", "FAILED_LABEL"].includes(status)) {
    return "bg-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]";
  }

  return "bg-[var(--text-muted)] shadow-[0_0_0_3px_#f1f5f9]";
}
