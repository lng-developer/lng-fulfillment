const YUN_SUPPORTED_COUNTRY_NAME_TO_CODE: Record<string, string> = {
  AUSTRALIA: "AU",
  AUSTRIA: "AT",
  BELGIUM: "BE",
  BRAZIL: "BR",
  BZ: "BR",
  BULGARIA: "BG",
  CANADA: "CA",
  CHILE: "CL",
  CROATIA: "HR",
  CYPRUS: "CY",
  CZECHIA: "CZ",
  CZECHREPUBLIC: "CZ",
  DENMARK: "DK",
  ESTONIA: "EE",
  FINLAND: "FI",
  FRANCE: "FR",
  GERMANY: "DE",
  GREECE: "GR",
  HONGKONG: "HK",
  HUNGARY: "HU",
  IRELAND: "IE",
  ISRAEL: "IL",
  ITALY: "IT",
  JAPAN: "JP",
  LATVIA: "LV",
  LITHUANIA: "LT",
  LUXEMBOURG: "LU",
  MALTA: "MT",
  MEXICO: "MX",
  NETHERLANDS: "NL",
  NEWZEALAND: "NZ",
  NORWAY: "NO",
  POLAND: "PL",
  PORTUGAL: "PT",
  ROMANIA: "RO",
  SAUDIARABIA: "SA",
  SINGAPORE: "SG",
  SLOVAKIA: "SK",
  SLOVENIA: "SI",
  SPAIN: "ES",
  SWEDEN: "SE",
  SWITZERLAND: "CH",
  UAE: "AE",
  UNITEDARABEMIRATES: "AE",
  UNITEDKINGDOM: "GB",
  GREATBRITAIN: "GB",
  ENGLAND: "GB",
  UK: "GB",
  UNITEDSTATES: "US",
  USA: "US",
};

export const YUN_SUPPORTED_COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "PL", label: "Poland" },
  { code: "AT", label: "Austria" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "IE", label: "Ireland" },
  { code: "BG", label: "Bulgaria" },
  { code: "CZ", label: "Czechia" },
  { code: "EE", label: "Estonia" },
  { code: "GR", label: "Greece" },
  { code: "HR", label: "Croatia" },
  { code: "HU", label: "Hungary" },
  { code: "LT", label: "Lithuania" },
  { code: "LV", label: "Latvia" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Romania" },
  { code: "SK", label: "Slovakia" },
  { code: "MT", label: "Malta" },
  { code: "SI", label: "Slovenia" },
  { code: "NO", label: "Norway" },
  { code: "IL", label: "Israel" },
  { code: "CH", label: "Switzerland" },
  { code: "CY", label: "Cyprus" },
  { code: "LU", label: "Luxembourg" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "SG", label: "Singapore" },
  { code: "CA", label: "Canada" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "CL", label: "Chile" },
  { code: "JP", label: "Japan" },
  { code: "HK", label: "Hong Kong" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "SE", label: "Sweden" },
  { code: "BE", label: "Belgium" },
  { code: "NL", label: "Netherlands" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "GB", label: "United Kingdom" },
] as const;

const YUN_SUPPORTED_COUNTRY_CODES = new Set<string>(
  YUN_SUPPORTED_COUNTRY_OPTIONS.map((country) => country.code),
);

export function normalizeYunSupportedCountryCode(
  value: string | null | undefined,
) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (YUN_SUPPORTED_COUNTRY_CODES.has(normalized)) return normalized;

  const compact = normalized.replace(/[^A-Z]/g, "");
  return YUN_SUPPORTED_COUNTRY_NAME_TO_CODE[compact] ?? null;
}

export function formatYunSupportedCountry(code: string) {
  const normalized = normalizeYunSupportedCountryCode(code) ?? code;
  const country = YUN_SUPPORTED_COUNTRY_OPTIONS.find(
    (option) => option.code === normalized,
  );

  return country ? `${country.label} (${country.code})` : code;
}
