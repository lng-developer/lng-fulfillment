"use client";

/* eslint-disable @next/next/no-img-element -- Portal image URLs are external and not pre-whitelisted for next/image. */

import type React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Package,
  ShoppingCart,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { StatusBadge, formatStatus } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type {
  OrderDetail,
  OrderDetailItem,
  PortalCostCenterSummary,
  PortalCustomizationOption,
  PortalFileLinks,
  PortalListingSummary,
  PortalPersonSummary,
  ShipmentFailureSummary,
  ShipmentCostSummary,
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
}: {
  order: OrderDetail | null;
  isLoading?: boolean;
}) {
  if (isLoading || !order) {
    return <OrderExpandSkeleton />;
  }

  const hasSellerOrScaler =
    hasPerson(order.portalMetadata?.seller) ||
    hasPerson(order.portalMetadata?.scaledBy);
  const shipmentFailure = getLatestShipmentFailure(order);

  return (
    <div className="[contain-intrinsic-size:auto_680px] [content-visibility:auto] bg-[var(--brand-light)] px-3 pb-3 pt-0 sm:pl-12 sm:pr-3.5">
      <div className="grid gap-3 pt-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <OrderSummaryCard order={order} />
          <RecipientCard failure={shipmentFailure} order={order} />
          {hasSellerOrScaler ? (
            <SellerScalerCard order={order} />
          ) : (
            <StatusHistoryCard order={order} />
          )}
        </div>

        {hasSellerOrScaler ? <StatusHistoryCard order={order} /> : null}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <PanelCard
            icon={<ShoppingCart />}
            title={`Items (${order.items.length})`}
          >
            <div className="grid gap-3">
              {order.items.map((item, index) => (
                <ItemCard item={item} itemIndex={index} key={item.id} />
              ))}
            </div>
          </PanelCard>

          <ActualPackageCostCard order={order} />
        </div>

        {/* <PanelCard icon={<Truck />} title="Shipments">
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
                  {shipment.labelUrl ? (
                    <a
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--brand)] hover:underline"
                      href={shipment.labelUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      Label
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                description="Create a YunExpress shipment from the Actions column when this order is ready."
                heading="No related shipments"
                icon={<Truck className="h-6 w-6" aria-hidden />}
              />
            )}
          </div>
        </PanelCard> */}
      </div>
    </div>
  );
}

