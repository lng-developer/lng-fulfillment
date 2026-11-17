/**
 * Normalizes a tracking number returned by Viettel Post.
 *
 * In USPS IMpb / GS1-128 barcodes, the full routing string starts with:
 * "420" (Application Identifier) + 5-digit or 9-digit ZIP code + 20-22 digit USPS tracking number.
 * Example:
 *   "4207261630339214490374008505076419"
 *   -> "420" (AI) + "726163033" (ZIP+4) + "9214490374008505076419" (USPS 22-digit tracking)
 *
 * Marketplaces (Amazon, Etsy) and USPS public tracking APIs require the clean
 * 20-22 digit tracking number without the 420 routing prefix.
 */
export function normalizeViettelPostTrackingNumber(
  rawTracking: string | null | undefined,
): string | null {
  if (!rawTracking) return null;
  const trimmed = rawTracking.trim();
  if (!trimmed) return null;

  // Match: 420 + 5-digit or 9-digit ZIP + 20-22 digit USPS tracking (typically starting with 9)
  const uspsWithRoutingMatch = trimmed.match(/^420\d{5,9}(9\d{19,21})$/);
  if (uspsWithRoutingMatch) {
    return uspsWithRoutingMatch[1];
  }

  // Fallback: 420 + 5 or 9 digit ZIP followed by any 20-22 digit sequence
  const genericWithRoutingMatch = trimmed.match(/^420\d{5,9}(\d{20,22})$/);
  if (genericWithRoutingMatch) {
    return genericWithRoutingMatch[1];
  }

  return trimmed;
}
