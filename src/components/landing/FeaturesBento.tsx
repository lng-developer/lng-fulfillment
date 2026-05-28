import {
  AlertTriangle,
  Check,
  FileText,
  KeyRound,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    Icon: ShieldCheck,
    title: "Preflight & Safe Execute",
    desc: "Kiểm tra toàn bộ điều kiện trước khi gửi lên carrier. Không bao giờ tự động — user phải xác nhận thủ công.",
    span: 3,
    showMiniUI: true,
  },
  {
    Icon: Package,
    title: "Orders với Expandable Rows",
    desc: "Mặc định mở tất cả rows, xem chi tiết đơn hàng ngay tại chỗ. Mũi tên đóng/mở từng row, không cần chuyển trang.",
    span: 3,
  },
  {
    Icon: KeyRound,
    title: "API Key Management",
    desc: "Plaintext chỉ hiển thị một lần. Scope granular, revoke tức thì.",
    span: 2,
  },
  {
    Icon: Users,
    title: "RBAC 4 cấp",
    desc: "Owner · Admin · Operator · Viewer. Server là source of truth.",
    span: 2,
  },
  {
    Icon: FileText,
    title: "Audit Logs",
    desc: "Mọi thao tác ghi nhận. Metadata tự động redact credentials.",
    span: 2,
  },
];

export function FeaturesBento() {
  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-16 md:px-7"
      id="features"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="lp-section-label">Tính năng</div>
        <h2 className="lp-section-h">Một workspace cho mọi tác vụ fulfillment</h2>
        <p className="lp-section-sub">
          Tập trung vào vận hành: order, shipment, carrier action, API key và
          audit trong một giao diện thống nhất.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-2.5 md:grid-cols-6">
          {features.map((feature) => (
            <BentoCard feature={feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  feature,
}: {
  feature: (typeof features)[number];
}) {
  const Icon = feature.Icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] p-5 transition-all duration-150 hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)]",
        feature.span === 3 ? "md:col-span-3" : "md:col-span-2",
      )}
    >
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--brand)] group-hover:border-[var(--brand-mid)] group-hover:bg-white">
        <Icon size={17} />
      </div>

      <div className="mb-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
        {feature.title}
      </div>
      <div className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
        {feature.desc}
      </div>

      {feature.showMiniUI ? <PreflightMiniUi /> : null}

      <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 rounded-tl-full bg-[var(--brand)] opacity-[0.05]" />
    </div>
  );
}

function PreflightMiniUi() {
  const rows = [
    { ok: true, label: "Auth OK · Role: ADMIN" },
    { ok: true, label: "Shipment: DRAFT · Carrier: yunexpress" },
    { ok: false, label: "liveEnabled: FALSE — sandbox mode" },
  ];

  return (
    <div className="mt-4 space-y-1.5">
      {rows.map((row) => (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] ${
            row.ok
              ? "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              : "border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--warning-text)]"
          }`}
          key={row.label}
        >
          {row.ok ? (
            <Check className="flex-shrink-0 text-[var(--success)]" size={12} />
          ) : (
            <AlertTriangle className="flex-shrink-0 text-amber-500" size={12} />
          )}
          {row.label}
        </div>
      ))}
    </div>
  );
}
