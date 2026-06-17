import { OrderSourceChannel } from "@prisma/client";
import { prisma } from "../src/shared/db";
import { sendPortalTrackingUpdate } from "../src/modules/portal-tracking";
import {
  buildEtsyTrackingSyncCandidates,
  parseEtsyTrackingSyncArgs,
} from "../src/modules/portal-tracking/etsy-bulk-sync";

async function main() {
  const args = parseEtsyTrackingSyncArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const rows = await prisma.order.findMany({
    where: {
      sourceChannel: OrderSourceChannel.ETSY,
      ...(args.tenantId ? { tenantId: args.tenantId } : {}),
      ...(args.orderId
        ? {
            OR: [
              { orderNumber: args.orderId },
              { externalOrderId: args.orderId },
            ],
          }
        : {}),
      shipments: {
        some: {
          trackingNumber: {
            not: null,
          },
        },
      },
    },
    select: {
      id: true,
      tenantId: true,
      externalOrderId: true,
      orderNumber: true,
      sourceChannel: true,
      shipments: {
        where: {
          trackingNumber: {
            not: null,
          },
        },
        select: {
          id: true,
          trackingNumber: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    ...(args.limit ? { take: args.limit } : {}),
  });

  const candidates = buildEtsyTrackingSyncCandidates(rows);
  const mode = args.execute ? "execute" : "dry-run";

  console.info("[etsy-tracking-sync] start", {
    mode,
    rows: rows.length,
    candidates: candidates.length,
    tenantId: args.tenantId ?? null,
    orderId: args.orderId ?? null,
    limit: args.limit ?? null,
    all: args.all,
  });

  let delivered = 0;
  let failed = 0;

  for (const candidate of candidates) {
    if (!args.execute) {
      console.info("[etsy-tracking-sync] dry-run candidate", candidate);
      continue;
    }

    const result = await sendPortalTrackingUpdate({
      orderId: candidate.orderId,
      tracking: candidate.tracking,
      sourceChannel: "ETSY",
    });

    if (result.attempted && result.delivered) {
      delivered += 1;
      console.info("[etsy-tracking-sync] delivered", candidate);
      continue;
    }

    failed += 1;
    console.warn("[etsy-tracking-sync] failed", {
      ...candidate,
      result,
    });
  }

  console.info("[etsy-tracking-sync] complete", {
    mode,
    candidates: candidates.length,
    delivered,
    failed,
    skipped: rows.length - candidates.length,
  });

  if (args.execute && failed > 0) {
    process.exitCode = 1;
  }
}

function printUsage() {
  console.info(`Sync Etsy tracking from Fulfillment Platform to Portal.

Usage:
  npm run sync:etsy-tracking -- --dry-run
  npm run sync:etsy-tracking -- --execute
  npm run sync:etsy-tracking -- --all --execute
  npm run sync:etsy-tracking -- --orderId=4088505825 --execute

Options:
  --dry-run          Preview candidates only. Default.
  --execute          Call Portal tracking update endpoint.
  --all              Process every eligible Etsy order instead of default limit.
  --limit=100        Limit order rows scanned. Default: 100.
  --tenantId=<id>    Restrict to one tenant.
  --orderId=<id>     Restrict to one Etsy order number or external order id.
  --help             Show this help.
`);
}

main()
  .catch((error) => {
    console.error("[etsy-tracking-sync] fatal", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
