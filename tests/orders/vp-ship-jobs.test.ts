import assert from "node:assert/strict";
import { runVpJobs, type VpJob } from "@/lib/shipment/vp-ship-jobs";
async function main() {
  let creates = 0,
    syncs = 0,
    reads = 0;
  const events: VpJob[] = [];
  const result = await runVpJobs(
    [
      { orderId: "a", orderNumber: "A", state: "queued" },
      { orderId: "b", orderNumber: "B", state: "queued" },
    ],
    {
      create: async (id) => {
        creates++;
        if (id === "b") throw Error("timeout");
        return { id: "s" };
      },
      read: async () => ({
        id: "s",
        status: "TRACKING_PENDING",
        labelUrl: ++reads > 1 ? "https://example.test/a.pdf" : null,
      }),
      sync: async () => {
        syncs++;
      },
      label: async () => "https://example.test/a.pdf",
      update: (j) => events.push(j),
      pause: async () => {},
      signal: new AbortController().signal,
    },
  );
  assert.equal(creates, 2);
  assert.equal(syncs, 1);
  assert.equal(result[0].state, "ready");
  assert.equal(result[1].state, "review");
  let attempts = 0;
  const resumed = await runVpJobs(
    [{ orderId: "a", orderNumber: "A", state: "waiting", shipmentId: "s" }],
    {
      create: async () => {
        throw Error("must not recreate");
      },
      read: async () => ({ status: "TRACKING_PENDING" }),
      sync: async () => {
        attempts++;
      },
      label: async () => null,
      update: () => {},
      pause: async () => {},
      signal: new AbortController().signal,
    },
  );
  assert.equal(attempts, 8);
  assert.equal(resumed[0].state, "waiting");
  const cancelled = await runVpJobs(
    [{ orderId: "a", orderNumber: "A", state: "waiting", shipmentId: "s" }],
    {
      create: async () => {
        throw Error("no create");
      },
      read: async () => ({
        status: "CANCELLED",
        labelUrl: "https://example.test/old.pdf",
      }),
      sync: async () => {
        throw Error("no sync");
      },
      label: async () => {
        throw Error("no label");
      },
      update: () => {},
      pause: async () => {},
      signal: new AbortController().signal,
    },
  );
  assert.equal(cancelled[0].state, "review");
  // Accelerate the real polling timeout to test cancellation inside a batch round.
  const originalTimeout = AbortSignal.timeout;
  let slowReads = 0;
  AbortSignal.timeout = () => originalTimeout(10);
  try {
    const bounded = await runVpJobs(
      [
        {
          orderId: "failed",
          orderNumber: "Failed",
          state: "review",
          message: "Check before resend",
        },
        ...Array.from(
          { length: 10 },
          (_, i): VpJob => ({
            orderId: String(i),
            orderNumber: String(i),
            shipmentId: `s${i}`,
            state: "waiting",
          }),
        ),
      ],
      {
        create: async () => {
          assert.fail("must not retry ambiguous creation");
        },
        read: async (_id, signal) => {
          slowReads++;
          await new Promise((resolve) => setTimeout(resolve, 25));
          signal.throwIfAborted();
          return {};
        },
        sync: async () => {
          assert.fail("no sync after deadline");
        },
        label: async () => {
          assert.fail("no label after deadline");
        },
        update: () => {},
        pause: async () => {},
        signal: new AbortController().signal,
      },
    );
    assert.equal(slowReads, 2);
    assert.equal(bounded[0].message, "Check before resend");
    assert.equal(bounded.length, 11);
  } finally {
    AbortSignal.timeout = originalTimeout;
  }
  console.log(
    "PASS VP jobs: isolated failures, bounded reads, no recreate, cancelled label blocked",
  );
}
void main();
