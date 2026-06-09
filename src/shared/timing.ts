export type SafeTimingMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export function createSafeTimingLogger(
  action: string,
  context: SafeTimingMetadata = {},
) {
  const enabled = process.env.SHIPMENT_TIMING_LOGS === "true";
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (step: string, metadata: SafeTimingMetadata = {}) => {
    if (!enabled) {
      return;
    }

    const now = Date.now();
    console.info("[shipment-timing]", {
      action,
      step,
      elapsedMs: now - startedAt,
      stepMs: now - previousAt,
      ...context,
      ...metadata,
    });
    previousAt = now;
  };
}
