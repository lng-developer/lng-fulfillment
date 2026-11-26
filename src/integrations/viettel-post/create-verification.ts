import type { CreateCarrierShipmentResult } from "@/modules/carrier/types";
import { normalizeViettelPostTrackingNumber } from "./tracking";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export async function verifyViettelPostCreation(
  result: CreateCarrierShipmentResult,
  createBody: unknown,
  lookup: () => Promise<Response>,
): Promise<CreateCarrierShipmentResult> {
  const envelope = record(createBody);
  const created = record(envelope?.data) ?? envelope;
  let reason = "Không xác minh được vận đơn trên VP. Cần đối soát trước khi gửi lại.";
  let verified = false;
  let trackingNumber = result.trackingNumber;
  let labelUrl = result.labelUrl;
  let status: unknown = created?.status;
  const rejected = (body: Record<string, unknown> | null) =>
    body?.success === false || body?.status === false ||
    (typeof body?.status === "number" && [4, 5, 6, 7, 11].includes(body.status));
  if (rejected(envelope) || rejected(created)) {
    reason = "VP trả trạng thái lỗi hoặc hủy khi tạo vận đơn. Cần kiểm tra phía VP.";
  } else {
    try {
      const response = await lookup();
      const body = record(await response.json());
      const detail = record(body?.data) ?? body;
      const identities = [detail?.id, detail?.shipmentId, detail?.shipmentCode, detail?.vtpOrderNumber];
      const matches = identities.includes(result.carrierShipmentId);
      status = detail?.status;
      verified = response.ok && matches && !rejected(body) && !rejected(detail) &&
        typeof status === "number" && [0, 1, 2, 3, 8, 9, 10].includes(status);
      if (verified) {
        const rawTracking = detail?.trackingCode ?? detail?.trackingNumber;
        trackingNumber = normalizeViettelPostTrackingNumber(typeof rawTracking === "string" ? rawTracking : undefined) ?? trackingNumber;
        const rawLabel = detail?.labelUrl ?? detail?.labelUrlVTP;
        if (typeof rawLabel === "string" && rawLabel.trim()) labelUrl = rawLabel.trim();
      }
      if (matches && rejected(detail)) reason = "VP đã cấp mã nhưng vận đơn đang lỗi hoặc đã hủy.";
    } catch {
      // Keep the returned identity: a lookup timeout is not proof that creation failed.
    }
  }
  return {
    ...result,
    trackingNumber,
    labelUrl,
    metadata: { ...result.metadata, safe: {
      ...result.metadata?.safe,
      creationVerified: verified,
      ...(typeof status === "number" ? { shipmentStatus: status } : {}),
      ...(!verified ? { creationReviewReason: reason } : {}),
    } },
  };
}
