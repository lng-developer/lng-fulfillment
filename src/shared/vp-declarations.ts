export type VpDeclaration = {
  orderItemId: string;
  declarationName: string;
  merchandiseCode: string;
};
export function vpSkuGroup(sku: string): string | null {
  const parts = sku.trim().split("-");
  if (parts.length < 3 || parts.some((part) => !part.trim())) return null;
  return /^[A-Za-z0-9]+$/.test(parts[1]) ? parts[1].toUpperCase() : null;
}
export type VpSkuMapping = {
  mappingType?: "SKU" | "GROUP";
  matchedKey?: string;
  skuCode: string;
  destinationCountryCode: string;
  declarationName: string;
  merchandiseCode: string;
};
export function vpDeclarationIssue(items: VpDeclaration[]): string | null {
  if (!items.length) return "Đơn chưa có sản phẩm để khai báo.";
  if (
    items.some(
      (i) =>
        !i.orderItemId ||
        !i.declarationName.trim() ||
        i.declarationName.trim().length > 200 ||
        /[\u0000-\u001f]/.test(i.declarationName),
    )
  )
    return "Nhập tên khai báo đúng hàng thực tế cho từng item (tối đa 200 ký tự).";
  if (items.some((i) => !/^\d{4,12}$/.test(i.merchandiseCode)))
    return "Nhập mã merchandise/HS 4–12 chữ số từ danh mục VP cho từng item.";
  if (new Set(items.map((i) => i.orderItemId)).size !== items.length)
    return "Trùng item trong khai báo.";
  if (new Set(items.map((i) => i.merchandiseCode)).size > 1)
    return "Đơn có nhiều nhóm merchandise. Chưa thể gửi chung theo API VP hiện tại; cần kiểm tra cách đóng kiện.";
  return null;
}
