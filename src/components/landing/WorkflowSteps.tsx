import { Package, PenLine, ShieldCheck } from "lucide-react";

const steps = [
  {
    Icon: Package,
    title: "Nhận đơn",
    desc: "Portal gửi qua API Key, tenant-scoped, idempotent",
    done: true,
  },
  {
    Icon: PenLine,
    title: "Tạo Draft",
    desc: "Chọn items, tạo draft shipment linh hoạt",
    done: true,
  },
  {
    Icon: ShieldCheck,
    title: "Preflight",
    desc: "Kiểm tra không gọi carrier network",
    done: true,
  },
  {
    title: "Execute",
    desc: "Xác nhận thủ công, live warning bắt buộc",
    done: false,
    num: "4",
  },
  {
    title: "Tracking",
    desc: "Sync thủ công, không auto-poll",
    done: false,
    num: "5",
  },
];

export function WorkflowSteps() {
  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-16 md:px-7"
      id="workflow"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="lp-section-label">Workflow</div>
        <h2 className="lp-section-h">Từ order đến carrier action có kiểm soát</h2>
        <p className="lp-section-sub">
          Mỗi bước quan trọng đều có state rõ ràng, không tự động gọi live
          carrier khi user chưa xác nhận.
        </p>

        <div className="relative mt-10 grid gap-7 md:grid-cols-5 md:gap-0">
          <div className="absolute left-[10%] right-[10%] top-[17px] hidden h-px bg-[var(--brand-mid)] md:block" />

          {steps.map((step) => {
            const Icon = "Icon" in step ? step.Icon : null;
            return (
              <div
                className="relative z-10 flex flex-col items-center px-3 text-center"
                key={step.title}
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full border ${
                    step.done
                      ? "border-[var(--brand-dark)] bg-[var(--brand)] text-white"
                      : "border-[var(--brand-mid)] bg-[var(--bg-surface)] text-[var(--brand)]"
                  }`}
                >
                  {Icon ? (
                    <Icon size={16} />
                  ) : (
                    <span className="text-[13px] font-semibold">{step.num}</span>
                  )}
                </div>
                <div className="mb-1 text-[12px] font-semibold text-[var(--text-primary)]">
                  {step.title}
                </div>
                <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