function OrderSummaryCard({ order }: { order: OrderDetail }) {
  const metadata = order.portalMetadata;
  const skuSummary = summarizeUniqueItemValues(
    order.items.map((item) => item.sku),
  );
  const asinSummary = summarizeUniqueItemValues(
    order.items.map((item) => item.asin),
  );
  const rows = [
    {
      label: "Order #",
      value: order.orderNumber ?? order.externalOrderId,
      mono: true,
    },
    { label: "SKU", value: skuSummary, mono: true },
    { label: "ASIN", value: asinSummary, mono: true },
    { label: "External status", value: order.externalStatus },
    { label: "Shop", value: order.shopName },
    { label: "Marketplace", value: order.marketplace },
    {
      label: "Shipping type",
      value: order.shippingType ?? order.shippingService,
    },
    { label: "Purchased", value: formatDate(order.purchaseAt) },
    {
      label: "Portal created",
      value: formatDateTime(metadata?.portalCreatedAt ?? null),
    },
    {
      label: "Base cost",
      value: formatCurrency(metadata?.baseCost ?? null, order.currency),
    },
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
                ["SCALED", "SENT", "COMPLETE"].includes(
                  metadata.scaleOverallStatus.toUpperCase(),
                )
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

function RecipientCard({
  order,
  failure,
}: {
  order: OrderDetail;
  failure: ShipmentFailureSummary | null;
}) {
  const [showFailure, setShowFailure] = useState(false);
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
    <PanelCard
      icon={<UserRound />}
      title={
        <span className="inline-flex items-center gap-1.5">
          Recipient
          {failure ? (
            <button
              aria-label="Show YunExpress recipient error"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--danger)] transition-colors hover:bg-[var(--danger-bg)]"
              onClick={() => setShowFailure((current) => !current)}
              title={failure.message}
              type="button"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      }
    >
      {failure && showFailure ? (
        <div className="mb-2 rounded-sm border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
          <div className="font-semibold">YunExpress rejected this shipment.</div>
          <div className="mt-1 leading-relaxed">{failure.message}</div>
          {failure.code ? (
            <div className="mt-1 font-mono text-[10px] text-red-700">
              Code: {failure.code}
            </div>
          ) : null}
        </div>
      ) : null}
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
      {hasPerson(seller) ? (
        <PersonBlock label="Seller" person={seller} />
      ) : null}
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
        <ol className="grid max-h-[220px] gap-2 overflow-y-auto pr-1">
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

function ActualPackageCostCard({ order }: { order: OrderDetail }) {
  const latestShipment = order.shipments?.[0] ?? null;
  const cost = latestShipment?.cost ?? null;

  return (
    <PanelCard icon={<Package />} title="Actual package & cost">
      {!cost ? (
        <div className="rounded-sm border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface2)] p-3 text-xs text-[var(--text-secondary)]">
          {["FULFILLED", "READY_TO_SHIP", "IN_PROCESSING"].includes(order.status)
            ? "Cần confirm ship và nhập kích thước/cân nặng thực tế để tính phí ước lượng."
            : "Chưa có thông số thực tế hoặc phí ước lượng cho đơn này."}
        </div>
      ) : (
        <div>
          <KeyValue label="Actual weight" value={`${formatKg(cost.actualWeightKg)} kg`} />
          <KeyValue
            label="Dimensions"
            value={`${formatCm(cost.actualLengthCm)} × ${formatCm(cost.actualWidthCm)} × ${formatCm(cost.actualHeightCm)} cm`}
          />
          <KeyValue
            label="Volumetric weight"
            value={`${formatKg(cost.volumetricWeightKg)} kg`}
          />
          <KeyValue
            label="Chargeable weight"
            value={`${formatKg(cost.chargeableWeightKg)} kg`}
          />
          <KeyValue
            label="Estimated bracket"
            value={
              cost.estimatedWeightKg ? `${formatKg(cost.estimatedWeightKg)} kg` : null
            }
          />
          <KeyValue
            label="Estimated fee"
            value={formatEstimatedFee(cost)}
          />
          <KeyValue
            label="Actual fee"
            value={
              cost.actualFeeStatus === "AVAILABLE" && cost.actualTotalFee
                ? formatNumber(cost.actualTotalFee)
                : <SmallBadge tone="neutral" value={cost.actualFeeStatus} />
            }
          />
        </div>
      )}
    </PanelCard>
  );
}

function ItemCard({
  item,
  itemIndex,
}: {
  item: OrderDetailItem;
  itemIndex: number;
}) {
  return (
    <article className="rounded-sm border border-[var(--border)] bg-white p-2.5">
      <div className="grid gap-3 grid-cols-2">
        <ItemContentBox icon={<Package />} title={`Item ${itemIndex + 1}`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              {/* <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="min-w-0 text-[12px] font-medium text-[var(--text-primary)]">
                  {item.title ?? item.name ?? "Unnamed item"}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  x{item.quantity}
                </span>
              </div> */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                {/* {item.listingId ? (
                  <span>
                    Listing: <span className="font-mono">{item.listingId}</span>
                  </span>
                ) : null}
                {item.scaleStatus ? (
                  <StatusBadge
                    className="px-1.5 py-0 text-[9px]"
                    status={item.scaleStatus}
                  />
                ) : null} */}
                {item.productionStatus ? (
                  <StatusBadge
                    className="px-1.5 py-0 text-[9px]"
                    status={item.productionStatus}
                  />
                ) : null}
              </div>
              {/* {item.qcNote ? (
                <div className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                  QC: {item.qcNote}
                </div>
              ) : null} */}
              {/* <PricingRow item={item} /> */}
            </div>
            {/* <ItemImages item={item} /> */}
          </div>

          <FulfillmentFiles
            files={item.fulfillmentFiles ?? {}}
            previewImageUrl={item.snapshotImageUrl}
          />
          {item.costCenter ? (
            <CostCenterInfo costCenter={item.costCenter} />
          ) : null}
          {item.listing ? <ListingInfoPanel listing={item.listing} /> : null}
          {/* {item.trackingInfo ? (
            <PortalTrackingInfo info={item.trackingInfo} />
          ) : null} */}
        </ItemContentBox>

        <CustomizationOptions options={item.customizationOptions ?? []} />
      </div>
    </article>
  );
}

function CustomizationOptions({
  options,
}: {
  options: PortalCustomizationOption[];
}) {
  return (
    <ItemContentBox icon={<FileText />} title="Customization options">
      {options.length ? (
        <div className="max-h-[360px] space-y-0.5 overflow-auto pr-1">
          {options.map((option, index) => (
            <div
              className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3 border-b border-[var(--border)] py-1.5 text-[11px] last:border-b-0"
              key={`${option.label}-${index}`}
            >
              <span className="min-w-0 break-words text-[var(--text-secondary)]">
                {option.label || "-"}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-[var(--text-primary)]">
                {option.value || "-"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-[var(--border)] bg-[var(--bg-surface2)] px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
          No customization options.
        </p>
      )}
    </ItemContentBox>
  );
}

function FulfillmentFiles({
  files,
  previewImageUrl,
}: {
  files: PortalFileLinks;
  previewImageUrl?: string | null;
}) {
  const entries = Object.entries(files).filter(([, url]) => hasText(url));
  const images = [
    ...(hasText(previewImageUrl)
      ? [{ label: "Preview", url: previewImageUrl, preview: true }]
      : []),
    ...entries.map(([side, url]) => ({
      label: side,
      url,
      preview: false,
    })),
  ];

  if (!images.length) {
    return null;
  }

  return (
    <ItemSubsection icon={<ExternalLink />} title="Fulfillment files">
      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <a
            className="group w-32 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)]"
            href={image.url}
            key={`${image.label}-${image.url}`}
            rel="noreferrer"
            target="_blank"
          >
            <div className="flex  w-full items-center justify-center overflow-hidden bg-[var(--bg-surface2)]">
              <img
                alt={
                  image.preview
                    ? "Preview image"
                    : `${image.label} fulfillment image`
                }
                className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.parentElement?.classList.add(
                    "broken-img",
                  );
                }}
                src={image.url}
              />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-1 border-t border-[var(--border)] px-1.5 py-1">
              <span className="truncate text-[10px] font-medium capitalize text-[var(--text-primary)]">
                {image.label}
              </span>
              <ExternalLink
                className="h-3 w-3 shrink-0 text-[var(--brand)]"
                aria-hidden
              />
            </div>
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

function ItemContentBox({
  icon,
  title,
  children,
}: {
  icon: React.ReactElement;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <div className="section-label-xs mb-2 flex items-center gap-1">
        <span className="text-[var(--brand)]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
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
  title: React.ReactNode;
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

function summarizeUniqueItemValues(values: Array<string | null | undefined>) {
  const uniqueValues = Array.from(
    new Set(values.filter((value): value is string => hasText(value))),
  );

  if (!uniqueValues.length) {
    return null;
  }

  const visibleValues = uniqueValues.slice(0, 3);
  const hiddenCount = uniqueValues.length - visibleValues.length;

  return hiddenCount > 0
    ? `${visibleValues.join(", ")} +${hiddenCount} more`
    : visibleValues.join(", ");
}

function getLatestShipmentFailure(order: OrderDetail) {
  const latestShipment = order.shipments?.[0] ?? null;

  if (latestShipment?.status !== "FAILED_CREATE") {
    return null;
  }

  return latestShipment.failure ?? null;
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
    line1:
      readString(record.line1) ??
      readString(record.address) ??
      readString(record.address1),
    line2:
      readString(record.line2) ??
      readString(record.address2) ??
      readString(record.address_2),
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

function formatCurrency(
  value: string | null | undefined,
  currency?: string | null,
) {
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

function formatEstimatedFee(cost: ShipmentCostSummary) {
  if (!hasText(cost.estimatedFee)) {
    return null;
  }

  const amount = Number(cost.estimatedFee);
  if (!Number.isFinite(amount)) {
    return cost.estimatedCurrency
      ? `${cost.estimatedFee} ${cost.estimatedCurrency}`
      : cost.estimatedFee;
  }

  if (cost.estimatedCurrency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      currency: "VND",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount);
  }

  return cost.estimatedCurrency
    ? `${formatNumber(cost.estimatedFee)} ${cost.estimatedCurrency}`
    : formatNumber(cost.estimatedFee);
}

function formatKg(value: string | null | undefined) {
  return formatNumber(value, 3);
}

function formatCm(value: string | null | undefined) {
  return formatNumber(value, 2);
}

function formatNumber(value: string | null | undefined, digits = 2) {
  if (!hasText(value)) {
    return "-";
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(numberValue);
}

function statusDotClass(status: string) {
  if (["READY_TO_SHIP", "FULFILLED", "SHIPPED", "DELIVERED"].includes(status)) {
    return "bg-[var(--success)] shadow-[0_0_0_3px_var(--success-bg)]";
  }

  if (["IN_PROCESSING", "IN_TRANSIT", "CREATED"].includes(status)) {
    return "bg-[var(--info)] shadow-[0_0_0_3px_var(--info-bg)]";
  }

  if (["EXCEPTION", "FAILED_CREATE", "FAILED_LABEL"].includes(status)) {
    return "bg-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]";
  }

  return "bg-[var(--text-muted)] shadow-[0_0_0_3px_#f1f5f9]";
}
