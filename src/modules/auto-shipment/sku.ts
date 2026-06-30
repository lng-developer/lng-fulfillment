const SKU_CODE_SEGMENT_INDEX = 1;

export function extractSkuCode(sku: string | null | undefined): string | null {
  const value = sku?.trim();
  if (!value) {
    return null;
  }

  const parts = value.split("-").map((part) => part.trim()).filter(Boolean);
  const skuCode = parts[SKU_CODE_SEGMENT_INDEX];

  return skuCode ? skuCode.toUpperCase() : null;
}
