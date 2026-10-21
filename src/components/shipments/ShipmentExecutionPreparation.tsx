"use client";

import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/base";
import {
  createDraftShipment as createDraftShipmentRequest,
  executeShipment as executeShipmentRequest,
  getPreflight,
  getShipment,
  getShipments,
  syncTracking as syncTrackingRequest,
} from "@/lib/api/shipments";
import styles from "./ShipmentExecutionPreparation.module.css";

type ShipmentCarrierCode = "YUNEXPRESS_OMS" | "VIETTEL_POST";
type ShipmentOptions = {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  hsCode?: string;
  parcels?: Array<{ orderItemId?: string; unitWeight?: number; unitPrice?: number }>;
};

type ShipmentStatus =
  | "DRAFT"
  | "CREATING"
  | "CREATED"
  | "LABEL_READY"
  | "TRACKING_PENDING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED_CREATE"
  | "FAILED_LABEL"
  | "EXCEPTION"
  | "CANCELLED";

type TenantRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";

type OrderItemSummary = {
  id: string;
  sku: string | null;
  name: string | null;
  quantity: number;
};

type ShipmentListItem = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  externalOrderId: string;
  status: ShipmentStatus;
  carrierCode: string | null;
  carrierShipmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

type ShipmentDetail = Omit<ShipmentListItem, "itemCount"> & {
  carrierAccountId: string | null;
  items: Array<{
    id: string;
    orderItemId: string;
    externalItemId: string | null;
    sku: string | null;
    name: string | null;
    quantity: number;
    orderItemQuantity: number;
    createdAt: string;
    updatedAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    status: ShipmentStatus;
    note: string | null;
    actorType: "USER" | "API_KEY" | "SYSTEM";
    actorId: string | null;
    createdAt: string;
  }>;
};

type ShipmentPreflight = {
  shipmentId: string;
  shipmentStatus: ShipmentStatus;
  carrierCode: ShipmentCarrierCode;
  liveEnabled: boolean;
  env: {
    baseUrlPresent: boolean;
    customerNoPresent: boolean;
    apiSecretPresent: boolean;
    defaultShippingMethodCode: string;
  };
  mappingPreview: {
    customerOrderNumber: string;
    shippingMethodCode: string;
    receiver: {
      country: string | null;
      state: string | null;
      city: string | null;
      postalCode: string | null;
    };
    package: {
      weight: number;
      length: number;
      width: number;
      height: number;
      packageCount: number;
    };
    parcels: Array<{
      sku: string | null;
      eName: string;
      cName: string;
      quantity: number;
      unitWeight: number | null;
      unitPrice: number | null;
    }>;
    sourceCode: string;
  };
  warnings: string[];
};

type ExecuteResult = {
  shipment: ShipmentDetail;
  carrierCode: ShipmentCarrierCode;
  carrierAccountId: string | null;
};

type TrackingSyncResult = {
  shipment: Pick<
    ShipmentDetail,
    | "id"
    | "status"
    | "carrierCode"
    | "carrierShipmentId"
    | "trackingNumber"
    | "updatedAt"
  >;
  tracking: {
    status:
      | "TRACKING_PENDING"
      | "IN_TRANSIT"
      | "DELIVERED"
      | "EXCEPTION"
      | "CANCELLED"
      | "RETURNED"
      | "UNKNOWN"
      | null;
    latestEvent: {
      eventTime: string;
      message: string | null;
      location: string | null;
    } | null;
    eventsCount: number;
  };
};

const EXECUTABLE_STATUSES: ShipmentStatus[] = ["DRAFT", "FAILED_CREATE"];
const CONFIRMATION_TEXT_BY_CARRIER: Record<ShipmentCarrierCode, string> = {
  YUNEXPRESS_OMS: "CREATE YUNEXPRESS SHIPMENT",
  VIETTEL_POST: "CREATE VIETTEL POST SHIPMENT",
};
const FAILURE_STATUSES: ShipmentStatus[] = [
  "FAILED_CREATE",
  "FAILED_LABEL",
  "EXCEPTION",
];

