import { ApiError, getErrorMessage } from "@/lib/api/base";
import { safeLabelUrl } from "@/shared/label-url";
export type VpJob = {
  orderId: string;
  orderNumber: string;
  shipmentId?: string;
  state: "queued" | "sending" | "waiting" | "ready" | "review";
  message?: string;
  labelUrl?: string | null;
};
export type VpSnapshot = {
  id?: string;
  status?: string;
  labelUrl?: string | null;
  carrierIssue?: string | null;
};
export type VpJobDependencies = {
  create: (orderId: string) => Promise<VpSnapshot>;
  read: (shipmentId: string, signal: AbortSignal) => Promise<VpSnapshot>;
  sync: (shipmentId: string, signal: AbortSignal) => Promise<unknown>;
  label: (shipmentId: string, signal: AbortSignal) => Promise<string | null>;
  update: (job: VpJob) => void;
  pause: () => Promise<void>;
  signal: AbortSignal;
};
export async function runVpJobs(input: VpJob[], deps: VpJobDependencies) {
  const jobs = input.map((job) => ({ ...job }));
  const emit = (job: VpJob, patch: Partial<VpJob>) => {
    Object.assign(job, patch);
    if (!deps.signal.aborted) deps.update({ ...job });
  };
  async function pool(
    items: VpJob[],
    action: (job: VpJob) => Promise<void>,
    signal = deps.signal,
  ) {
    let index = 0;
    await Promise.all(
      [0, 1].map(async () => {
        while (index < items.length && !signal.aborted)
          await action(items[index++]);
      }),
    );
  }
  await pool(
    jobs.filter((j) => !j.shipmentId && j.state !== "review"),
    async (job) => {
      emit(job, { state: "sending" });
      try {
        const shipment = await deps.create(job.orderId);
        if (!shipment.id)
          throw new Error("Thiếu mã vận đơn; kiểm tra đơn trước khi gửi lại.");
        emit(job, { shipmentId: shipment.id, state: "waiting" });
      } catch (error) {
        emit(job, {
          state: "review",
          message:
            error instanceof ApiError
              ? getErrorMessage(error)
              : "Chưa xác nhận được kết quả gửi. Kiểm tra chi tiết đơn trước khi gửi lại để tránh trùng vận đơn.",
        });
      }
    },
  );
  // Bounded polling only reads/syncs existing shipments. It never repeats create.
  const deadline = Date.now() + 120000;
  const pollSignal = AbortSignal.any([
    deps.signal,
    AbortSignal.timeout(120000),
  ]);
  for (
    let attempt = 0;
    attempt < 8 && Date.now() < deadline && !pollSignal.aborted;
    attempt++
  ) {
    const pending = jobs.filter(
      (j) => j.shipmentId && j.state !== "ready" && j.state !== "review",
    );
    if (!pending.length) break;
    await pool(
      pending,
      async (job) => {
        try {
          let shipment = await deps.read(job.shipmentId!, pollSignal);
          if (["CANCELLED", "FAILED_CREATE"].includes(shipment.status ?? "")) {
            emit(job, {
              state: "review",
              message:
                "Vận đơn đã hủy hoặc tạo thất bại. Kiểm tra trước khi gửi lại.",
            });
            return;
          }
          if (
            !safeLabelUrl(shipment.labelUrl) ||
            shipment.status === "EXCEPTION"
          ) {
            pollSignal.throwIfAborted();
            await deps.sync(job.shipmentId!, pollSignal);
            pollSignal.throwIfAborted();
            shipment = await deps.read(job.shipmentId!, pollSignal);
          }
          if (
            ["EXCEPTION", "CANCELLED", "FAILED_CREATE"].includes(
              shipment.status ?? "",
            )
          ) {
            emit(job, {
              state: "review",
              message: shipment.carrierIssue || "Vận đơn cần đối soát với VP.",
            });
            return;
          }
          pollSignal.throwIfAborted();
          const labelUrl = safeLabelUrl(
            await deps.label(job.shipmentId!, pollSignal),
          );
          emit(
            job,
            labelUrl
              ? { state: "ready", labelUrl, message: undefined }
              : { state: "waiting", message: "VP đã nhận · Đang lấy nhãn" },
          );
        } catch {
          emit(job, {
            state: "waiting",
            message: "Chưa lấy được nhãn; đang tự thử lại, không gửi lại đơn.",
          });
        }
      },
      pollSignal,
    );
    if (
      attempt < 7 &&
      jobs.some((j) => j.state === "waiting") &&
      !pollSignal.aborted
    )
      await deps.pause();
  }
  for (const job of jobs.filter((j) => j.state === "waiting"))
    emit(job, {
      message:
        "VP chưa trả nhãn. Có thể tiếp tục lấy nhãn; không cần gửi lại đơn.",
    });
  return jobs;
}
