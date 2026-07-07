import { ApiError, getCarrierFailureMessage } from "@/lib/api/base";

export const SKU_MAPPING_IMPORT_HEADERS = [
  "SKU Code",
  "Country Code",
  "Shipping Method Code",
  "EName",
  "CName",
  "Description",
] as const;

const SHIPPING_METHOD_CODES = new Set(["VN-YTYCPREC", "VNFZZXR", "VNTHZXR"]);

export type SkuMappingImportRow = {
  skuCode: string;
  destinationCountryCode: string;
  shippingMethodCode: string;
  eName: string;
  cName: string;
  description: string | null;
};

export type SkuMappingImportError = {
  rowNumber: number;
  message: string;
};

export type SkuMappingImportResult = {
  rows: SkuMappingImportRow[];
  errors: SkuMappingImportError[];
};

export type SkuMappingImportExistingMapping = {
  id: string;
  skuCode: string;
  destinationCountryCode: string;
  shippingMethodCode: string;
};

export type SkuMappingImportAction =
  | {
      type: "create";
      row: SkuMappingImportRow;
    }
  | {
      type: "overwrite";
      row: SkuMappingImportRow;
      mapping: SkuMappingImportExistingMapping;
    }
  | {
      type: "conflict";
      row: SkuMappingImportRow;
      message: string;
    };

export function buildSkuMappingImportTemplateCsv() {
  return [
    SKU_MAPPING_IMPORT_HEADERS.join(","),
    [
      "NK",
      "US",
      "VN-YTYCPREC",
      "Embroidered shirt",
      "Embroidered shirt CN",
      "US shirt route",
    ]
      .map(escapeCsvCell)
      .join(","),
    [
      "NK",
      "CA",
      "VNTHZXR",
      "Embroidered shirt",
      "Embroidered shirt CN",
      "Canada route",
    ]
      .map(escapeCsvCell)
      .join(","),
    ["WD", "GB", "VNFZZXR", "Wooden decor", "Wooden decor CN", "UK decor route"]
      .map(escapeCsvCell)
      .join(","),
  ].join("\r\n");
}

