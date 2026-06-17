const DEFAULT_LIMIT = 100;

export type EtsyTrackingSyncOrderRow = {
  id: string;
  tenantId: string;
  externalOrderId: string;
  orderNumber: string | null;
  sourceChannel: string | null;
  shipments: EtsyTrackingSyncShipmentRow[];
};

export type EtsyTrackingSyncShipmentRow = {
  id: string;
  trackingNumber: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export type EtsyTrackingSyncCandidate = {
  orderId: string;
  tracking: string;
  fulfillmentOrderId: string;
  tenantId: string;
  shipmentId: string;
};

export type EtsyTrackingSyncArgs = {
  execute: boolean;
  dryRun: boolean;
  all: boolean;
  tenantId?: string;
  orderId?: string;
  limit?: number;
  help: boolean;
};

export function buildEtsyTrackingSyncCandidates(
  rows: EtsyTrackingSyncOrderRow[],
): EtsyTrackingSyncCandidate[] {
  return rows.flatMap((row) => {
    if (row.sourceChannel?.trim().toUpperCase() !== "ETSY") {
      return [];
    }

    const shipment = [...row.shipments]
      .filter((entry) => entry.trackingNumber?.trim())
      .sort(compareShipmentNewestFirst)[0];
    const tracking = shipment?.trackingNumber?.trim();
    const orderId = row.orderNumber?.trim() || row.externalOrderId.trim();

    if (!shipment || !tracking || !orderId) {
      return [];
    }

    return [
      {
        orderId,
        tracking,
        fulfillmentOrderId: row.id,
        tenantId: row.tenantId,
        shipmentId: shipment.id,
      },
    ];
  });
}

export function parseEtsyTrackingSyncArgs(argv: string[]): EtsyTrackingSyncArgs {
  const args: EtsyTrackingSyncArgs = {
    execute: false,
    dryRun: true,
    all: false,
    tenantId: undefined,
    orderId: undefined,
    limit: DEFAULT_LIMIT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];

    if (entry === "--help" || entry === "-h") {
      args.help = true;
      continue;
    }

    if (entry === "--execute") {
      args.execute = true;
      args.dryRun = false;
      continue;
    }

    if (entry === "--dry-run") {
      args.execute = false;
      args.dryRun = true;
      continue;
    }

    if (entry === "--all") {
      args.all = true;
      args.limit = undefined;
      continue;
    }

    if (entry?.startsWith("--tenantId=")) {
      args.tenantId = readInlineValue(entry, "--tenantId=");
      continue;
    }

    if (entry === "--tenantId") {
      args.tenantId = readNextValue(argv, index, "--tenantId");
      index += 1;
      continue;
    }

    if (entry?.startsWith("--orderId=")) {
      args.orderId = readInlineValue(entry, "--orderId=");
      continue;
    }

    if (entry === "--orderId") {
      args.orderId = readNextValue(argv, index, "--orderId");
      index += 1;
      continue;
    }

    if (entry?.startsWith("--limit=")) {
      args.limit = parseLimit(readInlineValue(entry, "--limit="));
      args.all = false;
      continue;
    }

    if (entry === "--limit") {
      args.limit = parseLimit(readNextValue(argv, index, "--limit"));
      args.all = false;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${entry}`);
  }

  return args;
}

function compareShipmentNewestFirst(
  left: EtsyTrackingSyncShipmentRow,
  right: EtsyTrackingSyncShipmentRow,
) {
  const updatedDiff = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  return right.createdAt.getTime() - left.createdAt.getTime();
}

function readInlineValue(entry: string, prefix: string) {
  const value = entry.slice(prefix.length).trim();
  if (!value) {
    throw new Error(`${prefix.slice(0, -1)} requires a value.`);
  }

  return value;
}

function readNextValue(argv: string[], index: number, flag: string) {
  const value = argv[index + 1]?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function parseLimit(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  return parsed;
}
