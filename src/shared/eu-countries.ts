const EU_COUNTRY_NAME_TO_CODE: Record<string, string> = {
  AUSTRIA: "AT",
  BELGIUM: "BE",
  BULGARIA: "BG",
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
  HUNGARY: "HU",
  IRELAND: "IE",
  ITALY: "IT",
  LATVIA: "LV",
  LITHUANIA: "LT",
  LUXEMBOURG: "LU",
  MALTA: "MT",
  NETHERLANDS: "NL",
  POLAND: "PL",
  PORTUGAL: "PT",
  ROMANIA: "RO",
  SLOVAKIA: "SK",
  SLOVENIA: "SI",
  SPAIN: "ES",
  SWEDEN: "SE",
};

export const EU_COUNTRY_OPTIONS = [
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "IE", label: "Ireland" },
  { code: "PL", label: "Poland" },
  { code: "SE", label: "Sweden" },
] as const;

const EU_COUNTRY_CODES = new Set(Object.values(EU_COUNTRY_NAME_TO_CODE));

export function normalizeSupportedEuCountryCode(
  value: string | null | undefined,
) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (EU_COUNTRY_CODES.has(normalized)) return normalized;

  const compact = normalized.replace(/[^A-Z]/g, "");
  return EU_COUNTRY_NAME_TO_CODE[compact] ?? null;
}

export function isEuCountryCode(value: string | null | undefined) {
  return Boolean(normalizeSupportedEuCountryCode(value));
}