export function ShipmentExecutionPreparation({
  orderId,
  orderItems,
}: {
  orderId: string | null;
  orderItems: OrderItemSummary[];
}) {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [selectedShipmentDetail, setSelectedShipmentDetail] =
    useState<ShipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<ShipmentPreflight | null>(null);
  const [isPreflightLoading, setIsPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [carrierCode, setCarrierCode] = useState<ShipmentCarrierCode>("YUNEXPRESS_OMS");
  const [carrierOptions, setCarrierOptions] = useState<ShipmentOptions>({});
  const [viettelItemWeight, setViettelItemWeight] = useState("");
  const [viettelDeclaredValue, setViettelDeclaredValue] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [draftSelection, setDraftSelection] = useState<Record<string, boolean>>({});
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [createDraftError, setCreateDraftError] = useState<string | null>(null);
  const [createDraftMessage, setCreateDraftMessage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<TenantRole | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [trackingSyncError, setTrackingSyncError] = useState<string | null>(null);
  const [trackingSyncResult, setTrackingSyncResult] =
    useState<TrackingSyncResult | null>(null);
  const [isTrackingSyncing, setIsTrackingSyncing] = useState(false);

  useEffect(() => {
    setPreflight(null);
    setPreflightError(null);
    setExecuteError(null);
    setExecuteResult(null);
    setTrackingSyncError(null);
    setTrackingSyncResult(null);
    setConfirmationChecked(false);
    setConfirmationText("");
  }, [selectedShipmentId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRole() {
      setIsRoleLoading(true);

      try {
        const body = await getMe();
        setCurrentRole(
          (body.tenantMemberships.find((tenant) => tenant.status === "ACTIVE")
            ?.role as TenantRole | undefined) ?? null,
        );
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setCurrentRole(null);
        }
      } finally {
        setIsRoleLoading(false);
      }
    }

    loadRole();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDraftSelection({});
    setDraftQuantities(
      Object.fromEntries(orderItems.map((item) => [item.id, "1"])),
    );
    setCreateDraftError(null);
    setCreateDraftMessage(null);
  }, [orderItems]);

  useEffect(() => {
    if (!orderId) {
      setShipments([]);
      setSelectedShipmentId("");
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    const currentOrderId = orderId;

    async function loadShipments() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const body = await getShipments(
          { orderId: currentOrderId, pageSize: 100 },
          controller.signal,
        );

        setShipments(body.data as ShipmentListItem[]);
        setSelectedShipmentId((current) => {
          if (body.data.some((shipment) => shipment.id === current)) {
            return current;
          }

          return (
            body.data.find((shipment) =>
              EXECUTABLE_STATUSES.includes(shipment.status as ShipmentStatus),
            )?.id ??
            body.data[0]?.id ??
            ""
          );
        });
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setShipments([]);
          setSelectedShipmentId("");
          setLoadError(getErrorMessage(loadError));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadShipments();

    return () => controller.abort();
  }, [orderId, refreshToken]);

  useEffect(() => {
    if (!selectedShipmentId) {
      setSelectedShipmentDetail(null);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();

    async function loadShipmentDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const body = await getShipment(selectedShipmentId, controller.signal);
        setSelectedShipmentDetail(body as ShipmentDetail);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setSelectedShipmentDetail(null);
          setDetailError(getErrorMessage(loadError));
        }
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadShipmentDetail();

    return () => controller.abort();
  }, [selectedShipmentId, refreshToken]);

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null,
    [selectedShipmentId, shipments],
  );
  const canPreflight = Boolean(
    selectedShipment && EXECUTABLE_STATUSES.includes(selectedShipment.status),
  );
  const envReady = Boolean(
    preflight?.env.baseUrlPresent &&
      preflight.env.customerNoPresent &&
      preflight.env.apiSecretPresent,
  );
  const confirmationTextExpected = CONFIRMATION_TEXT_BY_CARRIER[carrierCode];
  const exactConfirmationMatches = confirmationText.trim() === confirmationTextExpected;
  const canExecute = Boolean(
    preflight?.liveEnabled &&
      envReady &&
      confirmationChecked &&
      exactConfirmationMatches &&
      selectedShipmentId &&
      !isExecuting,
  );
  const draftPayload = buildDraftPayload(orderItems, draftSelection, draftQuantities);
  const draftValidationError = validateDraftPayload(draftPayload);
  const canCreateDraft = Boolean(
    orderId && draftPayload.length > 0 && !draftValidationError && !isCreatingDraft,
  );
  const canManageTracking = currentRole
    ? ["OWNER", "ADMIN", "OPERATOR"].includes(currentRole)
    : false;

  async function createDraftShipment() {
    if (!orderId || !canCreateDraft) {
      return;
    }

    setIsCreatingDraft(true);
    setCreateDraftError(null);
    setCreateDraftMessage(null);

    try {
      const body = await createDraftShipmentRequest(
        orderId,
        draftPayload.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      );

      setSelectedShipmentId(body.id);
      setCreateDraftMessage("Draft shipment created.");
      setDraftSelection({});
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setCreateDraftError(getErrorMessage(error));
    } finally {
      setIsCreatingDraft(false);
    }
  }

  async function runPreflight() {
    if (!selectedShipmentId || !canPreflight || isPreflightLoading) {
      return;
    }

    setIsPreflightLoading(true);
    setPreflightError(null);
    setPreflight(null);
    setExecuteError(null);
    setExecuteResult(null);

    try {
      const body = await getPreflight(
        selectedShipmentId,
        carrierCode,
        null,
        buildCarrierOptions(carrierCode, carrierOptions, selectedShipmentDetail, viettelItemWeight, viettelDeclaredValue),
      );
      setPreflight(body as ShipmentPreflight);
    } catch (error) {
      setPreflightError(getErrorMessage(error));
    } finally {
      setIsPreflightLoading(false);
    }
  }

  async function executeShipment() {
    if (!canExecute || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setExecuteError(null);
    setExecuteResult(null);

    try {
      const body = await executeShipmentRequest(
        selectedShipmentId,
        carrierCode,
        null,
        buildCarrierOptions(carrierCode, carrierOptions, selectedShipmentDetail, viettelItemWeight, viettelDeclaredValue),
      );
      setExecuteResult(body as ExecuteResult);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setExecuteError(getErrorMessage(error));
    } finally {
      setIsExecuting(false);
    }
  }

  async function syncTracking() {
    if (!selectedShipmentDetail || isTrackingSyncing || !canManageTracking) {
      return;
    }

    setIsTrackingSyncing(true);
    setTrackingSyncError(null);
    setTrackingSyncResult(null);

    try {
      const body = await syncTrackingRequest(selectedShipmentDetail.id);
      setTrackingSyncResult(body as TrackingSyncResult);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setTrackingSyncError(getErrorMessage(error));
    } finally {
      setIsTrackingSyncing(false);
    }
  }

  return (
    <section
      aria-labelledby="shipment-execution-title"
      className={styles.preflight}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Shipments</p>
          <h4 id="shipment-execution-title">Shipment preparation</h4>
        </div>
        <button
          className={styles.secondaryButton}
          disabled={isLoading || !orderId}
          onClick={() => setRefreshToken((value) => value + 1)}
          type="button"
        >
          {isLoading ? "Loading..." : "Refresh shipments"}
        </button>
      </div>

      {!orderId ? (
        <p className={styles.empty}>Select an order to prepare shipments.</p>
      ) : null}

      {orderId ? (
        <div className={styles.sectionBlock}>
          <div className={styles.blockHeader}>
            <div>
              <h5>Create draft shipment</h5>
              <p>Select order items and quantities. This does not call a carrier.</p>
            </div>
            <span className={styles.readinessBadge}>Draft only</span>
          </div>

          {orderItems.length ? (
            <div className={styles.itemSelectionList}>
              {orderItems.map((item) => (
                <div className={styles.itemSelectionRow} key={item.id}>
                  <label className={styles.checkboxField}>
                    <input
                      checked={Boolean(draftSelection[item.id])}
                      onChange={(event) =>
                        setDraftSelection((current) => ({
                          ...current,
                          [item.id]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      {item.name ?? item.sku ?? "Unnamed item"} |{" "}
                      {item.sku ?? "No SKU"}
                    </span>
                  </label>
                  <label className={styles.quantityField}>
                    <span>Quantity</span>
                    <input
                      disabled={!draftSelection[item.id]}
                      max={item.quantity}
                      min={1}
                      onChange={(event) =>
                        setDraftQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      type="number"
                      value={draftQuantities[item.id] ?? "1"}
                    />
                    <small>Max {item.quantity}</small>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No order items are available.</p>
          )}

          {draftValidationError ? (
            <p className={styles.inlineWarning}>{draftValidationError}</p>
          ) : null}
          {createDraftError ? (
            <p className={styles.error} role="alert">
              {createDraftError}
            </p>
          ) : null}
          {createDraftMessage ? (
            <p className={styles.notice}>{createDraftMessage}</p>
          ) : null}
          <button
            className={styles.primaryButton}
            disabled={!canCreateDraft}
            onClick={createDraftShipment}
            type="button"
          >
            {isCreatingDraft ? "Creating draft..." : "Create draft shipment"}
          </button>
        </div>
      ) : null}

      <div className={styles.sectionBlock}>
        <div className={styles.blockHeader}>
          <div>
            <h5>Related shipments</h5>
            <p>Tenant-scoped shipment records for this order.</p>
          </div>
          {isLoading ? <span className={styles.readinessBadge}>Loading</span> : null}
        </div>

        {loadError ? (
          <p className={styles.error} role="alert">
            {loadError}
          </p>
        ) : null}

        {orderId && !isLoading && shipments.length === 0 ? (
          <p className={styles.empty}>No shipments exist for this order yet.</p>
        ) : null}

        {shipments.length > 0 ? (
          <div className={styles.shipmentList}>
            {shipments.map((shipment) => (
              <button
                className={
                  shipment.id === selectedShipmentId
                    ? `${styles.shipmentRow} ${styles.selectedShipmentRow}`
                    : styles.shipmentRow
                }
                key={shipment.id}
                onClick={() => setSelectedShipmentId(shipment.id)}
                type="button"
              >
                <div>
                  <strong>{shipment.id}</strong>
                  <span>
                    {shipment.itemCount} items | created {formatDate(shipment.createdAt)}
                  </span>
                </div>
                <StatusBadge status={shipment.status} />
                <span>{shipment.carrierCode ?? "No carrier"}</span>
                <span>{shipment.carrierShipmentId ?? "No carrier id"}</span>
                <span>{shipment.trackingNumber ?? "No tracking"}</span>
                <span>{shipment.labelUrl ? "Label available" : "No label"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedShipmentId ? (
        <div className={styles.sectionBlock}>
          <div className={styles.blockHeader}>
            <div>
              <h5>Shipment detail</h5>
              <p>Items, carrier result fields, and status history.</p>
            </div>
            {selectedShipment ? <StatusBadge status={selectedShipment.status} /> : null}
          </div>

          {isDetailLoading ? (
            <p className={styles.empty}>Loading shipment detail...</p>
          ) : null}
          {detailError ? (
            <p className={styles.error} role="alert">
              {detailError}
            </p>
          ) : null}
          {selectedShipmentDetail ? (
            <ShipmentDetailPanel
              canManageTracking={canManageTracking}
              isRoleLoading={isRoleLoading}
              isTrackingSyncing={isTrackingSyncing}
              onSyncTracking={syncTracking}
              shipment={selectedShipmentDetail}
              trackingSyncError={trackingSyncError}
              trackingSyncResult={trackingSyncResult}
            />
          ) : null}
        </div>
      ) : null}

      {shipments.length > 0 ? (
        <div className={styles.sectionBlock}>
          <div className={styles.blockHeader}>
            <div>
              <h5>{carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress OMS"} preflight</h5>
              <p>Safe readiness check and mapping preview.</p>
            </div>
            <span className={styles.carrierBadge}>{carrierCode}</span>
          </div>

          <div className={styles.controls}>
            <label className={styles.field}>
              <span>Shipment</span>
              <select
                className={styles.select}
                onChange={(event) => setSelectedShipmentId(event.target.value)}
                value={selectedShipmentId}
              >
                {shipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.id} | {formatStatus(shipment.status)} |{" "}
                    {shipment.itemCount} items
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Carrier</span>
              <select
                className={styles.select}
                onChange={(event) => {
                  setCarrierCode(event.target.value as ShipmentCarrierCode);
                  setPreflight(null);
                  setConfirmationChecked(false);
                  setConfirmationText("");
                }}
                value={carrierCode}
              >
                <option value="YUNEXPRESS_OMS">YUNEXPRESS_OMS</option>
                <option value="VIETTEL_POST">VIETTEL_POST</option>
              </select>
            </label>

            {carrierCode === "VIETTEL_POST" ? (
              <div className={styles.carrierOptions}>
                <label className={styles.field}>
                  <span>Weight (g)</span>
                  <input
                    className={styles.input}
                    min="1"
                    onChange={(event) =>
                      setCarrierOptions((current) => ({
                        ...current,
                        weight: toPositiveNumber(event.target.value),
                      }))
                    }
                    placeholder="1000"
                    type="number"
                    value={carrierOptions.weight ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Length (cm)</span>
                  <input
                    className={styles.input}
                    min="1"
                    onChange={(event) =>
                      setCarrierOptions((current) => ({
                        ...current,
                        length: toPositiveNumber(event.target.value),
                      }))
                    }
                    placeholder="20"
                    type="number"
                    value={carrierOptions.length ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Width (cm)</span>
                  <input
                    className={styles.input}
                    min="1"
                    onChange={(event) =>
                      setCarrierOptions((current) => ({
                        ...current,
                        width: toPositiveNumber(event.target.value),
                      }))
                    }
                    placeholder="15"
                    type="number"
                    value={carrierOptions.width ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Height (cm)</span>
                  <input
                    className={styles.input}
                    min="1"
                    onChange={(event) =>
                      setCarrierOptions((current) => ({
                        ...current,
                        height: toPositiveNumber(event.target.value),
                      }))
                    }
                    placeholder="10"
                    type="number"
                    value={carrierOptions.height ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>HS code</span>
                  <input
                    className={styles.input}
                    onChange={(event) =>
                      setCarrierOptions((current) => ({
                        ...current,
                        hsCode: event.target.value,
                      }))
                    }
                    placeholder="950300"
                    value={carrierOptions.hsCode ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Item weight (g)</span>
                  <input
                    className={styles.input}
                    min="1"
                    onChange={(event) => setViettelItemWeight(event.target.value)}
                    placeholder="1000"
                    type="number"
                    value={viettelItemWeight}
                  />
                </label>
                <label className={styles.field}>
                  <span>Declared value</span>
                  <input
                    className={styles.input}
                    min="0"
                    onChange={(event) => setViettelDeclaredValue(event.target.value)}
                    placeholder="19.96"
                    type="number"
                    value={viettelDeclaredValue}
                  />
                </label>
              </div>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={!canPreflight || isPreflightLoading}
              onClick={runPreflight}
              type="button"
            >
              {isPreflightLoading ? "Checking..." : "Run preflight"}
            </button>
          </div>

          {selectedShipment && !canPreflight ? (
            <p className={styles.notice}>
              Only DRAFT or FAILED_CREATE shipments can be prepared for execution.
            </p>
          ) : null}

          {preflightError ? (
            <p className={styles.error} role="alert">
              {preflightError}
            </p>
          ) : null}

          {preflight ? <PreflightPreview preflight={preflight} /> : null}

          {preflight && !preflight.liveEnabled ? (
            <p className={styles.notice}>
              Live {carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress OMS"} shipment creation is disabled.
            </p>
          ) : null}

          {preflight?.liveEnabled ? (
            <div className={styles.confirmation}>
              <p className={styles.dangerText}>
                This will create a real {carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress OMS"} shipment. Only continue if
                you are ready to manage/cancel it.
              </p>
              <label className={styles.checkboxField}>
                <input
                  checked={confirmationChecked}
                  onChange={(event) =>
                    setConfirmationChecked(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  I understand this will create a real or sandbox {carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress OMS"} shipment.
                </span>
              </label>
              <label className={styles.field}>
                <span>Confirmation text</span>
                <input
                  className={styles.input}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder={CONFIRMATION_TEXT_BY_CARRIER[carrierCode]}
                  value={confirmationText}
                />
              </label>
            </div>
          ) : null}

          {executeError ? (
            <p className={styles.error} role="alert">
              {executeError}
            </p>
          ) : null}
          {executeResult ? <ExecuteResultSummary result={executeResult} /> : null}

          <button
            className={styles.executeButton}
            disabled={!canExecute}
            onClick={executeShipment}
            type="button"
          >
            {isExecuting
              ? "Creating shipment..."
              : `Create ${carrierCode === "VIETTEL_POST" ? "Viettel Post" : "YunExpress"} shipment`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ShipmentDetailPanel({
  canManageTracking,
  isRoleLoading,
  isTrackingSyncing,
  onSyncTracking,
  shipment,
  trackingSyncError,
  trackingSyncResult,
}: {
  canManageTracking: boolean;
  isRoleLoading: boolean;
  isTrackingSyncing: boolean;
  onSyncTracking: () => void;
  shipment: ShipmentDetail;
  trackingSyncError: string | null;
  trackingSyncResult: TrackingSyncResult | null;
}) {
  const latestStatusEntry =
    shipment.statusHistory.length > 0
      ? shipment.statusHistory[shipment.statusHistory.length - 1]
      : null;
  const carrierResultState = getCarrierResultState(shipment);
  const trackingEligibility = getTrackingSyncEligibility(shipment);
  const canSyncTracking =
    trackingEligibility.canSync &&
    canManageTracking &&
    !isRoleLoading &&
    !isTrackingSyncing;

  return (
    <div className={styles.detailStack}>
      <div className={styles.previewGrid}>
        <SummaryItem label="Carrier" value={shipment.carrierCode ?? "Not set"} />
        <SummaryItem
          label="Carrier shipment ID"
          value={shipment.carrierShipmentId ?? "Not available"}
        />
        <SummaryItem
          label="Tracking"
          value={shipment.trackingNumber ?? "Not available"}
        />
        <SummaryItem
          label="Label"
          value={shipment.labelUrl ? "Available" : "Not available"}
        />
        <SummaryItem label="Created" value={formatDate(shipment.createdAt)} />
        <SummaryItem label="Updated" value={formatDate(shipment.updatedAt)} />
      </div>

      <div
        className={`${styles.resultPanel} ${styles[`result${carrierResultState.tone}`]}`}
      >
        <div className={styles.resultHeader}>
          <div>
            <h5>Carrier result</h5>
            <p>{carrierResultState.message}</p>
          </div>
          <span className={styles.resultBadge}>{carrierResultState.title}</span>
        </div>

        <div className={styles.resultGrid}>
          <ResultItem
            label="Carrier"
            state={shipment.carrierCode ?? "Not set"}
            value={
              shipment.carrierCode
                ? "Carrier selected for this shipment."
                : "Carrier result missing."
            }
          />
          <ResultItem
            label="Waybill"
            state={shipment.carrierShipmentId ? "Available" : "Not available"}
            value={
              shipment.carrierShipmentId
                ? "Carrier shipment id is stored."
                : "No carrier shipment id has been stored."
            }
          />
          <ResultItem
            label="Tracking"
            state={shipment.trackingNumber ? "Available" : "Pending"}
            value={
              shipment.trackingNumber
                ? "Tracking number is stored."
                : "Tracking number is not available yet."
            }
          />
          <ResultItem
            label="Label"
            state={shipment.labelUrl ? "Available" : "Unavailable"}
            value={
              shipment.labelUrl
                ? "Label link is available. The URL is not displayed as text."
                : "Label not available yet."
            }
          />
        </div>

        {carrierResultState.failureMessage ? (
          <p className={styles.failureMessage}>{carrierResultState.failureMessage}</p>
        ) : null}
      </div>

      <div className={styles.trackingPanel}>
        <div className={styles.trackingHeader}>
          <div>
            <h5>Tracking state</h5>
            <p>Existing shipment tracking fields and status history only.</p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <div className={styles.trackingGrid}>
          <TrackingItem label="Carrier" value={shipment.carrierCode ?? "Not set"} />
          <TrackingItem
            label="Waybill / carrier ID"
            value={shipment.carrierShipmentId ?? "Not available"}
          />
          <TrackingItem
            label="Tracking number"
            value={shipment.trackingNumber ?? "Not available yet"}
          />
          <TrackingItem
            label="Latest known status"
            value={
              latestStatusEntry
                ? `${formatStatus(latestStatusEntry.status)} | ${formatDate(latestStatusEntry.createdAt)}`
                : "No status history yet"
            }
          />
          <TrackingItem label="Created" value={formatDate(shipment.createdAt)} />
          <TrackingItem label="Updated" value={formatDate(shipment.updatedAt)} />
        </div>

        {!shipment.trackingNumber ? (
          <p className={styles.empty}>
            No tracking number exists yet.
          </p>
        ) : null}

        <div className={styles.labelState}>
          <div>
            <strong>Label</strong>
            <span>
              {shipment.labelUrl
                ? "Label URL is available from the carrier result."
                : "Label not available yet"}
            </span>
          </div>
          {shipment.labelUrl ? (
            <a
              aria-label="Open shipment label in a new tab"
              className={styles.labelLink}
              href={shipment.labelUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open Label
            </a>
          ) : null}
        </div>

        <div className={styles.trackingActionPanel}>
          <div>
            <strong>Manual tracking sync</strong>
            <span>
              Sync only runs when you click the button. It never runs on page
              load, selection, refresh, or polling.
            </span>
          </div>
          <button
            className={styles.primaryButton}
            disabled={!canSyncTracking}
            onClick={onSyncTracking}
            type="button"
          >
            {isTrackingSyncing ? "Syncing tracking..." : "Sync tracking"}
          </button>
        </div>

        {!trackingEligibility.canSync ? (
          <p className={styles.notice}>{trackingEligibility.message}</p>
        ) : null}
        {isRoleLoading ? (
          <p className={styles.notice}>Checking tenant role before enabling sync.</p>
        ) : null}
        {!isRoleLoading && !canManageTracking ? (
          <p className={styles.notice}>
            Tracking sync is available to OWNER, ADMIN, and OPERATOR roles only.
          </p>
        ) : null}
        {trackingSyncError ? (
          <p className={styles.error} role="alert">
            {trackingSyncError}
          </p>
        ) : null}
        {trackingSyncResult ? (
          <TrackingSyncResultSummary result={trackingSyncResult} />
        ) : null}
      </div>

      <div className={styles.fullWidthBlock}>
        <h5>Shipment items</h5>
        {shipment.items.length ? (
          <div className={styles.parcelList}>
            {shipment.items.map((item) => (
              <div className={styles.parcelRow} key={item.id}>
                <div>
                  <strong>{item.name ?? item.sku ?? "Unnamed item"}</strong>
                  <span>{item.sku ?? "No SKU"}</span>
                </div>
                <span>Shipment qty {item.quantity}</span>
                <span>Order qty {item.orderItemQuantity}</span>
                <span>{item.externalItemId ?? "No external item"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No shipment items found.</p>
        )}
      </div>

      <div className={styles.fullWidthBlock}>
        <h5>Shipment status history</h5>
        {shipment.statusHistory.length ? (
          <ol className={styles.timeline}>
            {shipment.statusHistory.map((entry) => (
              <li className={styles.timelineEntry} key={entry.id}>
                <div className={styles.timelineEntryHeader}>
                  <StatusBadge status={entry.status} />
                  <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                </div>
                <p>{entry.note ?? "No note"}</p>
                <span>{entry.actorType}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>No status history found.</p>
        )}
      </div>
    </div>
  );
}

function ResultItem({
  label,
  state,
  value,
}: {
  label: string;
  state: string;
  value: string;
}) {
  return (
    <div className={styles.resultItem}>
      <span>{label}</span>
      <strong>{state}</strong>
      <p>{value}</p>
    </div>
  );
}

function TrackingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.trackingItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreflightPreview({ preflight }: { preflight: ShipmentPreflight }) {
  return (
    <div className={styles.previewGrid}>
      <div className={styles.previewBlock}>
        <h5>Preflight</h5>
        <dl className={styles.definitionList}>
          <Definition label="Shipment status" value={formatStatus(preflight.shipmentStatus)} />
          <Definition label="Carrier" value={preflight.carrierCode} />
          <Definition label="Live enabled" value={preflight.liveEnabled ? "Yes" : "No"} />
          <Definition
            label="Readiness"
            value={preflight.liveEnabled ? "Manual confirmation required" : "Live disabled"}
          />
          <Definition
            label="Shipping method"
            value={preflight.mappingPreview.shippingMethodCode}
          />
          <Definition label="Source" value={preflight.mappingPreview.sourceCode} />
        </dl>
      </div>

      <div className={styles.previewBlock}>
        <h5>Environment</h5>
        <dl className={styles.definitionList}>
          <Definition
            label="Base URL"
            value={preflight.env.baseUrlPresent ? "Present" : "Missing"}
          />
          <Definition
            label="Customer number"
            value={preflight.env.customerNoPresent ? "Present" : "Missing"}
          />
          <Definition
            label="API secret"
            value={preflight.env.apiSecretPresent ? "Present" : "Missing"}
          />
          <Definition
            label="Default method"
            value={preflight.env.defaultShippingMethodCode}
          />
        </dl>
      </div>

      <div className={styles.previewBlock}>
        <h5>Receiver preview</h5>
        <dl className={styles.definitionList}>
          <Definition
            label="Country"
            value={preflight.mappingPreview.receiver.country ?? "Missing"}
          />
          <Definition
            label="State"
            value={preflight.mappingPreview.receiver.state ?? "Not provided"}
          />
          <Definition
            label="City"
            value={preflight.mappingPreview.receiver.city ?? "Not provided"}
          />
          <Definition
            label="Postal code"
            value={preflight.mappingPreview.receiver.postalCode ?? "Not provided"}
          />
        </dl>
      </div>

      <div className={styles.previewBlock}>
        <h5>Package preview</h5>
        <dl className={styles.definitionList}>
          <Definition
            label="Weight"
            value={String(preflight.mappingPreview.package.weight)}
          />
          <Definition
            label="Dimensions"
            value={`${preflight.mappingPreview.package.length} x ${preflight.mappingPreview.package.width} x ${preflight.mappingPreview.package.height}`}
          />
          <Definition
            label="Packages"
            value={String(preflight.mappingPreview.package.packageCount)}
          />
        </dl>
      </div>

      <div className={styles.fullWidthBlock}>
        <h5>Parcels</h5>
        <div className={styles.parcelList}>
          {preflight.mappingPreview.parcels.map((parcel, index) => (
            <div className={styles.parcelRow} key={`${parcel.sku}-${index}`}>
              <div>
                <strong>{parcel.eName}</strong>
                <span>{parcel.sku ?? "No SKU"}</span>
              </div>
              <span>Qty {parcel.quantity}</span>
              <span>Weight {parcel.unitWeight ?? "default"}</span>
              <span>Value {parcel.unitPrice ?? "not provided"}</span>
            </div>
          ))}
        </div>
      </div>

      {preflight.warnings.length ? (
        <div className={styles.fullWidthBlock}>
          <h5>Warnings</h5>
          <ul className={styles.warningList}>
            {preflight.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ExecuteResultSummary({ result }: { result: ExecuteResult }) {
  return (
    <div className={styles.notice}>
      Shipment execution accepted. Status: {formatStatus(result.shipment.status)}.
      Carrier ID: {result.shipment.carrierShipmentId ?? "not available"}. Tracking:{" "}
      {result.shipment.trackingNumber ?? "not available"}. Label:{" "}
      {result.shipment.labelUrl ? "available" : "not available"}.
    </div>
  );
}

function TrackingSyncResultSummary({ result }: { result: TrackingSyncResult }) {
  return (
    <div className={styles.notice} role="status">
      Tracking sync completed. Status: {formatStatus(result.shipment.status)}.
      Tracking: {result.shipment.trackingNumber ?? "not available"}. Events:{" "}
      {result.tracking.eventsCount}. Latest:{" "}
      {result.tracking.latestEvent
        ? [
            result.tracking.latestEvent.message,
            result.tracking.latestEvent.location,
            formatDate(result.tracking.latestEvent.eventTime),
          ]
            .filter(Boolean)
            .join(" | ")
        : "not available"}
      .
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.previewBlock}>
      <h5>{label}</h5>
      <p className={styles.summaryValue}>{value}</p>
    </div>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`] ?? ""}`}>
      {formatStatus(status)}
    </span>
  );
}

function getCarrierResultState(shipment: ShipmentDetail): {
  title: string;
  tone: "Neutral" | "Success" | "Warning" | "Danger";
  message: string;
  failureMessage?: string;
} {
  if (FAILURE_STATUSES.includes(shipment.status)) {
    return {
      title: formatStatus(shipment.status),
      tone: "Danger",
      message:
        "Carrier execution did not complete successfully. Raw carrier payload is not shown.",
      failureMessage: getSafeFailureMessage(shipment),
    };
  }

  if (shipment.labelUrl) {
    return {
      title: "Label available",
      tone: "Success",
      message: "Carrier label is available through a safe action link.",
    };
  }

  if (shipment.trackingNumber || shipment.status === "TRACKING_PENDING") {
    return {
      title: "Tracking pending",
      tone: "Warning",
      message: "Shipment has carrier tracking context but no label is available yet.",
    };
  }

  if (shipment.carrierShipmentId || shipment.status === "CREATED") {
    return {
      title: "Carrier result stored",
      tone: "Neutral",
      message: "Carrier result exists, but label and tracking are not complete yet.",
    };
  }

  return {
    title: "Carrier result missing",
    tone: "Neutral",
    message: "No carrier result has been stored for this shipment yet.",
  };
}

function getSafeFailureMessage(shipment: ShipmentDetail) {
  const latestFailure = [...shipment.statusHistory]
    .reverse()
    .find((entry) => FAILURE_STATUSES.includes(entry.status));

  if (latestFailure?.note) {
    return latestFailure.note;
  }

  if (shipment.status === "FAILED_LABEL") {
    return "Label generation or label retrieval failed. No raw carrier response is shown.";
  }

  if (shipment.status === "EXCEPTION") {
    return "Shipment is in exception state. Review safe status history before retrying.";
  }

  return "Shipment creation failed. Review safe status history before retrying.";
}

function getTrackingSyncEligibility(shipment: ShipmentDetail): {
  canSync: boolean;
  message: string;
} {
  if (!shipment.carrierCode) {
    return {
      canSync: false,
      message: "Tracking sync requires a carrier.",
    };
  }

  if (
    shipment.carrierShipmentId ||
    shipment.trackingNumber ||
    shipment.orderNumber ||
    shipment.externalOrderId
  ) {
    return {
      canSync: true,
      message: "Tracking sync is available.",
    };
  }

  return {
    canSync: false,
    message:
      "Tracking sync requires a waybill, tracking number, or customer order number.",
  };
}

function buildDraftPayload(
  orderItems: OrderItemSummary[],
  draftSelection: Record<string, boolean>,
  draftQuantities: Record<string, string>,
) {
  return orderItems
    .filter((item) => draftSelection[item.id])
    .map((item) => ({
      maxQuantity: item.quantity,
      orderItemId: item.id,
      quantity: Number(draftQuantities[item.id]),
    }));
}

function validateDraftPayload(
  draftPayload: Array<{
    maxQuantity: number;
    orderItemId: string;
    quantity: number;
  }>,
) {
  if (draftPayload.length === 0) {
    return null;
  }

  for (const item of draftPayload) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Selected item quantities must be positive whole numbers.";
    }

    if (item.quantity > item.maxQuantity) {
      return "Selected item quantity cannot exceed the order item quantity.";
    }
  }

  return null;
}

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildCarrierOptions(
  carrierCode: ShipmentCarrierCode,
  options: ShipmentOptions,
  shipment: ShipmentDetail | null,
  itemWeight: string,
  declaredValue: string,
): ShipmentOptions {
  if (carrierCode !== "VIETTEL_POST") {
    return options;
  }

  const unitWeight = toPositiveNumber(itemWeight);
  const unitPrice = toPositiveNumber(declaredValue);
  if (!shipment?.items.length || (!unitWeight && !unitPrice)) {
    return options;
  }

  return {
    ...options,
    parcels: shipment.items.map((item) => ({
      orderItemId: item.orderItemId,
      ...(unitWeight ? { unitWeight } : {}),
      ...(unitPrice ? { unitPrice } : {}),
    })),
  };
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
