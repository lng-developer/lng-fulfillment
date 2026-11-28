import { PDFDocument } from "pdf-lib";
import { AppError } from "@/shared/errors";
import { getShipmentLabels } from "./labels";
import { getShipmentLabelRecord } from "./repository";

export function validateLabelBatch(value: unknown): {
  shipmentIds: string[];
  mode: "single" | "double";
} {
  const body = value as { shipmentIds?: unknown; mode?: unknown } | null;
  if (
    !body ||
    !Array.isArray(body.shipmentIds) ||
    !body.shipmentIds.length ||
    body.shipmentIds.length > 10 ||
    body.shipmentIds.some(
      (id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id),
    ) ||
    !["single", "double"].includes(String(body.mode))
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Chọn 1–10 vận đơn và loại nhãn hợp lệ.",
      400,
    );
  }
  return {
    shipmentIds: [...new Set(body.shipmentIds as string[])],
    mode: body.mode as "single" | "double",
  };
}
export function validateVpPdfUrl(value: string) {
  const url = new URL(value);
  // Only the VP label CDN used by this integration; do not fetch arbitrary stored URLs.
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !url.hostname.endsWith(".cloudfront.net")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Nguồn nhãn chưa hỗ trợ gom PDF. Hãy mở nhãn riêng.",
      400,
    );
  }
  return url.href;
}
export async function readVpPdf(url: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(validateVpPdfUrl(url), {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.body)
    throw new AppError("CARRIER_ERROR", "Không tải được PDF nhãn VP.", 502);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10 * 1024 * 1024)
        throw new AppError(
          "VALIDATION_ERROR",
          "File nhãn vượt quá 10 MB.",
          413,
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function combineLabelPdfs(files: Uint8Array[]) {
  const merged = await PDFDocument.create();
  let total = 0;
  for (const bytes of files) {
    total += bytes.byteLength;
    if (total > 25 * 1024 * 1024)
      throw new AppError("VALIDATION_ERROR", "Lượt in vượt quá 25 MB.", 413);
    const pdf = await PDFDocument.load(bytes);
    if (merged.getPageCount() + pdf.getPageCount() > 100)
      throw new AppError(
        "VALIDATION_ERROR",
        "Lượt in vượt quá 100 trang.",
        413,
      );
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  if (!merged.getPageCount())
    throw new AppError("VALIDATION_ERROR", "File nhãn không có trang.", 400);
  return merged.save();
}
export async function getVpBatchPdf(
  tenantId: string,
  input: ReturnType<typeof validateLabelBatch>,
) {
  const files: Uint8Array[] = [];
  let total = 0;
  for (const shipmentId of input.shipmentIds) {
    const shipment = await getShipmentLabelRecord(tenantId, shipmentId);
    if (!shipment) throw new AppError("NOT_FOUND", "Shipment not found.", 404);
    if (
      shipment.carrierCode !== "VIETTEL_POST" ||
      ["CANCELLED", "EXCEPTION", "FAILED_CREATE", "DRAFT"].includes(
        shipment.status,
      )
    ) {
      throw new AppError(
        "CONFLICT",
        "Vận đơn chưa đủ điều kiện in nhãn VP.",
        409,
      );
    }
    const labels = await getShipmentLabels(tenantId, shipmentId);
    const url =
      input.mode === "double" ? labels.mergeLabelUrl : labels.labelUrl;
    if (labels.requiresAccount || !url)
      throw new AppError(
        "CONFLICT",
        "Có nhãn chưa sẵn sàng hoặc thiếu tài khoản gốc. Chọn lại các nhãn đã sẵn sàng.",
        409,
      );
    const bytes = await readVpPdf(url);
    total += bytes.length;
    if (total > 25 * 1024 * 1024)
      throw new AppError("VALIDATION_ERROR", "Lượt in vượt quá 25 MB.", 413);
    files.push(bytes);
  }
  return combineLabelPdfs(files);
}
