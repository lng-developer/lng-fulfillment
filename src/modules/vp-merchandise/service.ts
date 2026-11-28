import { AppError } from "@/shared/errors";
import {
  vpDeclarationIssue,
  vpSkuGroup,
  type VpDeclaration,
  type VpSkuMapping,
} from "@/shared/vp-declarations";
import type { CreateCarrierShipmentInput } from "@/modules/carrier";
import {
  findMappings,
  saveMapping,
  listMappingPage,
  createMapping,
  deleteMapping,
} from "./repository";

export function listMappings(
  tenantId: string,
  search: string,
  country: string,
  page: number,
) {
  if (
    search.length > 200 ||
    (country && !/^[A-Z]{2}$/.test(country)) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  )
    fail("Bộ lọc mapping không hợp lệ.");
  return listMappingPage(tenantId, search.trim(), country, page);
}
export async function addMapping(
  tenantId: string,
  actorId: string,
  value: unknown,
) {
  const mapping = validateMapping(value);
  try {
    return await createMapping(tenantId, actorId, mapping);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new AppError(
        "CONFLICT",
        "SKU/nhóm và nước đến đã có mapping. Hãy sửa bản ghi hiện có.",
        409,
      );
    throw error;
  }
}
export async function removeMapping(tenantId: string, value: unknown) {
  const mapping = validateMapping(value);
  const result = await deleteMapping(
    tenantId,
    mapping.skuCode,
    mapping.destinationCountryCode,
    mapping.mappingType,
  );
  if (!result.count)
    throw new AppError("NOT_FOUND", "Mapping không còn tồn tại.", 404);
}

function fail(message: string): never {
  throw new AppError("VALIDATION_ERROR", message, 400);
}
export function validateMapping(value: unknown): VpSkuMapping {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Mapping không hợp lệ.");
  const body = value as Record<string, unknown>;
  const mappingType = body.mappingType ?? "SKU";
  if (mappingType !== "SKU" && mappingType !== "GROUP")
    fail("Loại mapping không hợp lệ.");
  let skuCode = typeof body.skuCode === "string" ? body.skuCode.trim() : "";
  if (mappingType === "GROUP") {
    if (!/^[A-Za-z0-9]{1,50}$/.test(skuCode))
      fail("Nhập mã nhóm như ACO, không nhập SKU đầy đủ.");
    skuCode = skuCode.toUpperCase();
  }
  const destinationCountryCode =
    typeof body.destinationCountryCode === "string"
      ? body.destinationCountryCode.trim().toUpperCase()
      : "";
  const declarationName =
    typeof body.declarationName === "string" ? body.declarationName.trim() : "";
  const merchandiseCode =
    typeof body.merchandiseCode === "string" ? body.merchandiseCode.trim() : "";
  if (!skuCode || skuCode.length > 200 || /[\u0000-\u001f]/.test(skuCode))
    fail("SKU không hợp lệ.");
  if (!/^[A-Z]{2}$/.test(destinationCountryCode))
    fail("Nhập mã nước đến gồm 2 chữ cái.");
  const issue = vpDeclarationIssue([
    { orderItemId: skuCode, declarationName, merchandiseCode },
  ]);
  if (issue) fail(issue);
  return {
    mappingType,
    skuCode,
    destinationCountryCode,
    declarationName,
    merchandiseCode,
  };
}
export async function lookupMappings(
  tenantId: string,
  country: string,
  skus: string[],
) {
  if (
    !/^[A-Z]{2}$/.test(country) ||
    skus.length > 50 ||
    skus.some((s) => !s || s.length > 200)
  )
    fail("Yêu cầu tra mapping không hợp lệ (tối đa 50 SKU).");
  const unique = [...new Set(skus.map((sku) => sku.trim()))];
  if (!unique.length) return [];
  const groups = [
    ...new Set(
      unique.flatMap((sku) => (vpSkuGroup(sku) ? [vpSkuGroup(sku)!] : [])),
    ),
  ];
  const saved = await findMappings(tenantId, country, unique, groups);
  const exact = new Map(
    saved
      .filter((m) => (m.mappingType ?? "SKU") === "SKU")
      .map((m) => [m.skuCode, m]),
  );
  const byGroup = new Map(
    saved.filter((m) => m.mappingType === "GROUP").map((m) => [m.skuCode, m]),
  );
  return unique.flatMap((sku) => {
    const mapping = exact.get(sku) ?? byGroup.get(vpSkuGroup(sku) ?? "");
    return mapping
      ? [{ ...mapping, skuCode: sku, matchedKey: mapping.skuCode }]
      : [];
  });
}
export async function upsertMapping(
  tenantId: string,
  actorId: string,
  value: unknown,
) {
  return saveMapping(tenantId, actorId, validateMapping(value));
}
export async function applyVpDeclarations(
  input: CreateCarrierShipmentInput,
  overrides?: VpDeclaration[],
) {
  if (input.carrierCode !== "VIETTEL_POST") return input;
  const country = (input.recipient?.country || input.destinationCountry || "")
    .trim()
    .toUpperCase();
  const itemIds = new Set(input.items.map((i) => i.orderItemId));
  if (
    overrides &&
    (new Set(overrides.map((i) => i.orderItemId)).size !== overrides.length ||
      overrides.some((i) => !itemIds.has(i.orderItemId)))
  )
    fail("Khai báo có item trùng hoặc không thuộc vận đơn.");
  const byItem = new Map(overrides?.map((i) => [i.orderItemId, i]));
  const missing = input.items.filter((i) => !byItem.has(i.orderItemId));
  const mappings = missing.length
    ? await lookupMappings(
        input.tenantId,
        country,
        missing.flatMap((i) => (i.sku ? [i.sku.trim()] : [])),
      )
    : [];
  const bySku = new Map(mappings.map((m) => [m.skuCode, m]));
  const declarations = input.items.map((item) => {
    const value =
      byItem.get(item.orderItemId) ?? bySku.get(item.sku?.trim() ?? "");
    return {
      orderItemId: item.orderItemId,
      declarationName: value?.declarationName ?? "",
      merchandiseCode: value?.merchandiseCode ?? "",
    };
  });
  const issue = vpDeclarationIssue(declarations);
  if (issue) fail(issue);
  return {
    ...input,
    items: input.items.map((item, index) => ({
      ...item,
      name: declarations[index].declarationName,
    })),
    metadata: {
      ...input.metadata,
      hsCode: declarations[0].merchandiseCode,
      vpDeclarations: JSON.stringify(declarations),
    },
  };
}
