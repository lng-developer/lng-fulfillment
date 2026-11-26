// Only expose curated guidance, not raw carrier response metadata.
export function getShipmentIssue(shipment: { status?: string; carrierCode?: string | null; metadata?: unknown } | undefined): string | null {
  if (!shipment || !["FAILED_CREATE", "EXCEPTION"].includes(shipment.status ?? "")) return null;
  const metadata = shipment.metadata as { carrier?: { message?: unknown; creationVerified?: unknown }; safe?: { message?: unknown; creationVerified?: unknown } } | null;
  const carrier = metadata?.carrier ?? metadata?.safe;
  const message = typeof carrier?.message === "string" ? carrier.message : "";
  if (shipment.carrierCode === "VIETTEL_POST" && /not enough balance|không đủ số dư|chưa đủ số dư/i.test(message)) {
    return "Tài khoản Viettel Post không đủ số dư. Nạp tiền vào tài khoản đã chọn rồi gửi lại đơn.";
  }
  if (shipment.carrierCode === "VIETTEL_POST" && carrier?.creationVerified === false) {
    return "VP đã trả mã nhưng vận đơn chưa được xác minh hoặc đang lỗi. Cần đối soát trước khi gửi lại.";
  }
  return shipment.status === "FAILED_CREATE"
    ? "Tạo vận đơn thất bại. Kiểm tra thông tin và lỗi của hãng vận chuyển trước khi gửi lại."
    : "Vận đơn có lỗi. Cần kiểm tra hãng vận chuyển.";
}