export function parseSkuMappingImportCsv(text: string): SkuMappingImportResult {
  const parsedRows = parseCsvRows(stripBom(text));
  if (parsedRows.length === 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: "Import file is empty." }],
    };
  }

  const headers = parsedRows[0] ?? [];
  const columnIndexes = resolveColumnIndexes(headers);
  const missingHeaders = requiredColumns.filter(
    (column) => columnIndexes[column] === undefined,
  );

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required columns: ${missingHeaders
            .map(formatColumnName)
            .join(", ")}.`,
        },
      ],
    };
  }

  const rows: SkuMappingImportRow[] = [];
  const errors: SkuMappingImportError[] = [];

  parsedRows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2;
    if (cells.every((cell) => !cell.trim())) return;

    const row = readImportRow(cells, columnIndexes);
    const rowErrors = validateImportRow(row);

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber,
        message: rowErrors.join(" "),
      });
      return;
    }

    rows.push(row);
  });

  return { rows, errors };
}

export function formatSkuMappingImportApiError(error: unknown) {
  if (error instanceof ApiError) {
    return (
      getCarrierFailureMessage(error.details) ??
      readSafeDetailMessage(error.details) ??
      readString(error.message) ??
      "Import request failed."
    );
  }

  if (error instanceof Error) {
    return readString(error.message) ?? "Import request failed.";
  }

  return "Import request failed.";
}

export function isSkuMappingImportConflictError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === "CONFLICT"
  );
}

export function findExactSkuMappingImportMapping(
  row: SkuMappingImportRow,
  existingMappings: SkuMappingImportExistingMapping[],
) {
  return existingMappings.find(
    (mapping) =>
      normalizeCode(mapping.skuCode) === row.skuCode &&
      normalizeCode(mapping.destinationCountryCode) ===
        row.destinationCountryCode &&
      normalizeCode(mapping.shippingMethodCode) === row.shippingMethodCode,
  );
}

export function resolveSkuMappingImportActions(input: {
  rows: SkuMappingImportRow[];
  existingMappings: SkuMappingImportExistingMapping[];
}): SkuMappingImportAction[] {
  return input.rows.map((row) =>
    resolveSkuMappingImportAction(row, input.existingMappings),
  );
}

export function resolveSkuMappingImportAction(
  row: SkuMappingImportRow,
  existingMappings: SkuMappingImportExistingMapping[],
): SkuMappingImportAction {
  const sameSkuCountryMappings = existingMappings.filter(
    (mapping) =>
      normalizeCode(mapping.skuCode) === row.skuCode &&
      normalizeCode(mapping.destinationCountryCode) ===
        row.destinationCountryCode,
  );
  const exactMapping = findExactSkuMappingImportMapping(
    row,
    sameSkuCountryMappings,
  );

  if (exactMapping) {
    return {
      type: "overwrite",
      row,
      mapping: exactMapping,
    };
  }

  if (sameSkuCountryMappings.length > 0) {
    const existingMethods = sameSkuCountryMappings
      .map((mapping) => mapping.shippingMethodCode)
      .join(", ");

    return {
      type: "conflict",
      row,
      message: `Existing mapping for ${row.skuCode}/${row.destinationCountryCode} uses ${existingMethods}; import row uses ${row.shippingMethodCode}.`,
    };
  }

  return {
    type: "create",
    row,
  };
}

type ImportColumn =
  | "skuCode"
  | "destinationCountryCode"
  | "shippingMethodCode"
  | "eName"
  | "cName"
  | "description";

const requiredColumns: ImportColumn[] = [
  "skuCode",
  "destinationCountryCode",
  "shippingMethodCode",
  "eName",
  "cName",
];

const headerAliases: Record<string, ImportColumn> = {
  sku: "skuCode",
  skucode: "skuCode",
  country: "destinationCountryCode",
  countrycode: "destinationCountryCode",
  destinationcountry: "destinationCountryCode",
  destinationcountrycode: "destinationCountryCode",
  shipmethod: "shippingMethodCode",
  shipmethodcode: "shippingMethodCode",
  shippingmethod: "shippingMethodCode",
  shippingmethodcode: "shippingMethodCode",
  ename: "eName",
  englishname: "eName",
  productename: "eName",
  cname: "cName",
  chinesename: "cName",
  productcname: "cName",
  description: "description",
  note: "description",
};

function resolveColumnIndexes(headers: string[]) {
  const indexes: Partial<Record<ImportColumn, number>> = {};

  headers.forEach((header, index) => {
    const column = headerAliases[normalizeHeader(header)];
    if (column && indexes[column] === undefined) {
      indexes[column] = index;
    }
  });

  return indexes;
}

function readImportRow(
  cells: string[],
  columnIndexes: Partial<Record<ImportColumn, number>>,
): SkuMappingImportRow {
  const skuCode = readCell(cells, columnIndexes.skuCode).toUpperCase();
  const destinationCountryCode = readCell(
    cells,
    columnIndexes.destinationCountryCode,
  ).toUpperCase();
  const shippingMethodCode = readCell(
    cells,
    columnIndexes.shippingMethodCode,
  ).toUpperCase();
  const eName = readCell(cells, columnIndexes.eName);
  const cName = readCell(cells, columnIndexes.cName);
  const description = readCell(cells, columnIndexes.description);

  return {
    skuCode,
    destinationCountryCode,
    shippingMethodCode,
    eName,
    cName,
    description: description || null,
  };
}

function validateImportRow(row: SkuMappingImportRow) {
  const errors: string[] = [];

  if (!row.skuCode) errors.push("SKU Code is required.");
  if (!row.destinationCountryCode) errors.push("Country Code is required.");
  if (!row.shippingMethodCode) {
    errors.push("Shipping Method Code is required.");
  } else if (!SHIPPING_METHOD_CODES.has(row.shippingMethodCode)) {
    errors.push("Shipping Method Code is not supported.");
  }
  if (!row.eName) errors.push("EName is required.");
  if (!row.cName) errors.push("CName is required.");

  return errors;
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function readCell(cells: string[], index: number | undefined) {
  if (index === undefined) return "";
  return cells[index]?.trim() ?? "";
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function formatColumnName(column: ImportColumn) {
  switch (column) {
    case "skuCode":
      return "SKU Code";
    case "destinationCountryCode":
      return "Country Code";
    case "shippingMethodCode":
      return "Shipping Method Code";
    case "eName":
      return "EName";
    case "cName":
      return "CName";
    case "description":
      return "Description";
  }
}

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function escapeCsvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function readSafeDetailMessage(details: unknown) {
  const detailRecord = readRecord(details);
  const safeMetadata = readRecord(detailRecord?.safeMetadata);
  const remarks = readStringArray(safeMetadata?.itemRemarks);

  return (
    remarks[0] ??
    readString(safeMetadata?.message) ??
    readString(detailRecord?.message) ??
    null
  );
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => readString(item) !== null)
    : [];
}
